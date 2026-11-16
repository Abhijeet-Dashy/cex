import { type RedisClientType, createClient } from "redis";
import { config } from "./config.ts";
import { HttpError } from "./errors.ts";
import { type MessageFromOrderbook } from "./types/index.ts";
import { type MessageToEngine } from "./types/to.ts";

const createConnectedClient = (): RedisClientType => {
    const client: RedisClientType = createClient({ url: config.redisUrl });
    client.on("error", (err) => console.error("Redis error", err));
    client.connect();
    return client;
};

/**
 * Request/response over redis: the request goes on the "messages" queue and the engine
 * publishes its answer on a channel that only this request listens to.
 */
export class RedisManager {
    private client: RedisClientType;
    private publisher: RedisClientType;
    private static instance: RedisManager;

    private constructor() {
        this.client = createConnectedClient();
        this.publisher = createConnectedClient();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new RedisManager();
        }
        return this.instance;
    }

    public async sendAndAwait(message: MessageToEngine): Promise<MessageFromOrderbook> {
        const id = this.getRandomClientId();

        return new Promise<MessageFromOrderbook>(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                this.client.unsubscribe(id);
                reject(new HttpError(504, "Exchange engine did not respond in time"));
            }, config.engineTimeoutMs);

            try {
                // subscribe before queueing the request so the reply can never be missed
                await this.client.subscribe(id, (reply) => {
                    clearTimeout(timeout);
                    this.client.unsubscribe(id);
                    resolve(JSON.parse(reply));
                });
                await this.publisher.lPush("messages", JSON.stringify({ clientId: id, message }));
            } catch (e) {
                clearTimeout(timeout);
                reject(e);
            }
        });
    }

    public getRandomClientId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}
