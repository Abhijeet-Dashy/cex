import { pool } from "./config";

const KLINE_INTERVALS: Record<string, string> = {
    klines_1m: "1 minute",
    klines_1h: "1 hour",
    klines_1w: "1 week",
};

/** Creates all tables and views. Safe to run repeatedly. */
async function initializeDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS trades (
            trade_id        BIGINT NOT NULL,
            market          VARCHAR(20) NOT NULL,
            time            TIMESTAMP WITH TIME ZONE NOT NULL,
            price           DOUBLE PRECISION NOT NULL,
            quantity        DOUBLE PRECISION NOT NULL,
            quote_quantity  DOUBLE PRECISION NOT NULL,
            is_buyer_maker  BOOLEAN NOT NULL
        );
    `);
    await pool.query(`SELECT create_hypertable('trades', 'time', if_not_exists => TRUE);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS trades_market_time_idx ON trades (market, time DESC);`);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            order_id      VARCHAR(40) PRIMARY KEY,
            user_id       VARCHAR(64) NOT NULL,
            market        VARCHAR(20) NOT NULL,
            side          VARCHAR(4) NOT NULL,
            price         DOUBLE PRECISION NOT NULL,
            quantity      DOUBLE PRECISION NOT NULL,
            executed_qty  DOUBLE PRECISION NOT NULL DEFAULT 0,
            cancelled     BOOLEAN NOT NULL DEFAULT FALSE,
            created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id, created_at DESC);`);

    for (const [view, interval] of Object.entries(KLINE_INTERVALS)) {
        await pool.query(`
            CREATE MATERIALIZED VIEW IF NOT EXISTS ${view} AS
            SELECT
                time_bucket('${interval}', time) AS bucket,
                market,
                first(price, time) AS open,
                max(price) AS high,
                min(price) AS low,
                last(price, time) AS close,
                sum(quantity) AS volume,
                sum(quote_quantity) AS quote_volume,
                count(*) AS trades
            FROM trades
            GROUP BY bucket, market;
        `);
    }
}

initializeDB()
    .then(() => console.log("Database initialized successfully"))
    .catch(console.error)
    .finally(() => pool.end());
