import { Router } from "express";
import { marketRepository } from "../services/market.repository.ts";
import { requireMarket } from "../validation.ts";

export const tickersRouter = Router();

// rolling 24h stats, for every market or a single one with ?symbol=TATA_INR
tickersRouter.get("/", async (req, res) => {
    const market = req.query.symbol === undefined ? undefined : requireMarket(req.query.symbol);

    res.json(await marketRepository.getTickers(market));
});
