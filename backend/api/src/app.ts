import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/auth.routes.ts';
import userRoutes from './modules/users/user.routes.ts';
import { orderRouter } from "./routes/order.ts";
import { depthRouter } from "./routes/depth.ts";
import { tradesRouter } from "./routes/trades.ts";
import { klineRouter } from "./routes/kline.ts";
import { tickersRouter } from "./routes/ticker.ts";

const app : Application = express();

// Middlewares
app.use(helmet()); // Secures HTTP headers
app.use(cors()); // Allows frontend to communicate with backend
app.use(express.json()); // Parses incoming JSON payloads

// Auth Routes
app.use('/api/auth', authRoutes);

// User Routes
app.use('/api/users', userRoutes);

// Market Routes
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/depth", depthRouter);
app.use("/api/v1/trades", tradesRouter);
app.use("/api/v1/klines", klineRouter);
app.use("/api/v1/tickers", tickersRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Exchange API is running' });
});

export default app;