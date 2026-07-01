import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

try {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });
  console.log('SUCCESS: Instantiated PrismaClient successfully with datasourceUrl!');
  // Quick query test
  const count = await prisma.customOrder.count();
  console.log('Database custom orders count:', count);
  await prisma.$disconnect();
} catch (error) {
  console.error('ERROR: Failed to instantiate PrismaClient:', error);
}
