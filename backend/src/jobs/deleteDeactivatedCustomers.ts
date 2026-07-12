import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";

export const deleteDeactivatedCustomers = async () => {

    const customers = await prisma.customer.findMany({
        where: {
            isDeactivated: true,
            scheduledDeleteAt: {
                lte: new Date()
            }
        }
    });

    for (const customer of customers) {
        await prisma.customer.delete({
            where: {
                id: customer.id
            }
        });
    }

    logger.info(`Deleted ${customers.length} deactivated customers`);
};