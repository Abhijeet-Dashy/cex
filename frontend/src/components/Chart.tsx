import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, ColorType, createChart, type CandlestickData, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { api } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import type { Kline, KlineInterval } from "@/types";

const INTERVALS: { value: KlineInterval, label: string, seconds: number }[] = [
    { value: "1m", label: "1m", seconds: 60 },
    { value: "1h", label: "1H", seconds: 3600 },
    { value: "1w", label: "1W", seconds: 7 * 24 * 3600 },
];

const REFRESH_MS = 10_000; // the db service refreshes its candle views every 10s

const toCandle = (kline: Kline): CandlestickData => ({
    time: Math.floor(kline.start / 1000) as UTCTimestamp,
    open: Number(kline.open),
    high: Number(kline.high),
    low: Number(kline.low),
    close: Number(kline.close),
});

export const Chart = () => {
    const market = useStore((state) => state.market);
    const latestTrade = useStore((state) => state.trades[0]);
    const [interval, setInterval_] = useState<KlineInterval>("1m");

    const container = useRef<HTMLDivElement>(null);
    const series = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const lastCandle = useRef<CandlestickData | null>(null);

    // create the chart once
    useEffect(() => {
        if (!container.current) return;
        const chart = createChart(container.current, {
            autoSize: true,
            layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#94a3b8" },
            grid: { vertLines: { color: "#1e2733" }, horzLines: { color: "#1e2733" } },
            timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#1e2733" },
            rightPriceScale: { borderColor: "#1e2733" },
        });
        series.current = chart.addSeries(CandlestickSeries, {
            upColor: "#10b981", downColor: "#ef4444", wickUpColor: "#10b981", wickDownColor: "#ef4444", borderVisible: false,
        });
        return () => {
            chart.remove();
            series.current = null;
        };
    }, []);

    // load candles, then keep them fresh
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const klines = await api.getKlines(market, interval);
                if (cancelled || !series.current) return;
                const candles = klines.map(toCandle);
                series.current.setData(candles);
                lastCandle.current = candles.at(-1) ?? null;
            } catch (err) {
                console.error("Failed to load candles", err);
            }
        };
        load();
        const timer = globalThis.setInterval(load, REFRESH_MS);
        return () => {
            cancelled = true;
            globalThis.clearInterval(timer);
        };
    }, [market, interval]);

    // move the newest candle with every live trade (weekly candles are not aligned with the epoch, so skip them)
    useEffect(() => {
        const seconds = INTERVALS.find((i) => i.value === interval)!.seconds;
        if (!latestTrade || !series.current || interval === "1w") return;

        const price = Number(latestTrade.price);
        const time = (Math.floor(latestTrade.timestamp / 1000 / seconds) * seconds) as UTCTimestamp;
        const last = lastCandle.current;
        if (last && time < (last.time as number)) return;

        const candle: CandlestickData = last && last.time === time
            ? { ...last, high: Math.max(last.high, price), low: Math.min(last.low, price), close: price }
            : { time, open: price, high: price, low: price, close: price };
        lastCandle.current = candle;
        series.current.update(candle);
    }, [latestTrade, interval]);

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold">Price chart</div>
                <div className="flex gap-1">
                    {INTERVALS.map(({ value, label }) => (
                        <Button key={value} size="sm" variant={interval === value ? "secondary" : "ghost"} onClick={() => setInterval_(value)}>
                            {label}
                        </Button>
                    ))}
                </div>
            </div>
            <div ref={container} className="min-h-0 flex-1" />
        </div>
    );
};
