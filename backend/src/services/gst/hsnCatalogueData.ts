import { prisma } from "../../config/prisma.js";
import { Prisma } from "@prisma/client";

export const INITIAL_HSN_CATALOGUE = [
  {
    hsnCode: "4820",
    description: "Registers, account books, note books, order books, receipt books, letter pads, memorandum pads, diaries and similar articles, blotting-pads, binders, folders and book covers of paper or paperboard",
    gstRate: 18.0,
    taxCategory: "TAXABLE" as const
  },
  {
    hsnCode: "9503",
    description: "Tricycles, scooters, pedal cars and similar wheeled toys; dolls' carriages; dolls; other toys; reduced-size ('scale') models and similar recreational models, working or not; puzzles of all kinds",
    gstRate: 18.0,
    taxCategory: "TAXABLE" as const
  },
  {
    hsnCode: "6109",
    description: "T-shirts, singlets and other vests, knitted or crocheted (Cotton & Blends)",
    gstRate: 5.0,
    taxCategory: "TAXABLE" as const
  },
  {
    hsnCode: "6203",
    description: "Men's or boys' suits, ensembles, jackets, blazers, trousers, bib and brace overalls, breeches and shorts",
    gstRate: 12.0,
    taxCategory: "TAXABLE" as const
  },
  {
    hsnCode: "6204",
    description: "Women's or girls' suits, ensembles, jackets, dresses, skirts, divided skirts, trousers, bib and brace overalls, breeches and shorts",
    gstRate: 12.0,
    taxCategory: "TAXABLE" as const
  },
  {
    hsnCode: "0409",
    description: "Natural honey, put up in unit container and bearing a registered brand name",
    gstRate: 5.0,
    taxCategory: "TAXABLE" as const
  },
  {
    hsnCode: "0902",
    description: "Tea, whether or not flavoured (Packaged)",
    gstRate: 5.0,
    taxCategory: "TAXABLE" as const
  },
  {
    hsnCode: "1905",
    description: "Bread, pastry, cakes, biscuits and other bakers' wares",
    gstRate: 18.0,
    taxCategory: "TAXABLE" as const
  },
  {
    hsnCode: "2106",
    description: "Food preparations not elsewhere specified or included (Sweets, Namkeens, Snacks)",
    gstRate: 5.0,
    taxCategory: "TAXABLE" as const
  },
  {
    hsnCode: "6402",
    description: "Other footwear with outer soles and uppers of rubber or plastics",
    gstRate: 12.0,
    taxCategory: "TAXABLE" as const
  },
  {
    hsnCode: "0101",
    description: "Live horses, asses, mules and hinnies (Exempt)",
    gstRate: 0.0,
    taxCategory: "EXEMPT" as const
  },
  {
    hsnCode: "1006",
    description: "Rice, other than pre-packaged and labelled (Nil-rated)",
    gstRate: 0.0,
    taxCategory: "NIL_RATED" as const
  }
];

export async function seedHsnCatalogueIfEmpty() {
  const count = await prisma.hsnRateMaster.count();
  if (count > 0) return;

  for (const item of INITIAL_HSN_CATALOGUE) {
    await prisma.hsnRateMaster.create({
      data: {
        hsnCode: item.hsnCode,
        description: item.description,
        gstRate: new Prisma.Decimal(item.gstRate),
        taxCategory: item.taxCategory,
        isActive: true
      }
    });
  }
}
