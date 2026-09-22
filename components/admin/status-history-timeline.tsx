'use client';

import React from 'react';
import { MagazineStatusHistoryWithProfile, MagazineStatus, MAGAZINE_STATUS_LABELS, MAGAZINE_STATUS_COLORS } from '@/types/magazine';
import { Badge } from '@/components/ui/badge';
import { Clock, User, MessageSquare } from 'lucide-react';
import { formatDate, formatTimeAgo } from '@/lib/utils';

interface StatusHistoryTimelineProps {
  history: MagazineStatusHistoryWithProfile[];
}

export function StatusHistoryTimeline({ history }: StatusHistoryTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-[#77736C] font-mono">
        No editorial audit records found for this publication.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {history.map((event, eventIdx) => {
          const isLast = eventIdx === history.length - 1;
          const toColors = MAGAZINE_STATUS_COLORS[event.to_status as MagazineStatus] || {
            bg: 'bg-stone-100',
            text: 'text-stone-800',
            border: 'border-stone-300',
          };

          return (
            <li key={event.id || eventIdx}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-[#E8E2D8]"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-white border border-[#E8E2D8] flex items-center justify-center shadow-xs">
                      <Clock className="h-4 w-4 text-[#77736C]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {event.from_status && (
                          <>
                            <span className="text-xs text-[#77736C] font-mono">
                              {MAGAZINE_STATUS_LABELS[event.from_status as MagazineStatus]}
                            </span>
                            <span className="text-xs text-[#77736C]">→</span>
                          </>
                        )}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${toColors.bg} ${toColors.text} ${toColors.border}`}
                        >
                          {MAGAZINE_STATUS_LABELS[event.to_status as MagazineStatus]}
                        </span>
                      </div>
                      <time
                        dateTime={event.created_at}
                        className="text-[10px] font-mono text-[#77736C]"
                        title={formatDate(event.created_at)}
                      >
                        {formatTimeAgo(event.created_at)}
                      </time>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#44423E]">
                      <User className="w-3.5 h-3.5 text-[#77736C]" />
                      <span>{event.profile?.full_name || 'System / Administrator'}</span>
                    </div>

                    {event.note && (
                      <div className="mt-2 text-xs bg-[#F8F6F1] border border-[#E8E2D8] p-2.5 rounded-sm text-[#171717]">
                        <div className="flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-[#B58A55] mt-0.5 shrink-0" />
                          <p className="leading-relaxed whitespace-pre-wrap">{event.note}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
