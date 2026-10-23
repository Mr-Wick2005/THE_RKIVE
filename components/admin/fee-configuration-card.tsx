'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PAYMENT_CONFIG, formatPaiseToRupees } from '@/lib/payments/config';
import { getPlatformFeeAction, updatePlatformFeeAction } from '@/app/actions/payments';
import {
  CheckCircle2,
  AlertCircle,
  Shield,
  Edit2,
  X,
  IndianRupee,
  Database,
  AlertTriangle,
} from 'lucide-react';

export function FeeConfigurationCard() {
  const [feePaise, setFeePaise] = useState<number>(PAYMENT_CONFIG.DEFAULT_SUBMISSION_FEE_PAISE);
  const [isPersistent, setIsPersistent] = useState<boolean>(true);
  const [persistenceNotice, setPersistenceNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [inputRupees, setInputRupees] = useState((PAYMENT_CONFIG.DEFAULT_SUBMISSION_FEE_PAISE / 100).toString());
  const [changeReason, setChangeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getPlatformFeeAction();
        if (mounted) {
          if (res.feePaise) {
            setFeePaise(res.feePaise);
            setInputRupees((res.feePaise / 100).toString());
          }
          setIsPersistent(res.isPersistent ?? true);
          if (res.isPersistent === false && res.error) {
            setPersistenceNotice(res.error);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setIsPersistent(false);
          setPersistenceNotice(err.message || 'Could not verify database persistence for platform settings.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedRupees = parseFloat(inputRupees);
    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      setErrorMessage('Please enter a valid fee in Rupees (minimum ₹1).');
      return;
    }

    const candidatePaise = Math.round(parsedRupees * 100);
    if (candidatePaise < PAYMENT_CONFIG.MIN_SUBMISSION_FEE_PAISE || candidatePaise > PAYMENT_CONFIG.MAX_SUBMISSION_FEE_PAISE) {
      setErrorMessage(
        `Fee must be between ₹${PAYMENT_CONFIG.MIN_SUBMISSION_FEE_PAISE / 100} and ₹${
          PAYMENT_CONFIG.MAX_SUBMISSION_FEE_PAISE / 100
        } (${PAYMENT_CONFIG.MIN_SUBMISSION_FEE_PAISE} to ${PAYMENT_CONFIG.MAX_SUBMISSION_FEE_PAISE} paise).`
      );
      return;
    }

    const cleanReason = changeReason.trim();
    if (!cleanReason || cleanReason.length < 3) {
      setErrorMessage('A mandatory institutional audit reason (minimum 3 characters) is required.');
      return;
    }

    setIsSaving(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const activeToken = session?.access_token;

      const res = await updatePlatformFeeAction(candidatePaise, cleanReason, activeToken);
      if (!res.success) {
        if (res.error?.includes('schema cache') || res.error?.includes('platform_settings') || res.error?.includes('does not exist')) {
          setErrorMessage(
            'Database table "public.platform_settings" does not exist in the connected database. Please review and apply migration 20261021_payment_system.sql to your isolated development database to enable persistent fee updates.'
          );
          setIsPersistent(false);
        } else {
          setErrorMessage(res.error || 'Failed to update platform fee.');
        }
        return;
      }

      setFeePaise(candidatePaise);
      setIsPersistent(true);
      setPersistenceNotice(null);
      setSuccessMessage(`Platform submission fee updated to ${formatPaiseToRupees(candidatePaise)}.`);
      setIsEditing(false);
      setChangeReason('');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while updating platform fee.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border border-[#E8E2D8] bg-white rounded-sm p-6 shadow-editorial space-y-4">
      <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-[#FAF6F0] border border-[#E8E2D8] flex items-center justify-center text-[#B58A55]">
            <IndianRupee className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-[#171717]">
              Submission Fee & Financial Governance
            </h3>
            <p className="text-sm text-[#55524D]">
              Platform-wide fee charged per publication submission
            </p>
          </div>
        </div>

        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditing(true);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className="text-sm gap-1.5 border-[#171717]/25 text-[#171717] hover:bg-[#F8F6F1] min-h-[38px] px-3.5"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#B58A55]" />
            <span>Configure Fee</span>
          </Button>
        )}
      </div>

      {/* Migration Notice Banner if DB table is unmigrated */}
      {!isLoading && !isPersistent && (
        <div className="p-3.5 rounded-sm bg-amber-50/80 border border-amber-300 text-amber-950 text-xs sm:text-[13px] flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block text-amber-900">
              Database Table Notice: `public.platform_settings` is not yet applied
            </span>
            <p className="text-amber-800 leading-relaxed">
              The platform is actively operating with the default ₹20.00 fee fallback. Applying migration{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px] text-amber-950">
                supabase/migrations/20261021_payment_system.sql
              </code>{' '}
              to your development database is required to store new fee adjustments persistently.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {!isEditing ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-sm bg-[#F8F6F1] border border-[#E8E2D8]">
          <div className="space-y-1.5">
            <span className="text-xs font-mono uppercase tracking-wider text-[#77736C] font-medium">
              Current Active Submission Fee
            </span>
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-3xl font-bold text-[#171717]">
                {isLoading ? '...' : formatPaiseToRupees(feePaise)}
              </span>
              <span className="text-sm text-[#55524D]">
                ({feePaise.toLocaleString()} integer paise, INR)
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-[#55524D] leading-relaxed max-w-xl">
              Charged once when a completed magazine is submitted for college editorial review. Corrected resubmissions incur no extra charge.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono text-[#55524D] bg-white px-3 py-1.5 rounded-sm border border-[#E8E2D8]">
              <Shield className="w-3.5 h-3.5 text-[#B58A55]" />
              <span>Super Admin Controlled</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-sm border bg-white border-[#E8E2D8]">
              <Database className={`w-3.5 h-3.5 ${isPersistent ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className={isPersistent ? 'text-emerald-800 font-medium' : 'text-amber-800'}>
                {isPersistent ? 'Database Persisted' : 'Default Fallback'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSaveFee} className="space-y-4 p-5 rounded-sm bg-[#FAF6F0] border border-[#E8E2D8]">
          <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-2">
            <span className="text-sm font-semibold text-[#171717]">
              Update Platform Submission Fee
            </span>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setInputRupees((feePaise / 100).toString());
              }}
              className="text-[#77736C] hover:text-[#171717] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1.5">
                New Fee Amount (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#77736C] font-mono">₹</span>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={inputRupees}
                  onChange={(e) => setInputRupees(e.target.value)}
                  className="h-11 pl-8 text-sm font-mono bg-white border-[#E8E2D8]"
                  required
                />
              </div>
              <span className="text-xs text-[#55524D] mt-1.5 block">
                Permitted range: ₹1 to ₹1,000 (100 to 100,000 paise).
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1.5">
                Institutional Audit Reason *
              </label>
              <Input
                type="text"
                placeholder="e.g. Annual academic review fee adjustment"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="h-11 text-sm bg-white border-[#E8E2D8]"
                required
              />
              <span className="text-xs text-[#55524D] mt-1.5 block">
                Recorded permanently in the platform fee audit log with timestamp and actor ID.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8E2D8]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="text-sm min-h-[40px] px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              className="text-sm min-h-[40px] px-5 bg-[#171717] hover:bg-[#2C2C2A] text-white"
            >
              <span>Save Fee & Record Audit</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
