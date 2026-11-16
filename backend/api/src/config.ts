import "dotenv/config";

const required = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable ${name}`);
    }
    return value;
};

export const config = {
    port: Number(process.env.PORT ?? 8081),
    jwtSecret: required("JWT_SECRET"),
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    // TimescaleDB with the trades / orders tables written by the db service
    marketDbUrl: process.env.MARKET_DB_URL ?? "postgres://your_user:your_password@localhost:5432/my_database",
    engineTimeoutMs: Number(process.env.ENGINE_TIMEOUT_MS ?? 5000),
};
