import axios from "axios";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { GoogleMapsService } from "../../modules/delivery/services/googleMaps.service.js";

export type ServiceabilityStatus =
    | "AVAILABLE"
    | "COMING_SOON"
    | "DISTRICT_DISABLED"
    | "TOWN_DISABLED"
    | "SERVICE_AREA_DISABLED"
    | "CUSTOMER_UNAVAILABLE"
    | "SELLER_UNAVAILABLE"
    | "MAINTENANCE"
    | "LOCATION_UNRESOLVED"
    | "SERVICEABLE"
    | "NOT_SERVICEABLE"
    | "UNKNOWN";

export interface ServiceabilityCheckParams {
    stateId?: string;
    districtId?: string;
    townId?: string;
    serviceAreaId?: string;
    state?: string;
    district?: string;
    city?: string;
    town?: string;
    serviceArea?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    userRole?: "CUSTOMER" | "SELLER" | "GUEST";
}

export interface ServiceabilityCheckResult {
    status: ServiceabilityStatus;
    isServiceable: boolean;
    inheritedStatus: string; // ENABLED, DISABLED_BY_STATE, DISABLED_BY_DISTRICT, DISABLED_BY_CITY, DISABLED_BY_SERVICE_AREA, MAINTENANCE, COMING_SOON, NOT_CONFIGURED, LOCATION_UNRESOLVED
    districtId?: string;
    townId?: string;
    serviceAreaId?: string;
    state?: string;
    district?: string;
    city?: string;
    town?: string;
    serviceArea?: string;
    postalCode?: string;
    message: string;
    comingSoonMessage?: string | null;
    launchAnnouncement?: string | null;
    customerNotice?: string | null;
    sellerNotice?: string | null;
    allowCustomerBrowsing: boolean;
    allowCustomerOrdering: boolean;
    allowSellerRegistration: boolean;
    allowShopCreation: boolean;
    deliveryEnabled: boolean;
    availableStates?: Array<{ id: string; name: string }>;
    availableDistricts?: Array<{ id: string; name: string; state: string }>;
    availableCities?: Array<{ id: string; name: string; district: string }>;
}

export interface GeocodeLocationResult {
    doorNo?: string;
    buildingName?: string;
    street?: string;
    cross?: string;
    area?: string;
    locality?: string;
    landmark?: string;
    addressLine1?: string;
    addressLine2?: string;
    state: string;
    district: string;
    city: string;
    country?: string;
    serviceArea?: string;
    postalCode?: string;
    latitude: number;
    longitude: number;
    formattedAddress?: string;
    precision?: string;
    hasMissingDoorNo?: boolean;
}

export interface AddressSearchResult {
    placeId: string;
    formattedAddress: string;
    latitude: number;
    longitude: number;
    doorNo?: string;
    buildingName?: string;
    street?: string;
    cross?: string;
    area?: string;
    locality?: string;
    landmark?: string;
    city: string;
    district: string;
    state: string;
    postalCode?: string;
    country: string;
    hasMissingDoorNo: boolean;
}

// Canonical district mapping and aliases
export const DISTRICT_ALIASES: Record<string, string> = {
    "mysore": "Mysuru",
    "mysore district": "Mysuru",
    "mysuru": "Mysuru",
    "mysuru district": "Mysuru",
    "mysuru city": "Mysuru",
    "mysore city": "Mysuru",
    "bangalore": "Bengaluru Urban",
    "bangalore urban": "Bengaluru Urban",
    "bangalore rural": "Bengaluru Rural",
    "bangalore city": "Bengaluru Urban",
    "bengaluru": "Bengaluru Urban",
    "bengaluru urban": "Bengaluru Urban",
    "bengaluru rural": "Bengaluru Rural",
    "bengaluru city": "Bengaluru Urban",
    "belgaum": "Belagavi",
    "belgaum district": "Belagavi",
    "belagavi": "Belagavi",
    "belagavi district": "Belagavi",
    "bellary": "Ballari",
    "bellary district": "Ballari",
    "ballari": "Ballari",
    "ballari district": "Ballari",
    "bijapur": "Vijayapura",
    "bijapur district": "Vijayapura",
    "vijayapura": "Vijayapura",
    "vijayapura district": "Vijayapura",
    "gulbarga": "Kalaburagi",
    "gulbarga district": "Kalaburagi",
    "kalaburagi": "Kalaburagi",
    "kalaburagi district": "Kalaburagi",
    "chikmagalur": "Chikkamagaluru",
    "chikmagalur district": "Chikkamagaluru",
    "chickmagalur": "Chikkamagaluru",
    "chikkamagaluru": "Chikkamagaluru",
    "chikkamagaluru district": "Chikkamagaluru",
    "tumkur": "Tumakuru",
    "tumkur district": "Tumakuru",
    "tumakuru": "Tumakuru",
    "tumakuru district": "Tumakuru",
    "shimoga": "Shivamogga",
    "shimoga district": "Shivamogga",
    "shivamogga": "Shivamogga",
    "shivamogga district": "Shivamogga",
    "mangalore": "Dakshina Kannada",
    "mangalore district": "Dakshina Kannada",
    "mangaluru": "Dakshina Kannada",
    "mangaluru district": "Dakshina Kannada",
    "dakshina kannada": "Dakshina Kannada",
    "dakshina kannada district": "Dakshina Kannada",
    "uttara kannada": "Uttara Kannada",
    "uttara kannada district": "Uttara Kannada",
    "hubli": "Dharwad",
    "hubli district": "Dharwad",
    "hubballi": "Dharwad",
    "dharwad": "Dharwad",
    "dharwad district": "Dharwad",
    "dharwad-hubli": "Dharwad",
    "coorg": "Kodagu",
    "coorg district": "Kodagu",
    "kodagu": "Kodagu",
    "kodagu district": "Kodagu",
    "chamarajanagar": "Chamarajanagar",
    "chamarajanagar district": "Chamarajanagar",
    "chamarajanagara": "Chamarajanagar",
    "ramanagara": "Ramanagara",
    "ramanagara district": "Ramanagara",
    "ramnagaram": "Ramanagara",
    "vijayanagara": "Vijayanagara",
    "vijayanagara district": "Vijayanagara",
    "vijayanagar": "Vijayanagara",
    "hassan": "Hassan",
    "hassan district": "Hassan",
    "haveri": "Haveri",
    "haveri district": "Haveri",
    "mandya": "Mandya",
    "mandya district": "Mandya",
    "udupi": "Udupi",
    "udupi district": "Udupi",
    "yadgir": "Yadgir",
    "yadgir district": "Yadgir",
    "raichur": "Raichur",
    "raichur district": "Raichur",
    "koppal": "Koppal",
    "koppal district": "Koppal",
    "kolar": "Kolar",
    "kolar district": "Kolar",
    "gadag": "Gadag",
    "gadag district": "Gadag",
    "davanagere": "Davanagere",
    "davanagere district": "Davanagere",
    "chitradurga": "Chitradurga",
    "chitradurga district": "Chitradurga",
    "chikkaballapur": "Chikkaballapur",
    "chikkaballapur district": "Chikkaballapur",
    "bidar": "Bidar",
    "bidar district": "Bidar",
    "bagalkote": "Bagalkote",
    "bagalkote district": "Bagalkote",
    "bagalkot": "Bagalkote",
};

/**
 * Normalizes raw location strings by stripping administrative suffixes
 * and resolving against canonical district alias maps.
 */
export function normalizeDistrictName(rawName?: string): string {
    if (!rawName) return "";
    const trimmed = rawName.trim();
    const lower = trimmed.toLowerCase();
    if (DISTRICT_ALIASES[lower]) {
        return DISTRICT_ALIASES[lower];
    }

    // Strip suffixes: " District", " Dist", " Dist.", " Taluk", " Taluka", " City"
    const stripped = trimmed.replace(/\s+(district|dist\.?|taluk|taluka|city)$/i, "").trim();
    if (DISTRICT_ALIASES[stripped.toLowerCase()]) {
        return DISTRICT_ALIASES[stripped.toLowerCase()];
    }

    return stripped || trimmed;
}

export class ServiceabilityService {
    /**
     * Determine whether the marketplace currently serves the given location with
     * strict hierarchical inheritance enforcement:
     * Global Policy -> State -> District -> City/Town -> Service Area
     */
    static async checkServiceability(params: ServiceabilityCheckParams): Promise<ServiceabilityCheckResult> {
        let rawState = params.state?.trim();
        const rawDistrictOrCity = (params.district || params.city)?.trim();
        const rawTown = params.town?.trim();
        const rawServiceArea = params.serviceArea?.trim();
        const postalCode = params.postalCode?.trim();
        const role = (params.userRole || "CUSTOMER").toUpperCase() as "CUSTOMER" | "SELLER" | "GUEST";

        // Query active states for fallback selection lists
        let activeStates = await prisma.state.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        });

        // Query all active districts across active states (or all active districts if states table is empty)
        const activeDistrictWhere: any = {
            isActive: true,
            maintenanceMode: false,
        };
        if (activeStates.length > 0) {
            activeDistrictWhere.state = { in: activeStates.map(s => s.name) };
        }

        const activeDistricts = await prisma.city.findMany({
            where: activeDistrictWhere,
            select: { id: true, name: true, state: true },
            orderBy: { name: "asc" }
        });

        // 1. Direct Resolution by Database ID (Highest Fidelity)
        let district: any = null;
        if (params.districtId) {
            district = await prisma.city.findUnique({
                where: { id: params.districtId },
                include: {
                    cityTowns: true,
                    serviceAreas: true
                }
            });
            if (district && !rawState) {
                rawState = district.state;
            }
        }

        // If no state and no district ID and no district string
        if (!rawState && !district && !rawDistrictOrCity) {
            return {
                status: "UNKNOWN",
                isServiceable: false,
                inheritedStatus: "NOT_CONFIGURED",
                message: "Please select or provide a location to check service availability.",
                allowCustomerBrowsing: false,
                allowCustomerOrdering: false,
                allowSellerRegistration: false,
                allowShopCreation: false,
                deliveryEnabled: false,
                availableStates: activeStates,
                availableDistricts: activeDistricts,
            };
        }

        // 2. Verify State Level
        let stateRecord: any = null;
        if (rawState) {
            stateRecord = await prisma.state.findFirst({
                where: {
                    name: { equals: rawState, mode: "insensitive" }
                }
            });
        }

        // If states table has rows and the requested state is explicitly disabled
        if (stateRecord && !stateRecord.isActive) {
            return {
                status: "COMING_SOON",
                isServiceable: false,
                inheritedStatus: "DISABLED_BY_STATE",
                state: rawState,
                district: rawDistrictOrCity,
                message: `AtlasBasket is coming soon to ${rawState}! We are actively expanding to your state.`,
                allowCustomerBrowsing: false,
                allowCustomerOrdering: false,
                allowSellerRegistration: false,
                allowShopCreation: false,
                deliveryEnabled: false,
                availableStates: activeStates,
                availableDistricts: activeDistricts,
            };
        }

        // 3. District-Level Resolution
        if (!district) {
            if (!rawDistrictOrCity) {
                // District is required by marketplace policy
                return {
                    status: "NOT_SERVICEABLE",
                    isServiceable: false,
                    inheritedStatus: "DISTRICT_REQUIRED",
                    state: rawState || "Karnataka",
                    message: `Please specify a district to check serviceability.`,
                    allowCustomerBrowsing: true,
                    allowCustomerOrdering: false,
                    allowSellerRegistration: false,
                    allowShopCreation: false,
                    deliveryEnabled: false,
                    availableStates: activeStates,
                    availableDistricts: activeDistricts,
                };
            }

            const normalizedSearchDistrict = normalizeDistrictName(rawDistrictOrCity);

            const districtQueryConditions: any[] = [
                { name: { equals: normalizedSearchDistrict, mode: "insensitive" } },
                { displayName: { equals: normalizedSearchDistrict, mode: "insensitive" } },
                { name: { equals: rawDistrictOrCity, mode: "insensitive" } },
                { displayName: { equals: rawDistrictOrCity, mode: "insensitive" } },
            ];

            // If rawDistrictOrCity had "District" stripped, also match the stripped term
            const stripped = rawDistrictOrCity.replace(/\s+(district|dist\.?|taluk|taluka|city)$/i, "").trim();
            if (stripped && stripped !== rawDistrictOrCity && stripped !== normalizedSearchDistrict) {
                districtQueryConditions.push(
                    { name: { equals: stripped, mode: "insensitive" } },
                    { displayName: { equals: stripped, mode: "insensitive" } }
                );
            }

            // First search within specified state (if state provided)
            if (rawState) {
                district = await prisma.city.findFirst({
                    where: {
                        state: { equals: rawState, mode: "insensitive" },
                        OR: districtQueryConditions
                    },
                    include: {
                        cityTowns: true,
                        serviceAreas: true
                    }
                });
            }

            // Fallback: search across all states if state was mismatched or not passed
            if (!district) {
                district = await prisma.city.findFirst({
                    where: {
                        OR: districtQueryConditions
                    },
                    include: {
                        cityTowns: true,
                        serviceAreas: true
                    }
                });
            }
        }

        const stateDisplayName = district?.state || rawState || "Karnataka";
        const districtDisplayName = district ? (district.displayName || district.name) : (rawDistrictOrCity || "Your Location");

        if (!district) {
            return {
                status: "COMING_SOON",
                isServiceable: false,
                inheritedStatus: "NOT_CONFIGURED",
                state: stateDisplayName,
                district: districtDisplayName,
                message: `AtlasBasket has not yet launched in ${districtDisplayName}, ${stateDisplayName}. Coming soon!`,
                allowCustomerBrowsing: false,
                allowCustomerOrdering: false,
                allowSellerRegistration: false,
                allowShopCreation: false,
                deliveryEnabled: false,
                availableStates: activeStates,
                availableDistricts: activeDistricts,
            };
        }

        // Check if District Master is Disabled
        if (!district.isActive) {
            return {
                status: "DISTRICT_DISABLED",
                isServiceable: false,
                inheritedStatus: "DISABLED_BY_DISTRICT",
                districtId: district.id,
                state: district.state,
                district: district.displayName || district.name,
                message: district.comingSoonMessage || `AtlasBasket is currently not available in ${district.displayName || district.name}. Service is disabled.`,
                comingSoonMessage: district.comingSoonMessage,
                launchAnnouncement: district.launchAnnouncement,
                customerNotice: district.customerNoticeMessage,
                sellerNotice: district.sellerNoticeMessage,
                allowCustomerBrowsing: district.allowCustomerBrowsing,
                allowCustomerOrdering: false,
                allowSellerRegistration: false,
                allowShopCreation: false,
                deliveryEnabled: false,
                availableStates: activeStates,
                availableDistricts: activeDistricts,
            };
        }

        // Check Maintenance Mode
        if (district.maintenanceMode) {
            return {
                status: "MAINTENANCE",
                isServiceable: false,
                inheritedStatus: "MAINTENANCE",
                districtId: district.id,
                state: district.state,
                district: district.displayName || district.name,
                message: district.customerNoticeMessage || `Operations in ${district.displayName || district.name} are undergoing scheduled maintenance. Please check back shortly.`,
                comingSoonMessage: district.comingSoonMessage,
                customerNotice: district.customerNoticeMessage,
                sellerNotice: district.sellerNoticeMessage,
                allowCustomerBrowsing: district.allowCustomerBrowsing,
                allowCustomerOrdering: false,
                allowSellerRegistration: false,
                allowShopCreation: false,
                deliveryEnabled: false,
                availableStates: activeStates,
                availableDistricts: activeDistricts,
            };
        }

        // Check Launch Status
        if (district.launchStatus === "COMING_SOON" || district.launchStatus === "PLANNED") {
            return {
                status: "COMING_SOON",
                isServiceable: false,
                inheritedStatus: "COMING_SOON",
                districtId: district.id,
                state: district.state,
                district: district.displayName || district.name,
                message: district.comingSoonMessage || `AtlasBasket is coming soon to ${district.displayName || district.name}!`,
                comingSoonMessage: district.comingSoonMessage,
                launchAnnouncement: district.launchAnnouncement,
                customerNotice: district.customerNoticeMessage,
                sellerNotice: district.sellerNoticeMessage,
                allowCustomerBrowsing: district.allowCustomerBrowsing,
                allowCustomerOrdering: false,
                allowSellerRegistration: false,
                allowShopCreation: false,
                deliveryEnabled: false,
                availableStates: activeStates,
                availableDistricts: activeDistricts,
            };
        }

        // Role-specific availability checks
        if (role === "SELLER") {
            if (!district.isSellerEnabled || !district.allowSellerRegistration) {
                return {
                    status: "SELLER_UNAVAILABLE",
                    isServiceable: false,
                    inheritedStatus: "SELLER_DISABLED_BY_DISTRICT",
                    districtId: district.id,
                    state: district.state,
                    district: district.displayName || district.name,
                    message: district.sellerNoticeMessage || `Seller operations are currently not enabled in ${district.displayName || district.name}.`,
                    sellerNotice: district.sellerNoticeMessage,
                    allowCustomerBrowsing: district.allowCustomerBrowsing,
                    allowCustomerOrdering: district.allowCustomerOrdering,
                    allowSellerRegistration: false,
                    allowShopCreation: district.allowShopCreation,
                    deliveryEnabled: district.isDeliveryEnabled,
                    availableStates: activeStates,
                    availableDistricts: activeDistricts,
                };
            }
        }

        if (role === "CUSTOMER") {
            if (!district.isCustomerEnabled) {
                return {
                    status: "CUSTOMER_UNAVAILABLE",
                    isServiceable: false,
                    inheritedStatus: "CUSTOMER_DISABLED_BY_DISTRICT",
                    districtId: district.id,
                    state: district.state,
                    district: district.displayName || district.name,
                    message: district.customerNoticeMessage || `Customer operations are currently unavailable in ${district.displayName || district.name}.`,
                    customerNotice: district.customerNoticeMessage,
                    allowCustomerBrowsing: district.allowCustomerBrowsing,
                    allowCustomerOrdering: false,
                    allowSellerRegistration: district.allowSellerRegistration,
                    allowShopCreation: district.allowShopCreation,
                    deliveryEnabled: district.isDeliveryEnabled,
                    availableStates: activeStates,
                    availableDistricts: activeDistricts,
                };
            }
        }

        // 4. City / Town Availability Check
        let matchedTown: any = null;
        if (params.townId) {
            matchedTown = district.cityTowns.find((t: any) => t.id === params.townId);
        } else if (rawTown) {
            matchedTown = district.cityTowns.find(
                (t: any) => t.name.toLowerCase() === rawTown.toLowerCase() ||
                     (t.displayName && t.displayName.toLowerCase() === rawTown.toLowerCase())
            );
        }

        if (matchedTown) {
            const resolvedCityTownName = matchedTown.displayName || matchedTown.name;
            if (!matchedTown.isActive) {
                return {
                    status: "TOWN_DISABLED",
                    isServiceable: false,
                    inheritedStatus: "DISABLED_BY_CITY",
                    districtId: district.id,
                    townId: matchedTown.id,
                    state: district.state,
                    district: district.displayName || district.name,
                    city: resolvedCityTownName,
                    town: resolvedCityTownName,
                    message: `Service is currently suspended in ${resolvedCityTownName}.`,
                    allowCustomerBrowsing: district.allowCustomerBrowsing,
                    allowCustomerOrdering: false,
                    allowSellerRegistration: false,
                    allowShopCreation: false,
                    deliveryEnabled: false,
                    availableStates: activeStates,
                    availableDistricts: activeDistricts,
                };
            }
        }

        // 5. Service Area Check (by ID or name)
        let matchedArea: any = null;
        if (params.serviceAreaId) {
            matchedArea = district.serviceAreas.find((a: any) => a.id === params.serviceAreaId);
        } else if (rawServiceArea) {
            matchedArea = district.serviceAreas.find(
                (a: any) => a.name.toLowerCase() === rawServiceArea.toLowerCase()
            );
        }

        if (matchedArea) {
            // If matching service area belongs to a parent town, verify town is active
            if (matchedArea.cityTownId) {
                const parentTown = district.cityTowns.find((t: any) => t.id === matchedArea.cityTownId);
                if (parentTown && !parentTown.isActive) {
                    return {
                        status: "TOWN_DISABLED",
                        isServiceable: false,
                        inheritedStatus: "DISABLED_BY_CITY",
                        districtId: district.id,
                        townId: parentTown.id,
                        serviceAreaId: matchedArea.id,
                        state: district.state,
                        district: district.displayName || district.name,
                        city: parentTown.displayName || parentTown.name,
                        town: parentTown.displayName || parentTown.name,
                        serviceArea: matchedArea.name,
                        message: `Service in ${matchedArea.name} is unavailable because parent town ${parentTown.displayName || parentTown.name} is disabled.`,
                        allowCustomerBrowsing: district.allowCustomerBrowsing,
                        allowCustomerOrdering: false,
                        allowSellerRegistration: false,
                        allowShopCreation: false,
                        deliveryEnabled: false,
                        availableStates: activeStates,
                        availableDistricts: activeDistricts,
                    };
                }
            }

            if (!matchedArea.isActive) {
                return {
                    status: "SERVICE_AREA_DISABLED",
                    isServiceable: false,
                    inheritedStatus: "DISABLED_BY_SERVICE_AREA",
                    districtId: district.id,
                    townId: matchedArea.cityTownId || undefined,
                    serviceAreaId: matchedArea.id,
                    state: district.state,
                    district: district.displayName || district.name,
                    city: matchedTown?.displayName || matchedTown?.name,
                    town: matchedTown?.displayName || matchedTown?.name,
                    serviceArea: matchedArea.name,
                    message: `Service is currently unavailable in the ${matchedArea.name} coverage area.`,
                    allowCustomerBrowsing: district.allowCustomerBrowsing,
                    allowCustomerOrdering: false,
                    allowSellerRegistration: false,
                    allowShopCreation: false,
                    deliveryEnabled: false,
                    availableStates: activeStates,
                    availableDistricts: activeDistricts,
                };
            }
        }

        // 6. Postal Code Check
        if (postalCode && district.serviceAreas.length > 0) {
            const areasWithPostalCodes = district.serviceAreas.filter((a: any) => a.postalCodes && a.postalCodes.length > 0);
            if (areasWithPostalCodes.length > 0) {
                const matchingArea = areasWithPostalCodes.find((a: any) => a.postalCodes.includes(postalCode));
                if (matchingArea) {
                    if (matchingArea.cityTownId) {
                        const parentTown = district.cityTowns.find((t: any) => t.id === matchingArea.cityTownId);
                        if (parentTown && !parentTown.isActive) {
                            return {
                                status: "TOWN_DISABLED",
                                isServiceable: false,
                                inheritedStatus: "DISABLED_BY_CITY",
                                districtId: district.id,
                                townId: parentTown.id,
                                serviceAreaId: matchingArea.id,
                                state: district.state,
                                district: district.displayName || district.name,
                                postalCode,
                                city: parentTown.displayName || parentTown.name,
                                town: parentTown.displayName || parentTown.name,
                                serviceArea: matchingArea.name,
                                message: `Delivery to PIN code ${postalCode} (${matchingArea.name}) is unavailable because parent town ${parentTown.displayName || parentTown.name} is disabled.`,
                                allowCustomerBrowsing: district.allowCustomerBrowsing,
                                allowCustomerOrdering: false,
                                allowSellerRegistration: false,
                                allowShopCreation: false,
                                deliveryEnabled: false,
                                availableStates: activeStates,
                                availableDistricts: activeDistricts,
                            };
                        }
                    }

                    if (!matchingArea.isActive) {
                        return {
                            status: "SERVICE_AREA_DISABLED",
                            isServiceable: false,
                            inheritedStatus: "DISABLED_BY_SERVICE_AREA",
                            districtId: district.id,
                            townId: matchingArea.cityTownId || undefined,
                            serviceAreaId: matchingArea.id,
                            state: district.state,
                            district: district.displayName || district.name,
                            postalCode,
                            serviceArea: matchingArea.name,
                            message: `Delivery is currently paused for PIN code ${postalCode} (${matchingArea.name}).`,
                            allowCustomerBrowsing: district.allowCustomerBrowsing,
                            allowCustomerOrdering: false,
                            allowSellerRegistration: false,
                            allowShopCreation: false,
                            deliveryEnabled: false,
                            availableStates: activeStates,
                            availableDistricts: activeDistricts,
                        };
                    }
                }
            }
        }

        // District is fully operational and serviceable
        const resolvedCityName = matchedTown?.displayName || matchedTown?.name || district.displayName || district.name;

        return {
            status: "AVAILABLE",
            isServiceable: true,
            inheritedStatus: "ENABLED",
            districtId: district.id,
            townId: matchedTown?.id,
            serviceAreaId: matchedArea?.id,
            state: district.state,
            district: district.displayName || district.name,
            city: resolvedCityName,
            town: matchedTown?.displayName || matchedTown?.name,
            postalCode,
            serviceArea: matchedArea?.name || rawServiceArea,
            message: `Delivery is active in ${district.displayName || district.name}, ${district.state}.`,
            comingSoonMessage: district.comingSoonMessage,
            launchAnnouncement: district.launchAnnouncement,
            customerNotice: district.customerNoticeMessage,
            sellerNotice: district.sellerNoticeMessage,
            allowCustomerBrowsing: district.allowCustomerBrowsing,
            allowCustomerOrdering: district.allowCustomerOrdering,
            allowSellerRegistration: district.allowSellerRegistration,
            allowShopCreation: district.allowShopCreation,
            deliveryEnabled: district.isDeliveryEnabled,
            availableStates: activeStates,
            availableDistricts: activeDistricts,
        };
    }

    /**
     * Resolve GPS coordinates to human-readable administrative hierarchy.
     * Extracts full Indian address components (Door/Flat No, Building, Street, Cross, Area, Landmark, City, District, State, PIN).
     * NEVER defaults to Mysuru or any arbitrary district on resolution failure.
     */
    static async resolveCoordinates(latitude: number, longitude: number): Promise<GeocodeLocationResult> {
        const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

        if (apiKey) {
            try {
                const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
                const response = await axios.get(url, { timeout: 4000 });
                if (response.data?.status === "OK" && response.data?.results?.length > 0) {
                    const result = response.data.results[0];
                    let streetNumber = "";
                    let route = "";
                    let premise = "";
                    let subpremise = "";
                    let sublocality = "";
                    let neighborhood = "";
                    let locality = "";
                    let district = "";
                    let state = "";
                    let country = "India";
                    let postalCode = "";
                    let serviceArea = "";
                    let pointOfInterest = "";

                    for (const comp of result.address_components) {
                        const types = comp.types;
                        if (types.includes("street_number")) {
                            streetNumber = comp.long_name;
                        } else if (types.includes("route")) {
                            route = comp.long_name;
                        } else if (types.includes("premise")) {
                            premise = comp.long_name;
                        } else if (types.includes("subpremise")) {
                            subpremise = comp.long_name;
                        } else if (types.includes("sublocality_level_1") || types.includes("sublocality")) {
                            sublocality = comp.long_name;
                            serviceArea = comp.long_name;
                        } else if (types.includes("neighborhood") || types.includes("sublocality_level_2")) {
                            neighborhood = comp.long_name;
                        } else if (types.includes("locality")) {
                            locality = comp.long_name;
                        } else if (types.includes("administrative_area_level_2")) {
                            district = comp.long_name;
                        } else if (types.includes("administrative_area_level_1")) {
                            state = comp.long_name;
                        } else if (types.includes("country")) {
                            country = comp.long_name;
                        } else if (types.includes("postal_code")) {
                            postalCode = comp.long_name;
                        } else if (types.includes("point_of_interest") || types.includes("landmark")) {
                            pointOfInterest = comp.long_name;
                        }
                    }

                    const doorNo = subpremise || streetNumber || "";
                    const buildingName = premise || "";
                    const street = route || "";
                    const cross = neighborhood && neighborhood !== sublocality && (neighborhood.toLowerCase().includes("cross") || neighborhood.toLowerCase().includes("main")) ? neighborhood : "";
                    const area = sublocality || neighborhood || "";
                    const landmark = pointOfInterest || "";

                    // Build addressLine1: doorNo, building, street
                    const line1Components: string[] = [];
                    if (doorNo) line1Components.push(doorNo);
                    if (buildingName && !doorNo.includes(buildingName)) line1Components.push(buildingName);
                    if (street && !line1Components.includes(street)) line1Components.push(street);
                    const addressLine1 = line1Components.length > 0
                        ? line1Components.join(", ")
                        : (street || area || locality || "");

                    // Build addressLine2: cross, area, landmark
                    const line2Components: string[] = [];
                    if (cross) line2Components.push(cross);
                    if (area && !addressLine1.includes(area) && !line2Components.includes(area)) {
                        line2Components.push(area);
                    }
                    if (landmark && !addressLine1.includes(landmark) && !line2Components.includes(landmark)) {
                        line2Components.push(`Near ${landmark}`);
                    }
                    const addressLine2 = line2Components.join(", ");

                    // Clean and validate Indian 6-digit PIN code
                    const cleanPostal = postalCode.replace(/\D/g, "");
                    const validPostal = cleanPostal.length === 6 ? cleanPostal : postalCode;

                    // Canonical alias normalization
                    const canonicalDistrict = normalizeDistrictName(district || locality);
                    const locationType = result.geometry?.location_type || "APPROXIMATE";

                    return {
                        doorNo: doorNo || undefined,
                        buildingName: buildingName || undefined,
                        street: street || undefined,
                        cross: cross || undefined,
                        area: area || undefined,
                        locality: locality || sublocality || undefined,
                        landmark: landmark || undefined,
                        addressLine1: addressLine1 || undefined,
                        addressLine2: addressLine2 || undefined,
                        state,
                        district: canonicalDistrict,
                        city: locality || canonicalDistrict,
                        country: country || "India",
                        serviceArea: serviceArea || undefined,
                        postalCode: validPostal || undefined,
                        latitude,
                        longitude,
                        formattedAddress: result.formatted_address,
                        precision: locationType,
                        hasMissingDoorNo: Boolean(!doorNo && !buildingName)
                    };
                }
            } catch (err: any) {
                logger.warn(`[ServiceabilityService] Google reverse geocode error: ${err?.message}`);
            }
        }

        // OpenStreetMap Nominatim Fallback
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
            const response = await axios.get(url, {
                timeout: 4000,
                headers: { "User-Agent": "AtlasBasket/1.0" }
            });

            if (response.data && response.data.address) {
                const addr = response.data.address;
                const doorNo = addr.house_number || "";
                const buildingName = addr.house_name || addr.building || "";
                const street = addr.road || addr.pedestrian || addr.footway || addr.path || addr.street || "";
                const cross = addr.neighbourhood && (addr.neighbourhood.toLowerCase().includes("cross") || addr.neighbourhood.toLowerCase().includes("main")) ? addr.neighbourhood : "";
                const area = addr.suburb || addr.neighbourhood || addr.residential || addr.subdivision || "";
                const city = addr.city || addr.town || addr.village || addr.municipality || "";
                const rawDistrict = addr.state_district || addr.county || addr.district || city || "";
                const state = addr.state || "";
                const country = addr.country || "India";
                const postalCode = addr.postcode || "";
                const landmark = addr.amenity || addr.landmark || "";

                const line1Components: string[] = [];
                if (doorNo) line1Components.push(doorNo);
                if (buildingName) line1Components.push(buildingName);
                if (street && !line1Components.includes(street)) line1Components.push(street);
                const addressLine1 = line1Components.length > 0
                    ? line1Components.join(", ")
                    : (street || area || city || "");

                const line2Components: string[] = [];
                if (cross) line2Components.push(cross);
                if (area && !addressLine1.includes(area)) line2Components.push(area);
                if (landmark && !addressLine1.includes(landmark)) line2Components.push(`Near ${landmark}`);
                if (addr.hamlet && !addressLine1.includes(addr.hamlet) && !line2Components.includes(addr.hamlet)) {
                    line2Components.push(addr.hamlet);
                }
                const addressLine2 = line2Components.join(", ");

                const cleanPostal = postalCode.replace(/\D/g, "");
                const validPostal = cleanPostal.length === 6 ? cleanPostal : postalCode;

                const canonicalDistrict = normalizeDistrictName(rawDistrict || city);

                return {
                    doorNo: doorNo || undefined,
                    buildingName: buildingName || undefined,
                    street: street || undefined,
                    cross: cross || undefined,
                    area: area || undefined,
                    locality: city || area || undefined,
                    landmark: landmark || undefined,
                    addressLine1: addressLine1 || undefined,
                    addressLine2: addressLine2 || undefined,
                    state,
                    district: canonicalDistrict,
                    city: city || canonicalDistrict,
                    country: country || "India",
                    serviceArea: area || undefined,
                    postalCode: validPostal || undefined,
                    latitude,
                    longitude,
                    formattedAddress: response.data.display_name,
                    precision: doorNo ? "ROOFTOP" : street ? "RANGE_INTERPOLATED" : "APPROXIMATE",
                    hasMissingDoorNo: Boolean(!doorNo && !buildingName)
                };
            }
        } catch (err: any) {
            logger.warn(`[ServiceabilityService] Nominatim reverse geocode error: ${err?.message}`);
        }

        // Return empty result when resolution fails - never substitute an arbitrary district
        return {
            doorNo: undefined,
            buildingName: undefined,
            street: undefined,
            cross: undefined,
            area: undefined,
            locality: undefined,
            landmark: undefined,
            addressLine1: undefined,
            addressLine2: undefined,
            state: "",
            district: "",
            city: "",
            country: "India",
            latitude,
            longitude,
            formattedAddress: undefined,
            precision: "UNKNOWN",
            hasMissingDoorNo: true
        };
    }

    /**
     * Search address, locality, landmark, or building for autocomplete
     */
    static async searchAddress(query: string, cityHint?: string): Promise<AddressSearchResult[]> {
        const cleanQuery = query.trim();
        if (!cleanQuery) return [];

        const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
        const results: AddressSearchResult[] = [];

        if (apiKey) {
            try {
                const fullQuery = cityHint ? `${cleanQuery}, ${cityHint}, India` : `${cleanQuery}, India`;
                const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullQuery)}&components=country:IN&key=${apiKey}`;
                const response = await axios.get(url, { timeout: 4000 });

                if (response.data?.status === "OK" && Array.isArray(response.data?.results)) {
                    for (const item of response.data.results.slice(0, 6)) {
                        let streetNumber = "";
                        let route = "";
                        let premise = "";
                        let subpremise = "";
                        let sublocality = "";
                        let neighborhood = "";
                        let locality = "";
                        let district = "";
                        let state = "";
                        let postalCode = "";
                        let landmark = "";

                        for (const comp of item.address_components || []) {
                            const types = comp.types || [];
                            if (types.includes("street_number")) streetNumber = comp.long_name;
                            else if (types.includes("route")) route = comp.long_name;
                            else if (types.includes("premise")) premise = comp.long_name;
                            else if (types.includes("subpremise")) subpremise = comp.long_name;
                            else if (types.includes("sublocality_level_1") || types.includes("sublocality")) sublocality = comp.long_name;
                            else if (types.includes("neighborhood") || types.includes("sublocality_level_2")) neighborhood = comp.long_name;
                            else if (types.includes("locality")) locality = comp.long_name;
                            else if (types.includes("administrative_area_level_2")) district = comp.long_name;
                            else if (types.includes("administrative_area_level_1")) state = comp.long_name;
                            else if (types.includes("postal_code")) postalCode = comp.long_name;
                            else if (types.includes("point_of_interest") || types.includes("landmark")) landmark = comp.long_name;
                        }

                        const doorNo = subpremise || streetNumber;
                        const buildingName = premise;
                        const cleanPostal = postalCode.replace(/\D/g, "");

                        results.push({
                            placeId: item.place_id || `google_${item.geometry.location.lat}_${item.geometry.location.lng}`,
                            formattedAddress: item.formatted_address,
                            latitude: item.geometry.location.lat,
                            longitude: item.geometry.location.lng,
                            doorNo: doorNo || undefined,
                            buildingName: buildingName || undefined,
                            street: route || undefined,
                            cross: neighborhood && (neighborhood.toLowerCase().includes("cross") || neighborhood.toLowerCase().includes("main")) ? neighborhood : undefined,
                            area: sublocality || neighborhood || undefined,
                            locality: locality || sublocality || undefined,
                            landmark: landmark || undefined,
                            city: locality || normalizeDistrictName(district) || "Mysuru",
                            district: normalizeDistrictName(district || locality),
                            state: state || "Karnataka",
                            postalCode: cleanPostal.length === 6 ? cleanPostal : undefined,
                            country: "India",
                            hasMissingDoorNo: Boolean(!doorNo && !buildingName),
                        });
                    }

                    if (results.length > 0) return results;
                }
            } catch (err: any) {
                logger.warn(`[ServiceabilityService] Google Geocode search error: ${err?.message}`);
            }
        }

        // OpenStreetMap Nominatim Search Fallback
        try {
            const fullQuery = cityHint && !cleanQuery.toLowerCase().includes(cityHint.toLowerCase()) 
                ? `${cleanQuery}, ${cityHint}, India` 
                : `${cleanQuery}, India`;

            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&addressdetails=1&countrycodes=in&limit=6`;
            const response = await axios.get(url, {
                timeout: 4000,
                headers: { "User-Agent": "AtlasBasket/1.0" }
            });

            if (Array.isArray(response.data)) {
                for (const item of response.data) {
                    const addr = item.address || {};
                    const doorNo = addr.house_number || "";
                    const buildingName = addr.house_name || addr.building || "";
                    const street = addr.road || addr.pedestrian || addr.street || "";
                    const cross = addr.neighbourhood && (addr.neighbourhood.toLowerCase().includes("cross") || addr.neighbourhood.toLowerCase().includes("main")) ? addr.neighbourhood : "";
                    const area = addr.suburb || addr.neighbourhood || addr.residential || "";
                    const city = addr.city || addr.town || addr.village || "";
                    const rawDistrict = addr.state_district || addr.county || addr.district || city || "";
                    const state = addr.state || "";
                    const postalCode = (addr.postcode || "").replace(/\D/g, "");
                    const landmark = addr.amenity || addr.landmark || "";

                    results.push({
                        placeId: String(item.place_id || `osm_${item.lat}_${item.lon}`),
                        formattedAddress: item.display_name,
                        latitude: parseFloat(item.lat),
                        longitude: parseFloat(item.lon),
                        doorNo: doorNo || undefined,
                        buildingName: buildingName || undefined,
                        street: street || undefined,
                        cross: cross || undefined,
                        area: area || undefined,
                        locality: city || area || undefined,
                        landmark: landmark || undefined,
                        city: city || normalizeDistrictName(rawDistrict) || "Mysuru",
                        district: normalizeDistrictName(rawDistrict || city),
                        state: state || "Karnataka",
                        postalCode: postalCode.length === 6 ? postalCode : undefined,
                        country: "India",
                        hasMissingDoorNo: Boolean(!doorNo && !buildingName),
                    });
                }
            }
        } catch (err: any) {
            logger.warn(`[ServiceabilityService] Nominatim search error: ${err?.message}`);
        }

        return results;
    }

    /**
     * Submit a Customer or Seller Location Request to launch in their city
     */
    static async submitLocationRequest(params: {
        requestType?: "CUSTOMER" | "SELLER";
        customerId?: string;
        sellerId?: string;
        name?: string;
        email?: string;
        phone?: string;
        state: string;
        district?: string;
        city?: string;
        postalCode?: string;
        latitude?: number;
        longitude?: number;
        notes?: string;
    }) {
        const state = params.state.trim();
        const district = (params.district || params.city)?.trim() || null;
        const city = (params.city || district)?.trim() || null;
        const requestType = params.requestType || "CUSTOMER";
        const email = params.email?.trim().toLowerCase() || null;

        if (!state) {
            throw new Error("State is required to submit a location request.");
        }

        // Check for recent duplicate request (within past 7 days) to avoid spam
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const duplicate = await prisma.locationRequest.findFirst({
            where: {
                requestType,
                state: { equals: state, mode: "insensitive" },
                ...(district ? { district: { equals: district, mode: "insensitive" } } : {}),
                createdAt: { gte: sevenDaysAgo },
                OR: [
                    ...(params.customerId ? [{ customerId: params.customerId }] : []),
                    ...(params.sellerId ? [{ sellerId: params.sellerId }] : []),
                    ...(email ? [{ email }] : [])
                ]
            }
        });

        if (duplicate) {
            return {
                request: duplicate,
                alreadySubmitted: true,
                message: "You have already submitted a launch request for this area. We have recorded your interest!"
            };
        }

        const request = await prisma.locationRequest.create({
            data: {
                requestType,
                customerId: params.customerId || null,
                sellerId: params.sellerId || null,
                name: params.name?.trim() || null,
                email,
                phone: params.phone?.trim() || null,
                state,
                district,
                city,
                postalCode: params.postalCode?.trim() || null,
                latitude: params.latitude !== undefined && params.latitude !== null ? params.latitude : null,
                longitude: params.longitude !== undefined && params.longitude !== null ? params.longitude : null,
                status: "PENDING",
            }
        });

        // Also add to legacy location notification subscriptions for backward compatibility
        try {
            await prisma.locationNotificationSubscription.create({
                data: {
                    customerId: params.customerId || null,
                    email,
                    state,
                    district,
                    city,
                    postalCode: params.postalCode?.trim() || null,
                    latitude: params.latitude !== undefined && params.latitude !== null ? params.latitude : null,
                    longitude: params.longitude !== undefined && params.longitude !== null ? params.longitude : null,
                    consent: true,
                }
            });
        } catch {
            // Ignore legacy subscription error
        }

        return {
            request,
            alreadySubmitted: false,
            message: "Thank you for requesting AtlasBasket in your area! We will notify you as soon as operations launch."
        };
    }

    /**
     * Legacy notify-me subscription method maintained for backward compatibility
     */
    static async subscribeNotifyMe(params: {
        customerId?: string;
        email?: string;
        state: string;
        district?: string;
        city?: string;
        postalCode?: string;
        latitude?: number;
        longitude?: number;
        consent: boolean;
    }) {
        return this.submitLocationRequest({
            requestType: "CUSTOMER",
            customerId: params.customerId,
            email: params.email,
            state: params.state,
            district: params.district,
            city: params.city,
            postalCode: params.postalCode,
            latitude: params.latitude,
            longitude: params.longitude,
        });
    }

    /**
     * Withdraw subscription
     */
    static async withdrawSubscription(id: string, customerId?: string) {
        const subscription = await prisma.locationNotificationSubscription.findUnique({
            where: { id },
        });

        if (!subscription) {
            throw new Error("Subscription not found.");
        }

        if (customerId && subscription.customerId && subscription.customerId !== customerId) {
            throw new Error("Unauthorized to withdraw this subscription.");
        }

        await prisma.locationNotificationSubscription.delete({
            where: { id },
        });

        return { success: true, message: "Subscription withdrawn successfully." };
    }
}
