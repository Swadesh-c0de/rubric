import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { 
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const getPrismaInstance = () => {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not defined in environment variables.");
  }

  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({ connectionString: dbUrl });
  }
  const adapter = new PrismaPg(globalForPrisma.pgPool);
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma || getPrismaInstance();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

