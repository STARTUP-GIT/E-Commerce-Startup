"use client";

import React from 'react';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader, Toggle } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Wrench } from 'lucide-react';

export function MaintenancePage() {
  const { settings, isLoading, updateMaintenance } = useSettings();

  const [message, setMessage] = React.useState('');
  const [prevSettings, setPrevSettings] = React.useState(settings?.maintenance.message);

  if (settings && prevSettings !== settings.maintenance.message) {
    setPrevSettings(settings.maintenance.message);
    setMessage(settings.maintenance.message || '');
  }

  if (isLoading || !settings) {
    return <Skeleton className="h-72 w-full" />;
  }

  const maintenance = settings.maintenance;

  const handleToggle = async (next: boolean) => {
    await updateMaintenance({
      maintenanceMode: next,
      startedAt: next ? new Date().toISOString() : undefined,
    });
  };

  const handleSaveMessage = async () => {
    await updateMaintenance({ message });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Maintenance Mode"
        description="Temporarily take the platform offline for scheduled work."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-white/60" />
              Status
            </CardTitle>
            <CardDescription>
              When enabled, all public storefronts show the maintenance message.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <div>
                <p className="text-xs font-bold text-white/90">
                  {maintenance.maintenanceMode ? 'Maintenance Mode: ACTIVE' : 'Maintenance Mode: OFF'}
                </p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {maintenance.maintenanceMode ? `Since ${maintenance.startedAt ? new Date(maintenance.startedAt).toLocaleString() : '—'}` : 'Platform is fully operational.'}
                </p>
              </div>
              <Toggle
                checked={maintenance.maintenanceMode}
                onChange={handleToggle}
                label="Maintenance mode"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                Maintenance Message
              </label>
              <textarea
                rows={3}
                className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white/80 resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="We'll be back shortly."
              />
              <Button variant="outline" size="sm" onClick={handleSaveMessage}>
                Save Message
              </Button>
            </div>

            {maintenance.allowedRoles?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">
                  Bypass Roles
                </p>
                <div className="flex flex-wrap gap-2">
                  {maintenance.allowedRoles.map((role) => (
                    <span key={role} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-white/70">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What happens during maintenance?</CardTitle>
            <CardDescription>Behavior of the platform while maintenance mode is active.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow text="All customer and seller storefronts display the maintenance message." />
            <InfoRow text="Public APIs return a 503 Service Unavailable response." />
            <InfoRow text="The Platform control plane remains fully accessible to platform users." />
            <InfoRow text="Background jobs and queues are paused until maintenance ends." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
      <span className="h-1.5 w-1.5 rounded-full bg-white/40 mt-1.5 shrink-0" />
      <p className="text-xs text-white/70 leading-relaxed">{text}</p>
    </div>
  );
}
