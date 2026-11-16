export const CREATE_ORDER = "CREATE_ORDER";
export const CANCEL_ORDER = "CANCEL_ORDER";
export const ON_RAMP = "ON_RAMP";
export const REGISTER_USER = "REGISTER_USER";
export const GET_BALANCES = "GET_BALANCES";
export const GET_DEPTH = "GET_DEPTH";
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS";

// Keep in sync with api/src/types/to.ts
export type MessageFromApi = {
    type: typeof CREATE_ORDER,
    data: {
        market: string,
        price: string,
        quantity: string,
        side: "buy" | "sell",
        userId: string
    }
} | {
    type: typeof CANCEL_ORDER,
    data: {
        orderId: string,
        market: string,
        userId: string
    }
} | {
    type: typeof ON_RAMP,
    data: {
        userId: string,
        asset: string,
        amount: string
    }
} | {
    type: typeof REGISTER_USER,
    data: {
        userId: string
    }
} | {
    type: typeof GET_BALANCES,
    data: {
        userId: string
    }
} | {
    type: typeof GET_DEPTH,
    data: {
        market: string
    }
} | {
    type: typeof GET_OPEN_ORDERS,
    data: {
        userId: string,
        market: string
    }
};
