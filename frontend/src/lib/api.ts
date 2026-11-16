import { useAuth } from "@/store/useAuth";
import type {
    Balances, Depth, Kline, KlineInterval, OpenOrder, OrderHistoryItem, OrderResult, TickerResponse, Trade
} from "@/types";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8081";
export const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080";

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

async function request<T>(path: string, options: { method?: string, body?: unknown, query?: Record<string, string | number | undefined> } = {}): Promise<T> {
    const url = new URL(path, API_URL);
    Object.entries(options.query ?? {}).forEach(([key, value]) => value !== undefined && url.searchParams.set(key, String(value)));

    const token = useAuth.getState().token;
    let response: Response;
    try {
        response = await fetch(url, {
            method: options.method ?? "GET",
            headers: {
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: options.body ? JSON.stringify(options.body) : null,
        });
    } catch {
        throw new ApiError(0, "Cannot reach the exchange server");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        // an expired or invalid token logs the user out
        if (response.status === 401 && token) {
            useAuth.getState().logout();
        }
        throw new ApiError(response.status, data.error ?? `Request failed (${response.status})`);
    }
    return data as T;
}

export const api = {
    // account
    register: (email: string, password: string) =>
        request<{ token: string }>("/api/auth/register", { method: "POST", body: { email, password } }),
    login: (email: string, password: string) =>
        request<{ token: string }>("/api/auth/login", { method: "POST", body: { email, password } }),

    // wallet
    getBalances: () => request<Balances>("/api/v1/wallet"),
    deposit: (asset: string, amount: string) =>
        request<Balances>("/api/v1/wallet/deposit", { method: "POST", body: { asset, amount } }),

    // orders
    placeOrder: (market: string, side: "buy" | "sell", price: string, quantity: string) =>
        request<OrderResult>("/api/v1/order", { method: "POST", body: { market, side, price, quantity } }),
    cancelOrder: (market: string, orderId: string) =>
        request<unknown>("/api/v1/order", { method: "DELETE", body: { market, orderId } }),
    getOpenOrders: (market: string) => request<OpenOrder[]>("/api/v1/order/open", { query: { market } }),
    getOrderHistory: (market: string) => request<OrderHistoryItem[]>("/api/v1/order/history", { query: { market } }),

    // market data
    getDepth: (market: string) => request<Depth>("/api/v1/depth", { query: { symbol: market } }),
    getTrades: (market: string) => request<Trade[]>("/api/v1/trades", { query: { symbol: market } }),
    getKlines: (market: string, interval: KlineInterval) =>
        request<Kline[]>("/api/v1/klines", { query: { symbol: market, interval } }),
    getTicker: (market: string) => request<TickerResponse[]>("/api/v1/tickers", { query: { symbol: market } }),
};
