/**
 * Central catalogue of every permission the Admin panel understands.
 *
 * There is exactly ONE authorization model in this product: Admin roles.
 * `AdminRole.permissions` stores a subset of the keys below; the platform
 * application's permission system has been removed.
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
        group: "Dashboard & Analytics",
        permissions: [
            { key: "dashboard.view", label: "View dashboard" },
            { key: "analytics.view", label: "View analytics reports" }
        ]
    },
    {
        group: "Customers",
        permissions: [
            { key: "customers.view", label: "View customers" },
            { key: "customers.manage", label: "Edit / disable customers" }
        ]
    },
    {
        group: "Sellers & Shops",
        permissions: [
            { key: "sellers.view", label: "View sellers, shops & verifications" },
            { key: "sellers.manage", label: "Approve, ban, strikes & payouts" }
        ]
    },
    {
        group: "Orders",
        permissions: [
            { key: "orders.view", label: "View orders" },
            { key: "orders.manage", label: "Manage orders & returns" }
        ]
    },
    {
        group: "Payments",
        permissions: [
            { key: "payments.view", label: "View transactions & payouts" },
            { key: "payments.refund", label: "Initiate refunds" }
        ]
    },
    {
        group: "Reports & Exports",
        permissions: [
            { key: "reports.view", label: "View reports" },
            { key: "reports.export", label: "Export CSV / PDF reports" }
        ]
    },
    {
        group: "Support & Moderation",
        permissions: [
            { key: "support.view", label: "View support tickets" },
            { key: "support.manage", label: "Reply / resolve support tickets" },
            { key: "moderation.view", label: "View reviews & reports" },
            { key: "moderation.manage", label: "Approve / hide reviews & products" }
        ]
    },
    {
        group: "Content & Branding",
        permissions: [
            { key: "content.view", label: "View CMS content blocks" },
            { key: "content.manage", label: "Create / publish content blocks" },
            { key: "branding.view", label: "View branding settings" },
            { key: "branding.manage", label: "Update marketplace branding" }
        ]
    },
    {
        group: "Catalogue & Delivery",
        permissions: [
            { key: "catalog.view", label: "View categories, cities & states" },
            { key: "catalog.manage", label: "Manage catalogue reference data" },
            { key: "delivery.view", label: "View delivery methods" },
            { key: "delivery.manage", label: "Manage delivery methods" },
            { key: "coupons.view", label: "View coupons" },
            { key: "coupons.manage", label: "Create / edit coupons" },
            { key: "notifications.view", label: "View notifications" },
            { key: "notifications.manage", label: "Send notifications" },
            { key: "settings.view", label: "View marketplace settings" },
            { key: "settings.manage", label: "Update marketplace settings" }
        ]
    },
    {
        group: "Administration",
        permissions: [
            { key: "admin.users.manage", label: "Manage admin accounts" },
            { key: "admin.roles.manage", label: "Manage roles & permissions" },
            { key: "sessions.view", label: "View active sessions" },
            { key: "sessions.manage", label: "Revoke sessions" },
            { key: "audit_logs.view", label: "View audit logs" }
        ]
    },
    {
        group: "Seller Enforcement & Appeals",
        permissions: [
            { key: "enforcement.view", label: "View warnings, strikes and suspensions" },
            { key: "enforcement.warning", label: "Issue warnings to sellers" },
            { key: "enforcement.strike", label: "Issue community guidelines strikes" },
            { key: "enforcement.suspend", label: "Suspend or reinstate sellers" },
            { key: "appeals.view", label: "View seller appeals" },
            { key: "appeals.manage", label: "Review, request info & decide appeals" }
        ]
    },
    {
        group: "Policies & Guidelines",
        permissions: [
            { key: "guidelines.view", label: "View community guidelines & acceptance records" },
            { key: "guidelines.manage", label: "Create & edit guideline drafts" },
            { key: "guidelines.publish", label: "Approve & publish community guidelines" },
            { key: "policies.view", label: "View policy notices" },
            { key: "policies.manage", label: "Create & edit policy notice drafts" },
            { key: "policies.publish", label: "Publish policy notices" }
        ]
    },
    {
        group: "Financial Settlements",
        permissions: [
            { key: "commissions.view", label: "View commission statements & balances" },
            { key: "commissions.manage", label: "Create, publish statements & record payments" }
        ]
    },
    {
        group: "Investigations & Postmortems",
        permissions: [
            { key: "cases.view", label: "View customer case reports & timeline" },
            { key: "cases.manage", label: "Investigate & resolve customer case reports" },
            { key: "postmortems.view", label: "View incident postmortems" },
            { key: "postmortems.manage", label: "Create, review & approve postmortems" }
        ]
    },
    {
        group: "Conversations & Messaging",
        permissions: [
            { key: "conversations.view", label: "View customer and seller conversations" },
            { key: "conversations.manage", label: "Reply and resolve conversations" }
        ]
    }
];

export const ALL_PERMISSIONS: string[] = PERMISSION_CATALOG.flatMap((g) =>
    g.permissions.map((p) => p.key)
);

/** Group prefix used for `group.*` wildcard matching, e.g. `customers.*`. */
export const permissionGroups: string[] = Array.from(
    new Set(ALL_PERMISSIONS.map((key) => key.split(".")[0]))
);

export interface RoleDefinition {
    name: string;
    displayName: string;
    description: string;
    permissions: string[];
}

const perms = (...keys: string[]) => keys;

/**
 * The nine system roles. Seeded on demand by `ensureDefaultRoles()` so a fresh
 * database (created with `prisma db push`) behaves exactly like one created by
 * the migration.
 */
export const SYSTEM_ROLES: RoleDefinition[] = [
    {
        name: "OWNER",
        displayName: "Owner",
        description: "Full marketplace ownership. Unrestricted access.",
        permissions: [...ALL_PERMISSIONS]
    },
    {
        name: "SUPER_ADMIN",
        displayName: "Super Admin",
        description: "Everything an owner can do, including role management.",
        permissions: [...ALL_PERMISSIONS]
    },
    {
        name: "ADMINISTRATOR",
        displayName: "Administrator",
        description: "Day-to-day marketplace operations without admin-user or role management.",
        permissions: perms(
            "dashboard.view", "analytics.view",
            "customers.view", "customers.manage",
            "sellers.view", "sellers.manage",
            "enforcement.view", "enforcement.warning", "enforcement.strike", "enforcement.suspend",
            "appeals.view", "appeals.manage",
            "guidelines.view", "guidelines.manage", "guidelines.publish",
            "policies.view", "policies.manage", "policies.publish",
            "commissions.view", "commissions.manage",
            "cases.view", "cases.manage",
            "postmortems.view", "postmortems.manage",
            "conversations.view", "conversations.manage",
            "orders.view", "orders.manage",
            "payments.view", "payments.refund",
            "reports.view", "reports.export",
            "support.view", "support.manage",
            "moderation.view", "moderation.manage",
            "content.view", "content.manage",
            "branding.view", "branding.manage",
            "settings.view", "settings.manage",
            "notifications.view", "notifications.manage",
            "coupons.view", "coupons.manage",
            "catalog.view", "catalog.manage",
            "delivery.view", "delivery.manage",
            "returns.view", "returns.manage",
            "sessions.view", "sessions.manage",
            "audit_logs.view"
        )
    },
    {
        name: "FINANCE",
        displayName: "Finance",
        description: "Payments, refunds, payouts, commissions and financial reporting.",
        permissions: perms(
            "dashboard.view", "analytics.view",
            "customers.view", "sellers.view", "orders.view",
            "payments.view", "payments.refund",
            "commissions.view", "commissions.manage",
            "reports.view", "reports.export",
            "sessions.view", "audit_logs.view", "settings.view"
        )
    },
    {
        name: "SUPPORT",
        displayName: "Support",
        description: "Customer and seller support, tickets and order resolution.",
        permissions: perms(
            "dashboard.view",
            "customers.view", "customers.manage", "sellers.view",
            "orders.view", "orders.manage",
            "support.view", "support.manage",
            "cases.view", "cases.manage",
            "conversations.view", "conversations.manage",
            "appeals.view",
            "moderation.view", "reports.view",
            "notifications.view", "sessions.view", "audit_logs.view"
        )
    },
    {
        name: "MODERATOR",
        displayName: "Moderator",
        description: "Content moderation: reviews, reports and product approvals.",
        permissions: perms(
            "dashboard.view",
            "customers.view", "sellers.view",
            "catalog.view", "catalog.manage",
            "moderation.view", "moderation.manage",
            "cases.view", "cases.manage",
            "enforcement.view", "enforcement.warning",
            "reports.view", "support.view", "audit_logs.view"
        )
    },
    {
        name: "SELLER_MANAGER",
        displayName: "Seller Manager",
        description: "Seller onboarding, verification, performance and payouts.",
        permissions: perms(
            "dashboard.view", "analytics.view",
            "customers.view", "sellers.view", "sellers.manage",
            "enforcement.view", "enforcement.warning", "enforcement.strike", "enforcement.suspend",
            "appeals.view", "appeals.manage",
            "guidelines.view", "policies.view",
            "commissions.view",
            "conversations.view", "conversations.manage",
            "orders.view", "reports.view", "reports.export",
            "support.view", "notifications.view", "audit_logs.view"
        )
    },
    {
        name: "DEVELOPER",
        displayName: "Developer",
        description: "Product, content and configuration access for engineering.",
        permissions: perms(
            "dashboard.view", "analytics.view",
            "catalog.view", "catalog.manage",
            "content.view", "content.manage",
            "reports.view", "settings.view",
            "sessions.view", "audit_logs.view"
        )
    },
    {
        name: "DEVOPS",
        displayName: "DevOps",
        description: "Operational visibility: sessions, settings and audit trails.",
        permissions: perms(
            "dashboard.view", "analytics.view",
            "sessions.view", "sessions.manage",
            "settings.view", "reports.view", "audit_logs.view"
        )
    }
];

/** Roles whose holders always receive every permission. */
export const UNRESTRICTED_ROLES = new Set(["OWNER", "SUPER_ADMIN"]);

/** Fallback for an admin whose role row is missing or was hard-deleted. */
export const FALLBACK_ROLE = "ADMINISTRATOR";

export const isValidPermissionKey = (key: string): boolean =>
    ALL_PERMISSIONS.includes(key);
