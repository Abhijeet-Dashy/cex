import { BASE_CURRENCY } from "./constants.js";

export interface Order {
    price: number;
    quantity: number;
    orderId: string;
    filled: number;
    side: "buy" | "sell";
    userId: string;
}

export interface Fill {
    price: string;
    qty: number;
    tradeId: number;
    otherUserId: string;
    markerOrderId: string;
}

const remaining = (order: Order) => order.quantity - order.filled;

export class Orderbook {
    bids: Order[];
    asks: Order[];
    baseAsset: string;
    quoteAsset: string = BASE_CURRENCY;
    lastTradeId: number;
    currentPrice: number;

    constructor(baseAsset: string, bids: Order[], asks: Order[], lastTradeId: number, currentPrice: number) {
        this.bids = bids;
        this.asks = asks;
        this.baseAsset = baseAsset;
        this.lastTradeId = lastTradeId || 0;
        this.currentPrice = currentPrice || 0;
    }

    ticker() {
        return `${this.baseAsset}_${this.quoteAsset}`;
    }

    getSnapshot() {
        return {
            baseAsset: this.baseAsset,
            bids: this.bids,
            asks: this.asks,
            lastTradeId: this.lastTradeId,
            currentPrice: this.currentPrice
        };
    }

    /** Matches the order against the book and rests whatever is left. */
    addOrder(order: Order): { executedQty: number, fills: Fill[] } {
        const fills = order.side === "buy" ? this.matchBid(order) : this.matchAsk(order);
        const executedQty = fills.reduce((sum, fill) => sum + fill.qty, 0);
        order.filled = executedQty;

        if (executedQty < order.quantity) {
            (order.side === "buy" ? this.bids : this.asks).push(order);
        }
        return { executedQty, fills };
    }

    /** A buy order takes the cheapest asks first. */
    private matchBid(order: Order): Fill[] {
        this.asks.sort((a, b) => a.price - b.price);
        const fills = this.match(order, this.asks, (askPrice) => askPrice <= order.price);
        this.asks = this.asks.filter(o => remaining(o) > 0);
        return fills;
    }

    /** A sell order takes the highest bids first. */
    private matchAsk(order: Order): Fill[] {
        this.bids.sort((a, b) => b.price - a.price);
        const fills = this.match(order, this.bids, (bidPrice) => bidPrice >= order.price);
        this.bids = this.bids.filter(o => remaining(o) > 0);
        return fills;
    }

    /** `book` must be sorted best price first. Trades happen at the resting order's price. */
    private match(order: Order, book: Order[], crosses: (restingPrice: number) => boolean): Fill[] {
        const fills: Fill[] = [];
        let executedQty = 0;

        for (const resting of book) {
            if (executedQty >= order.quantity || !crosses(resting.price)) {
                break;
            }
            if (resting.userId === order.userId) {
                continue; // self-trade prevention
            }
            const qty = Math.min(order.quantity - executedQty, remaining(resting));
            executedQty += qty;
            resting.filled += qty;
            this.currentPrice = resting.price;
            fills.push({
                price: resting.price.toString(),
                qty,
                tradeId: ++this.lastTradeId,
                otherUserId: resting.userId,
                markerOrderId: resting.orderId
            });
        }
        return fills;
    }

    /** Aggregated open quantity per price level, best price first. */
    getDepth() {
        return {
            bids: this.aggregate(this.bids, (a, b) => b - a),
            asks: this.aggregate(this.asks, (a, b) => a - b)
        };
    }

    private aggregate(orders: Order[], byPrice: (a: number, b: number) => number): [string, string][] {
        const levels = new Map<number, number>();
        for (const order of orders) {
            levels.set(order.price, (levels.get(order.price) ?? 0) + remaining(order));
        }
        return [...levels.entries()]
            .sort(([a], [b]) => byPrice(a, b))
            .map(([price, qty]) => [price.toString(), qty.toString()]);
    }

    findOrder(orderId: string): Order | undefined {
        return this.bids.find(o => o.orderId === orderId) ?? this.asks.find(o => o.orderId === orderId);
    }

    getOpenOrders(userId: string): Order[] {
        return [...this.asks, ...this.bids].filter(o => o.userId === userId);
    }

    /** Removes the order from the book. */
    cancel(order: Order) {
        if (order.side === "buy") {
            this.bids = this.bids.filter(o => o.orderId !== order.orderId);
        } else {
            this.asks = this.asks.filter(o => o.orderId !== order.orderId);
        }
    }
}
