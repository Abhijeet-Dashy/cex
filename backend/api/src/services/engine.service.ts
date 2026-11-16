import { RedisManager } from "../RedisManager.ts";
import { HttpError } from "../errors.ts";
import {
    CANCEL_ORDER, CREATE_ORDER, GET_BALANCES, GET_DEPTH, GET_OPEN_ORDERS, ON_RAMP, REGISTER_USER,
    type MessageFromOrderbook
} from "../types/index.ts";
import { type MessageToEngine } from "../types/to.ts";

type Reply<T extends MessageFromOrderbook["type"]> = Extract<MessageFromOrderbook, { type: T }>["payload"];

/** Sends a request to the engine and returns the payload, turning engine errors into HTTP 400s. */
async function request<T extends MessageFromOrderbook["type"]>(message: MessageToEngine, expected: T): Promise<Reply<T>> {
    const response = await RedisManager.getInstance().sendAndAwait(message);
    if (response.type === "ERROR") {
        throw new HttpError(400, response.payload.message);
    }
    if (response.type !== expected) {
        throw new HttpError(502, "Unexpected response from exchange engine");
    }
    return response.payload as Reply<T>;
}

export const engine = {
    registerUser: (userId: string) =>
        request({ type: REGISTER_USER, data: { userId } }, "BALANCES"),

    getBalances: (userId: string) =>
        request({ type: GET_BALANCES, data: { userId } }, "BALANCES"),

    deposit: (userId: string, asset: string, amount: string) =>
        request({ type: ON_RAMP, data: { userId, asset, amount } }, "BALANCES"),

    createOrder: (userId: string, market: string, price: string, quantity: string, side: "buy" | "sell") =>
        request({ type: CREATE_ORDER, data: { userId, market, price, quantity, side } }, "ORDER_PLACED"),

    cancelOrder: (userId: string, market: string, orderId: string) =>
        request({ type: CANCEL_ORDER, data: { userId, market, orderId } }, "ORDER_CANCELLED"),

    getOpenOrders: (userId: string, market: string) =>
        request({ type: GET_OPEN_ORDERS, data: { userId, market } }, "OPEN_ORDERS"),

    getDepth: (market: string) =>
        request({ type: GET_DEPTH, data: { market } }, "DEPTH"),
};
