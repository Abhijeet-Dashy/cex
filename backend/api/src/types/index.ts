export const CREATE_ORDER = "CREATE_ORDER";
export const CANCEL_ORDER = "CANCEL_ORDER";
export const ON_RAMP = "ON_RAMP";
export const REGISTER_USER = "REGISTER_USER";
export const GET_BALANCES = "GET_BALANCES";
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS";
export const GET_DEPTH = "GET_DEPTH";

export type OpenOrder = {
    orderId: string,
    filled: number,
    price: number,
    quantity: number,
    side: "buy" | "sell",
    userId: string
};

export type Balances = Record<string, { available: number, locked: number }>;

// Keep in sync with engine/src/types/toApi.ts
export type MessageFromOrderbook = {
    type: "DEPTH",
    payload: {
        bids: [string, string][],
        asks: [string, string][],
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
    payload: OpenOrder[]
} | {
    type: "BALANCES",
    payload: Balances
} | {
    type: "ERROR",
    payload: {
        message: string
    }
};
