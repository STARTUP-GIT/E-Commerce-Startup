import { prisma } from "../config/prisma.js";

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

    console.log(
        `Deleted ${customers.length} deactivated customers`
    );
};