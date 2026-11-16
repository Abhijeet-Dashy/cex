import { type RedisClientType, createClient } from "redis";
import { type ORDER_CANCELLED, type ORDER_UPDATE, type TRADE_ADDED } from "./types/index.js";
import { type WsMessage } from "./types/toWs.js";
import { type MessageToApi } from "./types/toApi.js";

/** Messages consumed by the db service. Keep in sync with db/src/types.ts */
export type DbMessage = {
    type: typeof TRADE_ADDED,
    data: {
        id: string,
        isBuyerMaker: boolean,
        price: string,
        quantity: string,
        quoteQuantity: string,
        timestamp: number,
        market: string
    }
} | {
    type: typeof ORDER_UPDATE,
    data: {
        orderId: string,
        executedQty: number,
        market?: string,
        price?: string,
        quantity?: string,
        side?: "buy" | "sell",
        userId?: string
    }
} | {
    type: typeof ORDER_CANCELLED,
    data: {
        orderId: string
    }
};

export const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export class RedisManager {
    private client: RedisClientType;
    private static instance: RedisManager;

    private constructor() {
        this.client = createClient({ url: REDIS_URL });
        this.client.on("error", (err) => console.error("Redis error", err));
        this.client.connect();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new RedisManager();
        }
        return this.instance;
    }

    /** Queue consumed by the db service. */
    public pushMessage(message: DbMessage) {
        return this.client.lPush("db_processor", JSON.stringify(message));
    }

    /** Pub/sub consumed by the ws service. */
    public publishMessage(channel: string, message: WsMessage) {
        return this.client.publish(channel, JSON.stringify(message));
    }

    /** Reply to the api request that is waiting on `clientId`. */
    public sendToApi(clientId: string, message: MessageToApi) {
        return this.client.publish(clientId, JSON.stringify(message));
    }
}
