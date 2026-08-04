"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { webhookApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { Webhook, Plus, Trash2, Power, Pencil } from 'lucide-react';

const WEBHOOK_EVENTS = ['user.created', 'user.updated', 'payment.received', 'payment.failed', 'release.published'];

export function WebhooksPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { showConfirm } = useConfirmStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', url: '', events: ['user.created'] as string[] });

  const { data, isLoading } = useQuery({ queryKey: ['webhooks'], queryFn: webhookApi.list });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['webhooks'] });

  const createWebhook = useMutation({
    mutationFn: () => webhookApi.create(form),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      closeDialog();
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to create webhook.', 'error'),
  });

  const updateWebhook = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('No webhook selected');
      return webhookApi.update(editingId, { name: form.name, url: form.url, events: form.events });
    },
    onSuccess: (res) => {
      showToast(res.message, 'success');
      closeDialog();
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to update webhook.', 'error'),
  });

  const toggleWebhook = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => webhookApi.update(id, { enabled: !enabled }),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to toggle webhook.', 'error'),
  });

  const removeWebhook = useMutation({
    mutationFn: (id: string) => webhookApi.remove(id),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to delete webhook.', 'error'),
  });

  const webhooks = data?.webhooks ?? [];

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ name: '', url: '', events: ['user.created'] });
  };

  const toggleEvent = (event: string) => {
    setForm((prev) => {
      const has = prev.events.includes(event);
      if (prev.events.length === 1 && has) return prev;
      return { ...prev, events: has ? prev.events.filter((e) => e !== event) : [...prev.events, event] };
    });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Webhooks"
        description="Notify external services when platform events occur."
        actions={
          <Button
            onClick={() => {
              setEditingId(null);
              setForm({ name: '', url: '', events: ['user.created'] });
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Webhook
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-white/60" />
            Endpoints ({webhooks.length})
          </CardTitle>
          <CardDescription>Each endpoint receives a signed JSON POST on its subscribed events.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : webhooks.length === 0 ? (
            <p className="text-xs text-white/40 py-10 text-center">No webhook endpoints configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((hook) => (
                  <TableRow key={hook.id}>
                    <TableCell className="text-xs font-bold text-white/90">{hook.name}</TableCell>
                    <TableCell className="text-[10px] font-mono text-white/50 max-w-[200px] truncate">{hook.url}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {hook.events.slice(0, 3).map((event) => (
                          <Badge key={event} variant="secondary" className="text-[9px] font-mono">{event}</Badge>
                        ))}
                        {hook.events.length > 3 && (
                          <Badge variant="secondary" className="text-[9px]">+{hook.events.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] text-white/50 whitespace-nowrap">
                      {new Date(hook.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={hook.enabled ? 'success' : 'secondary'}>
                        {hook.enabled ? 'ENABLED' : 'DISABLED'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Edit"
                          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                          onClick={() => {
                            setEditingId(hook.id);
                            setForm({ name: hook.name, url: hook.url, events: hook.events });
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title={hook.enabled ? 'Disable' : 'Enable'}
                          className="p-1.5 rounded-lg text-white/40 hover:text-yellow-400 hover:bg-white/5 transition-colors"
                          onClick={() => toggleWebhook.mutate({ id: hook.id, enabled: hook.enabled })}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Delete"
                          className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                          onClick={() =>
                            showConfirm({
                              title: 'Delete webhook?',
                              message: `The "${hook.name}" endpoint will no longer receive events.`,
                              confirmText: 'Delete',
                              onConfirm: () => removeWebhook.mutate(hook.id),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        isOpen={dialogOpen}
        onClose={closeDialog}
        title={editingId ? 'Edit Webhook' : 'Create Webhook'}
        description="Configure an endpoint to receive platform event notifications."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (editingId) updateWebhook.mutate();
            else createWebhook.mutate();
          }}
        >
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Name</label>
            <Input placeholder="e.g. Slack alerts" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Endpoint URL</label>
            <Input
              placeholder="https://example.com/hooks/platform"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Events</label>
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENTS.map((event) => (
                <button
                  key={event}
                  type="button"
                  onClick={() => toggleEvent(event)}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono transition-colors cursor-pointer ${
                    form.events.includes(event)
                      ? 'border-white/40 bg-white/10 text-white'
                      : 'border-white/10 bg-white/[0.02] text-white/40 hover:text-white/70'
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            isLoading={createWebhook.isPending || updateWebhook.isPending}
            disabled={!form.name.trim() || !form.url.trim() || form.events.length === 0}
          >
            {editingId ? 'Save Changes' : 'Create Webhook'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
