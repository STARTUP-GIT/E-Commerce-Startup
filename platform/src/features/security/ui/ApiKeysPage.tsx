"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiKeyApi } from '@/lib/api/platformApi';
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
import { KeyRound, Plus, Copy, Check, Ban, Trash2 } from 'lucide-react';

const API_KEY_SCOPES = ['admin', 'read', 'webhooks', 'audit'];

export function ApiKeysPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { showConfirm } = useConfirmStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['api-keys'], queryFn: apiKeyApi.list });

  const createKey = useMutation({
    mutationFn: () => apiKeyApi.create({ name, scopes }),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      setCreatedKey(res.apiKey);
      setName('');
      setScopes(['read']);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to create API key.', 'error'),
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => apiKeyApi.revoke(id),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to revoke API key.', 'error'),
  });

  const removeKey = useMutation({
    mutationFn: (id: string) => apiKeyApi.remove(id),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to delete API key.', 'error'),
  });

  const apiKeys = data?.apiKeys ?? [];

  const toggleScope = (scope: string) => {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="API Keys"
        description="Programmatic access tokens for platform integrations."
        actions={
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New API Key
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-white/60" />
            Keys ({apiKeys.length})
          </CardTitle>
          <CardDescription>API keys authenticate server-to-server calls to the platform.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : apiKeys.length === 0 ? (
            <p className="text-xs text-white/40 py-10 text-center">No API keys created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="text-xs font-bold text-white/90">{key.name}</TableCell>
                    <TableCell className="text-[10px] font-mono text-white/40">{key.prefix}••••••••</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[9px] font-mono">{s}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] text-white/50 whitespace-nowrap">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-[10px] text-white/50">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.revoked ? 'destructive' : 'success'}>
                        {key.revoked ? 'REVOKED' : 'ACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!key.revoked && (
                          <button
                            title="Revoke"
                            className="p-1.5 rounded-lg text-white/40 hover:text-yellow-400 hover:bg-white/5 transition-colors"
                            onClick={() =>
                              showConfirm({
                                title: 'Revoke API Key?',
                                message: `This will immediately disable the "${key.name}" key.`,
                                confirmText: 'Revoke',
                                onConfirm: () => revokeKey.mutate(key.id),
                              })
                            }
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          title="Delete"
                          className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                          onClick={() =>
                            showConfirm({
                              title: 'Delete API Key?',
                              message: `The "${key.name}" key will be permanently removed.`,
                              confirmText: 'Delete',
                              onConfirm: () => removeKey.mutate(key.id),
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
        onClose={() => {
          setDialogOpen(false);
          setCreatedKey(null);
        }}
        title={createdKey ? 'API Key Created' : 'Create API Key'}
        description={
          createdKey
            ? 'Copy your key now. It will only be shown once.'
            : 'Name your key and choose which scopes it can access.'
        }
      >
        {createdKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10">
              <code className="flex-1 text-[10px] font-mono text-emerald-300 break-all">{createdKey}</code>
              <button
                className="p-1.5 rounded-lg text-emerald-300 hover:bg-white/10 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(createdKey);
                  setCopied(true);
                  showToast('API key copied to clipboard.', 'success');
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setCreatedKey(null);
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) createKey.mutate();
            }}
          >
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Key name</label>
              <Input
                placeholder="e.g. CI deployment token"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Scopes</label>
              <div className="flex flex-wrap gap-2">
                {API_KEY_SCOPES.map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => toggleScope(scope)}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                      scopes.includes(scope)
                        ? 'border-white/40 bg-white/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/40 hover:text-white/70'
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" isLoading={createKey.isPending} disabled={!name.trim()}>
              <KeyRound className="h-4 w-4" />
              Generate Key
            </Button>
          </form>
        )}
      </Dialog>
    </div>
  );
}
