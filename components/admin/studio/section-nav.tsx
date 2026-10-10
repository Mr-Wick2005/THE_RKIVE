'use client';

import React from 'react';
import {
  LayoutDashboard,
  Menu,
  Type,
  Film,
  BookOpen,
  Building2,
  Info,
  Library,
  BookmarkCheck,
  PanelBottom,
  Palette,
  Image as ImageIcon,
  History,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { SectionId, LandingPageConfig } from '@/types/cms';
import { cn } from '@/lib/utils';

interface SectionNavProps {
  activeSection: SectionId;
  onSelectSection: (section: SectionId) => void;
  config: LandingPageConfig;
  onToggleVisibility: (sectionKey: keyof LandingPageConfig) => void;
  onMoveSection: (sectionKey: string, direction: 'up' | 'down') => void;
}

export function SectionNav({
  activeSection,
  onSelectSection,
  config,
  onToggleVisibility,
  onMoveSection,
}: SectionNavProps) {
  const sectionsList: Array<{
    id: SectionId;
    label: string;
    icon: React.ElementType;
    isConfigSection?: boolean;
    configKey?: keyof LandingPageConfig;
  }> = [
    { id: 'overview', label: 'Overview & Status', icon: LayoutDashboard },
    { id: 'header', label: 'Header & Navigation', icon: Menu },
    { id: 'hero', label: 'Hero Section', icon: Type, isConfigSection: true, configKey: 'hero' },
    { id: 'archive_reel', label: 'Archive Reel', icon: Film, isConfigSection: true, configKey: 'archive_reel' },
    { id: 'recent_releases', label: 'Recent Releases', icon: BookOpen, isConfigSection: true, configKey: 'recent_releases' },
    { id: 'departments_showcase', label: 'Department Showcase', icon: Building2, isConfigSection: true, configKey: 'departments_showcase' },
    { id: 'about_section', label: 'About THE RKIVE', icon: Info, isConfigSection: true, configKey: 'about_section' },
    { id: 'bookshelf_section', label: 'Digital Bookshelf', icon: Library, isConfigSection: true, configKey: 'bookshelf_section' },
    { id: 'archive_manifesto', label: 'Archive Manifesto', icon: BookmarkCheck, isConfigSection: true, configKey: 'archive_manifesto' },
    { id: 'footer', label: 'Footer & Links', icon: PanelBottom },
    { id: 'theme', label: 'Theme & Styling', icon: Palette },
    { id: 'media_library', label: 'Media Library', icon: ImageIcon },
    { id: 'version_history', label: 'Version History', icon: History },
  ];

  return (
    <aside className="w-full lg:w-72 bg-[#FAF7F2] border-b-2 lg:border-b-0 lg:border-r-2 border-[#1A1A1A] p-4 flex flex-col gap-2 overflow-y-auto">
      <div className="pb-3 border-b-2 border-[#1A1A1A] flex items-center justify-between">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#1A1A1A]">
          Homepage Layout
        </span>
        <span className="text-[10px] font-mono text-[#55524D] bg-[#F4EFEB] px-2 py-0.5 border border-[#1A1A1A]/20">
          13 Areas
        </span>
      </div>

      <nav className="space-y-1.5 flex-1">
        {sectionsList.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const sectionConfig = item.configKey ? (config[item.configKey] as any) : null;
          const isVisible = sectionConfig?.is_visible !== false;
          const orderIdx = item.configKey ? config.section_order.indexOf(item.configKey as string) : -1;

          return (
            <div
              key={item.id}
              className={cn(
                'group flex items-center justify-between p-2 rounded-none border-2 transition-all',
                isActive
                  ? 'bg-[#1A1A1A] text-[#FAF7F2] border-[#1A1A1A] shadow-[3px_3px_0px_#1B44B8]'
                  : 'bg-[#F4EFEB] text-[#1A1A1A] border-[#1A1A1A]/40 hover:border-[#1A1A1A] hover:bg-[#FAF8F3]'
              )}
            >
              <button
                type="button"
                onClick={() => onSelectSection(item.id)}
                className="flex items-center gap-2.5 flex-1 text-left py-0.5 cursor-pointer"
              >
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-[#FAF7F2]' : 'text-[#1B44B8] group-hover:text-[#1A1A1A]'
                  )}
                />
                <span className="text-xs font-bold tracking-tight">
                  {item.label}
                </span>
              </button>

              {/* Controls for homepage reorderable content sections */}
              {item.isConfigSection && item.configKey && (
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  {/* Visibility Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.configKey) onToggleVisibility(item.configKey);
                    }}
                    title={isVisible ? 'Hide this section from homepage' : 'Show this section on homepage'}
                    className={cn(
                      'p-1 transition-colors',
                      isVisible
                        ? isActive ? 'text-[#FAF7F2] hover:text-[#C24A26]' : 'text-[#2B6E3F] hover:text-[#1A1A1A]'
                        : 'text-gray-400 hover:text-gray-600 line-through'
                    )}
                  >
                    {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  {/* Reorder Buttons */}
                  {orderIdx >= 0 && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={orderIdx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveSection(item.configKey as string, 'up');
                        }}
                        title="Move Up"
                        className="p-0.5 hover:text-[#1B44B8] disabled:opacity-20 cursor-pointer"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={orderIdx === config.section_order.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveSection(item.configKey as string, 'down');
                        }}
                        title="Move Down"
                        className="p-0.5 hover:text-[#1B44B8] disabled:opacity-20 cursor-pointer"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Quick Section Ordering Legend */}
      <div className="pt-3 border-t-2 border-[#1A1A1A]/20 text-[11px] font-mono text-[#55524D] space-y-1">
        <div className="flex items-center justify-between">
          <span>Active Sections:</span>
          <span className="font-bold text-[#1A1A1A]">
            {config.section_order.filter(key => (config[key as keyof LandingPageConfig] as any)?.is_visible !== false).length}
          </span>
        </div>
        <p className="text-[10px] text-[#77736C] leading-tight">
          Click section to edit. Use arrows to reorder homepage layout.
        </p>
      </div>
    </aside>
  );
}
