import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_exchange_key';

// This tells TypeScript that we are adding a 'userId' property to the standard Express Request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Get the token from the headers
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  // 2. Extract just the token part
  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Malformed token' });
    return;
  }

  try {
    // 3. Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: string };
    
    // 4. Attach the user's ID to the request so the controller can use it
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};