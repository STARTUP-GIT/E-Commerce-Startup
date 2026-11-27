/**
 * Standalone Deduplication Script for Seller Verifications
 * 
 * Safely identifies and resolves duplicate seller verification records in the database,
 * promoting the authoritative record to isCurrent = true and demoting historical duplicates
 * to isCurrent = false while preserving all document URLs, review history, and audit logs.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
  console.log('--- Starting Safe Seller Verification Deduplication ---');
  try {
    // 1. Group by sellerId to identify duplicate counts
    const duplicates = await prisma.sellerVerification.groupBy({
      by: ['sellerId'],
      _count: { id: true },
      having: {
        id: { _count: { gt: 1 } }
      }
    });

    console.log(`Found ${duplicates.length} seller(s) with multiple verification records.`);

    const STATUS_PRIORITY = {
      APPROVED: 4,
      UNDER_REVIEW: 3,
      PENDING: 2,
      REJECTED: 1,
      EXPIRED: 0
    };

    for (const dup of duplicates) {
      const records = await prisma.sellerVerification.findMany({
        where: { sellerId: dup.sellerId },
        orderBy: [
          { reviewedAt: 'desc' },
          { updatedAt: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      // Sort by status priority first, then recency
      records.sort((a, b) => {
        const pA = STATUS_PRIORITY[a.status] ?? 0;
        const pB = STATUS_PRIORITY[b.status] ?? 0;
        if (pA !== pB) return pB - pA;
        const dateA = new Date(a.reviewedAt || a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.reviewedAt || b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });

      const authoritative = records[0];
      const olderRecords = records.slice(1);

      console.log(`Seller ${dup.sellerId}: authoritative record is ${authoritative.id} (Status: ${authoritative.status}). Demoting ${olderRecords.length} duplicate/historical records.`);

      // Keep authoritative as current
      await prisma.sellerVerification.update({
        where: { id: authoritative.id },
        data: {
          isCurrent: true,
          version: records.length
        }
      });

      // Demote duplicates/historical records
      for (let i = 0; i < olderRecords.length; i++) {
        await prisma.sellerVerification.update({
          where: { id: olderRecords[i].id },
          data: {
            isCurrent: false,
            version: records.length - 1 - i
          }
        });
      }
    }

    console.log('✓ Successfully deduplicated all seller verification records.');
  } catch (error) {
    console.error('Error during seller verification deduplication:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  cleanDuplicates();
}

module.exports = { cleanDuplicates };
