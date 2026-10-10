'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/components/admin/admin-auth-context';
import { StudioHeader } from './studio-header';
import { SectionNav } from './section-nav';
import { OverviewForm } from './forms/overview-form';
import { HeaderForm } from './forms/header-form';
import { HeroForm } from './forms/hero-form';
import { ArchiveReelForm } from './forms/archive-reel-form';
import { RecentReleasesForm } from './forms/recent-releases-form';
import { DepartmentsForm } from './forms/departments-form';
import { AboutForm } from './forms/about-form';
import { BookshelfForm } from './forms/bookshelf-form';
import { ManifestoForm } from './forms/manifesto-form';
import { FooterForm } from './forms/footer-form';
import { ThemeForm } from './forms/theme-form';
import { MediaLibraryPanel } from './forms/media-library-panel';
import { VersionHistoryPanel } from './forms/version-history-panel';
import { InteractivePreview } from './preview/interactive-preview';
import { PublishModal } from './publish-modal';
import { SectionId, LandingPageConfig, CmsStudioData } from '@/types/cms';
import { DEFAULT_LANDING_PAGE_CONFIG } from '@/lib/cms/defaults';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudioShellProps {
  initialData: CmsStudioData;
}

export function StudioShell({ initialData }: StudioShellProps) {
  const { token } = useAdminAuth();
  const [studioData, setStudioData] = useState<CmsStudioData>(initialData);
  const [draft, setDraft] = useState<LandingPageConfig>(initialData.draft || DEFAULT_LANDING_PAGE_CONFIG);
  const [savedDraft, setSavedDraft] = useState<LandingPageConfig>(initialData.draft || DEFAULT_LANDING_PAGE_CONFIG);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [showPreviewPane, setShowPreviewPane] = useState(true);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Media Library Picker Modal State
  const [mediaPickerCallback, setMediaPickerCallback] = useState<((url: string) => void) | null>(null);

  // Check if draft has unsaved changes compared to last saved state
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Keyboard shortcut: Ctrl+S or Cmd+S to Save Draft
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveDraft();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draft, token]);

  const handleSaveDraft = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'save-draft',
          draft,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save draft');

      setSavedDraft(draft);
      showNotification('Draft saved successfully');
    } catch (err: any) {
      showNotification(err.message || 'Error saving draft', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async (note: string) => {
    if (!token) return;
    setIsPublishing(true);
    try {
      // 1. Ensure draft is saved first
      await fetch('/api/admin/cms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'save-draft',
          draft,
        }),
      });

      // 2. Publish
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'publish',
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish configuration');

      // 3. Refresh studio data
      const refreshRes = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'get-data' }),
      });
      if (refreshRes.ok) {
        const refreshedData = await refreshRes.json();
        setStudioData(refreshedData);
        setDraft(refreshedData.draft);
        setSavedDraft(refreshedData.draft);
      }

      showNotification(`Version ${data.version} published to live website!`);
    } catch (err: any) {
      showNotification(err.message || 'Error publishing', 'error');
      throw err;
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'restore-version',
          versionNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore version');

      // Refresh data
      const refreshRes = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'get-data' }),
      });
      if (refreshRes.ok) {
        const refreshed = await refreshRes.json();
        setStudioData(refreshed);
        setDraft(refreshed.draft);
        setSavedDraft(refreshed.draft);
      }
      showNotification(`Restored to Version ${versionNumber}`);
    } catch (err: any) {
      showNotification(err.message || 'Error restoring version', 'error');
    }
  };

  const handleResetDefaults = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reset-defaults' }),
      });
      if (!res.ok) throw new Error('Failed to reset defaults');

      setDraft(DEFAULT_LANDING_PAGE_CONFIG);
      setSavedDraft(DEFAULT_LANDING_PAGE_CONFIG);
      showNotification('Draft reset to factory defaults');
    } catch (err: any) {
      showNotification(err.message || 'Error resetting defaults', 'error');
    }
  };

  const handleUploadMedia = async (file: File, sectionTag: string, altText: string) => {
    if (!token) return false;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sectionTag', sectionTag);
    formData.append('altText', altText);

    const res = await fetch('/api/admin/cms/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');

    setStudioData((prev) => ({
      ...prev,
      media: [data.asset, ...prev.media],
    }));
    showNotification('Media asset uploaded successfully');
    return true;
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!token) return false;
    if (!window.confirm('Delete this media asset?')) return false;

    const res = await fetch('/api/admin/cms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'delete-media', mediaId }),
    });
    if (!res.ok) throw new Error('Failed to delete asset');

    setStudioData((prev) => ({
      ...prev,
      media: prev.media.filter((m) => m.id !== mediaId),
    }));
    showNotification('Media asset deleted');
    return true;
  };

  const toggleSectionVisibility = (sectionKey: keyof LandingPageConfig) => {
    const current = (draft[sectionKey] as any) || {};
    const updated = {
      ...draft,
      [sectionKey]: {
        ...current,
        is_visible: current.is_visible === false ? true : false,
      },
    };
    setDraft(updated);
  };

  const moveSectionOrder = (sectionKey: string, direction: 'up' | 'down') => {
    const order = [...draft.section_order];
    const idx = order.indexOf(sectionKey);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= order.length) return;

    const temp = order[idx];
    order[idx] = order[targetIdx];
    order[targetIdx] = temp;
    setDraft({ ...draft, section_order: order });
  };

  const openMediaPicker = (onSelect: (url: string) => void) => {
    setMediaPickerCallback(() => (url: string) => {
      onSelect(url);
      setMediaPickerCallback(null);
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F6F0]">
      {/* Toast Notification */}
      {notification && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 px-4 py-3 border-2 border-[#1A1A1A] text-xs font-mono font-bold shadow-[4px_4px_0px_#1A1A1A] animate-in slide-in-from-bottom-3',
            notification.type === 'success'
              ? 'bg-[#2B6E3F] text-[#FAF7F2]'
              : 'bg-rose-700 text-white'
          )}
        >
          {notification.text}
        </div>
      )}

      {/* Studio Header Toolbar */}
      <StudioHeader
        version={studioData.version}
        isDirty={isDirty}
        isSaving={isSaving}
        isPublishing={isPublishing}
        lastSavedAt={studioData.draft_updated_at}
        publishedAt={studioData.published_at}
        previewMode={previewMode}
        showPreviewPane={showPreviewPane}
        onTogglePreviewPane={() => setShowPreviewPane(!showPreviewPane)}
        onChangePreviewMode={setPreviewMode}
        onSaveDraft={handleSaveDraft}
        onOpenPublishModal={() => setIsPublishModalOpen(true)}
        onResetDefaults={handleResetDefaults}
      />

      {/* Main Studio Body: 3-Panel Architecture */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Panel 1: Section Navigator (Left) */}
        <SectionNav
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          config={draft}
          onToggleVisibility={toggleSectionVisibility}
          onMoveSection={moveSectionOrder}
        />

        {/* Panel 2: Section Editor Form (Center) */}
        <main
          className={cn(
            'flex-1 p-6 sm:p-8 overflow-y-auto bg-[#FAF8F3] transition-all',
            showPreviewPane ? 'lg:max-w-xl xl:max-w-2xl' : 'max-w-4xl mx-auto w-full'
          )}
        >
          {activeSection === 'overview' && (
            <OverviewForm
              config={draft}
              studioData={studioData}
              isDirty={isDirty}
              onSaveDraft={handleSaveDraft}
              onOpenPublishModal={() => setIsPublishModalOpen(true)}
              onSelectSection={setActiveSection}
            />
          )}

          {activeSection === 'header' && (
            <HeaderForm
              header={draft.header}
              onChange={(header) => setDraft({ ...draft, header })}
              onOpenMediaLibrary={openMediaPicker}
            />
          )}

          {activeSection === 'hero' && (
            <HeroForm
              hero={draft.hero}
              onChange={(hero) => setDraft({ ...draft, hero })}
              onOpenMediaLibrary={openMediaPicker}
            />
          )}

          {activeSection === 'archive_reel' && (
            <ArchiveReelForm
              reel={draft.archive_reel}
              onChange={(archive_reel) => setDraft({ ...draft, archive_reel })}
              onOpenMediaLibrary={openMediaPicker}
            />
          )}

          {activeSection === 'recent_releases' && (
            <RecentReleasesForm
              releases={draft.recent_releases}
              onChange={(recent_releases) => setDraft({ ...draft, recent_releases })}
              studioData={studioData}
            />
          )}

          {activeSection === 'departments_showcase' && (
            <DepartmentsForm
              departments={draft.departments_showcase}
              onChange={(departments_showcase) => setDraft({ ...draft, departments_showcase })}
              studioData={studioData}
            />
          )}

          {activeSection === 'about_section' && (
            <AboutForm
              about={draft.about_section}
              onChange={(about_section) => setDraft({ ...draft, about_section })}
              onOpenMediaLibrary={openMediaPicker}
            />
          )}

          {activeSection === 'bookshelf_section' && (
            <BookshelfForm
              bookshelf={draft.bookshelf_section}
              onChange={(bookshelf_section) => setDraft({ ...draft, bookshelf_section })}
            />
          )}

          {activeSection === 'archive_manifesto' && (
            <ManifestoForm
              manifesto={draft.archive_manifesto}
              onChange={(archive_manifesto) => setDraft({ ...draft, archive_manifesto })}
            />
          )}

          {activeSection === 'footer' && (
            <FooterForm
              footer={draft.footer}
              onChange={(footer) => setDraft({ ...draft, footer })}
              onOpenMediaLibrary={openMediaPicker}
            />
          )}

          {activeSection === 'theme' && (
            <ThemeForm
              theme={draft.theme}
              onChange={(theme) => setDraft({ ...draft, theme })}
            />
          )}

          {activeSection === 'media_library' && (
            <MediaLibraryPanel
              media={studioData.media}
              onUploadAsset={handleUploadMedia}
              onDeleteAsset={handleDeleteMedia}
            />
          )}

          {activeSection === 'version_history' && (
            <VersionHistoryPanel
              versions={studioData.versions}
              currentVersion={studioData.version}
              onRestoreVersion={handleRestoreVersion}
              onResetDefaults={handleResetDefaults}
            />
          )}
        </main>

        {/* Panel 3: Live Interactive Preview (Right) */}
        {showPreviewPane && (
          <aside className="flex-1 hidden lg:block h-[calc(100vh-100px)] sticky top-[100px]">
            <InteractivePreview
              config={draft}
              studioData={studioData}
              previewMode={previewMode}
              onChangePreviewMode={setPreviewMode}
            />
          </aside>
        )}
      </div>

      {/* Publish Confirmation Modal */}
      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        draftConfig={draft}
        publishedConfig={studioData.published}
        currentVersion={studioData.version}
        onConfirmPublish={handlePublish}
        isPublishing={isPublishing}
      />

      {/* Media Picker Modal */}
      {mediaPickerCallback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[85vh] border-2 border-[#1A1A1A] bg-[#FAF8F3] shadow-[8px_8px_0px_#1A1A1A] flex flex-col overflow-hidden">
            <div className="p-4 bg-[#1A1A1A] text-[#FAF7F2] flex items-center justify-between border-b-2 border-[#1A1A1A]">
              <span className="font-serif text-base font-bold">Select Media Asset</span>
              <button
                type="button"
                onClick={() => setMediaPickerCallback(null)}
                className="p-1 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <MediaLibraryPanel
                media={studioData.media}
                onUploadAsset={handleUploadMedia}
                onDeleteAsset={handleDeleteMedia}
                onSelectAssetUrl={mediaPickerCallback}
                isModalPicker
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
