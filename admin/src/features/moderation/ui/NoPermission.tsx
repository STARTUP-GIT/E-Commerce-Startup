"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { useBranding } from '@/lib/hooks/useBranding';

interface NoPermissionProps {
  permission: string;
}

export function NoPermission({ permission }: NoPermissionProps) {
  const router = useRouter();
  const { branding } = useBranding();

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 space-y-4 animate-fade-up">
      <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
        <ShieldAlert className="h-7 w-7 text-yellow-400" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-white/90">You don&apos;t have permission to view this page</h2>
        <p className="text-xs text-white/45 max-w-sm">
          Your role is missing the <span className="font-bold text-white/75">{permission}</span> permission
          on {branding.name || 'this workspace'}. Ask a workspace owner to grant it.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => router.back()}>
        Go Back
      </Button>
    </div>
  );
}
