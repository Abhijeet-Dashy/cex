import { pool } from "./config";

const REFRESH_INTERVAL_MS = 10 * 1000;

async function refreshViews() {
    await pool.query("REFRESH MATERIALIZED VIEW klines_1m");
    await pool.query("REFRESH MATERIALIZED VIEW klines_1h");
    await pool.query("REFRESH MATERIALIZED VIEW klines_1w");
}

async function tick() {
    try {
        await refreshViews();
        console.log("Materialized views refreshed successfully");
    } catch (e) {
        console.error("Failed to refresh views", e);
    }
}

tick();
setInterval(tick, REFRESH_INTERVAL_MS);
