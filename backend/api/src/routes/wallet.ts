import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { engine } from "../services/engine.service.ts";
import { requirePositiveNumber, requireString } from "../validation.ts";

export const walletRouter = Router();

walletRouter.use(authenticate);

// available and locked balance per asset
walletRouter.get("/", async (req, res) => {
    res.json(await engine.getBalances(req.userId!));
});

// Simulated deposit: credits funds without any real payment. Replace with a payment/blockchain
// integration before using real money.
walletRouter.post("/deposit", async (req, res) => {
    const asset = requireString(req.body.asset, "asset").toUpperCase();
    const amount = requirePositiveNumber(req.body.amount, "amount");

    res.json(await engine.deposit(req.userId!, asset, amount));
});
