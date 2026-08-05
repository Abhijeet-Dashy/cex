import { type Request, type Response } from 'express';
import { UserRepository } from '../users/user.repository.ts';

const userRepository = new UserRepository();

export class UserController {
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId; 

      if (!userId) {
        res.status(400).json({ error: 'User ID missing' });
        return;
      }

      const user = await userRepository.findById(userId);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({ user });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}