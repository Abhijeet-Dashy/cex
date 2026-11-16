import { create } from "zustand";
import { api } from "@/lib/api";
import type { DepthUpdateMessage, TickerResponse, TickerUpdateMessage, Trade, TradeAddedMessage } from "@/types";

export type OrderbookRow = {
    price: string;
    quantity: string;
    total: number;
}

export type Ticker = {
    last: string;
    high: string;
    low: string;
    volume: string;
    firstPrice: string | null;
}

const BOOK_DEPTH = 15;

/** Applies [price, quantity] updates to one side of the book (quantity 0 removes the level). */
function mergeLevels(rows: OrderbookRow[], updates: [string, string][], ascending: boolean): OrderbookRow[] {
    const levels = new Map(rows.map(row => [Number(row.price), row.quantity]));
    updates.forEach(([price, quantity]) => {
        if (Number(quantity) === 0) {
            levels.delete(Number(price));
        } else {
            levels.set(Number(price), quantity);
        }
    });
    return toRows([...levels.entries()].map(([price, quantity]) => [String(price), quantity]), ascending);
}

/** Sorts best price first and adds the cumulative total. */
function toRows(levels: [string, string][], ascending: boolean): OrderbookRow[] {
    let total = 0;
    return levels
        .sort(([a], [b]) => (ascending ? Number(a) - Number(b) : Number(b) - Number(a)))
        .slice(0, BOOK_DEPTH)
        .map(([price, quantity]) => {
            total += Number(quantity);
            return { price, quantity, total };
        });
}

interface StoreState {
    market: string;
    connected: boolean;
    setConnected: (connected: boolean) => void;

    ticker: Ticker | null;
    setTickerFromRest: (ticker: TickerResponse | undefined) => void;
    updateTicker: (data: TickerUpdateMessage["data"]) => void;

    bids: OrderbookRow[];
    asks: OrderbookRow[];
    setDepth: (bids: [string, string][], asks: [string, string][]) => void;
    updateOrderbook: (data: DepthUpdateMessage["data"]) => void;

    trades: Trade[];
    setTrades: (trades: Trade[]) => void;
    addTrade: (trade: TradeAddedMessage["data"]) => void;

    /** price clicked in the orderbook, picked up by the order form */
    selectedPrice: string | null;
    selectPrice: (price: string) => void;

    /** Loads depth, trades and ticker for the market. */
    loadSnapshot: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
    market: "TATA_INR",
    connected: false,
    setConnected: (connected) => set({ connected }),

    ticker: null,
    setTickerFromRest: (ticker) => set({
        ticker: ticker
            ? { last: ticker.lastPrice, high: ticker.high, low: ticker.low, volume: ticker.volume, firstPrice: ticker.firstPrice }
            : null,
    }),
    updateTicker: (data) => set((state) => ({
        ticker: {
            last: data.c ?? state.ticker?.last ?? "",
            high: data.h ?? state.ticker?.high ?? "",
            low: data.l ?? state.ticker?.low ?? "",
            volume: data.v ?? state.ticker?.volume ?? "",
            firstPrice: state.ticker?.firstPrice ?? data.c ?? null,
        },
    })),

    bids: [],
    asks: [],
    setDepth: (bids, asks) => set({ bids: toRows(bids, false), asks: toRows(asks, true) }),
    updateOrderbook: (data) => set((state) => ({
        bids: data.b ? mergeLevels(state.bids, data.b, false) : state.bids,
        asks: data.a ? mergeLevels(state.asks, data.a, true) : state.asks,
    })),

    trades: [],
    setTrades: (trades) => set({ trades }),
    addTrade: (trade) => set((state) => ({
        trades: [
            { id: trade.t, price: trade.p, quantity: trade.q, timestamp: Date.now(), isBuyerMaker: trade.m },
            ...state.trades,
        ].slice(0, 50),
    })),

    selectedPrice: null,
    selectPrice: (selectedPrice) => set({ selectedPrice }),

    loadSnapshot: async () => {
        const { market } = get();
        const [depth, trades, tickers] = await Promise.allSettled([
            api.getDepth(market), api.getTrades(market), api.getTicker(market),
        ]);
        if (depth.status === "fulfilled") get().setDepth(depth.value.bids, depth.value.asks);
        if (trades.status === "fulfilled") get().setTrades(trades.value);
        if (tickers.status === "fulfilled") get().setTickerFromRest(tickers.value[0]);
    },
}));
