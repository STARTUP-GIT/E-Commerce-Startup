/**
 * Central catalogue of every permission the Admin panel understands.
 *
 * There is exactly ONE authorization model in this product: Admin roles.
 * `AdminRole.permissions` stores a subset of the keys below.
 *
 * This file is also exposed to the Admin frontend through
 * `GET /api/admin/roles/permissions` so the Roles & Permissions screen never
 * hardcodes a second copy of the catalogue.
 */

export interface PermissionDef {
    key: string;
    label: string;
}

export interface PermissionGroup {
    group: string;
    permissions: PermissionDef[];
}

export const PERMISSION_CATALOG: PermissionGroup[] = [
    {
        group: "DASHBOARD",
        permissions: [
            { key: "dashboard.view", label: "View dashboard" },
            { key: "analytics.view", label: "View analytics" }
        ]
    },
    {
        group: "MARKETPLACE",
        permissions: [
            { key: "customers.view", label: "View customers" },
            { key: "customers.manage", label: "Manage customers" },
            { key: "sellers.view", label: "View sellers" },
            { key: "sellers.manage", label: "Manage sellers" },
            { key: "products.view", label: "View products" },
            { key: "products.manage", label: "Manage products" },
            { key: "categories.manage", label: "Manage categories" },
            { key: "catalog.view", label: "View catalog" },
            { key: "catalog.manage", label: "Manage catalog" }
        ]
    },
    {
        group: "OPERATIONS",
        permissions: [
            { key: "orders.view", label: "View orders" },
            { key: "orders.manage", label: "Manage orders" },
            { key: "delivery.view", label: "View deliveries" },
            { key: "delivery.manage", label: "Manage deliveries" },
            { key: "returns.view", label: "View returns" },
            { key: "returns.manage", label: "Manage returns" },
            { key: "cases.view", label: "View customer cases" },
            { key: "cases.manage", label: "Manage customer cases" }
        ]
    },
    {
        group: "LOCATIONS",
        permissions: [
            { key: "locations.districts.view", label: "View districts" },
            { key: "locations.districts.manage", label: "Manage districts" },
            { key: "locations.towns.manage", label: "Manage towns" },
            { key: "locations.areas.manage", label: "Manage service areas" },
            { key: "locations.availability.manage", label: "Manage location availability" }
        ]
    },
    {
        group: "COMMUNICATION",
        permissions: [
            { key: "conversations.view", label: "View conversations" },
            { key: "conversations.manage", label: "Reply to conversations" },
            { key: "notifications.view", label: "View notifications" },
            { key: "notifications.manage", label: "Manage notifications" }
        ]
    },
    {
        group: "FINANCE",
        permissions: [
            { key: "payments.view", label: "View payments" },
            { key: "commissions.manage", label: "Manage settlements" },
            { key: "reports.view", label: "View financial reports" },
            { key: "reports.export", label: "Export reports" },
            { key: "platform_fees.manage", label: "Manage platform fees" },
            { key: "gst.view", label: "View GST configuration" },
            { key: "gst.manage", label: "Modify GST configuration" },
            { key: "payments.refund", label: "Manage refunds" }
        ]
    },
    {
        group: "SYSTEM",
        permissions: [
            { key: "admin.users.view", label: "View administrators" },
            { key: "admin.users.manage", label: "Manage administrators (add, edit, suspend)" },
            { key: "admin.roles.manage", label: "Manage roles & permissions" },
            { key: "audit_logs.view", label: "View audit logs" },
            { key: "settings.view", label: "View system settings" },
            { key: "settings.manage", label: "Manage system settings" },
            { key: "branding.view", label: "View branding" },
            { key: "branding.manage", label: "Manage branding & delivery logo" }
        ]
    },
    {
        group: "ENFORCEMENT & COMPLIANCE",
        permissions: [
            { key: "enforcement.view", label: "View warnings & strikes" },
            { key: "enforcement.warning", label: "Issue warnings to sellers" },
            { key: "enforcement.strike", label: "Issue strikes" },
            { key: "enforcement.suspend", label: "Suspend or reinstate sellers" },
            { key: "appeals.view", label: "View seller appeals" },
            { key: "appeals.manage", label: "Review and decide appeals" },
            { key: "guidelines.view", label: "View community guidelines" },
            { key: "guidelines.manage", label: "Manage guidelines" },
            { key: "policies.view", label: "View policies" },
            { key: "policies.manage", label: "Manage policies" },
            { key: "postmortems.view", label: "View postmortems" },
            { key: "postmortems.manage", label: "Manage postmortems" },
            { key: "moderation.view", label: "View reviews & reports" },
            { key: "moderation.manage", label: "Approve or hide reviews" }
        ]
    }
];

export const ALL_PERMISSIONS: string[] = PERMISSION_CATALOG.flatMap((g) =>
    g.permissions.map((p) => p.key)
);

export interface RoleDefinition {
    name: string;
    displayName: string;
    description: string;
    permissions: string[];
}

const perms = (...keys: string[]) => keys;

export const SYSTEM_ROLES: RoleDefinition[] = [
    {
        name: "SUPER_ADMIN",
        displayName: "Super Admin",
        description: "Full unrestricted platform administration, access approval, and role management.",
        permissions: [...ALL_PERMISSIONS]
    },
    {
        name: "ADMIN",
        displayName: "Admin",
        description: "Day-to-day marketplace operations and administration across modules.",
        permissions: perms(
            "dashboard.view", "analytics.view",
            "customers.view", "customers.manage",
            "sellers.view", "sellers.manage",
            "products.view", "products.manage", "categories.manage",
            "catalog.view", "catalog.manage",
            "orders.view", "orders.manage", "delivery.view", "delivery.manage", "returns.view", "returns.manage",
            "locations.districts.view", "locations.districts.manage", "locations.towns.manage", "locations.areas.manage", "locations.availability.manage",
            "conversations.view", "conversations.manage", "notifications.view", "notifications.manage",
            "payments.view", "commissions.manage", "reports.view", "reports.export", "platform_fees.manage", "gst.view", "gst.manage", "payments.refund",
            "admin.users.view", "audit_logs.view", "settings.view", "settings.manage", "branding.view", "branding.manage",
            "moderation.view", "moderation.manage", "guidelines.view", "policies.view", "appeals.view", "appeals.manage"
        )
    },
    {
        name: "OPERATIONS_MANAGER",
        displayName: "Operations Manager",
        description: "Oversees orders, delivery dispatches, refunds, and resolution cases.",
        permissions: perms(
            "dashboard.view", "analytics.view",
            "orders.view", "orders.manage",
            "delivery.view", "delivery.manage",
            "returns.view", "returns.manage",
            "cases.view", "cases.manage",
            "payments.view", "payments.refund",
            "locations.districts.view", "locations.availability.manage",
            "conversations.view", "conversations.manage",
            "notifications.view"
        )
    },
    {
        name: "MARKETPLACE_MANAGER",
        displayName: "Marketplace Manager",
        description: "Oversees product catalogue, seller approvals, customer accounts, and categories.",
        permissions: perms(
            "dashboard.view", "analytics.view",
            "customers.view", "customers.manage",
            "sellers.view", "sellers.manage",
            "products.view", "products.manage", "categories.manage",
            "catalog.view", "catalog.manage",
            "moderation.view", "moderation.manage",
            "reports.view"
        )
    },
    {
        name: "SELLER_SUPPORT",
        displayName: "Seller Support",
        description: "Handles seller communications, verification assistance, and onboarding inquiries.",
        permissions: perms(
            "dashboard.view",
            "sellers.view",
            "conversations.view", "conversations.manage",
            "appeals.view",
            "guidelines.view", "policies.view",
            "notifications.view"
        )
    },
    {
        name: "CUSTOMER_SUPPORT",
        displayName: "Customer Support",
        description: "Assists customers with orders, returns, and support conversations.",
        permissions: perms(
            "dashboard.view",
            "customers.view",
            "orders.view", "orders.manage", "returns.view",
            "conversations.view", "conversations.manage",
            "cases.view", "cases.manage",
            "notifications.view"
        )
    },
    {
        name: "FINANCE_MANAGER",
        displayName: "Finance Manager",
        description: "Manages settlements, payouts, financial reporting, platform fees, and GST configuration.",
        permissions: perms(
            "dashboard.view", "analytics.view",
            "payments.view", "commissions.manage",
            "reports.view", "reports.export",
            "platform_fees.manage", "gst.view", "gst.manage",
            "payments.refund", "orders.view"
        )
    },
    {
        name: "DELIVERY_MANAGER",
        displayName: "Delivery Manager",
        description: "Manages delivery fleets, partner assignments, and delivery branding.",
        permissions: perms(
            "dashboard.view",
            "delivery.view", "delivery.manage",
            "locations.districts.view", "locations.towns.manage", "locations.areas.manage", "locations.availability.manage",
            "branding.view", "branding.manage",
            "orders.view"
        )
    },
    {
        name: "LOCATION_MANAGER",
        displayName: "Location Manager",
        description: "Full control over districts, towns, service areas, and availability toggles.",
        permissions: perms(
            "dashboard.view",
            "locations.districts.view", "locations.districts.manage",
            "locations.towns.manage", "locations.areas.manage",
            "locations.availability.manage"
        )
    },
    {
        name: "ANALYST",
        displayName: "Read-only Analyst",
        description: "Read-only view of dashboard metrics, analytics, and operational reports.",
        permissions: perms(
            "dashboard.view", "analytics.view",
            "reports.view", "reports.export",
            "orders.view", "customers.view", "sellers.view",
            "locations.districts.view", "payments.view", "audit_logs.view"
        )
    },
    // Backwards-compatible legacy roles
    {
        name: "OWNER",
        displayName: "Owner",
        description: "Unrestricted owner access.",
        permissions: [...ALL_PERMISSIONS]
    },
    {
        name: "ADMINISTRATOR",
        displayName: "Administrator",
        description: "Full operational administration.",
        permissions: [...ALL_PERMISSIONS]
    },
    {
        name: "MODERATOR",
        displayName: "Moderator",
        description: "Content moderation.",
        permissions: perms("dashboard.view", "moderation.view", "moderation.manage", "customers.view", "sellers.view", "reports.view")
    }
];

export const UNRESTRICTED_ROLES = new Set(["OWNER", "SUPER_ADMIN"]);
export const FALLBACK_ROLE = "ADMIN";

export const isValidPermissionKey = (key: string): boolean =>
    ALL_PERMISSIONS.includes(key);

export const matchesPermission = (granted: string[], required: string): boolean => {
    if (granted.includes("*")) return true;
    if (granted.includes(required)) return true;

    // Wildcard support: e.g. "customers.*" grants "customers.view"
    const prefix = required.split(".")[0];
    if (granted.includes(`${prefix}.*`)) return true;

    // Backward compatibility & cross-module aliases (symmetrical)
    if ((required === "locations.districts.view" || required === "catalog.view") &&
        (granted.includes("catalog.view") || granted.includes("locations.districts.view") || granted.includes("catalog.*") || granted.includes("locations.*"))) {
        return true;
    }
    if ((required === "locations.districts.manage" || required === "catalog.manage") &&
        (granted.includes("catalog.manage") || granted.includes("locations.districts.manage") || granted.includes("catalog.*") || granted.includes("locations.*"))) {
        return true;
    }
    if (required === "admin.users.manage" && (granted.includes("admin.users.create") || granted.includes("admin.users.manage"))) return true;
    if (required === "branding.manage" && (granted.includes("settings.manage") || granted.includes("branding.manage"))) return true;

    return false;
};
