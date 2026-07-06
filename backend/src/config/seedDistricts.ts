import { prisma } from "./prisma.js";

const KARNATAKA_DISTRICTS = [
    "Bagalkote",
    "Ballari",
    "Belagavi",
    "Bengaluru Rural",
    "Bengaluru Urban",
    "Bidar",
    "Chamarajanagar",
    "Chikkaballapur",
    "Chikkamagaluru",
    "Chitradurga",
    "Dakshina Kannada",
    "Davanagere",
    "Dharwad",
    "Gadag",
    "Hassan",
    "Haveri",
    "Kalaburagi",
    "Kodagu",
    "Kolar",
    "Koppal",
    "Mandya",
    "Mysuru",
    "Raichur",
    "Ramanagara",
    "Shivamogga",
    "Tumakuru",
    "Udupi",
    "Uttara Kannada",
    "Vijayapura",
    "Yadgir",
    "Vijayanagara"
];

const ALL_INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

export async function seedKarnatakaDistricts() {
    try {
        console.log("Checking state data in database...");
        for (const name of ALL_INDIAN_STATES) {
            await prisma.state.upsert({
                where: { name },
                update: {},
                create: {
                    name,
                    isActive: name === "Karnataka"
                }
            });
        }
        console.log("Successfully seeded 36 states.");

        console.log("Checking district data in database...");
        
        // Find if there are any cities associated with Karnataka
        const existingKarnataka = await prisma.city.findFirst({
            where: {
                state: { equals: "Karnataka", mode: "insensitive" }
            }
        });

        if (!existingKarnataka) {
            console.log("No Karnataka districts found. Seeding 31 districts...");
            for (const name of KARNATAKA_DISTRICTS) {
                await prisma.city.upsert({
                    where: { name },
                    update: { state: "Karnataka" },
                    create: {
                        name,
                        state: "Karnataka",
                        isActive: true
                    }
                });
            }
            console.log("Successfully seeded 31 Karnataka districts.");
        } else {
            console.log("Karnataka districts already present in database.");
        }

        // Seed Default Categories
        await seedCategories();

    } catch (error) {
        console.error("FAILED TO SEED KARNATAKA DISTRICTS AND STATES:", error);
    }
}

const DEFAULT_CATEGORIES = [
    "Electronics",
    "Fashion",
    "Home & Kitchen",
    "Furniture",
    "Books",
    "Sports",
    "Toys",
    "Beauty",
    "Health",
    "Groceries",
    "Automotive",
    "Jewellery",
    "Pet Supplies",
    "Office Supplies",
    "Garden",
    "Baby Products",
    "Musical Instruments",
    "Art & Craft",
    "Industrial",
    "Tools",
    "3D Printing",
    "Stationery",
    "Accessories",
    "Other"
];

export async function seedCategories() {
    try {
        console.log("Seeding default categories...");
        for (const name of DEFAULT_CATEGORIES) {
            const slug = name.toLowerCase()
                             .replace(/&/g, 'and')
                             .replace(/[^a-z0-9]+/g, '-')
                             .replace(/(^-|-$)/g, '');
            await prisma.category.upsert({
                where: { slug },
                update: {},
                create: {
                    name,
                    slug,
                    isActive: true,
                    description: `${name} products`
                }
            });
        }
        console.log("Successfully seeded categories.");
    } catch (e) {
        console.error("FAILED TO SEED CATEGORIES:", e);
    }
}
