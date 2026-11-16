import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./modules/auth/auth.routes.ts";
import userRoutes from "./modules/users/user.routes.ts";
import { orderRouter } from "./routes/order.ts";
import { walletRouter } from "./routes/wallet.ts";
import { depthRouter } from "./routes/depth.ts";
import { tradesRouter } from "./routes/trades.ts";
import { klineRouter } from "./routes/kline.ts";
import { tickersRouter } from "./routes/ticker.ts";
import { errorHandler, notFound } from "./errors.ts";

const app: Application = express();

app.use(helmet()); // secures HTTP headers
app.use(cors()); // allows the frontend to talk to the backend
app.use(express.json()); // parses incoming JSON payloads

// Account
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Trading (requires login)
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/wallet", walletRouter);

// Market data (public)
app.use("/api/v1/depth", depthRouter);
app.use("/api/v1/trades", tradesRouter);
app.use("/api/v1/klines", klineRouter);
app.use("/api/v1/tickers", tickersRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", message: "Exchange API is running" });
});

app.use(notFound);
app.use(errorHandler);

export default app;
