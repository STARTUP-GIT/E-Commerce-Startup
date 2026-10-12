"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { shopApi } from '@/features/shops/api/shopApi';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import Link from 'next/link';
import {
  FileCheck,
  Search,
  Hash,
  User,
  Store,
  Calendar,
  Globe,
  ShieldCheck,
  Download,
  Eye,
  X,
  ExternalLink,
  Clock,
  Layers
} from 'lucide-react';

export default function AgreementTrackingPage() {
  const [activeTab, setActiveTab] = useState<'shop-agreements' | 'guidelines'>('shop-agreements');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState<any>(null);

  // 1. Fetch Shop Approval Agreements
  const { data: shopAgreementsData, isLoading: isShopAgreementsLoading } = useQuery({
    queryKey: ['admin-shop-agreements', { search, statusFilter }],
    queryFn: async () => {
      return await shopApi.getAllAgreements({
        search: search || undefined,
        status: statusFilter || undefined,
        limit: 50,
      });
    },
    enabled: activeTab === 'shop-agreements',
  });

  // 2. Fetch Guidelines
  const { data: guidelinesData } = useQuery({
    queryKey: ['admin-guidelines-list'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/guidelines');
      return res.data;
    },
    enabled: activeTab === 'guidelines',
  });

  // 3. Fetch Guideline Signatures
  const { data: agreementsData, isLoading: isGuidelineAgreementsLoading } = useQuery({
    queryKey: ['admin-guideline-agreements', { search, selectedVersion }],
    queryFn: async () => {
      const url = selectedVersion
        ? `/api/admin/guidelines/${selectedVersion}/agreements`
        : '/api/admin/guidelines/agreements/all';
      const res = await axiosInstance.get(url, {
        params: { search: search || undefined },
      });
      return res.data;
    },
    enabled: activeTab === 'guidelines',
  });

  const shopAgreements = shopAgreementsData?.agreements ?? [];
  const guidelines = guidelinesData?.guidelines ?? [];
  const activeGuideline = guidelines.find((g: any) => g.status === 'PUBLISHED');
  const guidelineAgreements = agreementsData?.agreements ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-400" />
            Seller Agreements & Legal Compliance Tracking
          </h1>
          <p className="text-xs text-white/50">
            Authoritative records of shop-specific commercial agreements and marketplace policy acceptances.
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('shop-agreements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'shop-agreements'
              ? 'bg-white/10 text-white border border-white/15'
              : 'text-white/50 hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          <Store className="h-4 w-4 text-purple-400" />
          <span>Shop Approval Agreements</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300">
            Individual Terms
          </span>
        </button>

        <button
          onClick={() => setActiveTab('guidelines')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'guidelines'
              ? 'bg-white/10 text-white border border-white/15'
              : 'text-white/50 hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Community Guidelines Acceptances</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300">
            Marketplace Policies
          </span>
        </button>
      </div>

      {/* TAB 1: SHOP APPROVAL AGREEMENTS */}
      {activeTab === 'shop-agreements' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="p-3 border border-white/5 bg-white/[0.01] flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search by shop name, seller email, or agreement ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Agreement Statuses</option>
              <option value="ISSUED">Issued (Pending Acceptance)</option>
              <option value="ACCEPTED">Accepted (Signed)</option>
              <option value="DECLINED">Declined</option>
              <option value="SUPERSEDED">Superseded</option>
            </select>
          </Card>

          {/* Table */}
          <Card className="border border-white/5 bg-white/[0.01] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] text-white/40 border-b border-white/5 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-3.5">Shop & Seller</th>
                    <th className="p-3.5">Agreement & Version</th>
                    <th className="p-3.5">Commission</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Issued / Published</th>
                    <th className="p-3.5">Acceptance Details</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-white/80">
                  {isShopAgreementsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="p-4">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : shopAgreements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-white/40">
                        No shop approval agreements found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    shopAgreements.map((agr: any) => (
                      <tr key={agr.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-3.5">
                          <Link href={`/shops/${agr.shopId}`} className="font-bold text-white hover:text-indigo-400 block transition-colors">
                            {agr.shop?.name || 'Shop'}
                          </Link>
                          <span className="text-[10px] text-white/40">
                            {agr.seller?.firstName} {agr.seller?.lastName} ({agr.seller?.email})
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-white/90 block truncate max-w-xs">{agr.title}</span>
                          <span className="text-[10px] font-mono text-indigo-400">v{agr.version}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-purple-400 text-sm">{agr.commissionPercentage}%</span>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant={
                              agr.status === 'ACCEPTED' ? 'success' :
                              agr.status === 'ISSUED' ? 'warning' :
                              agr.status === 'DECLINED' ? 'destructive' : 'outline'
                            }
                            className="text-[9px]"
                          >
                            {agr.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-[11px] text-white/60">
                          {new Date(agr.publishedAt || agr.createdAt).toLocaleDateString()}
                          <div className="text-[9px] text-white/40">
                            By: {agr.issuedByAdmin ? `${agr.issuedByAdmin.firstName} ${agr.issuedByAdmin.lastName}` : 'Admin'}
                          </div>
                        </td>
                        <td className="p-3.5 text-[11px]">
                          {agr.status === 'ACCEPTED' ? (
                            <div>
                              <span className="text-emerald-400 font-bold block">{agr.acceptedByName || 'Verified'}</span>
                              <span className="text-[9px] text-white/40 block">
                                {agr.acceptedAt ? new Date(agr.acceptedAt).toLocaleDateString() : ''} • IP: {agr.acceptedIp || 'N/A'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-white/30 italic text-[11px]">Awaiting signature</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAgreement(agr)}
                              className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 text-xs"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> View Terms
                            </Button>
                            <Link href={`/shops/${agr.shopId}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-white/60 hover:text-white border-white/10 text-xs"
                              >
                                <Store className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: GUIDELINES ACCEPTANCES */}
      {activeTab === 'guidelines' && (
        <div className="space-y-4">
          <Card className="p-3 border border-white/5 bg-white/[0.01] flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
              <input
                type="text"
                placeholder="Search by seller name, email, or shop..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Guideline Versions</option>
              {guidelines.map((g: any) => (
                <option key={g.id} value={g.id}>
                  v{g.version} ({g.title}) - {g.status}
                </option>
              ))}
            </select>
          </Card>

          <Card className="border border-white/5 bg-white/[0.01] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] text-white/40 border-b border-white/5 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-3.5">Seller & Shop</th>
                    <th className="p-3.5">Guideline Version</th>
                    <th className="p-3.5">Typed Legal Name</th>
                    <th className="p-3.5">Document SHA-256 Hash</th>
                    <th className="p-3.5">Accepted Date</th>
                    <th className="p-3.5">IP & Client Evidence</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-white/80">
                  {isGuidelineAgreementsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="p-4">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : guidelineAgreements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-white/40">
                        No guideline agreements recorded matching the filter.
                      </td>
                    </tr>
                  ) : (
                    guidelineAgreements.map((a: any) => (
                      <tr key={a.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-3.5">
                          <div className="font-semibold text-white">
                            {a.seller?.firstName} {a.seller?.lastName}
                          </div>
                          <div className="text-[11px] text-white/40">
                            {a.seller?.email} • Shop: <span className="text-emerald-400">{a.seller?.shop?.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                            v{a.guideline?.version || a.guidelineVersion || '1.0'}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-medium text-white">{a.signedName}</td>
                        <td className="p-3.5 font-mono text-[10px] text-white/40">
                          {a.documentHash ? a.documentHash.substring(0, 16) + '...' : 'N/A'}
                        </td>
                        <td className="p-3.5 text-white/60">
                          {new Date(a.acceptedAt).toLocaleDateString()} {new Date(a.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3.5 text-[11px] text-white/60">
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-white/40" />
                            <span>{a.ipAddress || '127.0.0.1'}</span>
                          </div>
                          <div className="text-[10px] text-white/40 truncate max-w-[160px]">
                            {a.userAgent || 'Web browser'}
                          </div>
                        </td>
                        <td className="p-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAgreement(a)}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> Audit Record
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Audit Detail Modal */}
      {selectedAgreement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border border-white/10 bg-[#0c0c10] p-6 space-y-4 shadow-2xl animate-in fade-in-50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Agreement Terms & Certificate</h3>
              </div>
              <button
                onClick={() => setSelectedAgreement(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/40">Agreement ID:</span>
                  <span className="font-mono text-white text-[11px]">{selectedAgreement.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Shop:</span>
                  <span className="text-purple-400 font-bold">{selectedAgreement.shop?.name || selectedAgreement.seller?.shop?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Seller:</span>
                  <span className="text-white font-semibold">
                    {selectedAgreement.seller?.firstName} {selectedAgreement.seller?.lastName} ({selectedAgreement.seller?.email})
                  </span>
                </div>
                {selectedAgreement.commissionPercentage !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Agreed Commission:</span>
                    <span className="text-purple-400 font-bold">{selectedAgreement.commissionPercentage}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/40">Status:</span>
                  <Badge variant={selectedAgreement.status === 'ACCEPTED' ? 'success' : 'warning'} className="text-[9px]">
                    {selectedAgreement.status || 'ACCEPTED'}
                  </Badge>
                </div>
                {selectedAgreement.acceptedAt && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Accepted At:</span>
                    <span className="text-white">{new Date(selectedAgreement.acceptedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {selectedAgreement.documentHash && (
                <div className="p-3 bg-black/40 rounded-lg border border-white/5 space-y-1">
                  <p className="text-[11px] font-semibold text-white/80 flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-purple-400" />
                    Cryptographic Content SHA-256 Digest
                  </p>
                  <p className="font-mono text-[10px] break-all text-purple-300 bg-purple-950/20 p-2 rounded border border-purple-900/30">
                    {selectedAgreement.documentHash}
                  </p>
                </div>
              )}

              {selectedAgreement.content && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-white/60">Immutable Agreement Body:</p>
                  <div className="p-3 rounded-lg bg-black/60 border border-white/5 font-mono text-[10px] text-white/70 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                    {selectedAgreement.content}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAgreement(null)}
                className="text-white/60 border-white/10 text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const receiptText = JSON.stringify(selectedAgreement, null, 2);
                  const blob = new Blob([receiptText], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `agreement_certificate_${selectedAgreement.id}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download JSON Certificate
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
