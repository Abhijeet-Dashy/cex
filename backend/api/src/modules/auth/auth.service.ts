import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../../config.ts";
import { HttpError } from "../../errors.ts";
import { engine } from "../../services/engine.service.ts";
import { UserRepository } from "../users/user.repository.ts";

const userRepository = new UserRepository();
const SALT_ROUNDS = 10;

export class AuthService {
  async register(email: string, password: string) {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new HttpError(409, "Email already in use");
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userRepository.create({ email, password: hashedPassword });

    // give the new user an (empty) wallet in the matching engine
    await engine.registerUser(user.id);

    return this.generateToken(user.id);
  }

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    const isValidPassword = user && await bcrypt.compare(password, user.password);
    if (!user || !isValidPassword) {
      throw new HttpError(401, "Invalid credentials");
    }

    // registering is idempotent, this repairs users whose engine wallet is missing (e.g. engine data reset)
    await engine.registerUser(user.id);

    return this.generateToken(user.id);
  }

  private generateToken(userId: string) {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: "7d" });
  }
}
