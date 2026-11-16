import { Router } from "express";
import { engine } from "../services/engine.service.ts";
import { requireMarket } from "../validation.ts";

export const depthRouter = Router();

depthRouter.get("/", async (req, res) => {
    res.json(await engine.getDepth(requireMarket(req.query.symbol)));
});
