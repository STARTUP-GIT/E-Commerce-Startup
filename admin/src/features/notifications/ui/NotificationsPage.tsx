"use client";

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { notificationApi } from '@/lib/api/featureApis';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useUIStore } from '@/lib/store/uiStore';
import { Bell, Megaphone } from 'lucide-react';
import { useForm } from 'react-hook-form';

export function NotificationsPage() {
  const { showToast } = useUIStore();
  const [activeForm, setActiveForm] = useState<'send' | 'broadcast'>('broadcast');

  const broadcastForm = useForm({
    defaultValues: { title: '', message: '', userType: 'ALL' }
  });

  const sendForm = useForm({
    defaultValues: { userId: '', userType: 'CUSTOMER', title: '', message: '' }
  });

  const broadcastMutation = useMutation({
    mutationFn: (v: any) => notificationApi.broadcastNotification({ ...v, type: 'PROMOTIONAL' }),
    onSuccess: () => { broadcastForm.reset(); showToast('Broadcast sent successfully!', 'success'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const sendMutation = useMutation({
    mutationFn: (v: any) => notificationApi.sendNotification({ ...v, type: 'SYSTEM' }),
    onSuccess: () => { sendForm.reset(); showToast('Notification sent successfully!', 'success'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white/95">Notifications</h1>
        <p className="text-xs text-white/45 mt-1">Send targeted or broadcast notifications to users</p>
      </div>

      {/* Toggle */}
      <div className="flex gap-1 border border-white/5 rounded-xl p-1 bg-white/[0.02] w-fit">
        {(['broadcast', 'send'] as const).map((t) => (
          <button key={t} onClick={() => setActiveForm(t)} className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer flex items-center gap-2 ${activeForm === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
            {t === 'broadcast' ? <Megaphone className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            {t === 'broadcast' ? 'Broadcast' : 'Send to User'}
          </button>
        ))}
      </div>

      {activeForm === 'broadcast' && (
        <Card className="border border-white/5 max-w-xl">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-white/60" />
              <CardTitle className="text-xs font-bold text-white/90">Broadcast Notification</CardTitle>
            </div>
            <CardDescription>Send to all users or a specific group</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={broadcastForm.handleSubmit((v) => broadcastMutation.mutate(v))} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Target Audience</label>
                <select {...broadcastForm.register('userType')} className="glass-input w-full h-10 rounded-xl px-3 text-sm text-white cursor-pointer">
                  <option value="ALL">All Users</option>
                  <option value="CUSTOMER">Customers Only</option>
                  <option value="SELLER">Sellers Only</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Title</label>
                <Input placeholder="Notification title..." {...broadcastForm.register('title', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Message</label>
                <textarea {...broadcastForm.register('message', { required: true })} placeholder="Enter your message..." rows={4} className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white resize-none" />
              </div>
              <Button type="submit" className="w-full" isLoading={broadcastMutation.isPending}>
                <Megaphone className="mr-2 h-4 w-4" /> Send Broadcast
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeForm === 'send' && (
        <Card className="border border-white/5 max-w-xl">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-white/60" />
              <CardTitle className="text-xs font-bold text-white/90">Send to User</CardTitle>
            </div>
            <CardDescription>Target a specific user by their ID</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={sendForm.handleSubmit((v) => sendMutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">User ID</label>
                  <Input placeholder="User ID..." {...sendForm.register('userId', { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">User Type</label>
                  <select {...sendForm.register('userType')} className="glass-input w-full h-10 rounded-xl px-3 text-sm text-white cursor-pointer">
                    <option value="CUSTOMER">Customer</option>
                    <option value="SELLER">Seller</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Title</label>
                <Input placeholder="Notification title..." {...sendForm.register('title', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Message</label>
                <textarea {...sendForm.register('message', { required: true })} placeholder="Enter your message..." rows={4} className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white resize-none" />
              </div>
              <Button type="submit" className="w-full" isLoading={sendMutation.isPending}>
                <Bell className="mr-2 h-4 w-4" /> Send Notification
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
