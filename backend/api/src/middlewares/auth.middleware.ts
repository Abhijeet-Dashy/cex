import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.ts";

// This tells TypeScript that we are adding a 'userId' property to the standard Express Request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Requires a valid "Authorization: Bearer <jwt>" header and sets req.userId. */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Unauthorized: Malformed token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as unknown as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
