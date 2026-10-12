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
    darkLogoUrl?: string;
    lightLogoUrl?: string;
    brandDescription?: string;
    customerTitle?: string;
    sellerPortalTitle?: string;
    sellerPortalTagline?: string;
    sellerPortalLogoUrl?: string;
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

const appDefaults: Record<BrandingApp, BrandingConfiguration> = {
    CUSTOMER: {
        name: "Sante Marketplace",
        marketplaceName: "Sante Marketplace",
        brandName: "Sante Marketplace",
        logo: "",
        favicon: "",
        tagline: "Your local marketplace for everything",
        shortName: "Sante",
        logoUrl: "",
        faviconUrl: "",
        darkLogoUrl: "",
        lightLogoUrl: "",
        brandDescription: "Your curated marketplace for local creators, artisans, and custom merchandise.",
        customerTitle: "Sante Marketplace",
        sellerPortalTitle: "Sante Seller Portal",
        sellerPortalTagline: "Manage your storefront, products, and incoming orders.",
        heroBadge: "The Local Marketplace for Everything",
        heroHeadingLine1: "Buy Anything.",
        heroHeadingLine2: "From Anyone.",
        heroHeadingLine3: "Near You.",
        heroDescription:
            "Sante is your local marketplace for everything — fashion, tech, food, prints, crafts, and beyond. Discover creators. Support neighbours.",
        searchPlaceholder: "Search products, shops on Marketplace…",
        exploreShopsButtonText: "Explore Shops",
        browseProductsButtonText: "Browse Products",
        footerDescription:
            "Discover local craft creators, purchase unique handmade items, and order custom products directly from makers on Sante.",
        seoTitle: "Sante Marketplace",
        seoDescription: "Discover local artisans, handcrafted items, and custom products.",
        browserTitle: "Sante Marketplace",
        primaryColor: "#FF5722",
        secondaryColor: "#0EA5E9",
        updatedAt: new Date(0).toISOString(),
        updatedBy: "system"
    },
    SELLER: {
        name: "Sante Seller Portal",
        marketplaceName: "Sante Marketplace",
        brandName: "Sante Marketplace",
        logo: "",
        favicon: "",
        tagline: "Manage your storefront, products, and incoming orders.",
        shortName: "Seller",
        logoUrl: "",
        faviconUrl: "",
        darkLogoUrl: "",
        lightLogoUrl: "",
        brandDescription: "Merchant operating system for marketplace sellers.",
        customerTitle: "Sante Marketplace",
        sellerPortalTitle: "Sante Seller Portal",
        sellerPortalTagline: "Manage your storefront, products, and incoming orders.",
        heroBadge: "The Local Marketplace for Everything",
        heroHeadingLine1: "Sell Anything.",
        heroHeadingLine2: "From Your Shop.",
        heroHeadingLine3: "Locally.",
        heroDescription:
            "Manage your shop, products, orders, and sales seamlessly from one place.",
        searchPlaceholder: "Search your products and orders…",
        exploreShopsButtonText: "Manage Shop",
        browseProductsButtonText: "View Orders",
        footerDescription:
            "Manage your store, track orders, and grow your business with Sante Seller Portal.",
        seoTitle: "Sante Seller Portal",
        seoDescription: "Manage your shop, products, orders, and sales.",
        browserTitle: "Sante Seller Portal",
        primaryColor: "#7C3AED",
        secondaryColor: "#4F46E5",
        updatedAt: new Date(0).toISOString(),
        updatedBy: "system"
    }
};

export const DEFAULT_BRANDING: BrandingConfiguration = appDefaults.CUSTOMER;
export const DEFAULT_SELLER_BRANDING: BrandingConfiguration = appDefaults.SELLER;

const CACHE_TTL_MS = 15_000;
const brandingCache = new Map<BrandingApp, { value: BrandingConfiguration; expiresAt: number }>();

export const invalidateBrandingCache = (app?: BrandingApp): void => {
    if (app) brandingCache.delete(app);
    else brandingCache.clear();
};

const str = (value: unknown, fallback: string): string =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;

const cleanAssetUrl = (url: unknown): string => {
    if (typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed || trimmed === "/images/logo.png" || trimmed === "/favicon.ico") return "";
    return trimmed;
};

export const getBrandingConfiguration = async (
    app: BrandingApp = "CUSTOMER"
): Promise<BrandingConfiguration> => {
    const cacheKey = app;
    const cached = brandingCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    // Always fetch central CUSTOMER branding as the primary source of truth
    const [centralRow, sellerRow] = await Promise.all([
        prisma.marketplaceBranding.findUnique({ where: { app: "CUSTOMER" } }),
        prisma.marketplaceBranding.findUnique({ where: { app: "SELLER" } })
    ]);

    const central = centralRow || ({} as any);
    const seller = sellerRow || ({} as any);

    // Primary marketplace identity (Source of Truth)
    const centralBrandName = str(central.brandName, DEFAULT_BRANDING.brandName);
    const centralLogo = cleanAssetUrl(central.logoUrl);
    const centralDarkLogo = cleanAssetUrl(central.darkLogoUrl) || centralLogo;
    const centralLightLogo = cleanAssetUrl(central.lightLogoUrl) || centralLogo;
    const centralFavicon = cleanAssetUrl(central.faviconUrl) || centralLogo;
    const centralTagline = str(central.tagline, DEFAULT_BRANDING.tagline);
    const primaryColor = str(central.primaryColor, "#FF5722");
    const secondaryColor = str(central.secondaryColor, "#0EA5E9");

    if (app === "SELLER") {
        // Derive seller portal specific title and tagline with central inheritance
        const sellerTitle =
            str(central.sellerPortalTitle, "") ||
            str(seller.sellerPortalTitle, "") ||
            (seller.brandName && seller.brandName !== "Marketplace Seller" && seller.brandName !== "Marketplace"
                ? seller.brandName
                : centralBrandName.toLowerCase().includes("seller")
                ? centralBrandName
                : `${centralBrandName} Seller Portal`);

        const sellerTagline =
            str(central.sellerPortalTagline, "") ||
            str(seller.sellerPortalTagline, "") ||
            (seller.tagline && seller.tagline !== "Grow your store locally"
                ? seller.tagline
                : centralTagline && centralTagline !== DEFAULT_BRANDING.tagline
                ? centralTagline
                : DEFAULT_SELLER_BRANDING.tagline);

        // Inherit logo: seller-specific override if explicitly uploaded, otherwise central logo!
        const sellerLogo =
            cleanAssetUrl(central.sellerPortalLogoUrl) ||
            cleanAssetUrl(seller.sellerPortalLogoUrl) ||
            (cleanAssetUrl(seller.logoUrl) && cleanAssetUrl(seller.logoUrl) !== cleanAssetUrl(central.logoUrl)
                ? cleanAssetUrl(seller.logoUrl)
                : centralLogo);

        const sellerFavicon = cleanAssetUrl(seller.faviconUrl) || centralFavicon || sellerLogo;

        const config: BrandingConfiguration = {
            name: sellerTitle,
            marketplaceName: centralBrandName,
            brandName: centralBrandName,
            logo: sellerLogo,
            favicon: sellerFavicon,
            logoUrl: sellerLogo,
            faviconUrl: sellerFavicon,
            darkLogoUrl: cleanAssetUrl(seller.darkLogoUrl) || centralDarkLogo || sellerLogo,
            lightLogoUrl: cleanAssetUrl(seller.lightLogoUrl) || centralLightLogo || sellerLogo,
            tagline: sellerTagline,
            shortName: str(seller.shortName, "Seller"),
            brandDescription: str(seller.brandDescription, str(central.brandDescription, DEFAULT_SELLER_BRANDING.brandDescription!)),
            customerTitle: str(central.customerTitle, centralBrandName),
            sellerPortalTitle: sellerTitle,
            sellerPortalTagline: sellerTagline,
            sellerPortalLogoUrl: sellerLogo,
            heroBadge: str(seller.heroBadge, DEFAULT_SELLER_BRANDING.heroBadge),
            heroHeadingLine1: str(seller.heroHeadingLine1, DEFAULT_SELLER_BRANDING.heroHeadingLine1),
            heroHeadingLine2: str(seller.heroHeadingLine2, DEFAULT_SELLER_BRANDING.heroHeadingLine2),
            heroHeadingLine3: str(seller.heroHeadingLine3, DEFAULT_SELLER_BRANDING.heroHeadingLine3),
            heroDescription: str(seller.heroDescription, DEFAULT_SELLER_BRANDING.heroDescription),
            searchPlaceholder: str(seller.searchPlaceholder, DEFAULT_SELLER_BRANDING.searchPlaceholder),
            exploreShopsButtonText: str(seller.exploreShopsButtonText, DEFAULT_SELLER_BRANDING.exploreShopsButtonText),
            browseProductsButtonText: str(seller.browseProductsButtonText, DEFAULT_SELLER_BRANDING.browseProductsButtonText),
            footerDescription: str(seller.footerDescription, DEFAULT_SELLER_BRANDING.footerDescription),
            seoTitle: str(seller.seoTitle, `${sellerTitle} | ${centralBrandName}`),
            seoDescription: str(seller.seoDescription, DEFAULT_SELLER_BRANDING.seoDescription),
            browserTitle: str(seller.browserTitle, `${sellerTitle}`),
            primaryColor: seller.primaryColor || primaryColor,
            secondaryColor: seller.secondaryColor || secondaryColor,
            supportEmail: seller.supportEmail || central.supportEmail || undefined,
            supportPhone: seller.supportPhone || central.supportPhone || undefined,
            updatedAt: seller.updatedAt ? new Date(seller.updatedAt).toISOString() : new Date().toISOString(),
            updatedBy: str(seller.updatedBy, "system")
        };

        brandingCache.set(cacheKey, { value: config, expiresAt: Date.now() + CACHE_TTL_MS });
        return config;
    }

    // Default: CUSTOMER branding (authoritative primary marketplace identity)
    const custTitle = str(central.customerTitle, centralBrandName);
    const config: BrandingConfiguration = {
        name: centralBrandName,
        marketplaceName: centralBrandName,
        brandName: centralBrandName,
        logo: centralLogo,
        favicon: centralFavicon,
        logoUrl: centralLogo,
        faviconUrl: centralFavicon,
        darkLogoUrl: centralDarkLogo,
        lightLogoUrl: centralLightLogo,
        tagline: centralTagline,
        shortName: str(central.shortName, centralBrandName),
        brandDescription: str(central.brandDescription, DEFAULT_BRANDING.brandDescription!),
        customerTitle: custTitle,
        sellerPortalTitle: str(central.sellerPortalTitle, `${centralBrandName} Seller Portal`),
        sellerPortalTagline: str(central.sellerPortalTagline, "Manage your storefront, products, and incoming orders."),
        sellerPortalLogoUrl: cleanAssetUrl(central.sellerPortalLogoUrl) || centralLogo,
        heroBadge: str(central.heroBadge, DEFAULT_BRANDING.heroBadge),
        heroHeadingLine1: str(central.heroHeadingLine1, DEFAULT_BRANDING.heroHeadingLine1),
        heroHeadingLine2: str(central.heroHeadingLine2, DEFAULT_BRANDING.heroHeadingLine2),
        heroHeadingLine3: str(central.heroHeadingLine3, DEFAULT_BRANDING.heroHeadingLine3),
        heroDescription: str(central.heroDescription, DEFAULT_BRANDING.heroDescription),
        searchPlaceholder: str(central.searchPlaceholder, DEFAULT_BRANDING.searchPlaceholder),
        exploreShopsButtonText: str(central.exploreShopsButtonText, DEFAULT_BRANDING.exploreShopsButtonText),
        browseProductsButtonText: str(central.browseProductsButtonText, DEFAULT_BRANDING.browseProductsButtonText),
        footerDescription: str(central.footerDescription, DEFAULT_BRANDING.footerDescription),
        seoTitle: str(central.seoTitle, `${centralBrandName}`),
        seoDescription: str(central.seoDescription, DEFAULT_BRANDING.seoDescription),
        browserTitle: str(central.browserTitle, `${centralBrandName}`),
        primaryColor,
        secondaryColor,
        supportEmail: central.supportEmail || undefined,
        supportPhone: central.supportPhone || undefined,
        updatedAt: central.updatedAt ? new Date(central.updatedAt).toISOString() : new Date().toISOString(),
        updatedBy: str(central.updatedBy, "system")
    };

    brandingCache.set(cacheKey, { value: config, expiresAt: Date.now() + CACHE_TTL_MS });
    return config;
};

/** Accepts legacy Platform keys and all new centralized branding fields */
export interface BrandingUpdate {
    brandName?: string;
    name?: string;
    marketplaceName?: string;
    shortName?: string;
    tagline?: string;
    logoUrl?: string;
    logoPublicId?: string | null;
    logo?: string;
    darkLogoUrl?: string;
    darkLogoPublicId?: string | null;
    lightLogoUrl?: string;
    lightLogoPublicId?: string | null;
    faviconUrl?: string;
    faviconPublicId?: string | null;
    favicon?: string;
    brandDescription?: string;
    customerTitle?: string;
    sellerPortalTitle?: string;
    sellerPortalTagline?: string;
    sellerPortalLogoUrl?: string;
    sellerPortalLogoPublicId?: string | null;
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
    const centralRow = await prisma.marketplaceBranding.findUnique({ where: { app: "CUSTOMER" } });
    const sellerRow = await prisma.marketplaceBranding.findUnique({ where: { app: "SELLER" } });

    const brandName = str(
        pick(input.brandName, input.name, input.marketplaceName),
        centralRow?.brandName || DEFAULT_BRANDING.brandName
    );

    const logoUrl = str(pick(input.logoUrl, input.logo), centralRow?.logoUrl || "");
    const faviconRaw = pick(input.faviconUrl, input.favicon);
    const faviconUrl = faviconRaw === "" ? null : (faviconRaw ?? centralRow?.faviconUrl ?? null);

    const logoPublicId = input.logoPublicId === undefined
        ? centralRow?.logoPublicId ?? null
        : input.logoPublicId || null;

    const faviconPublicId = input.faviconPublicId === undefined
        ? centralRow?.faviconPublicId ?? null
        : input.faviconPublicId || null;

    const darkLogoUrl = input.darkLogoUrl !== undefined ? (input.darkLogoUrl || null) : centralRow?.darkLogoUrl ?? null;
    const darkLogoPublicId = input.darkLogoPublicId !== undefined ? (input.darkLogoPublicId || null) : centralRow?.darkLogoPublicId ?? null;
    const lightLogoUrl = input.lightLogoUrl !== undefined ? (input.lightLogoUrl || null) : centralRow?.lightLogoUrl ?? null;
    const lightLogoPublicId = input.lightLogoPublicId !== undefined ? (input.lightLogoPublicId || null) : centralRow?.lightLogoPublicId ?? null;

    const sellerPortalTitle = input.sellerPortalTitle !== undefined
        ? (input.sellerPortalTitle || null)
        : (centralRow?.sellerPortalTitle || `${brandName} Seller Portal`);

    const sellerPortalTagline = input.sellerPortalTagline !== undefined
        ? (input.sellerPortalTagline || null)
        : (centralRow?.sellerPortalTagline || "Manage your storefront, products, and incoming orders.");

    const sellerPortalLogoUrl = input.sellerPortalLogoUrl !== undefined
        ? (input.sellerPortalLogoUrl || null)
        : (centralRow?.sellerPortalLogoUrl || null);

    const sellerPortalLogoPublicId = input.sellerPortalLogoPublicId !== undefined
        ? (input.sellerPortalLogoPublicId || null)
        : (centralRow?.sellerPortalLogoPublicId || null);

    const commonData = {
        brandName,
        shortName: str(input.shortName, centralRow?.shortName || "Sante"),
        tagline: str(input.tagline, centralRow?.tagline || DEFAULT_BRANDING.tagline),
        logoUrl,
        logoPublicId,
        faviconUrl,
        faviconPublicId,
        darkLogoUrl,
        darkLogoPublicId,
        lightLogoUrl,
        lightLogoPublicId,
        brandDescription: input.brandDescription !== undefined ? (input.brandDescription || null) : centralRow?.brandDescription ?? null,
        customerTitle: input.customerTitle !== undefined ? (input.customerTitle || null) : centralRow?.customerTitle ?? brandName,
        sellerPortalTitle,
        sellerPortalTagline,
        sellerPortalLogoUrl,
        sellerPortalLogoPublicId,
        browserTitle: str(input.browserTitle, brandName),
        seoTitle: str(input.seoTitle, brandName),
        seoDescription: str(input.seoDescription, centralRow?.seoDescription || DEFAULT_BRANDING.seoDescription),
        primaryColor: input.primaryColor ?? centralRow?.primaryColor ?? "#FF5722",
        secondaryColor: input.secondaryColor ?? centralRow?.secondaryColor ?? "#0EA5E9",
        supportEmail: input.supportEmail ?? centralRow?.supportEmail ?? null,
        supportPhone: input.supportPhone ?? centralRow?.supportPhone ?? null,
        heroBadge: str(input.heroBadge, centralRow?.heroBadge || DEFAULT_BRANDING.heroBadge),
        heroHeadingLine1: str(input.heroHeadingLine1, centralRow?.heroHeadingLine1 || DEFAULT_BRANDING.heroHeadingLine1),
        heroHeadingLine2: str(input.heroHeadingLine2, centralRow?.heroHeadingLine2 || DEFAULT_BRANDING.heroHeadingLine2),
        heroHeadingLine3: str(input.heroHeadingLine3, centralRow?.heroHeadingLine3 || DEFAULT_BRANDING.heroHeadingLine3),
        heroDescription: str(input.heroDescription, centralRow?.heroDescription || DEFAULT_BRANDING.heroDescription),
        searchPlaceholder: str(input.searchPlaceholder, centralRow?.searchPlaceholder || DEFAULT_BRANDING.searchPlaceholder),
        exploreShopsButtonText: str(input.exploreShopsButtonText, centralRow?.exploreShopsButtonText || DEFAULT_BRANDING.exploreShopsButtonText),
        browseProductsButtonText: str(input.browseProductsButtonText, centralRow?.browseProductsButtonText || DEFAULT_BRANDING.browseProductsButtonText),
        footerDescription: str(input.footerDescription, centralRow?.footerDescription || DEFAULT_BRANDING.footerDescription),
        updatedBy: adminId ?? "system"
    };

    // 1. Persist Authoritative Central CUSTOMER row
    await prisma.marketplaceBranding.upsert({
        where: { app: "CUSTOMER" },
        update: commonData,
        create: { app: "CUSTOMER", ...commonData }
    });

    // 2. Automatically synchronize SELLER row with central brand assets
    const sellerSyncData = {
        brandName: sellerPortalTitle || `${brandName} Seller Portal`,
        shortName: "Seller",
        tagline: sellerPortalTagline || "Manage your storefront, products, and incoming orders.",
        logoUrl: sellerPortalLogoUrl || logoUrl,
        logoPublicId: sellerPortalLogoPublicId || logoPublicId,
        faviconUrl: faviconUrl || logoUrl,
        faviconPublicId,
        darkLogoUrl,
        darkLogoPublicId,
        lightLogoUrl,
        lightLogoPublicId,
        brandDescription: commonData.brandDescription,
        customerTitle: commonData.customerTitle,
        sellerPortalTitle,
        sellerPortalTagline,
        sellerPortalLogoUrl,
        sellerPortalLogoPublicId,
        browserTitle: `${sellerPortalTitle || `${brandName} Seller Portal`}`,
        seoTitle: `${sellerPortalTitle || `${brandName} Seller Portal`} | ${brandName}`,
        seoDescription: `Manage your shop, products, orders, and sales on ${brandName}.`,
        primaryColor: commonData.primaryColor,
        secondaryColor: commonData.secondaryColor,
        supportEmail: commonData.supportEmail,
        supportPhone: commonData.supportPhone,
        updatedBy: adminId ?? "system"
    };

    await prisma.marketplaceBranding.upsert({
        where: { app: "SELLER" },
        update: sellerSyncData,
        create: { app: "SELLER", ...sellerSyncData }
    });

    // Invalidate caches across both applications
    invalidateBrandingCache("CUSTOMER");
    invalidateBrandingCache("SELLER");

    // Clean up replaced Cloudinary assets if any changed
    const replacedPublicIds = [
        centralRow?.logoPublicId && centralRow.logoPublicId !== logoPublicId ? centralRow.logoPublicId : null,
        centralRow?.faviconPublicId && centralRow.faviconPublicId !== faviconPublicId ? centralRow.faviconPublicId : null,
        sellerRow?.logoPublicId && sellerRow.logoPublicId !== logoPublicId && sellerRow.logoPublicId !== sellerPortalLogoPublicId ? sellerRow.logoPublicId : null,
    ].filter((publicId): publicId is string => Boolean(publicId));

    for (const publicId of replacedPublicIds) {
        try {
            await storageService.deleteImage({ publicId });
        } catch (error) {
            console.error("FAILED TO REMOVE REPLACED BRANDING IMAGE:", error);
        }
    }

    return getBrandingConfiguration(app);
};

/** Admin-facing payload (row-shaped, includes editable non-public fields). */
export const getBrandingSettings = async (app: BrandingApp = "CUSTOMER") => {
    const [branding, row] = await Promise.all([
        getBrandingConfiguration(app),
        prisma.marketplaceBranding.findUnique({ where: { app: "CUSTOMER" } })
    ]);
    return {
        branding: {
            ...branding,
            logoPublicId: row?.logoPublicId ?? null,
            faviconPublicId: row?.faviconPublicId ?? null,
            darkLogoUrl: row?.darkLogoUrl ?? null,
            darkLogoPublicId: row?.darkLogoPublicId ?? null,
            lightLogoUrl: row?.lightLogoUrl ?? null,
            lightLogoPublicId: row?.lightLogoPublicId ?? null,
            brandDescription: row?.brandDescription ?? null,
            customerTitle: row?.customerTitle ?? null,
            sellerPortalTitle: row?.sellerPortalTitle ?? null,
            sellerPortalTagline: row?.sellerPortalTagline ?? null,
            sellerPortalLogoUrl: row?.sellerPortalLogoUrl ?? null,
            sellerPortalLogoPublicId: row?.sellerPortalLogoPublicId ?? null,
        }
    };
};

