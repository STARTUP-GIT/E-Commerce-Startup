"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
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
  X
} from 'lucide-react';

export default function AgreementTrackingPage() {
  const [search, setSearch] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState<any>(null);

  // Fetch guidelines to populate version filter
  const { data: guidelinesData } = useQuery({
    queryKey: ['admin-guidelines-list'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/guidelines');
      return res.data;
    },
  });

  // Fetch agreements with search & filter
  const { data: agreementsData, isLoading } = useQuery({
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
  });

  const guidelines = guidelinesData?.guidelines ?? [];
  const activeGuideline = guidelines.find((g: any) => g.status === 'PUBLISHED');
  const agreements = agreementsData?.agreements ?? [];
  const totalAgreements = agreementsData?.pagination?.total ?? agreements.length;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-400" />
            Seller Agreement & Compliance Tracking
          </h1>
          <p className="text-xs text-white/50">
            Immutable cryptographic records of seller acceptances for published Community Guidelines terms.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Active Published Version</p>
              <p className="text-lg font-bold text-white mt-1">
                {activeGuideline ? `v${activeGuideline.version}` : 'None'}
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">
            {activeGuideline?.title || 'No active terms'}
          </p>
        </Card>

        <Card className="p-4 border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Total Valid Signatures</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">{totalAgreements}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <FileCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Verified server timestamps & hashes</p>
        </Card>

        <Card className="p-4 border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Active Document Hash</p>
              <p className="text-xs font-mono font-bold text-slate-300 mt-1 truncate max-w-[150px]">
                {activeGuideline?.contentHash ? activeGuideline.contentHash.substring(0, 16) + '...' : 'N/A'}
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Hash className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">SHA-256 cryptographic fingerprint</p>
        </Card>

        <Card className="p-4 border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Guideline Versions</p>
              <p className="text-lg font-bold text-white mt-1">{guidelines.length}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Audited drafts & superseded records</p>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-3 border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by seller name, email, or shop..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={selectedVersion}
          onChange={(e) => setSelectedVersion(e.target.value)}
          className="bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Guideline Versions</option>
          {guidelines.map((g: any) => (
            <option key={g.id} value={g.id}>
              v{g.version} ({g.title}) - {g.status}
            </option>
          ))}
        </select>
      </Card>

      {/* Agreements Table */}
      <Card className="border border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Seller & Shop</th>
                <th className="p-3">Guideline Version</th>
                <th className="p-3">Typed Legal Name</th>
                <th className="p-3">Document SHA-256 Hash</th>
                <th className="p-3">Accepted Date</th>
                <th className="p-3">IP & Client Evidence</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="p-3">
                      <Skeleton className="h-8 w-full bg-slate-800/40" />
                    </td>
                  </tr>
                ))
              ) : agreements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No guideline agreements recorded matching the filter.
                  </td>
                </tr>
              ) : (
                agreements.map((a: any) => {
                  const sellerName = a.seller
                    ? `${a.seller.firstName || ''} ${a.seller.lastName || ''}`.trim()
                    : 'Seller';
                  const shopName = a.seller?.shop?.name || 'N/A';
                  return (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-white">{sellerName}</div>
                        <div className="text-[11px] text-slate-400">
                          {a.seller?.email} • Shop: <span className="text-emerald-400">{shopName}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                          v{a.guideline?.version || a.guidelineVersion || '1.0'}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium text-white">{a.signedName}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-400">
                        {a.documentHash ? a.documentHash.substring(0, 16) + '...' : 'N/A'}
                      </td>
                      <td className="p-3 text-slate-400">
                        {new Date(a.acceptedAt).toLocaleDateString()} {new Date(a.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-slate-500" />
                          <span>{a.ipAddress || '127.0.0.1'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                          {a.userAgent || 'Web browser'}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAgreement(a)}
                          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Audit Record
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit Detail Drawer / Modal */}
      {selectedAgreement && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl animate-in fade-in-50">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Cryptographic Acceptance Certificate</h3>
              </div>
              <button
                onClick={() => setSelectedAgreement(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Certificate Reference ID:</span>
                  <span className="font-mono text-white text-[11px]">{selectedAgreement.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Seller Legal Name:</span>
                  <span className="font-semibold text-white">{selectedAgreement.signedName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Seller Account:</span>
                  <span className="text-slate-300">{selectedAgreement.seller?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Shop:</span>
                  <span className="text-emerald-400 font-semibold">{selectedAgreement.seller?.shop?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Guideline Version:</span>
                  <span className="text-indigo-400 font-semibold">
                    v{selectedAgreement.guideline?.version || selectedAgreement.guidelineVersion}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Accepted Timestamp:</span>
                  <span className="text-white">{new Date(selectedAgreement.acceptedAt).toUTCString()}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-purple-400" />
                  Document Content SHA-256 Digest
                </p>
                <p className="font-mono text-[10px] break-all text-purple-300 bg-purple-950/30 p-2 rounded border border-purple-900/40">
                  {selectedAgreement.documentHash || 'N/A'}
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
                <p className="text-[11px] font-semibold text-slate-300">Technical Audit Metadata</p>
                <div className="text-[10px] text-slate-400 space-y-1">
                  <div>IP Address: <span className="font-mono text-slate-300">{selectedAgreement.ipAddress || '127.0.0.1'}</span></div>
                  <div>User Agent: <span className="text-slate-300 break-all">{selectedAgreement.userAgent || 'Unknown'}</span></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAgreement(null)}
                className="text-slate-300 border-slate-700 text-xs"
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
                  a.download = `agreement_receipt_${selectedAgreement.id}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download JSON Proof
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
