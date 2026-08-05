import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../users/user.repository.ts';

const userRepository = new UserRepository();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_exchange_key';

export class AuthService {
  async register(email: string, password: string) {
    // 1. Check if the user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already in use');
    }

    // 2. Hash the password (10 is the salt rounds, determining how secure/slow the hash is)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Save the user via the repository
    const user = await userRepository.create({ 
      email, 
      password: hashedPassword 
    });

    return this.generateToken(user.id);
  }

  async login(email: string, password: string) {
    // 1. Find the user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 2. Compare the plain-text password with the hashed password in the DB
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    return this.generateToken(user.id);
  }

  private generateToken(userId: string) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  }
}