// Keep in sync with engine/src/RedisManager.ts
export type DbMessage = {
    type: "TRADE_ADDED",
    data: {
        id: string,
        isBuyerMaker: boolean,
        price: string,
        quantity: string,
        quoteQuantity: string,
        timestamp: number,
        market: string
    }
} | {
    type: "ORDER_UPDATE",
    data: {
        orderId: string,
        executedQty: number,
        market?: string,
        price?: string,
        quantity?: string,
        side?: "buy" | "sell",
        userId?: string
    }
} | {
    type: "ORDER_CANCELLED",
    data: {
        orderId: string
    }
};

/** Published to the ws service on `ticker@<market>`. */
export type TickerUpdate = {
    stream: string,
    data: {
        c: string,
        h: string,
        l: string,
        v: string,
        V: string,
        s: string,
        id: number,
        e: "ticker"
    }
};
