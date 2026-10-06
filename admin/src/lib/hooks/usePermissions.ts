'use client';

import { useQuery } from '@tanstack/react-query';
import { rolesApi } from '@/lib/api/rolesApi';
import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * Single source of truth for "may this admin do X?" in the Admin panel.
 *
 * Backend: GET /api/admin/roles/me → { permissions, roleName, roleId, isSuperAdmin }
 * Keys come from backend/src/modules/admin/services/permissionCatalog.ts.
 * Wildcards: `*` and `group.*` grant a whole group.
 *
 * While loading (or if the endpoint fails) `can()` falls back to the legacy
 * super-admin check so an existing super admin is never locked out of a page.
 */
export function usePermissions() {
  const { admin } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-permissions'],
    queryFn: async () => rolesApi.getMyPermissions(),
    staleTime: 60_000,
    retry: false,
  });

  const permissions = data?.permissions ?? [];
  const isSuperAdmin = data?.isSuperAdmin ?? admin?.isSuperAdmin ?? false;

  const can = (key: string): boolean => {
    if (isSuperAdmin) return true;
    if (isLoading) return Boolean(admin?.isSuperAdmin);
    if (isError) return Boolean(admin?.isSuperAdmin);
    if (permissions.includes('*')) return true;
    if (permissions.includes(key)) return true;
    const group = key.split('.')[0];
    return permissions.includes(`${group}.*`);
  };

  return {
    permissions,
    roleName: data?.roleName ?? admin?.role ?? null,
    roleId: data?.roleId ?? null,
    isSuperAdmin,
    can,
    canAny: (...keys: string[]) => keys.some((key) => can(key)),
    isLoading,
  };
}
