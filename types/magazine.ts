import { Database, MagazineStatus, MagazineProcessingStatus } from './database.types';
import { Department } from './department';
import { Profile } from './auth';

export type Magazine = Database['public']['Tables']['magazines']['Row'];
export type MagazineInsert = Database['public']['Tables']['magazines']['Insert'];
export type MagazineUpdate = Database['public']['Tables']['magazines']['Update'];

export type MagazinePage = Database['public']['Tables']['magazine_pages']['Row'];
export type MagazinePageInsert = Database['public']['Tables']['magazine_pages']['Insert'];
export type MagazinePageUpdate = Database['public']['Tables']['magazine_pages']['Update'];

export type MagazineStatusHistory = Database['public']['Tables']['magazine_status_history']['Row'];
export type MagazineStatusHistoryInsert = Database['public']['Tables']['magazine_status_history']['Insert'];

export type { MagazineStatus, MagazineProcessingStatus };

export interface MagazineStatusHistoryWithProfile extends MagazineStatusHistory {
  profile?: Profile;
}

export interface MagazineWithRelations extends Magazine {
  department?: Department;
  author?: Profile;
  pages?: MagazinePage[];
  status_history?: MagazineStatusHistoryWithProfile[];
}

export interface MagazineWithProcessing extends Magazine {
  pages_count_processed?: number;
}

export const MAGAZINE_STATUS_LABELS: Record<MagazineStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted for Review',
  UNDER_REVIEW: 'Under Editorial Review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  REJECTED: 'Needs Revision',
  ARCHIVED: 'Archived',
};

export const MAGAZINE_STATUS_COLORS: Record<
  MagazineStatus,
  { bg: string; text: string; border: string }
> = {
  DRAFT: {
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-300',
  },
  SUBMITTED: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
  },
  UNDER_REVIEW: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-300',
  },
  APPROVED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
  PUBLISHED: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    border: 'border-emerald-400',
  },
  REJECTED: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-300',
  },
  ARCHIVED: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-300',
  },
};

export const PROCESSING_STATUS_LABELS: Record<MagazineProcessingStatus, string> = {
  NOT_STARTED: 'Not Processed',
  QUEUED: 'Queued',
  PROCESSING: 'Processing Pages...',
  COMPLETED: 'Ready',
  FAILED: 'Processing Failed',
};

export const PROCESSING_STATUS_COLORS: Record<
  MagazineProcessingStatus,
  { bg: string; text: string; border: string; dot: string }
> = {
  NOT_STARTED: {
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    border: 'border-stone-200',
    dot: 'bg-stone-400',
  },
  QUEUED: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
  },
  PROCESSING: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500 animate-pulse',
  },
  COMPLETED: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  FAILED: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
};

