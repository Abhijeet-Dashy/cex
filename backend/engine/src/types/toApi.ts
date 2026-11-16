import { type Order } from "../trade/Orderbook.js";
import { type UserBalance } from "../trade/Balances.js";

// Keep in sync with api/src/types/index.ts
export type MessageToApi = {
    type: "DEPTH",
    payload: {
        bids: [string, string][],
        asks: [string, string][]
    }
} | {
    type: "ORDER_PLACED",
    payload: {
        orderId: string,
        executedQty: number,
        fills: {
            price: string,
            qty: number,
            tradeId: number
        }[]
    }
} | {
    type: "ORDER_CANCELLED",
    payload: {
        orderId: string,
        executedQty: number,
        remainingQty: number
    }
} | {
    type: "OPEN_ORDERS",
    payload: Order[]
} | {
    type: "BALANCES",
    payload: UserBalance
} | {
    type: "ERROR",
    payload: {
        message: string
    }
};
