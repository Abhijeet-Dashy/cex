import { type Request, type Response } from "express";
import { HttpError } from "../../errors.ts";
import { UserRepository } from "./user.repository.ts";

const userRepository = new UserRepository();

export class UserController {
  async getProfile(req: Request, res: Response): Promise<void> {
    const user = await userRepository.findById(req.userId!);
    if (!user) {
      throw new HttpError(404, "User not found");
    }

    // never send the password hash back
    const { password: _password, ...profile } = user;
    res.status(200).json({ user: profile });
  }
}
