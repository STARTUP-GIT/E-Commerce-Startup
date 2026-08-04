export type FeatureApplication = 'CUSTOMER' | 'SELLER';

/**
 * A deployed feature auto-registered by the backend.
 * Platform only ever toggles `enabled` — features are defined in code,
 * never created or deleted from the UI.
 */
export interface Feature {
  id: string;
  featureKey: string;
  application: string;
  displayName: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const APPLICATION_ORDER: string[] = ['CUSTOMER', 'SELLER'];

export const APPLICATION_LABELS: Record<string, string> = {
  CUSTOMER: 'Customer Dashboard',
  SELLER: 'Seller Dashboard',
};

export function applicationLabel(application: string): string {
  const normalized = application?.toUpperCase();
  if (APPLICATION_LABELS[normalized]) return APPLICATION_LABELS[normalized];
  if (!application) return 'General';
  return `${application.charAt(0).toUpperCase()}${application.slice(1).toLowerCase()} Dashboard`;
}

export function formatUpdatedAt(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
