import { PrismaClient } from '../../generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export class UserRepository {
  // Find a user by their email
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  // Find a user by their id
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id }
    });
  }

  // Save a new user to the database    
  async create(data: any) {
    return prisma.user.create({
      data
    });
  }
}