import 'dotenv/config';
import { prisma } from './dist/src/config/prisma.js';

async function reactivateSeller() {
  console.log('Reactivating all deactivated seller accounts for testing...\n');

  const updated = await prisma.seller.updateMany({
    where: { isDeactivated: true },
    data: {
      isDeactivated: false,
      deactivatedAt: null,
      scheduledDeleteAt: null,
    }
  });

  console.log(`✓ Reactivated ${updated.count} seller account(s).`);

  const sellers = await prisma.seller.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      status: true,
      isDeactivated: true,
      isBanned: true,
    }
  });

  console.log('\nCurrent seller accounts:\n');
  for (const s of sellers) {
    const flags = [
      s.isDeactivated ? '❌ DEACTIVATED' : '✅ active',
      s.isBanned ? '🚫 BANNED' : '',
      `status: ${s.status}`,
    ].filter(Boolean).join(' | ');
    console.log(`  ${s.email} (${s.username}) — ${flags}`);
  }

  await prisma.$disconnect();
}

reactivateSeller().catch(console.error);
