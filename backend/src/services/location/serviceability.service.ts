import axios from "axios";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../config/logger.js";
import { GoogleMapsService } from "../../modules/delivery/services/googleMaps.service.js";

export type ServiceabilityStatus = "SERVICEABLE" | "NOT_SERVICEABLE" | "UNKNOWN";

export interface ServiceabilityCheckParams {
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
    inheritedStatus: string; // ENABLED, DISABLED_BY_STATE, DISABLED_BY_DISTRICT, DISABLED_BY_CITY, DISABLED_BY_SERVICE_AREA, MAINTENANCE, COMING_SOON, NOT_CONFIGURED
    state?: string;
    district?: string;
    city?: string;
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
    state: string;
    district: string;
    city: string;
    serviceArea?: string;
    postalCode?: string;
    latitude: number;
    longitude: number;
    formattedAddress?: string;
}

// Common district aliases to map GPS geocoded names to canonical seeded districts
const DISTRICT_ALIASES: Record<string, string> = {
    "mysore": "Mysuru",
    "bangalore": "Bengaluru Urban",
    "bangalore urban": "Bengaluru Urban",
    "bangalore rural": "Bengaluru Rural",
    "belgaum": "Belagavi",
    "bellary": "Ballari",
    "bijapur": "Vijayapura",
    "gulbarga": "Kalaburagi",
    "chikmagalur": "Chikkamagaluru",
    "chickmagalur": "Chikkamagaluru",
    "tumkur": "Tumakuru",
    "shimoga": "Shivamogga",
    "mangalore": "Dakshina Kannada",
    "mangaluru": "Dakshina Kannada",
    "hubli": "Dharwad",
    "dharwad-hubli": "Dharwad",
    "coorg": "Kodagu",
};

export class ServiceabilityService {
    /**
     * Determine whether the marketplace currently serves the given location with
     * strict hierarchical inheritance enforcement:
     * Global Policy -> State -> District -> City/Town -> Service Area
     */
    static async checkServiceability(params: ServiceabilityCheckParams): Promise<ServiceabilityCheckResult> {
        const rawState = params.state?.trim();
        const rawDistrictOrCity = (params.district || params.city)?.trim();
        const rawTown = params.town?.trim();
        const rawServiceArea = params.serviceArea?.trim();
        const postalCode = params.postalCode?.trim();
        const role = params.userRole || "CUSTOMER";

        // Query active states for fallback selection lists
        const activeStates = await prisma.state.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        });

        // Query all active districts across active states
        const activeDistricts = await prisma.city.findMany({
            where: {
                isActive: true,
                state: { in: activeStates.map(s => s.name) }
            },
            select: { id: true, name: true, state: true },
            orderBy: { name: "asc" }
        });

        if (!rawState) {
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

        // 1. Verify State Level
        const stateRecord = await prisma.state.findFirst({
            where: {
                name: { equals: rawState, mode: "insensitive" }
            }
        });

        if (!stateRecord || !stateRecord.isActive) {
            return {
                status: "NOT_SERVICEABLE",
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

        // 2. Fetch marketplace policy
        const marketplaceSetting = await prisma.marketplaceSetting.findUnique({ where: { id: 1 } });
        const settingsData = marketplaceSetting?.data as any;
        const districtRequired = settingsData?.districtRequired !== false;

        // Active districts for this specific active state
        const stateActiveDistricts = activeDistricts.filter(
            d => d.state.toLowerCase() === stateRecord.name.toLowerCase()
        );

        if (!rawDistrictOrCity) {
            if (districtRequired) {
                return {
                    status: "NOT_SERVICEABLE",
                    isServiceable: false,
                    inheritedStatus: "DISTRICT_REQUIRED",
                    state: stateRecord.name,
                    message: `Please specify a district in ${stateRecord.name} to check serviceability.`,
                    allowCustomerBrowsing: true,
                    allowCustomerOrdering: false,
                    allowSellerRegistration: false,
                    allowShopCreation: false,
                    deliveryEnabled: false,
                    availableStates: activeStates,
                    availableDistricts: stateActiveDistricts,
                };
            }

            return {
                status: "SERVICEABLE",
                isServiceable: true,
                inheritedStatus: "ENABLED_BY_STATE",
                state: stateRecord.name,
                message: `Service is available in ${stateRecord.name}.`,
                allowCustomerBrowsing: true,
                allowCustomerOrdering: true,
                allowSellerRegistration: true,
                allowShopCreation: true,
                deliveryEnabled: true,
                availableStates: activeStates,
                availableDistricts: stateActiveDistricts,
            };
        }

        // Canonical alias resolution for district names
        const normalizedSearchDistrict = DISTRICT_ALIASES[rawDistrictOrCity.toLowerCase()] || rawDistrictOrCity;

        // 3. District-Level Check
        const district = await prisma.city.findFirst({
            where: {
                state: { equals: stateRecord.name, mode: "insensitive" },
                OR: [
                    { name: { equals: normalizedSearchDistrict, mode: "insensitive" } },
                    { displayName: { equals: normalizedSearchDistrict, mode: "insensitive" } },
                    { name: { equals: rawDistrictOrCity, mode: "insensitive" } },
                    { displayName: { equals: rawDistrictOrCity, mode: "insensitive" } }
                ]
            },
            include: {
                cityTowns: true,
                serviceAreas: true
            }
        });

        if (!district) {
            return {
                status: "NOT_SERVICEABLE",
                isServiceable: false,
                inheritedStatus: "NOT_CONFIGURED",
                state: stateRecord.name,
                district: rawDistrictOrCity,
                message: `AtlasBasket has not yet launched in ${rawDistrictOrCity}, ${stateRecord.name}. Coming soon!`,
                allowCustomerBrowsing: false,
                allowCustomerOrdering: false,
                allowSellerRegistration: false,
                allowShopCreation: false,
                deliveryEnabled: false,
                availableStates: activeStates,
                availableDistricts: stateActiveDistricts,
            };
        }

        // Check if District is disabled
        if (!district.isActive) {
            return {
                status: "NOT_SERVICEABLE",
                isServiceable: false,
                inheritedStatus: "DISABLED_BY_DISTRICT",
                state: stateRecord.name,
                district: district.displayName || district.name,
                message: district.comingSoonMessage || `Service in ${district.displayName || district.name} is currently suspended or disabled.`,
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
                availableDistricts: stateActiveDistricts,
            };
        }

        // Check Maintenance Mode
        if (district.maintenanceMode) {
            return {
                status: "NOT_SERVICEABLE",
                isServiceable: false,
                inheritedStatus: "MAINTENANCE",
                state: stateRecord.name,
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
                availableDistricts: stateActiveDistricts,
            };
        }

        // Check Launch Status
        if (district.launchStatus === "COMING_SOON" || district.launchStatus === "PLANNED") {
            return {
                status: "NOT_SERVICEABLE",
                isServiceable: false,
                inheritedStatus: "COMING_SOON",
                state: stateRecord.name,
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
                availableDistricts: stateActiveDistricts,
            };
        }

        // Role-specific availability checks
        if (role === "SELLER" && (!district.isSellerEnabled || !district.allowSellerRegistration)) {
            return {
                status: "NOT_SERVICEABLE",
                isServiceable: false,
                inheritedStatus: "SELLER_DISABLED_BY_DISTRICT",
                state: stateRecord.name,
                district: district.displayName || district.name,
                message: district.sellerNoticeMessage || `New seller registrations and operations are temporarily paused in ${district.displayName || district.name}.`,
                sellerNotice: district.sellerNoticeMessage,
                allowCustomerBrowsing: district.allowCustomerBrowsing,
                allowCustomerOrdering: district.allowCustomerOrdering,
                allowSellerRegistration: false,
                allowShopCreation: district.allowShopCreation,
                deliveryEnabled: district.isDeliveryEnabled,
                availableStates: activeStates,
                availableDistricts: stateActiveDistricts,
            };
        }

        if (role === "CUSTOMER" && !district.isCustomerEnabled) {
            return {
                status: "NOT_SERVICEABLE",
                isServiceable: false,
                inheritedStatus: "CUSTOMER_DISABLED_BY_DISTRICT",
                state: stateRecord.name,
                district: district.displayName || district.name,
                message: district.customerNoticeMessage || `Customer operations are currently unavailable in ${district.displayName || district.name}.`,
                customerNotice: district.customerNoticeMessage,
                allowCustomerBrowsing: district.allowCustomerBrowsing,
                allowCustomerOrdering: false,
                allowSellerRegistration: district.allowSellerRegistration,
                allowShopCreation: district.allowShopCreation,
                deliveryEnabled: district.isDeliveryEnabled,
                availableStates: activeStates,
                availableDistricts: stateActiveDistricts,
            };
        }

        // 4. City / Town Geographical Resolution (Town is parent grouping metadata, not an independent activation gate)
        let resolvedCityTownName: string | undefined = undefined;
        if (rawTown) {
            const matchedTown = district.cityTowns.find(
                t => t.name.toLowerCase() === rawTown.toLowerCase() ||
                     (t.displayName && t.displayName.toLowerCase() === rawTown.toLowerCase())
            );

            if (matchedTown) {
                resolvedCityTownName = matchedTown.displayName || matchedTown.name;
            }
        }

        // 5. Service Area Check (if specified)
        if (rawServiceArea) {
            const matchedArea = district.serviceAreas.find(
                a => a.name.toLowerCase() === rawServiceArea.toLowerCase()
            );

            if (matchedArea) {
                if (!matchedArea.isActive) {
                    return {
                        status: "NOT_SERVICEABLE",
                        isServiceable: false,
                        inheritedStatus: "DISABLED_BY_SERVICE_AREA",
                        state: stateRecord.name,
                        district: district.displayName || district.name,
                        city: resolvedCityTownName,
                        serviceArea: matchedArea.name,
                        message: `Service is currently unavailable in the ${matchedArea.name} coverage area.`,
                        allowCustomerBrowsing: district.allowCustomerBrowsing,
                        allowCustomerOrdering: false,
                        allowSellerRegistration: false,
                        allowShopCreation: false,
                        deliveryEnabled: false,
                        availableStates: activeStates,
                        availableDistricts: stateActiveDistricts,
                    };
                }
            }
        }

        // 6. Postal Code Check (if district has configured service areas with postal codes)
        if (postalCode && district.serviceAreas.length > 0) {
            const areasWithPostalCodes = district.serviceAreas.filter(a => a.postalCodes && a.postalCodes.length > 0);
            if (areasWithPostalCodes.length > 0) {
                const matchingArea = areasWithPostalCodes.find(a => a.postalCodes.includes(postalCode));
                if (matchingArea) {
                    if (!matchingArea.isActive) {
                        return {
                            status: "NOT_SERVICEABLE",
                            isServiceable: false,
                            inheritedStatus: "DISABLED_BY_SERVICE_AREA",
                            state: stateRecord.name,
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
                            availableDistricts: stateActiveDistricts,
                        };
                    }
                }
            }
        }

        // District is fully operational
        return {
            status: "SERVICEABLE",
            isServiceable: true,
            inheritedStatus: "ENABLED",
            state: stateRecord.name,
            district: district.displayName || district.name,
            city: resolvedCityTownName || district.name,
            postalCode,
            serviceArea: rawServiceArea,
            message: `Delivery is active in ${district.displayName || district.name}, ${stateRecord.name}.`,
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
            availableDistricts: stateActiveDistricts,
        };
    }

    /**
     * Resolve GPS coordinates to human-readable administrative hierarchy
     * using Google Maps Geocoding (if key available) or Nominatim OSM fallback.
     */
    static async resolveCoordinates(latitude: number, longitude: number): Promise<GeocodeLocationResult> {
        const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

        if (apiKey) {
            try {
                const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
                const response = await axios.get(url, { timeout: 4000 });
                if (response.data?.status === "OK" && response.data?.results?.length > 0) {
                    const result = response.data.results[0];
                    let state = "Karnataka";
                    let district = "Mysuru";
                    let city = "Mysuru";
                    let postalCode = "";
                    let serviceArea = "";

                    for (const comp of result.address_components) {
                        const types = comp.types;
                        if (types.includes("administrative_area_level_1")) {
                            state = comp.long_name;
                        } else if (types.includes("administrative_area_level_2")) {
                            district = comp.long_name;
                        } else if (types.includes("locality")) {
                            city = comp.long_name;
                        } else if (types.includes("sublocality") || types.includes("sublocality_level_1") || types.includes("neighborhood")) {
                            serviceArea = comp.long_name;
                        } else if (types.includes("postal_code")) {
                            postalCode = comp.long_name;
                        }
                    }

                    // Alias normalization
                    const canonicalDistrict = DISTRICT_ALIASES[district.toLowerCase()] ||
                                              DISTRICT_ALIASES[city.toLowerCase()] ||
                                              district;

                    return {
                        state,
                        district: canonicalDistrict,
                        city: city || canonicalDistrict,
                        serviceArea: serviceArea || undefined,
                        postalCode: postalCode || undefined,
                        latitude,
                        longitude,
                        formattedAddress: result.formatted_address
                    };
                }
            } catch (err: any) {
                logger.warn(`[ServiceabilityService] Google reverse geocode error: ${err?.message}`);
            }
        }

        // Free OpenStreetMap Nominatim Fallback
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
            const response = await axios.get(url, {
                timeout: 4000,
                headers: { "User-Agent": "AtlasBasket/1.0" }
            });

            if (response.data && response.data.address) {
                const addr = response.data.address;
                const state = addr.state || "Karnataka";
                const rawDistrict = addr.state_district || addr.county || addr.city || addr.town || "Mysuru";
                const city = addr.city || addr.town || addr.village || rawDistrict;
                const serviceArea = addr.suburb || addr.neighbourhood || addr.residential || "";
                const postalCode = addr.postcode || "";

                const canonicalDistrict = DISTRICT_ALIASES[rawDistrict.toLowerCase()] ||
                                          DISTRICT_ALIASES[city.toLowerCase()] ||
                                          rawDistrict;

                return {
                    state,
                    district: canonicalDistrict,
                    city,
                    serviceArea: serviceArea || undefined,
                    postalCode: postalCode || undefined,
                    latitude,
                    longitude,
                    formattedAddress: response.data.display_name
                };
            }
        } catch (err: any) {
            logger.warn(`[ServiceabilityService] Nominatim reverse geocode error: ${err?.message}`);
        }

        // If geocoding services unreachable or resolution fails, return empty result
        // NEVER substitute an arbitrary enabled district like Mysuru
        return {
            state: "",
            district: "",
            city: "",
            latitude,
            longitude,
            formattedAddress: undefined
        };
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
