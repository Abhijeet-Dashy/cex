import fs from "fs";
import path from "path";
import { RedisManager } from "../RedisManager.js";
import { ORDER_CANCELLED, ORDER_UPDATE, TRADE_ADDED } from "../types/index.js";
import {
    CANCEL_ORDER, CREATE_ORDER, GET_BALANCES, GET_DEPTH, GET_OPEN_ORDERS, ON_RAMP, REGISTER_USER,
    type MessageFromApi
} from "../types/fromApi.js";
import { type MessageToApi } from "../types/toApi.js";
import { Balances } from "./Balances.js";
import { ALL_ASSETS, BASE_ASSETS } from "./constants.js";
import { type Fill, type Order, Orderbook } from "./Orderbook.js";

//TODO: Avoid floats everywhere, use a decimal library / integer amounts for every currency
const SNAPSHOT_PATH = process.env.SNAPSHOT_PATH ?? "./data/snapshot.json";
const SNAPSHOT_INTERVAL_MS = 5 * 1000;

const parsePositive = (value: string, name: string) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
        throw new Error(`Invalid ${name}`);
    }
    return number;
};

const randomId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export class Engine {
    private orderbooks: Orderbook[] = [];
    private balances: Balances;

    constructor() {
        const snapshot = this.loadSnapshot();
        if (snapshot) {
            this.orderbooks = snapshot.orderbooks.map((o: any) => new Orderbook(o.baseAsset, o.bids, o.asks, o.lastTradeId, o.currentPrice));
            this.balances = new Balances(ALL_ASSETS, snapshot.balances);
        } else {
            this.orderbooks = BASE_ASSETS.map(asset => new Orderbook(asset, [], [], 0, 0));
            this.balances = new Balances(ALL_ASSETS);
        }
        // make sure every supported market has an orderbook
        BASE_ASSETS
            .filter(asset => !this.orderbooks.some(o => o.baseAsset === asset))
            .forEach(asset => this.orderbooks.push(new Orderbook(asset, [], [], 0, 0)));

        setInterval(() => this.saveSnapshot(), SNAPSHOT_INTERVAL_MS).unref();
    }

    private loadSnapshot() {
        if (!process.env.WITH_SNAPSHOT) {
            return null;
        }
        try {
            return JSON.parse(fs.readFileSync(SNAPSHOT_PATH).toString());
        } catch (e) {
            console.log("No snapshot found");
            return null;
        }
    }

    saveSnapshot() {
        const snapshot = {
            orderbooks: this.orderbooks.map(o => o.getSnapshot()),
            balances: this.balances.snapshot()
        };
        fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
        const tmpPath = `${SNAPSHOT_PATH}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(snapshot));
        fs.renameSync(tmpPath, SNAPSHOT_PATH); // atomic, so a crash never leaves a half-written snapshot
    }

    /** Handles one request from the api and replies on the client's channel. */
    process({ message, clientId }: { message: MessageFromApi, clientId: string }) {
        let reply: MessageToApi;
        try {
            reply = this.handle(message);
        } catch (e) {
            console.log(e);
            reply = { type: "ERROR", payload: { message: e instanceof Error ? e.message : "Unknown error" } };
        }
        RedisManager.getInstance().sendToApi(clientId, reply);
    }

    private handle(message: MessageFromApi): MessageToApi {
        switch (message.type) {
            case CREATE_ORDER: {
                const { market, price, quantity, side, userId } = message.data;
                const { executedQty, fills, orderId } = this.createOrder(market, price, quantity, side, userId);
                return { type: "ORDER_PLACED", payload: { orderId, executedQty, fills } };
            }
            case CANCEL_ORDER:
                return this.cancelOrder(message.data.orderId, message.data.market, message.data.userId);
            case GET_OPEN_ORDERS:
                return {
                    type: "OPEN_ORDERS",
                    payload: this.getOrderbook(message.data.market).getOpenOrders(message.data.userId)
                };
            case GET_DEPTH:
                return { type: "DEPTH", payload: this.getOrderbook(message.data.market).getDepth() };
            case REGISTER_USER:
                return { type: "BALANCES", payload: this.balances.ensureUser(message.data.userId) };
            case ON_RAMP:
                return this.onRamp(message.data.userId, message.data.asset, message.data.amount);
            case GET_BALANCES:
                return { type: "BALANCES", payload: this.balances.get(message.data.userId) };
        }
    }

    private getOrderbook(market: string): Orderbook {
        const orderbook = this.orderbooks.find(o => o.ticker() === market);
        if (!orderbook) {
            throw new Error("No orderbook found");
        }
        return orderbook;
    }

    // ---------------------------------------------------------------- orders

    createOrder(market: string, price: string, quantity: string, side: "buy" | "sell", userId: string) {
        const orderbook = this.getOrderbook(market);
        const orderPrice = parsePositive(price, "price");
        const orderQuantity = parsePositive(quantity, "quantity");

        // lock first: a buy locks quote currency at the limit price, a sell locks the base asset
        if (side === "buy") {
            this.balances.lock(userId, orderbook.quoteAsset, orderPrice * orderQuantity);
        } else {
            this.balances.lock(userId, orderbook.baseAsset, orderQuantity);
        }

        const order: Order = {
            price: orderPrice,
            quantity: orderQuantity,
            orderId: randomId(),
            filled: 0,
            side,
            userId
        };

        const { fills, executedQty } = orderbook.addOrder(order);
        this.settle(orderbook, order, fills);

        this.pushDbUpdates(order, fills, market);
        this.publishDepth(orderbook, fills.map(f => f.price), [price], side);
        this.publishTrades(fills, order, market);
        return { executedQty, fills, orderId: order.orderId };
    }

    private cancelOrder(orderId: string, market: string, userId: string): MessageToApi {
        const orderbook = this.getOrderbook(market);
        const order = orderbook.findOrder(orderId);
        if (!order) {
            throw new Error("No order found");
        }
        if (order.userId !== userId) {
            throw new Error("Order does not belong to user");
        }

        const remainingQty = order.quantity - order.filled;
        orderbook.cancel(order);

        if (order.side === "buy") {
            this.balances.unlock(userId, orderbook.quoteAsset, remainingQty * order.price);
        } else {
            this.balances.unlock(userId, orderbook.baseAsset, remainingQty);
        }

        this.publishDepthAt(orderbook, order.price.toString(), order.side);
        RedisManager.getInstance().pushMessage({ type: ORDER_CANCELLED, data: { orderId } });

        return { type: "ORDER_CANCELLED", payload: { orderId, executedQty: order.filled, remainingQty } };
    }

    // -------------------------------------------------------------- balances

    /** Moves funds between the taker and each maker for every fill. Trades happen at the maker's price. */
    private settle(orderbook: Orderbook, taker: Order, fills: Fill[]) {
        const { baseAsset, quoteAsset } = orderbook;

        for (const fill of fills) {
            const maker = fill.otherUserId;
            const quoteAmount = fill.qty * Number(fill.price);

            if (taker.side === "buy") {
                this.balances.spendLocked(taker.userId, quoteAsset, quoteAmount);
                // the taker locked funds at its limit price but paid the (better) maker price
                this.balances.unlock(taker.userId, quoteAsset, fill.qty * (taker.price - Number(fill.price)));
                this.balances.credit(taker.userId, baseAsset, fill.qty);

                this.balances.spendLocked(maker, baseAsset, fill.qty);
                this.balances.credit(maker, quoteAsset, quoteAmount);
            } else {
                this.balances.spendLocked(taker.userId, baseAsset, fill.qty);
                this.balances.credit(taker.userId, quoteAsset, quoteAmount);

                this.balances.spendLocked(maker, quoteAsset, quoteAmount);
                this.balances.credit(maker, baseAsset, fill.qty);
            }
        }
    }

    private onRamp(userId: string, asset: string, amount: string): MessageToApi {
        if (!ALL_ASSETS.includes(asset)) {
            throw new Error(`Unsupported asset ${asset}`);
        }
        this.balances.deposit(userId, asset, parsePositive(amount, "amount"));
        return { type: "BALANCES", payload: this.balances.get(userId) };
    }

    // ------------------------------------------------------------- publishing

    private pushDbUpdates(order: Order, fills: Fill[], market: string) {
        const redis = RedisManager.getInstance();

        redis.pushMessage({
            type: ORDER_UPDATE,
            data: {
                orderId: order.orderId,
                executedQty: order.filled,
                market,
                price: order.price.toString(),
                quantity: order.quantity.toString(),
                side: order.side,
                userId: order.userId
            }
        });

        fills.forEach(fill => {
            redis.pushMessage({
                type: ORDER_UPDATE,
                data: { orderId: fill.markerOrderId, executedQty: fill.qty }
            });
            redis.pushMessage({
                type: TRADE_ADDED,
                data: {
                    market,
                    id: fill.tradeId.toString(),
                    isBuyerMaker: order.side === "sell", // the maker was the buyer when the taker sold
                    price: fill.price,
                    quantity: fill.qty.toString(),
                    quoteQuantity: (fill.qty * Number(fill.price)).toString(),
                    timestamp: Date.now()
                }
            });
        });
    }

    private publishTrades(fills: Fill[], taker: Order, market: string) {
        fills.forEach(fill => {
            RedisManager.getInstance().publishMessage(`trade@${market}`, {
                stream: `trade@${market}`,
                data: {
                    e: "trade",
                    t: fill.tradeId,
                    m: taker.side === "sell",
                    p: fill.price,
                    q: fill.qty.toString(),
                    s: market,
                }
            });
        });
    }

    /**
     * Publishes the new quantity at every price level an order touched.
     * `fillPrices` are on the opposite side of the taker, `orderPrices` on the taker's own side.
     */
    private publishDepth(orderbook: Orderbook, fillPrices: string[], orderPrices: string[], takerSide: "buy" | "sell") {
        const askPrices = takerSide === "buy" ? fillPrices : orderPrices;
        const bidPrices = takerSide === "buy" ? orderPrices : fillPrices;
        const depth = orderbook.getDepth();
        const levels = (side: [string, string][], prices: string[]): [string, string][] =>
            [...new Set(prices.map(p => Number(p).toString()))]
                .map(price => side.find(level => level[0] === price) ?? [price, "0"]);

        const market = orderbook.ticker();
        RedisManager.getInstance().publishMessage(`depth@${market}`, {
            stream: `depth@${market}`,
            data: { a: levels(depth.asks, askPrices), b: levels(depth.bids, bidPrices), e: "depth" }
        });
    }

    private publishDepthAt(orderbook: Orderbook, price: string, side: "buy" | "sell") {
        this.publishDepth(orderbook, [], [price], side);
    }
}
