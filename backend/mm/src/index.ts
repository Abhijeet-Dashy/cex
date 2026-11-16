import axios, { type AxiosInstance } from "axios";

const BASE_URL = process.env.API_URL ?? "http://localhost:8081";
const EMAIL = process.env.MM_EMAIL ?? "market-maker@exchange.local";
const PASSWORD = process.env.MM_PASSWORD ?? "market-maker-password";

const MARKET = "TATA_INR";
const BASE_ASSET = "TATA";
const QUOTE_ASSET = "INR";
const TOTAL_BIDS = 15;
const TOTAL_ASKS = 15;
const LOOP_DELAY_MS = 1000;
const STARTING_FUNDS = 10_000_000;

type OpenOrder = { orderId: string, price: number, side: "buy" | "sell" };

/** Logs in (registering the market maker account on first run) and returns an authorised client. */
async function connect(): Promise<AxiosInstance> {
    const credentials = { email: EMAIL, password: PASSWORD };
    const auth = axios.create({ baseURL: BASE_URL, validateStatus: () => true });

    let response = await auth.post("/api/auth/login", credentials);
    if (response.status === 401) {
        response = await auth.post("/api/auth/register", credentials);
    }
    if (!response.data.token) {
        throw new Error(`Could not authenticate market maker: ${JSON.stringify(response.data)}`);
    }
    return axios.create({ baseURL: BASE_URL, headers: { Authorization: `Bearer ${response.data.token}` } });
}

/** Tops up the market maker's simulated wallet so it always has something to quote with. */
async function ensureFunds(api: AxiosInstance) {
    const { data: balances } = await api.get("/api/v1/wallet");
    for (const asset of [QUOTE_ASSET, BASE_ASSET]) {
        const total = (balances[asset]?.available ?? 0) + (balances[asset]?.locked ?? 0);
        if (total < STARTING_FUNDS / 10) {
            await api.post("/api/v1/wallet/deposit", { asset, amount: STARTING_FUNDS });
        }
    }
}

async function cancelOrders(api: AxiosInstance, orders: OpenOrder[]) {
    await Promise.all(orders.map(o => api.delete("/api/v1/order", { data: { orderId: o.orderId, market: MARKET } })));
    return orders.length;
}

async function placeOrder(api: AxiosInstance, side: "buy" | "sell", price: number) {
    await api.post("/api/v1/order", { market: MARKET, price: price.toFixed(1), quantity: "1", side });
}

async function quote(api: AxiosInstance) {
    const price = 1000 + Math.random() * 10;
    const { data: openOrders } = await api.get<OpenOrder[]>("/api/v1/order/open", { params: { market: MARKET } });

    const bids = openOrders.filter(o => o.side === "buy");
    const asks = openOrders.filter(o => o.side === "sell");

    // pull orders that drifted away from the current price, plus a few at random so the book keeps moving
    const staleBids = bids.filter(o => o.price > price || Math.random() < 0.1);
    const staleAsks = asks.filter(o => o.price < price || Math.random() < 0.5);
    await cancelOrders(api, [...staleBids, ...staleAsks]);

    let bidsToAdd = TOTAL_BIDS - bids.length + staleBids.length;
    let asksToAdd = TOTAL_ASKS - asks.length + staleAsks.length;

    while (bidsToAdd > 0 || asksToAdd > 0) {
        if (bidsToAdd-- > 0) {
            await placeOrder(api, "buy", price - Math.random());
        }
        if (asksToAdd-- > 0) {
            await placeOrder(api, "sell", price + Math.random());
        }
    }
}

async function main() {
    const api = await connect();
    await ensureFunds(api);

    while (true) {
        try {
            await quote(api);
        } catch (e) {
            console.error("Market maker iteration failed", e instanceof Error ? e.message : e);
        }
        await new Promise(resolve => setTimeout(resolve, LOOP_DELAY_MS));
    }
}

main();
