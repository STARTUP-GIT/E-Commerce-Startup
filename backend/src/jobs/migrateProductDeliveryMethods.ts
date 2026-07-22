import { prisma } from "../config/prisma.js";

export const migrateProductDeliveryMethods = async () => {
    try {
        const shops = await prisma.shop.findMany({
            include: {
                seller: {
                    include: {
                        products: true
                    }
                }
            }
        });

        for (const shop of shops) {
            const targetMethod = shop.deliveryMode === "SELF" ? "SELF_DELIVERY" : "PORTAL_DELIVERY";
            const products = shop.seller?.products || [];
            for (const prod of products) {
                // Backfill if needed
                if (!prod.deliveryMethod) {
                    await prisma.product.update({
                        where: { id: prod.id },
                        data: { deliveryMethod: targetMethod as any }
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error migrating product delivery methods:", error);
    }
};
