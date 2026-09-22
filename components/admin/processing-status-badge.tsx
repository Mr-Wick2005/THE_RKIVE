import React from 'react';
import { MagazineProcessingStatus, PROCESSING_STATUS_LABELS, PROCESSING_STATUS_COLORS } from '@/types/magazine';
import { cn } from '@/lib/utils';
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, FileQuestion } from 'lucide-react';

interface ProcessingStatusBadgeProps {
  status?: MagazineProcessingStatus | null;
  pageCount?: number;
  className?: string;
  showIcon?: boolean;
}

export function ProcessingStatusBadge({
  status = 'NOT_STARTED',
  pageCount = 0,
  className,
  showIcon = true,
}: ProcessingStatusBadgeProps) {
  const safeStatus = status || 'NOT_STARTED';
  const config = PROCESSING_STATUS_COLORS[safeStatus] || PROCESSING_STATUS_COLORS.NOT_STARTED;
  const label = safeStatus === 'COMPLETED' && pageCount > 0
    ? `Ready (${pageCount} pgs)`
    : PROCESSING_STATUS_LABELS[safeStatus];

  const getIcon = () => {
    switch (safeStatus) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
      case 'PROCESSING':
        return <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />;
      case 'QUEUED':
        return <Clock className="w-3 h-3 text-amber-600" />;
      case 'FAILED':
        return <AlertTriangle className="w-3 h-3 text-rose-600" />;
      default:
        return <FileQuestion className="w-3 h-3 text-stone-500" />;
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium border font-mono tracking-wide',
        config.bg,
        config.text,
        config.border,
        className
      )}
      title={safeStatus === 'COMPLETED' ? `Document processed: ${pageCount} pages generated` : label}
    >
      {showIcon && getIcon()}
      <span>{label}</span>
    </span>
  );
}
