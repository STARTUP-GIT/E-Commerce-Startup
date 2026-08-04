import axiosInstance from '@/lib/axios/axiosInstance';
import type {
  PlatformSettings,
  HealthResponse,
  OverviewResponse,
  AuditLogEntry,
  Queue,
  BackgroundJob,
  ApiKeyRecord,
  WebhookRecord,
  ReleaseRecord,
  BackupRecord,
  SessionRecord,
  SecuritySettings,
} from '@/types/platform';

export const settingsApi = {
  get: async (): Promise<{ settings: PlatformSettings }> => {
    const response = await axiosInstance.get('/api/platform/settings');
    return response.data;
  },
  updateMarketplace: async (payload: Partial<PlatformSettings['marketplace']>): Promise<{ message: string; settings: PlatformSettings }> => {
    const response = await axiosInstance.patch('/api/platform/settings/marketplace', payload);
    return response.data;
  },
  updateCommission: async (payload: Partial<PlatformSettings['commission']>): Promise<{ message: string; settings: PlatformSettings }> => {
    const response = await axiosInstance.patch('/api/platform/settings/commission', payload);
    return response.data;
  },
  updateMaintenance: async (payload: Partial<PlatformSettings['maintenance']>): Promise<{ message: string; settings: PlatformSettings }> => {
    const response = await axiosInstance.patch('/api/platform/settings/maintenance', payload);
    return response.data;
  },
  updatePaymentProviders: async (providers: PlatformSettings['paymentProviders']): Promise<{ message: string; settings: PlatformSettings }> => {
    const response = await axiosInstance.patch('/api/platform/settings/payment-providers', { providers });
    return response.data;
  },
  updateStorage: async (payload: Partial<PlatformSettings['storage']>): Promise<{ message: string; settings: PlatformSettings }> => {
    const response = await axiosInstance.patch('/api/platform/settings/storage', { storage: payload });
    return response.data;
  },
  updateEmailProviders: async (providers: PlatformSettings['emailProviders']): Promise<{ message: string; settings: PlatformSettings }> => {
    const response = await axiosInstance.patch('/api/platform/settings/email-providers', { providers });
    return response.data;
  },
  updateOAuthProviders: async (providers: PlatformSettings['oauthProviders']): Promise<{ message: string; settings: PlatformSettings }> => {
    const response = await axiosInstance.patch('/api/platform/settings/oauth-providers', { providers });
    return response.data;
  },
  updateRazorpay: async (payload: { enabled?: boolean; keyId?: string; keySecret?: string }): Promise<{ message: string; settings: PlatformSettings }> => {
    const response = await axiosInstance.patch('/api/platform/settings/razorpay', payload);
    return response.data;
  },
};

export const monitoringApi = {
  health: async (): Promise<HealthResponse> => {
    const response = await axiosInstance.get('/api/platform/monitoring/health');
    return response.data;
  },
  overview: async (): Promise<OverviewResponse> => {
    const response = await axiosInstance.get('/api/platform/monitoring/overview');
    return response.data;
  },
  logs: async (limit?: number): Promise<{ logs: AuditLogEntry[] }> => {
    const response = await axiosInstance.get('/api/platform/monitoring/logs', { params: { limit } });
    return response.data;
  },
  auditLogs: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    module?: string;
    email?: string;
  }): Promise<{ logs: AuditLogEntry[]; pagination: { page: number; limit: number; total: number; pages: number } }> => {
    const response = await axiosInstance.get('/api/platform/monitoring/audit-logs', { params });
    return response.data;
  },
  cache: async (): Promise<{ cache: { provider: string; featureFlagEntries: number; ttlSeconds: number; enabled: boolean } }> => {
    const response = await axiosInstance.get('/api/platform/monitoring/cache');
    return response.data;
  },
};

export const securityApi = {
  get: async (): Promise<{ security: SecuritySettings }> => {
    const response = await axiosInstance.get('/api/platform/security');
    return response.data;
  },
  updateRateLimits: async (payload: Partial<SecuritySettings>): Promise<{ message: string; security: SecuritySettings }> => {
    const response = await axiosInstance.patch('/api/platform/security/rate-limits', payload);
    return response.data;
  },
  getBlockedIps: async (): Promise<{ blockedIps: string[] }> => {
    const response = await axiosInstance.get('/api/platform/security/blocked-ips');
    return response.data;
  },
  addBlockedIp: async (ip: string): Promise<{ message: string; blockedIps: string[] }> => {
    const response = await axiosInstance.post('/api/platform/security/blocked-ips', { ip });
    return response.data;
  },
  removeBlockedIp: async (ip: string): Promise<{ message: string; blockedIps: string[] }> => {
    const response = await axiosInstance.delete(`/api/platform/security/blocked-ips/${encodeURIComponent(ip)}`);
    return response.data;
  },
  getSessions: async (): Promise<{ sessions: SessionRecord[] }> => {
    const response = await axiosInstance.get('/api/platform/security/sessions');
    return response.data;
  },
  revokeSession: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post(`/api/platform/security/sessions/${id}/revoke`);
    return response.data;
  },
  getVersionHistory: async (): Promise<{ versions: ReleaseRecord[] }> => {
    const response = await axiosInstance.get('/api/platform/security/versions');
    return response.data;
  },
};

export const apiKeyApi = {
  list: async (): Promise<{ apiKeys: ApiKeyRecord[] }> => {
    const response = await axiosInstance.get('/api/platform/security/api-keys');
    return response.data;
  },
  create: async (payload: { name: string; scopes?: string[] }): Promise<{ message: string; apiKey: string; record: ApiKeyRecord }> => {
    const response = await axiosInstance.post('/api/platform/security/api-keys', payload);
    return response.data;
  },
  revoke: async (id: string): Promise<{ message: string; apiKeys: ApiKeyRecord[] }> => {
    const response = await axiosInstance.post(`/api/platform/security/api-keys/${id}/revoke`);
    return response.data;
  },
  remove: async (id: string): Promise<{ message: string; apiKeys: ApiKeyRecord[] }> => {
    const response = await axiosInstance.delete(`/api/platform/security/api-keys/${id}`);
    return response.data;
  },
};

export const webhookApi = {
  list: async (): Promise<{ webhooks: WebhookRecord[] }> => {
    const response = await axiosInstance.get('/api/platform/webhooks');
    return response.data;
  },
  create: async (payload: { name: string; url: string; events?: string[] }): Promise<{ message: string; webhooks: WebhookRecord[] }> => {
    const response = await axiosInstance.post('/api/platform/webhooks', payload);
    return response.data;
  },
  update: async (id: string, payload: Partial<WebhookRecord>): Promise<{ message: string; webhooks: WebhookRecord[] }> => {
    const response = await axiosInstance.patch(`/api/platform/webhooks/${id}`, payload);
    return response.data;
  },
  remove: async (id: string): Promise<{ message: string; webhooks: WebhookRecord[] }> => {
    const response = await axiosInstance.delete(`/api/platform/webhooks/${id}`);
    return response.data;
  },
};

export const releaseApi = {
  list: async (): Promise<{ versions: ReleaseRecord[] }> => {
    const response = await axiosInstance.get('/api/platform/release/versions');
    return response.data;
  },
  create: async (payload: { version: string; name: string; notes?: string; status?: string }): Promise<{ message: string; versions: ReleaseRecord[] }> => {
    const response = await axiosInstance.post('/api/platform/release/versions', payload);
    return response.data;
  },
  update: async (id: string, payload: Partial<ReleaseRecord>): Promise<{ message: string; versions: ReleaseRecord[] }> => {
    const response = await axiosInstance.patch(`/api/platform/release/versions/${id}`, payload);
    return response.data;
  },
  remove: async (id: string): Promise<{ message: string; versions: ReleaseRecord[] }> => {
    const response = await axiosInstance.delete(`/api/platform/release/versions/${id}`);
    return response.data;
  },
};

export const backupApi = {
  list: async (): Promise<{ backups: BackupRecord[] }> => {
    const response = await axiosInstance.get('/api/platform/backups');
    return response.data;
  },
  create: async (payload: { label?: string; location?: string }): Promise<{ message: string; backups: BackupRecord[] }> => {
    const response = await axiosInstance.post('/api/platform/backups', payload);
    return response.data;
  },
  remove: async (id: string): Promise<{ message: string; backups: BackupRecord[] }> => {
    const response = await axiosInstance.delete(`/api/platform/backups/${id}`);
    return response.data;
  },
};

export const queueApi = {
  list: async (): Promise<{ queues: Queue[] }> => {
    const response = await axiosInstance.get('/api/platform/queues');
    return response.data;
  },
  jobs: async (): Promise<{ jobs: BackgroundJob[] }> => {
    const response = await axiosInstance.get('/api/platform/queues/jobs');
    return response.data;
  },
  runJob: async (name: string): Promise<{ message: string; job: { name: string; status: string } }> => {
    const response = await axiosInstance.post('/api/platform/queues/jobs/run', { name });
    return response.data;
  },
};
