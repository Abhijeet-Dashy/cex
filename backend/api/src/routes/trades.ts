import { Router } from "express";
import { marketRepository } from "../services/market.repository.ts";
import { requireMarket } from "../validation.ts";

export const tradesRouter = Router();

// most recent trades of a market
tradesRouter.get("/", async (req, res) => {
    const market = requireMarket(req.query.symbol ?? req.query.market);
    const limit = Math.min(Number(req.query.limit) || 50, 500);

    res.json(await marketRepository.getTrades(market, limit));
});
