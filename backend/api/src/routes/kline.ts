import { Router } from "express";
import { HttpError } from "../errors.ts";
import { isKlineInterval, marketRepository } from "../services/market.repository.ts";
import { requireMarket } from "../validation.ts";

export const klineRouter = Router();

const parseTime = (value: unknown, name: string): Date | undefined => {
    if (value === undefined) {
        return undefined;
    }
    const time = new Date(Number(value));
    if (Number.isNaN(time.getTime())) {
        throw new HttpError(400, `${name} must be a unix timestamp in milliseconds`);
    }
    return time;
};

// candles for a market, e.g. /klines?symbol=TATA_INR&interval=1m&startTime=...&endTime=...
klineRouter.get("/", async (req, res) => {
    const market = requireMarket(req.query.symbol ?? req.query.market);
    const interval = req.query.interval;
    if (!isKlineInterval(interval)) {
        throw new HttpError(400, "interval must be one of 1m, 1h, 1w");
    }

    res.json(await marketRepository.getKlines(
        market,
        interval,
        parseTime(req.query.startTime, "startTime"),
        parseTime(req.query.endTime, "endTime")
    ));
});
