import { RedisClientType, createClient } from "redis";
import { UserManager } from "./UserManager";

/**
 * Keeps one Redis subscription per stream and fans each message out to every user subscribed to it.
 */
export class SubscriptionManager {
    private static instance: SubscriptionManager;
    private subscriptions: Map<string, Set<string>> = new Map();        // userId -> streams
    private reverseSubscriptions: Map<string, Set<string>> = new Map(); // stream -> userIds
    private redisClient: RedisClientType;

    private constructor() {
        this.redisClient = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
        this.redisClient.on("error", (err) => console.error("Redis error", err));
        this.redisClient.connect();
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }

    public subscribe(userId: string, stream: string) {
        const userStreams = this.subscriptions.get(userId) ?? new Set();
        if (userStreams.has(stream)) {
            return;
        }
        userStreams.add(stream);
        this.subscriptions.set(userId, userStreams);

        const subscribers = this.reverseSubscriptions.get(stream) ?? new Set();
        subscribers.add(userId);
        this.reverseSubscriptions.set(stream, subscribers);

        // first subscriber of this stream: start listening on redis
        if (subscribers.size === 1) {
            this.redisClient.subscribe(stream, this.redisCallbackHandler);
        }
    }

    public unsubscribe(userId: string, stream: string) {
        this.subscriptions.get(userId)?.delete(stream);

        const subscribers = this.reverseSubscriptions.get(stream);
        if (!subscribers) {
            return;
        }
        subscribers.delete(userId);

        // last subscriber left: stop listening on redis
        if (subscribers.size === 0) {
            this.reverseSubscriptions.delete(stream);
            this.redisClient.unsubscribe(stream);
        }
    }

    public userLeft(userId: string) {
        console.log("user left " + userId);
        [...(this.subscriptions.get(userId) ?? [])].forEach(stream => this.unsubscribe(userId, stream));
        this.subscriptions.delete(userId);
    }

    private redisCallbackHandler = (message: string, channel: string) => {
        const parsedMessage = JSON.parse(message);
        this.reverseSubscriptions.get(channel)?.forEach(userId =>
            UserManager.getInstance().getUser(userId)?.emit(parsedMessage)
        );
    };
}
