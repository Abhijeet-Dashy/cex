import { type Request, type Response } from "express";
import { requireCredentials } from "../../validation.ts";
import { AuthService } from "./auth.service.ts";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const { email, password } = requireCredentials(req.body);
    const token = await authService.register(email, password);
    res.status(201).json({ token });
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = requireCredentials(req.body);
    const token = await authService.login(email, password);
    res.status(200).json({ token });
  }
}
