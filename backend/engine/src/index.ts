import { createClient } from "redis";
import { Engine } from "./trade/Engine.js";
import { REDIS_URL } from "./RedisManager.js";

async function main() {
    const engine = new Engine();
    const redisClient = createClient({ url: REDIS_URL });
    redisClient.on("error", (err) => console.error("Redis error", err));
    await redisClient.connect();
    console.log("connected to redis");

    const shutdown = () => {
        engine.saveSnapshot();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    while (true) {
        try {
            const response = await redisClient.brPop("messages", 0);
            if (response) {
                engine.process(JSON.parse(response.element));
            }
        } catch (e) {
            console.error("Failed to process message", e);
        }
    }
}

main();
