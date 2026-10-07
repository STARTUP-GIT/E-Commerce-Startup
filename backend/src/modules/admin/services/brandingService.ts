import { prisma } from "../../../config/prisma.js";
import storageService from "../../storage/services/storage.service.js";

/**
 * Marketplace branding — independent Admin-owned configurations per app.
 *
 * Replaces the removed Platform app's branding store. Read by:
 *   - GET /api/branding (public)          → app-selected public configuration
 *   - Admin → Branding screen             → GET/PUT /api/admin/settings/branding
 *   - Server-side PDF invoices / emails   → getBrandingConfiguration()
 *
 * The response shape is deliberately backwards compatible with the old
 * Platform branding payload so every existing `normalizeBranding()` keeps
 * working unchanged.
 */

export interface BrandingConfiguration {
    name: string;
    marketplaceName: string;
    brandName: string;
    logo: string;
    favicon: string;
    tagline: string;
    shortName: string;
    logoUrl: string;
    faviconUrl: string;
    heroBadge: string;
    heroHeadingLine1: string;
    heroHeadingLine2: string;
    heroHeadingLine3: string;
    heroDescription: string;
    searchPlaceholder: string;
    exploreShopsButtonText: string;
    browseProductsButtonText: string;
    footerDescription: string;
    seoTitle: string;
    seoDescription: string;
    browserTitle: string;
    primaryColor?: string;
    secondaryColor?: string;
    supportEmail?: string;
    supportPhone?: string;
    updatedAt: string;
    updatedBy: string;
}

export type BrandingApp = "CUSTOMER" | "SELLER";

const SINGLE_BRANDING_APP: BrandingApp = "CUSTOMER";

const resolveCanonicalBrandingApp = async (requestedApp: BrandingApp = SINGLE_BRANDING_APP) => {
    const preferredApp = requestedApp === "SELLER" ? SINGLE_BRANDING_APP : requestedApp;
    const customerRow = await prisma.marketplaceBranding.findUnique({ where: { app: "CUSTOMER" } });
    const sellerRow = await prisma.marketplaceBranding.findUnique({ where: { app: "SELLER" } });
    const existingRow = customerRow ?? sellerRow ?? null;
    return {
        requestedApp: preferredApp,
        canonicalApp: customerRow ? "CUSTOMER" : (existingRow?.app ?? preferredApp),
        existingRow
    };
};

export const DEFAULT_BRANDING: BrandingConfiguration = {
    name: "Marketplace",
    marketplaceName: "Marketplace",
    brandName: "Marketplace",
    logo: "/images/logo.png",
    favicon: "/images/logo.png",
    tagline: "Your local marketplace for everything",
    shortName: "Marketplace",
    logoUrl: "/images/logo.png",
    faviconUrl: "/images/logo.png",
    heroBadge: "The Local Marketplace for Everything",
    heroHeadingLine1: "Buy Anything.",
    heroHeadingLine2: "From Anyone.",
    heroHeadingLine3: "Near You.",
    heroDescription:
        "Marketplace is your local marketplace for everything — fashion, tech, food, prints, crafts, and beyond. Discover creators. Support neighbours.",
    searchPlaceholder: "Search products, shops on Marketplace…",
    exploreShopsButtonText: "Explore Shops",
    browseProductsButtonText: "Browse Products",
    footerDescription:
        "Discover local craft creators, purchase unique handmade items, and order custom-made 3D prints directly from makers on Marketplace.",
    seoTitle: "Marketplace",
    seoDescription: "Discover local artisans, handcrafted items, and custom products.",
    browserTitle: "Marketplace",
    updatedAt: new Date(0).toISOString(),
    updatedBy: "system"
};

export const DEFAULT_SELLER_BRANDING: BrandingConfiguration = {
    ...DEFAULT_BRANDING,
    name: "Marketplace Seller",
    marketplaceName: "Marketplace Seller",
    brandName: "Marketplace Seller",
    tagline: "Grow your store locally",
    shortName: "Seller",
    seoTitle: "Marketplace Seller",
    seoDescription: "Manage your shop, products, orders, and sales.",
    browserTitle: "Marketplace Seller"
};

const CACHE_TTL_MS = 15_000;
const brandingCache = new Map<BrandingApp, { value: BrandingConfiguration; expiresAt: number }>();

export const invalidateBrandingCache = (app?: BrandingApp): void => {
    if (app) brandingCache.delete(app);
    else brandingCache.clear();
};

const str = (value: unknown, fallback: string): string =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;

const normalize = (row: any, defaults: BrandingConfiguration): BrandingConfiguration => {
    const d = defaults;
    const name = str(row?.brandName, d.name);
    const logo = str(row?.logoUrl, d.logo);
    const rawFavicon = typeof row?.faviconUrl === "string" ? row.faviconUrl.trim() : "";
    // Never ship a framework-default favicon: fall back to the brand logo.
    const favicon =
        rawFavicon && rawFavicon !== "/favicon.ico" ? rawFavicon : logo;

    return {
        name,
        marketplaceName: name,
        brandName: name,
        logo,
        favicon,
        logoUrl: logo,
        faviconUrl: favicon,
        tagline: str(row?.tagline, d.tagline),
        shortName: str(row?.shortName, name),
        heroBadge: str(row?.heroBadge, d.heroBadge),
        heroHeadingLine1: str(row?.heroHeadingLine1, d.heroHeadingLine1),
        heroHeadingLine2: str(row?.heroHeadingLine2, d.heroHeadingLine2),
        heroHeadingLine3: str(row?.heroHeadingLine3, d.heroHeadingLine3),
        heroDescription: str(row?.heroDescription, d.heroDescription),
        searchPlaceholder: str(row?.searchPlaceholder, d.searchPlaceholder),
        exploreShopsButtonText: str(row?.exploreShopsButtonText, d.exploreShopsButtonText),
        browseProductsButtonText: str(row?.browseProductsButtonText, d.browseProductsButtonText),
        footerDescription: str(row?.footerDescription, d.footerDescription),
        seoTitle: str(row?.seoTitle, d.seoTitle),
        seoDescription: str(row?.seoDescription, d.seoDescription),
        browserTitle: str(row?.browserTitle, d.browserTitle),
        primaryColor: row?.primaryColor || undefined,
        secondaryColor: row?.secondaryColor || undefined,
        supportEmail: row?.supportEmail || undefined,
        supportPhone: row?.supportPhone || undefined,
        updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : d.updatedAt,
        updatedBy: str(row?.updatedBy, d.updatedBy)
    };
};

export const getBrandingConfiguration = async (
    app: BrandingApp = "CUSTOMER"
): Promise<BrandingConfiguration> => {
    const { canonicalApp } = await resolveCanonicalBrandingApp(app);
    const cacheKey = canonicalApp;
    const cached = brandingCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const row = await prisma.marketplaceBranding.findFirst({
        where: { app: { in: ["CUSTOMER", "SELLER"] } },
        orderBy: [{ app: "asc" }]
    });

    const defaults = DEFAULT_BRANDING;
    const value = row ? normalize(row, defaults) : { ...defaults };
    brandingCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
};

/** Accepts legacy Platform keys (name/logo/favicon) and the new column names. */
export interface BrandingUpdate {
    brandName?: string;
    name?: string;
    marketplaceName?: string;
    shortName?: string;
    tagline?: string;
    logoUrl?: string;
    logoPublicId?: string | null;
    logo?: string;
    faviconUrl?: string;
    faviconPublicId?: string | null;
    favicon?: string;
    browserTitle?: string;
    seoTitle?: string;
    seoDescription?: string;
    primaryColor?: string;
    secondaryColor?: string;
    supportEmail?: string;
    supportPhone?: string;
    heroBadge?: string;
    heroHeadingLine1?: string;
    heroHeadingLine2?: string;
    heroHeadingLine3?: string;
    heroDescription?: string;
    searchPlaceholder?: string;
    exploreShopsButtonText?: string;
    browseProductsButtonText?: string;
    footerDescription?: string;
}

const pick = <T>(...values: T[]): T | undefined =>
    values.find((value) => value !== undefined);

export const saveBranding = async (
    input: BrandingUpdate,
    adminId?: string,
    app: BrandingApp = "CUSTOMER"
): Promise<BrandingConfiguration> => {
    const { canonicalApp, existingRow } = await resolveCanonicalBrandingApp(app);
    const current = await getBrandingConfiguration(canonicalApp);
    const existing = existingRow ?? await prisma.marketplaceBranding.findUnique({ where: { app: canonicalApp } });

    const brandName = str(
        pick(input.brandName, input.name, input.marketplaceName),
        current.brandName
    );
    const logoUrl = str(pick(input.logoUrl, input.logo), current.logoUrl);
    const faviconRaw = pick(input.faviconUrl, input.favicon);
    const faviconUrl = faviconRaw === "" ? null : (faviconRaw ?? current.faviconUrl);
    const logoPublicId = input.logoPublicId === undefined
        ? existing?.logoPublicId ?? null
        : input.logoPublicId || null;
    const faviconPublicId = input.faviconPublicId === undefined
        ? existing?.faviconPublicId ?? null
        : input.faviconPublicId || null;

    const data = {
        brandName,
        shortName: str(input.shortName, current.shortName),
        tagline: str(input.tagline, current.tagline),
        logoUrl,
        logoPublicId,
        faviconUrl,
        faviconPublicId,
        browserTitle: str(input.browserTitle, current.browserTitle),
        seoTitle: str(input.seoTitle, current.seoTitle),
        seoDescription: str(input.seoDescription, current.seoDescription),
        primaryColor: input.primaryColor ?? current.primaryColor ?? null,
        secondaryColor: input.secondaryColor ?? current.secondaryColor ?? null,
        supportEmail: input.supportEmail ?? current.supportEmail ?? null,
        supportPhone: input.supportPhone ?? current.supportPhone ?? null,
        heroBadge: str(input.heroBadge, current.heroBadge),
        heroHeadingLine1: str(input.heroHeadingLine1, current.heroHeadingLine1),
        heroHeadingLine2: str(input.heroHeadingLine2, current.heroHeadingLine2),
        heroHeadingLine3: str(input.heroHeadingLine3, current.heroHeadingLine3),
        heroDescription: str(input.heroDescription, current.heroDescription),
        searchPlaceholder: str(input.searchPlaceholder, current.searchPlaceholder),
        exploreShopsButtonText: str(input.exploreShopsButtonText, current.exploreShopsButtonText),
        browseProductsButtonText: str(input.browseProductsButtonText, current.browseProductsButtonText),
        footerDescription: str(input.footerDescription, current.footerDescription),
        updatedBy: adminId ?? "system"
    };

    await prisma.marketplaceBranding.upsert({
        where: { app: canonicalApp },
        update: data,
        create: { app: canonicalApp, ...data }
    });

    invalidateBrandingCache(canonicalApp);
    invalidateBrandingCache("CUSTOMER");
    invalidateBrandingCache("SELLER");
    const replacedPublicIds = [
        existing?.logoPublicId && existing.logoPublicId !== logoPublicId ? existing.logoPublicId : null,
        existing?.faviconPublicId && existing.faviconPublicId !== faviconPublicId ? existing.faviconPublicId : null
    ].filter((publicId): publicId is string => Boolean(publicId));
    for (const publicId of replacedPublicIds) {
        try {
            await storageService.deleteImage({ publicId });
        } catch (error) {
            console.error("FAILED TO REMOVE REPLACED BRANDING IMAGE:", error);
        }
    }
    return getBrandingConfiguration(canonicalApp);
};

/** Admin-facing payload (row-shaped, includes editable non-public fields). */
export const getBrandingSettings = async (app: BrandingApp = "CUSTOMER") => {
    const { canonicalApp } = await resolveCanonicalBrandingApp(app);
    const [branding, row] = await Promise.all([
        getBrandingConfiguration(canonicalApp),
        prisma.marketplaceBranding.findUnique({ where: { app: canonicalApp } })
    ]);
    return {
        branding: {
            ...branding,
            logoPublicId: row?.logoPublicId ?? null,
            faviconPublicId: row?.faviconPublicId ?? null
        }
    };
};
