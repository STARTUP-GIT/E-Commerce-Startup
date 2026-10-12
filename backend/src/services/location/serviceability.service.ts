import { prisma } from "../../config/prisma.js";

export type ServiceabilityStatus = "SERVICEABLE" | "NOT_SERVICEABLE" | "UNKNOWN";

export interface ServiceabilityCheckParams {
    state?: string;
    district?: string;
    city?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
}

export interface ServiceabilityCheckResult {
    status: ServiceabilityStatus;
    isServiceable: boolean;
    state?: string;
    district?: string;
    message: string;
    availableStates?: string[];
    availableDistricts?: string[];
}

export class ServiceabilityService {
    /**
     * Determine whether the marketplace currently serves the given location.
     */
    static async checkServiceability(params: ServiceabilityCheckParams): Promise<ServiceabilityCheckResult> {
        const normalizedState = params.state?.trim();
        const rawDistrict = (params.district || params.city)?.trim();

        if (!normalizedState) {
            return {
                status: "UNKNOWN",
                isServiceable: false,
                message: "State is required to determine location serviceability.",
            };
        }

        // 1. Verify State is configured and active
        const stateRecord = await prisma.state.findFirst({
            where: {
                name: { equals: normalizedState, mode: "insensitive" },
                isActive: true,
            },
        });

        if (!stateRecord) {
            return {
                status: "NOT_SERVICEABLE",
                isServiceable: false,
                state: normalizedState,
                district: rawDistrict,
                message: `We haven't launched in ${normalizedState} yet. Coming soon to your area!`,
            };
        }

        // 2. Fetch marketplace district policy
        const marketplaceSetting = await prisma.marketplaceSetting.findUnique({ where: { id: 1 } });
        const settingsData = marketplaceSetting?.data as any;
        const districtRequired = settingsData?.districtRequired !== false;

        // Fetch active districts for this state
        const activeDistricts = await prisma.city.findMany({
            where: {
                state: { equals: stateRecord.name, mode: "insensitive" },
                isActive: true,
            },
            select: { name: true },
            orderBy: { name: "asc" },
        });

        const activeDistrictNames = activeDistricts.map((d) => d.name);

        if (!rawDistrict) {
            if (districtRequired) {
                return {
                    status: "NOT_SERVICEABLE",
                    isServiceable: false,
                    state: stateRecord.name,
                    message: `Please specify a district in ${stateRecord.name} to confirm serviceability.`,
                    availableDistricts: activeDistrictNames,
                };
            }
            return {
                status: "SERVICEABLE",
                isServiceable: true,
                state: stateRecord.name,
                message: `Service is available in ${stateRecord.name}.`,
                availableDistricts: activeDistrictNames,
            };
        }

        // 3. Match district against active districts
        const matchedCity = await prisma.city.findFirst({
            where: {
                state: { equals: stateRecord.name, mode: "insensitive" },
                name: { equals: rawDistrict, mode: "insensitive" },
                isActive: true,
            },
        });

        if (!matchedCity) {
            return {
                status: "NOT_SERVICEABLE",
                isServiceable: false,
                state: stateRecord.name,
                district: rawDistrict,
                message: `We are available in ${stateRecord.name}, but delivery has not yet started in ${rawDistrict}. Coming soon!`,
                availableDistricts: activeDistrictNames,
            };
        }

        return {
            status: "SERVICEABLE",
            isServiceable: true,
            state: stateRecord.name,
            district: matchedCity.name,
            message: `Delivery is active in ${matchedCity.name}, ${stateRecord.name}.`,
            availableDistricts: activeDistrictNames,
        };
    }

    /**
     * Subscribe to "Notify Me When Available" notifications
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
        if (!params.state?.trim()) {
            throw new Error("State is required for subscription.");
        }
        if (!params.consent) {
            throw new Error("Explicit consent is required to receive notifications.");
        }

        const state = params.state.trim();
        const district = (params.district || params.city)?.trim() || null;

        // Check for existing subscription to prevent duplicates
        const existing = await prisma.locationNotificationSubscription.findFirst({
            where: {
                ...(params.customerId ? { customerId: params.customerId } : { email: params.email }),
                state: { equals: state, mode: "insensitive" },
                ...(district ? { district: { equals: district, mode: "insensitive" } } : {}),
            },
        });

        if (existing) {
            return {
                subscription: existing,
                alreadySubscribed: true,
                message: "You are already registered to receive updates for this area.",
            };
        }

        const subscription = await prisma.locationNotificationSubscription.create({
            data: {
                customerId: params.customerId || null,
                email: params.email || null,
                state,
                district,
                city: params.city || district,
                postalCode: params.postalCode || null,
                latitude: params.latitude !== undefined && params.latitude !== null ? params.latitude : null,
                longitude: params.longitude !== undefined && params.longitude !== null ? params.longitude : null,
                consent: true,
            },
        });

        return {
            subscription,
            alreadySubscribed: false,
            message: "Thank you! We will notify you as soon as service launches in your area.",
        };
    }

    /**
     * Withdraw "Notify Me When Available" notification subscription
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
