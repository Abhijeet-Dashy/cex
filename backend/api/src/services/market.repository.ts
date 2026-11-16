import { Pool } from "pg";
import { config } from "../config.ts";

const pool = new Pool({ connectionString: config.marketDbUrl });

const HOUR_MS = 60 * 60 * 1000;

/** Supported kline intervals: materialized view maintained by the db service + bucket length. */
const KLINE_INTERVALS = {
    "1m": { view: "klines_1m", ms: 60 * 1000 },
    "1h": { view: "klines_1h", ms: HOUR_MS },
    "1w": { view: "klines_1w", ms: 7 * 24 * HOUR_MS },
} as const;

export type KlineInterval = keyof typeof KLINE_INTERVALS;

export const isKlineInterval = (value: unknown): value is KlineInterval =>
    typeof value === "string" && value in KLINE_INTERVALS;

export const marketRepository = {
    async getTrades(market: string, limit: number) {
        const { rows } = await pool.query(
            `SELECT trade_id, price, quantity, quote_quantity, is_buyer_maker, time
             FROM trades WHERE market = $1 ORDER BY time DESC LIMIT $2`,
            [market, limit]
        );
        return rows.map(row => ({
            id: Number(row.trade_id),
            isBuyerMaker: row.is_buyer_maker,
            price: String(row.price),
            quantity: String(row.quantity),
            quoteQuantity: String(row.quote_quantity),
            timestamp: new Date(row.time).getTime(),
            market
        }));
    },

    async getKlines(market: string, interval: KlineInterval, startTime?: Date, endTime?: Date) {
        const { view, ms } = KLINE_INTERVALS[interval];
        const { rows } = await pool.query(
            `SELECT bucket, open, high, low, close, volume, quote_volume, trades
             FROM ${view}
             WHERE market = $1
               AND ($2::timestamptz IS NULL OR bucket >= $2)
               AND ($3::timestamptz IS NULL OR bucket <= $3)
             ORDER BY bucket ASC`,
            [market, startTime ?? null, endTime ?? null]
        );
        return rows.map(row => {
            const start = new Date(row.bucket).getTime();
            return {
                start,
                end: start + ms,
                open: String(row.open),
                high: String(row.high),
                low: String(row.low),
                close: String(row.close),
                volume: String(row.volume),
                quoteVolume: String(row.quote_volume),
                trades: String(row.trades),
            };
        });
    },

    /** Rolling 24h stats per market (or for a single market). */
    async getTickers(market?: string) {
        const { rows } = await pool.query(
            `SELECT market,
                    first(price, time) AS first_price,
                    last(price, time) AS last_price,
                    max(price) AS high,
                    min(price) AS low,
                    sum(quantity) AS volume,
                    sum(quote_quantity) AS quote_volume,
                    count(*) AS trades
             FROM trades
             WHERE time > now() - interval '24 hours'
               AND ($1::text IS NULL OR market = $1)
             GROUP BY market`,
            [market ?? null]
        );
        return rows.map(row => {
            const change = row.last_price - row.first_price;
            return {
                symbol: row.market,
                firstPrice: String(row.first_price),
                lastPrice: String(row.last_price),
                high: String(row.high),
                low: String(row.low),
                priceChange: String(change),
                priceChangePercent: String(row.first_price ? (change / row.first_price) * 100 : 0),
                volume: String(row.volume),
                quoteVolume: String(row.quote_volume),
                trades: String(row.trades),
            };
        });
    },

    /** A user's orders, newest first. */
    async getOrderHistory(userId: string, market: string | undefined, limit: number) {
        const { rows } = await pool.query(
            `SELECT order_id, market, side, price, quantity, executed_qty, cancelled, created_at
             FROM orders
             WHERE user_id = $1 AND ($2::text IS NULL OR market = $2)
             ORDER BY created_at DESC LIMIT $3`,
            [userId, market ?? null, limit]
        );
        return rows.map(row => ({
            orderId: row.order_id,
            market: row.market,
            side: row.side,
            price: String(row.price),
            quantity: String(row.quantity),
            executedQty: String(row.executed_qty),
            status: row.cancelled ? "CANCELLED" : row.executed_qty >= row.quantity ? "FILLED" : row.executed_qty > 0 ? "PARTIALLY_FILLED" : "OPEN",
            createdAt: new Date(row.created_at).getTime(),
        }));
    },
};
