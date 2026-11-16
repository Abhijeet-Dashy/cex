import { CANCEL_ORDER, CREATE_ORDER, GET_BALANCES, GET_DEPTH, GET_OPEN_ORDERS, ON_RAMP, REGISTER_USER } from "./index.ts";

// Keep in sync with engine/src/types/fromApi.ts
export type MessageToEngine = {
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
