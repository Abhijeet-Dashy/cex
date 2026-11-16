import { useMemo } from "react";
import { cn, formatNumber } from "@/lib/utils";
import { useStore, type OrderbookRow } from "@/store/useStore";

const Row = ({ type, row, maxTotal }: { type: "bid" | "ask", row: OrderbookRow, maxTotal: number }) => {
    const selectPrice = useStore((state) => state.selectPrice);

    return (
        <button
            type="button"
            onClick={() => selectPrice(row.price)}
            className="relative flex w-full items-center py-0.5 text-xs hover:bg-muted/50"
        >
            <div
                className={cn("absolute inset-y-0 right-0", type === "bid" ? "bg-bid/15" : "bg-ask/15")}
                style={{ width: `${maxTotal ? (row.total / maxTotal) * 100 : 0}%` }}
            />
            <span className={cn("relative z-10 flex-1 pr-3 text-right", type === "bid" ? "text-bid" : "text-ask")}>{formatNumber(row.price)}</span>
            <span className="relative z-10 flex-1 pr-3 text-right">{formatNumber(row.quantity, 3)}</span>
            <span className="relative z-10 flex-1 pr-3 text-right text-muted-foreground">{formatNumber(row.total, 3)}</span>
        </button>
    );
};

export const Orderbook = () => {
    const { bids, asks, ticker } = useStore();

    const maxTotal = useMemo(
        () => Math.max(bids.at(-1)?.total ?? 0, asks.at(-1)?.total ?? 0),
        [bids, asks]
    );
    const spread = bids[0] && asks[0] ? Number(asks[0].price) - Number(bids[0].price) : null;

    return (
        <div className="flex h-full w-72 shrink-0 flex-col border-r bg-card">
            <div className="border-b p-3 text-sm font-semibold">Order book</div>
            <div className="flex p-2 pb-1 text-xs text-muted-foreground">
                <div className="flex-1 pr-3 text-right">Price</div>
                <div className="flex-1 pr-3 text-right">Size</div>
                <div className="flex-1 pr-3 text-right">Total</div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
                    {[...asks].reverse().map((ask) => <Row key={ask.price} type="ask" row={ask} maxTotal={maxTotal} />)}
                </div>

                <div className="flex items-baseline justify-between border-y bg-background/50 px-3 py-2">
                    <span className="text-lg font-bold">{formatNumber(ticker?.last)}</span>
                    <span className="text-xs text-muted-foreground">Spread {spread === null ? "---" : formatNumber(spread)}</span>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                    {bids.map((bid) => <Row key={bid.price} type="bid" row={bid} maxTotal={maxTotal} />)}
                </div>
            </div>
        </div>
    );
};
