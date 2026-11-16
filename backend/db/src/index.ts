import { createClient, type RedisClientType } from "redis";
import { pool, REDIS_URL } from "./config";
import type { DbMessage, TickerUpdate } from "./types";

type Message<T extends DbMessage["type"]> = Extract<DbMessage, { type: T }>["data"];

const BATCH_SIZE = 200;

/** Splits a batch into the message kinds we store. */
function groupMessages(messages: DbMessage[]) {
    const trades: Message<"TRADE_ADDED">[] = [];
    const newOrders: Message<"ORDER_UPDATE">[] = [];
    const fills: Message<"ORDER_UPDATE">[] = [];
    const cancelled: Message<"ORDER_CANCELLED">[] = [];

    for (const message of messages) {
        if (message.type === "TRADE_ADDED") {
            trades.push(message.data);
        } else if (message.type === "ORDER_CANCELLED") {
            cancelled.push(message.data);
        } else if (message.data.market) {
            newOrders.push(message.data); // a message with a market is a newly placed order
        } else {
            fills.push(message.data); // otherwise it adds fills to a resting order
        }
    }
    return { trades, newOrders, fills, cancelled };
}

async function saveNewOrders(orders: Message<"ORDER_UPDATE">[]) {
    if (orders.length === 0) return;
    await pool.query(
        `INSERT INTO orders (order_id, user_id, market, side, price, quantity, executed_qty)
         SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::float8[], $6::float8[], $7::float8[])
         ON CONFLICT (order_id) DO NOTHING`,
        [
            orders.map(o => o.orderId), orders.map(o => o.userId), orders.map(o => o.market), orders.map(o => o.side),
            orders.map(o => o.price), orders.map(o => o.quantity), orders.map(o => o.executedQty),
        ]
    );
}

async function saveFills(fills: Message<"ORDER_UPDATE">[]) {
    if (fills.length === 0) return;
    await pool.query(
        `UPDATE orders o SET executed_qty = o.executed_qty + f.qty
         FROM (SELECT id, sum(qty) AS qty FROM unnest($1::text[], $2::float8[]) AS t(id, qty) GROUP BY id) f
         WHERE o.order_id = f.id`,
        [fills.map(f => f.orderId), fills.map(f => f.executedQty)]
    );
}

async function markCancelled(cancelled: Message<"ORDER_CANCELLED">[]) {
    if (cancelled.length === 0) return;
    await pool.query("UPDATE orders SET cancelled = TRUE WHERE order_id = ANY($1::text[])", [cancelled.map(c => c.orderId)]);
}

async function saveTrades(trades: Message<"TRADE_ADDED">[]) {
    if (trades.length === 0) return;
    await pool.query(
        `INSERT INTO trades (trade_id, market, time, price, quantity, quote_quantity, is_buyer_maker)
         SELECT * FROM unnest($1::bigint[], $2::text[], $3::timestamptz[], $4::float8[], $5::float8[], $6::float8[], $7::boolean[])`,
        [
            trades.map(t => t.id), trades.map(t => t.market), trades.map(t => new Date(t.timestamp)),
            trades.map(t => t.price), trades.map(t => t.quantity), trades.map(t => t.quoteQuantity), trades.map(t => t.isBuyerMaker),
        ]
    );
}

/** Rolling 24h stats for a market, in the shape the ws clients expect. */
async function buildTicker(market: string): Promise<TickerUpdate> {
    const { rows } = await pool.query(
        `SELECT last(price, time) AS last_price,
                max(price) AS high,
                min(price) AS low,
                sum(quantity) AS volume,
                sum(quote_quantity) AS quote_volume
         FROM trades
         WHERE market = $1 AND time > now() - interval '24 hours'`,
        [market]
    );
    const row = rows[0];
    return {
        stream: `ticker@${market}`,
        data: {
            c: String(row.last_price),
            h: String(row.high),
            l: String(row.low),
            v: String(row.volume),
            V: String(row.quote_volume),
            s: market,
            id: Date.now(),
            e: "ticker"
        }
    };
}

async function handleBatch(messages: DbMessage[], publisher: RedisClientType) {
    const { trades, newOrders, fills, cancelled } = groupMessages(messages);

    // order matters: an order must exist before it can be filled or cancelled
    await saveNewOrders(newOrders);
    await saveFills(fills);
    await markCancelled(cancelled);
    await saveTrades(trades);

    // one ticker update per market that traded in this batch
    for (const market of new Set(trades.map(t => t.market))) {
        const ticker = await buildTicker(market);
        await publisher.publish(ticker.stream, JSON.stringify(ticker));
    }
}

async function main() {
    const redisClient: RedisClientType = createClient({ url: REDIS_URL });
    redisClient.on("error", (err) => console.error("Redis error", err));
    await redisClient.connect();
    console.log("connected to redis");

    // the engine lPushes and we pop from the other end, so messages are handled oldest first
    while (true) {
        try {
            const first = await redisClient.brPop("db_processor", 0);
            if (!first) continue;
            const rest = await redisClient.rPopCount("db_processor", BATCH_SIZE - 1);
            const raw = [first.element, ...(rest ?? [])];
            await handleBatch(raw.map(m => JSON.parse(m)), redisClient);
        } catch (e) {
            console.error("Failed to process messages", e);
        }
    }
}

main();
