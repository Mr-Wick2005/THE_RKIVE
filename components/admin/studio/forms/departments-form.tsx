'use client';

import React, { useState } from 'react';
import { Building2, ChevronUp, ChevronDown, Check, Trash2, Plus } from 'lucide-react';
import { DepartmentsShowcaseConfig, CmsStudioData } from '@/types/cms';
import { cn } from '@/lib/utils';

interface DepartmentsFormProps {
  departments: DepartmentsShowcaseConfig;
  onChange: (updated: DepartmentsShowcaseConfig) => void;
  studioData: CmsStudioData;
}

export function DepartmentsForm({
  departments,
  onChange,
  studioData,
}: DepartmentsFormProps) {
  const [selectedDeptForOverride, setSelectedDeptForOverride] = useState<string | null>(null);

  const updateField = <K extends keyof DepartmentsShowcaseConfig>(
    key: K,
    value: DepartmentsShowcaseConfig[K]
  ) => {
    onChange({ ...departments, [key]: value });
  };

  const toggleFeaturedDepartment = (id: string) => {
    const current = departments.featured_department_ids || [];
    if (current.includes(id)) {
      updateField('featured_department_ids', current.filter((dId) => dId !== id));
    } else {
      updateField('featured_department_ids', [...current, id]);
    }
  };

  const moveDepartmentOrder = (index: number, direction: 'up' | 'down') => {
    const current = [...(departments.featured_department_ids || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIdx];
    current[targetIdx] = temp;
    updateField('featured_department_ids', current);
  };

  const updateOverride = (deptId: string, field: 'display_label' | 'custom_description', value: string) => {
    const currentOverrides = { ...(departments.department_overrides || {}) };
    currentOverrides[deptId] = {
      ...(currentOverrides[deptId] || {}),
      [field]: value,
    };
    updateField('department_overrides', currentOverrides);
  };

  const allDepts = studioData.available_departments || [];
  const selectedDepts = (departments.featured_department_ids || [])
    .map((id) => allDepts.find((d) => d.id === id))
    .filter(Boolean) as typeof allDepts;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Section Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-4 flex items-center justify-between">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
            Faculties Directory Area
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
            Department Showcase
          </h2>
          <p className="text-xs text-[#55524D] mt-1">
            Configure featured academic faculties, display sequence, and custom public descriptions.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer bg-[#F4EFEB] px-3 py-1.5 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]">
          <input
            type="checkbox"
            checked={departments.is_visible}
            onChange={(e) => updateField('is_visible', e.target.checked)}
            className="w-4 h-4 border-2 border-[#1A1A1A] accent-[#1B44B8]"
          />
          <span className="text-xs font-bold text-[#1A1A1A]">
            Section Visible
          </span>
        </label>
      </div>

      {/* Headings */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Section Headings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Eyebrow Label
            </label>
            <input
              type="text"
              value={departments.eyebrow}
              onChange={(e) => updateField('eyebrow', e.target.value)}
              placeholder="Academic Directory"
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Section Title
            </label>
            <input
              type="text"
              value={departments.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Explore by Department"
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Subtitle Description
          </label>
          <textarea
            rows={2}
            value={departments.subtitle}
            onChange={(e) => updateField('subtitle', e.target.value)}
            className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-medium text-[#1A1A1A] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Mode Selector */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Faculty Selection Mode
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => updateField('mode', 'automatic')}
            className={cn(
              'p-4 border-2 text-left transition-all cursor-pointer',
              departments.mode === 'automatic'
                ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] shadow-[3px_3px_0px_#1B44B8]'
                : 'border-[#1A1A1A]/40 bg-[#F4EFEB] text-[#1A1A1A] hover:bg-white'
            )}
          >
            <div className="font-bold text-xs mb-1">
              Automatic (All Active Faculties)
            </div>
            <p
              className={cn(
                'text-[11px] leading-snug',
                departments.mode === 'automatic' ? 'text-[#FAF7F2]/80' : 'text-[#55524D]'
              )}
            >
              Automatically showcases all active collegiate departments with real publication counts from the database.
            </p>
          </button>

          <button
            type="button"
            onClick={() => updateField('mode', 'manual')}
            className={cn(
              'p-4 border-2 text-left transition-all cursor-pointer',
              departments.mode === 'manual'
                ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] shadow-[3px_3px_0px_#1B44B8]'
                : 'border-[#1A1A1A]/40 bg-[#F4EFEB] text-[#1A1A1A] hover:bg-white'
            )}
          >
            <div className="font-bold text-xs mb-1">
              Manual Curated Department Ordering
            </div>
            <p
              className={cn(
                'text-[11px] leading-snug',
                departments.mode === 'manual' ? 'text-[#FAF7F2]/80' : 'text-[#55524D]'
              )}
            >
              Choose specific featured departments and customize their exact display order on the homepage.
            </p>
          </button>
        </div>
      </div>

      {/* Manual Selection & Custom Overrides */}
      {departments.mode === 'manual' && (
        <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-5">
          <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
            Featured Faculties Sequence ({selectedDepts.length})
          </h3>

          <div className="space-y-2">
            {selectedDepts.map((dept, idx) => {
              const override = (departments.department_overrides || {})[dept.id] || {};
              const isExpanded = selectedDeptForOverride === dept.id;

              return (
                <div
                  key={dept.id}
                  className="p-3 border-2 border-[#1A1A1A] bg-[#F4EFEB] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#1B44B8] w-5">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-xs text-[#1A1A1A]">
                          {override.display_label || dept.name}
                        </div>
                        <div className="text-[10px] font-mono text-[#77736C]">
                          Code: {dept.short_name} • {dept.magazine_count || 0} Editions Published
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedDeptForOverride(isExpanded ? null : dept.id)
                        }
                        className="px-2 py-1 border border-[#1A1A1A] bg-white hover:bg-[#EAE3D7] text-[11px] font-mono font-bold"
                      >
                        {isExpanded ? 'Close Edit' : 'Edit Text'}
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveDepartmentOrder(idx, 'up')}
                        className="p-1 border border-[#1A1A1A] bg-white hover:bg-[#EAE3D7] disabled:opacity-20 text-xs cursor-pointer"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === selectedDepts.length - 1}
                        onClick={() => moveDepartmentOrder(idx, 'down')}
                        className="p-1 border border-[#1A1A1A] bg-white hover:bg-[#EAE3D7] disabled:opacity-20 text-xs cursor-pointer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleFeaturedDepartment(dept.id)}
                        className="p-1 border border-[#1A1A1A] bg-white hover:bg-rose-100 text-rose-700 text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Override Expand Form */}
                  {isExpanded && (
                    <div className="p-3 border border-[#1A1A1A]/30 bg-white space-y-3 mt-2">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-mono font-bold uppercase text-[#1A1A1A]">
                          Custom Display Name Override
                        </label>
                        <input
                          type="text"
                          value={override.display_label || ''}
                          placeholder={dept.name}
                          onChange={(e) => updateOverride(dept.id, 'display_label', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-mono font-bold uppercase text-[#1A1A1A]">
                          Custom Public Description
                        </label>
                        <textarea
                          rows={2}
                          value={override.custom_description || ''}
                          placeholder={dept.description || 'Department editorial description...'}
                          onChange={(e) => updateOverride(dept.id, 'custom_description', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-[#1A1A1A] bg-[#F4EFEB] text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Catalog Picker */}
          <div className="pt-4 border-t border-[#1A1A1A]/20 space-y-3">
            <span className="text-xs font-mono font-bold uppercase text-[#1A1A1A] block">
              Add Available Faculties to Showcase
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allDepts.map((d) => {
                const isSelected = (departments.featured_department_ids || []).includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleFeaturedDepartment(d.id)}
                    className={cn(
                      'p-2.5 border-2 text-left flex items-center justify-between transition-all cursor-pointer',
                      isSelected
                        ? 'border-[#1B44B8] bg-[#1B44B8]/10 text-[#1B44B8]'
                        : 'border-[#1A1A1A]/20 bg-white hover:border-[#1A1A1A]'
                    )}
                  >
                    <div>
                      <div className="font-bold text-xs text-[#1A1A1A]">{d.name}</div>
                      <div className="text-[10px] font-mono text-[#77736C]">
                        {d.magazine_count || 0} Editions
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="text-xs font-mono font-bold text-[#1B44B8] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Added
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-gray-500">+ Add</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
