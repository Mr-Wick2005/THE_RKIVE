import Link from 'next/link';
import { BookOpen, Search, Layers, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  type?: 'search' | 'department' | 'magazines' | 'general';
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({
  type = 'general',
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'search':
        return <Search className="w-8 h-8 text-[#77736C]" />;
      case 'department':
        return <Layers className="w-8 h-8 text-[#77736C]" />;
      default:
        return <BookOpen className="w-8 h-8 text-[#77736C]" />;
    }
  };

  const defaultTitle = {
    search: 'No publications match your search',
    department: 'No publications released yet',
    magazines: 'No published digital magazines',
    general: 'No records found',
  }[type];

  const defaultDesc = {
    search: 'Try adjusting your search terms, removing academic year filters, or selecting a different department.',
    department: 'This academic department has not yet published an approved digital edition to the public archive.',
    magazines: 'Digital magazine editions are currently undergoing peer editorial review before being published.',
    general: 'The requested archival records are currently unavailable.',
  }[type];

  return (
    <div className="border border-[#E8E2D8] bg-white rounded-sm p-12 sm:p-16 text-center space-y-4 max-w-xl mx-auto shadow-sm my-8">
      <div className="w-14 h-14 rounded-full bg-[#F8F6F1] border border-[#E8E2D8] flex items-center justify-center mx-auto">
        {getIcon()}
      </div>

      <div className="space-y-1.5">
        <h3 className="font-serif text-xl font-medium text-[#171717]">
          {title || defaultTitle}
        </h3>
        <p className="text-xs sm:text-sm text-[#77736C] max-w-md mx-auto leading-relaxed">
          {description || defaultDesc}
        </p>
      </div>

      {actionHref && actionLabel && (
        <div className="pt-2">
          <Link href={actionHref}>
            <Button variant="outline" size="sm">
              {actionLabel}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
