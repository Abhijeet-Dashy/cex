import { type Request, type Response } from 'express';
import { AuthService } from './auth.service.ts';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      
      // Basic validation
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const token = await authService.register(email, password);

      res.status(201).json({ token });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const token = await authService.login(email, password);
      
      res.status(200).json({ token }); 
    } catch (error: any) {
      res.status(401).json({ error: error.message }); 
    }
  }
}