import 'dotenv/config';
import { prisma } from './dist/src/config/prisma.js';
async function main() {
  const sellers = await prisma.seller.findMany({
    include: { shop: true }
  });
  console.log('Sellers list:', JSON.stringify(sellers, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
