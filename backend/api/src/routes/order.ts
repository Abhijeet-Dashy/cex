import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.ts";
import { engine } from "../services/engine.service.ts";
import { marketRepository } from "../services/market.repository.ts";
import { requireMarket, requirePositiveNumber, requireSide, requireString } from "../validation.ts";

export const orderRouter = Router();

orderRouter.use(authenticate);

// place an order
orderRouter.post("/", async (req, res) => {
    const market = requireMarket(req.body.market);
    const price = requirePositiveNumber(req.body.price, "price");
    const quantity = requirePositiveNumber(req.body.quantity, "quantity");
    const side = requireSide(req.body.side);

    res.json(await engine.createOrder(req.userId!, market, price, quantity, side));
});

// cancel one of the user's orders
orderRouter.delete("/", async (req, res) => {
    const market = requireMarket(req.body.market);
    const orderId = requireString(req.body.orderId, "orderId");

    res.json(await engine.cancelOrder(req.userId!, market, orderId));
});

// the user's orders that are still on the book
orderRouter.get("/open", async (req, res) => {
    const market = requireMarket(req.query.market);

    res.json(await engine.getOpenOrders(req.userId!, market));
});

// all of the user's past orders
orderRouter.get("/history", async (req, res) => {
    const market = req.query.market === undefined ? undefined : requireMarket(req.query.market);
    const limit = Math.min(Number(req.query.limit) || 50, 500);

    res.json(await marketRepository.getOrderHistory(req.userId!, market, limit));
});
