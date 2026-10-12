import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '../api/shopApi';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Dialog } from '@/shared/components/Dialog';
import { useUIStore } from '@/lib/store/uiStore';
import {
  FileCheck,
  CheckCircle2,
  Clock,
  Send,
  Lock
} from 'lucide-react';

interface SellerAgreementBannerProps {
  shopStatus?: string;
}

export function SellerAgreementBanner({ shopStatus }: SellerAgreementBannerProps) {
  const queryClient = useQueryClient();
  const showToast = useUIStore((state) => state.showToast);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['seller-shop-agreement'],
    queryFn: shopApi.getAgreement,
    staleTime: 10 * 1000,
  });

  const agreement = data?.agreement;

  const acceptMutation = useMutation({
    mutationFn: () => {
      if (!agreement?.id) throw new Error('No agreement ID');
      return shopApi.acceptAgreement(agreement.id, { signedName: signedName.trim() });
    },
    onSuccess: () => {
      showToast('Agreement successfully accepted! Your shop is now awaiting final admin approval.', 'success');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['seller-shop-agreement'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shop'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to accept agreement', 'error');
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => {
      if (!agreement?.id) throw new Error('No agreement ID');
      return shopApi.declineAgreement(agreement.id, { reason: declineReason.trim() });
    },
    onSuccess: () => {
      showToast('Agreement declined. Platform operations will review your feedback.', 'info');
      setIsDeclineModalOpen(false);
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['seller-shop-agreement'] });
      queryClient.invalidateQueries({ queryKey: ['seller-shop'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to decline agreement', 'error');
    },
  });

  if (isLoading) return null;

  // If shop is already approved and no pending agreement action is required
  if (shopStatus === 'APPROVED' && (!agreement || agreement.status === 'ACCEPTED')) {
    return null;
  }

  return (
    <>
      {/* 1. Agreement ISSUED (Action Required) */}
      {agreement && agreement.status === 'ISSUED' && (
        <Card className="border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-transparent p-5 rounded-2xl relative overflow-hidden backdrop-blur-md animate-fade-in mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    Action Required: Review & Accept Shop Agreement (v{agreement.version})
                  </h4>
                  <Badge variant="outline" className="text-[9px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30 font-bold">
                    Pending Acceptance
                  </Badge>
                </div>
                <p className="text-xs text-white/60 leading-relaxed max-w-2xl">
                  An individual seller agreement has been issued for your storefront specifying a <strong className="text-purple-300">{agreement.commissionPercentage}% commission</strong> rate and operational terms. You must accept this agreement before your shop can receive final approval.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 shrink-0 shadow-lg shadow-indigo-600/20"
            >
              Review & Sign Agreement
            </Button>
          </div>
        </Card>
      )}

      {/* 2. Agreement ACCEPTED, Awaiting Final Admin Approval */}
      {agreement && agreement.status === 'ACCEPTED' && shopStatus !== 'APPROVED' && (
        <Card className="border border-emerald-500/20 bg-emerald-950/20 p-4 rounded-xl backdrop-blur-md mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-white">
                Agreement Accepted (v{agreement.version}) — Awaiting Final Shop Approval
              </p>
              <p className="text-white/50 text-[11px] mt-0.5">
                Signed by <strong>{agreement.acceptedByName || 'You'}</strong> on {agreement.acceptedAt ? new Date(agreement.acceptedAt).toLocaleDateString() : 'recently'}. An administrator is completing the final storefront review. You can prepare your product catalog in the meantime!
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Pre-Approval Product Notice when Shop is PENDING but no agreement issued yet */}
      {(!agreement || agreement.status === 'DECLINED') && shopStatus === 'PENDING' && (
        <Card className="border border-blue-500/20 bg-blue-950/20 p-4 rounded-xl backdrop-blur-md mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-400 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-white">
                Shop Approval Pending — Pre-Approval Catalog Creation Enabled
              </p>
              <p className="text-white/50 text-[11px] mt-0.5">
                You can add and configure products now so your store is ready at launch. Your listings will automatically become eligible for public sales once platform operations issues your agreement and approves your storefront.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Agreement Review & Acceptance Dialog */}
      {agreement && (
        <Dialog
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Review & Accept Seller Agreement (v${agreement.version})`}
          description={agreement.title}
          className="max-w-[700px]"
        >
          <div className="space-y-4 text-xs">
            {/* Commercial terms summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <span className="text-[10px] text-white/40 block font-semibold uppercase">Commission Rate</span>
                <span className="text-base font-extrabold text-purple-400">{agreement.commissionPercentage}%</span>
                <span className="text-[9px] text-white/35 block">of gross product sale</span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 block font-semibold uppercase">Effective Date</span>
                <span className="text-xs font-bold text-white">
                  {agreement.effectiveDate ? new Date(agreement.effectiveDate).toLocaleDateString() : 'Upon Digital Acceptance'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 block font-semibold uppercase">Issued Date</span>
                <span className="text-xs font-bold text-white">
                  {new Date(agreement.publishedAt || agreement.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Fulfilment & Obligations highlights */}
            {agreement.deliveryFulfilmentTerms && (
              <div className="p-3 rounded-lg bg-white/[0.01] border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-white/50 uppercase block">Fulfilment & Delivery Standard</span>
                <p className="text-white/80 leading-relaxed text-[11px]">{agreement.deliveryFulfilmentTerms}</p>
              </div>
            )}

            {agreement.otherObligations && (
              <div className="p-3 rounded-lg bg-white/[0.01] border border-white/5 space-y-1">
                <span className="text-[10px] font-bold text-white/50 uppercase block">Quality Assurances & Seller Warranties</span>
                <p className="text-white/80 leading-relaxed text-[11px]">{agreement.otherObligations}</p>
              </div>
            )}

            {/* Complete immutable body */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-white/50 uppercase block">Full Legal Terms Snapshot</span>
              <div className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-white/70 whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed select-text">
                {agreement.content}
              </div>
            </div>

            {/* Digital Signature Form */}
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-3 pt-3">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                <Lock className="h-4 w-4" />
                <span>Digital Acceptance & Execution</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-white/70 font-bold block">
                  Authorized Signer Full Legal Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your legal full name (e.g. Jane Doe)"
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-white/15 bg-black/40 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/40"
                />
                <span className="text-[11px] text-white/65 leading-relaxed select-none">
                  I represent and warrant that I am authorized to bind the merchant to these terms. By typing my legal name and clicking "Accept & Sign", I execute a legally binding agreement under applicable digital transaction laws.
                </span>
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeclineModalOpen(true)}
                className="text-rose-400 hover:text-rose-300 border-rose-500/20 hover:bg-rose-500/10 text-xs"
              >
                Decline Agreement
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={!signedName.trim() || !acceptedTerms}
                  isLoading={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Accept & Sign Agreement
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Decline Reason Modal */}
      <Dialog
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        title="Decline Seller Agreement"
        description="Provide feedback to platform operations regarding the proposed terms"
        className="max-w-[480px]"
      >
        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-white/60 font-bold block">
              Reason for Declining <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Explain why the proposed commercial terms, commission rate, or obligations are unacceptable..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-black/40 text-white placeholder-white/30 focus:outline-none focus:border-rose-500 text-xs font-medium resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeclineModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!declineReason.trim()}
              isLoading={declineMutation.isPending}
              onClick={() => declineMutation.mutate()}
            >
              Submit Decline
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
