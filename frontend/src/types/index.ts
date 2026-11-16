// ---- WebSocket messages (see backend/engine/src/types/toWs.ts and backend/db/src/types.ts)

export type TickerUpdateMessage = {
    stream: string,
    data: {
        c?: string,
        h?: string,
        l?: string,
        v?: string,
        V?: string,
        s?: string,
        id: number,
        e: "ticker"
    }
}

export type DepthUpdateMessage = {
    stream: string,
    data: {
        b?: [string, string][],
        a?: [string, string][],
        e: "depth"
    }
}

export type TradeAddedMessage = {
    stream: string,
    data: {
        e: "trade",
        t: number,
        m: boolean,
        p: string,
        q: string,
        s: string, // symbol
    }
}

export type WsMessage = TickerUpdateMessage | DepthUpdateMessage | TradeAddedMessage;

// ---- REST responses (see backend/api/src/routes)

export type Balances = Record<string, { available: number, locked: number }>;

export type OpenOrder = {
    orderId: string,
    price: number,
    quantity: number,
    filled: number,
    side: "buy" | "sell",
    userId: string
}

export type OrderHistoryItem = {
    orderId: string,
    market: string,
    side: "buy" | "sell",
    price: string,
    quantity: string,
    executedQty: string,
    status: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED",
    createdAt: number
}

export type Trade = {
    id: number,
    price: string,
    quantity: string,
    timestamp: number,
    isBuyerMaker: boolean
}

export type Kline = {
    start: number,
    end: number,
    open: string,
    high: string,
    low: string,
    close: string,
    volume: string
}

export type KlineInterval = "1m" | "1h" | "1w";

export type TickerResponse = {
    symbol: string,
    firstPrice: string,
    lastPrice: string,
    high: string,
    low: string,
    volume: string,
    quoteVolume: string
}

export type Depth = {
    bids: [string, string][],
    asks: [string, string][]
}

export type OrderResult = {
    orderId: string,
    executedQty: number,
    fills: { price: string, qty: number, tradeId: number }[]
}
