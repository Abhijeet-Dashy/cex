import { Pool } from "pg";

export const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const pool = new Pool({
    user: process.env.PG_USER ?? "your_user",
    host: process.env.PG_HOST ?? "localhost",
    database: process.env.PG_DATABASE ?? "my_database",
    password: process.env.PG_PASSWORD ?? "your_password",
    port: Number(process.env.PG_PORT ?? 5432),
});
