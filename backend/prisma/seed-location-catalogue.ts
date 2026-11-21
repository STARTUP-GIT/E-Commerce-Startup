import { prisma } from "../src/config/prisma.js";
import { AUTHORITATIVE_LOCATION_CATALOGUE } from "../src/services/location/locationCatalogueData.js";

async function main() {
    console.log("Seeding Location Catalogue...");

    let insertedCount = 0;
    for (const item of AUTHORITATIVE_LOCATION_CATALOGUE) {
        // Upsert by checking existing match
        const existing = await prisma.locationCatalogue.findFirst({
            where: {
                state: item.state,
                district: item.district,
                cityTown: item.cityTown,
                serviceArea: item.serviceArea,
                postalCode: item.postalCode
            }
        });

        if (!existing) {
            await prisma.locationCatalogue.create({
                data: {
                    state: item.state,
                    district: item.district,
                    cityTown: item.cityTown,
                    serviceArea: item.serviceArea,
                    postalCode: item.postalCode
                }
            });
            insertedCount++;
        }
    }

    console.log(`Location Catalogue seed finished. Inserted ${insertedCount} new catalogue records.`);
}

main()
    .catch((e) => {
        console.error("Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
