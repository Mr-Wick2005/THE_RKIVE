'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/auth/session';
import { generateUniqueMagazineSlug, recordStatusTransition } from '@/lib/magazines/admin';
import { uploadMagazineCover, uploadMagazinePdf, deleteMagazineStorageAssets } from '@/lib/storage/upload';
import { processMagazinePdf } from '@/lib/pdf/pipeline';
import { isSupabaseConfigured } from '@/lib/utils';
import { MagazineProcessingStatus, MagazineStatus } from '@/types/magazine';

export interface ActionResult {
  success: boolean;
  error?: string;
  magazineId?: string;
  slug?: string;
}

/**
 * Server action to create a new publication draft (or submit directly for review)
 */
export async function createMagazineAction(formData: FormData): Promise<ActionResult> {
  try {
    const token = formData.get('access_token') as string | null;
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    // Determine target department
    const departmentId = profile.role === 'SUPER_ADMIN'
      ? (formData.get('department_id') as string) || profile.department_id
      : profile.department_id;

    if (!departmentId) {
      return { success: false, error: 'Department assignment is missing from your profile.' };
    }

    const title = (formData.get('title') as string)?.trim();
    const subtitle = (formData.get('subtitle') as string)?.trim() || null;
    const description = (formData.get('description') as string)?.trim() || null;
    const academic_year = (formData.get('academic_year') as string)?.trim();
    const edition = (formData.get('edition') as string)?.trim() || null;
    const volume = (formData.get('volume') as string)?.trim() || null;
    const issue = (formData.get('issue') as string)?.trim() || null;
    const customId = (formData.get('id') as string)?.trim() || null;
    const submitForReview = formData.get('submit_now') === 'true';

    if (!title) {
      return { success: false, error: 'Publication title is required.' };
    }

    if (!academic_year) {
      return { success: false, error: 'Academic year is required (e.g., 2025-2026).' };
    }

    if (submitForReview) {
      return { success: false, error: 'Save the new publication as a draft, wait for PDF processing to complete, then submit it for review.' };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    const supabase = createAdminClient();
    const slug = await generateUniqueMagazineSlug(title);

    // Check for pre-uploaded direct URLs
    const directCoverUrl = (formData.get('cover_image_url') as string)?.trim() || null;
    const directPdfUrl = (formData.get('original_pdf_url') as string)?.trim() || null;

    let coverUrl: string | null = directCoverUrl;
    let pdfUrl: string | null = directPdfUrl;
    let hasPdfUploaded = Boolean(directPdfUrl);

    // 1. Insert Initial Magazine Record
    const initialStatus = 'DRAFT';

    const insertPayload: Record<string, any> = {
      title,
      subtitle,
      description,
      academic_year,
      edition,
      volume,
      issue,
      page_count: 0,
      slug,
      department_id: departmentId,
      created_by: profile.id,
      status: initialStatus,
      processing_status: (pdfUrl ? 'QUEUED' : 'NOT_STARTED') as MagazineProcessingStatus,
      cover_image_url: coverUrl,
      original_pdf_url: pdfUrl,
    };

    if (customId) {
      insertPayload.id = customId;
    }

    const { data: magazine, error: insertError } = await (supabase
      .from('magazines') as any)
      .insert(insertPayload)
      .select('id, slug')
      .single();

    if (insertError || !magazine) {
      console.error('Error inserting magazine:', insertError);
      return { success: false, error: insertError?.message || 'Failed to create publication record.' };
    }

    const magazineId = magazine.id;

    // 2. Handle Cover Upload if attached as file (fallback)
    const coverFile = formData.get('cover_file') as File | null;
    if (!coverUrl && coverFile && coverFile.size > 0) {
      try {
        const { publicUrl } = await uploadMagazineCover(
          supabase,
          departmentId,
          magazineId,
          coverFile
        );
        coverUrl = publicUrl;
      } catch (err: any) {
        console.error('[Action] Cover upload failure:', err);
        return { success: false, error: `Failed to upload cover image: ${err.message}` };
      }
    }

    // 3. Handle PDF Upload if attached as file (fallback)
    const pdfFile = formData.get('pdf_file') as File | null;
    if (!pdfUrl && pdfFile && pdfFile.size > 0) {
      try {
        const { path } = await uploadMagazinePdf(
          supabase,
          departmentId,
          magazineId,
          pdfFile
        );
        pdfUrl = path;
        hasPdfUploaded = true;
      } catch (err: any) {
        console.error('[Action] PDF upload failure:', err);
        return { success: false, error: `Failed to upload PDF document: ${err.message}` };
      }
    }

    // 4. Update Magazine record with file paths if newly uploaded
    if ((!insertPayload.cover_image_url && coverUrl) || (!insertPayload.original_pdf_url && pdfUrl)) {
      const updates: Record<string, any> = {};
      if (coverUrl) updates.cover_image_url = coverUrl;
      if (pdfUrl) {
        updates.original_pdf_url = pdfUrl;
        updates.processing_status = 'QUEUED' as MagazineProcessingStatus;
      }

      await (supabase.from('magazines') as any).update(updates).eq('id', magazineId);
    }

    // 5. Initiate background processing without blocking the HTTP response
    if (hasPdfUploaded) {
      processMagazinePdf(magazineId, { requestingUserId: profile.id }).catch((procErr: any) => {
        console.error('[PDF_PROCESS Background Error]:', procErr);
      });
    }

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/magazines');

    return { success: true, magazineId, slug: magazine.slug };
  } catch (err: any) {
    console.error('Unexpected error in createMagazineAction:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Server action to update an existing magazine draft
 */
export async function updateMagazineAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const token = formData.get('access_token') as string | null;
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    // Verify ownership and status
    const { data: existing, error: fetchError } = await (supabase
      .from('magazines') as any)
      .select('id, department_id, status, title, original_pdf_url, processing_status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Publication record not found.' };
    }

    if (profile.role !== 'SUPER_ADMIN' && existing.department_id !== profile.department_id) {
      return { success: false, error: 'Forbidden: You can only edit your own department publications.' };
    }

    if (!['DRAFT', 'SUBMITTED', 'REJECTED'].includes(existing.status)) {
      return {
        success: false,
        error: `Cannot modify publication while in '${existing.status}' status.`,
      };
    }

    const title = (formData.get('title') as string)?.trim();
    const subtitle = (formData.get('subtitle') as string)?.trim() || null;
    const description = (formData.get('description') as string)?.trim() || null;
    const academic_year = (formData.get('academic_year') as string)?.trim();
    const edition = (formData.get('edition') as string)?.trim() || null;
    const volume = (formData.get('volume') as string)?.trim() || null;
    const issue = (formData.get('issue') as string)?.trim() || null;
    const submitForReview = formData.get('submit_now') === 'true';

    if (!title) {
      return { success: false, error: 'Publication title is required.' };
    }

    if (!academic_year) {
      return { success: false, error: 'Academic year is required.' };
    }

    const updates: Record<string, any> = {
      title,
      subtitle,
      description,
      academic_year,
      edition,
      volume,
      issue,
    };

    const directCoverUrl = (formData.get('cover_image_url') as string)?.trim() || null;
    const directPdfUrl = (formData.get('original_pdf_url') as string)?.trim() || null;
    const pdfFile = formData.get('pdf_file') as File | null;
    const coverFile = formData.get('cover_file') as File | null;

    let newPdfUploaded = false;

    if (directCoverUrl) {
      updates.cover_image_url = directCoverUrl;
    } else if (coverFile && coverFile.size > 0) {
      try {
        const { publicUrl } = await uploadMagazineCover(
          supabase,
          existing.department_id,
          id,
          coverFile
        );
        updates.cover_image_url = publicUrl;
      } catch (err: any) {
        console.error('[Action] Cover update upload failure:', err);
        return { success: false, error: `Failed to upload cover image: ${err.message}` };
      }
    }

    if (directPdfUrl) {
      updates.original_pdf_url = directPdfUrl;
      updates.processing_status = 'QUEUED' as MagazineProcessingStatus;
      updates.processing_error = null;
      newPdfUploaded = true;
    } else if (pdfFile && pdfFile.size > 0) {
      try {
        const { path } = await uploadMagazinePdf(
          supabase,
          existing.department_id,
          id,
          pdfFile
        );
        updates.original_pdf_url = path;
        updates.processing_status = 'QUEUED' as MagazineProcessingStatus;
        updates.processing_error = null;
        newPdfUploaded = true;
      } catch (err: any) {
        console.error('[Action] PDF update upload failure:', err);
        return { success: false, error: `Failed to upload PDF document: ${err.message}` };
      }
    }

    if (submitForReview && (newPdfUploaded || existing.processing_status !== 'COMPLETED')) {
      return { success: false, error: 'Save the PDF changes and wait for processing to complete before submitting for review.' };
    }
    if (submitForReview) updates.status = 'SUBMITTED';

    const { error: updateError } = await (supabase
      .from('magazines') as any)
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating magazine:', updateError);
      return { success: false, error: updateError.message || 'Failed to update publication.' };
    }

    if (newPdfUploaded) {
      processMagazinePdf(id, { requestingUserId: profile.id }).catch((procErr: any) => {
        console.error('[PDF_PROCESS Background Error on update]:', procErr);
      });
    }

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/magazines');
    revalidatePath(`/admin/magazines/${id}/edit`);

    return { success: true, magazineId: id };
  } catch (err: any) {
    console.error('Unexpected error in updateMagazineAction:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Server action to manually trigger or retry PDF ingestion & page processing
 */
export async function retryMagazineProcessingAction(id: string, token?: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await (supabase
      .from('magazines') as any)
      .select('id, department_id, original_pdf_url, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Publication record not found.' };
    }

    if (profile.role !== 'SUPER_ADMIN' && existing.department_id !== profile.department_id) {
      return { success: false, error: 'Forbidden: You can only manage your own department publications.' };
    }

    if (!existing.original_pdf_url) {
      return { success: false, error: 'No PDF file is uploaded for this publication. Please upload a PDF first.' };
    }

    // Set status to QUEUED
    await (supabase.from('magazines') as any)
      .update({
        processing_status: 'QUEUED' as MagazineProcessingStatus,
        processing_error: null,
      })
      .eq('id', id);

    // Run processing pipeline
    const processResult = await processMagazinePdf(id, { requestingUserId: profile.id });

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/magazines');
    revalidatePath(`/admin/magazines/${id}/edit`);

    if (!processResult.success) {
      return { success: false, error: processResult.error || 'Processing failed' };
    }

    return { success: true, magazineId: id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to retry processing.' };
  }
}

/**
 * Server action to submit a draft magazine for college administration review.
 * Enforces submission safety: PDF must exist, processing_status must be 'COMPLETED',
 * and rendered pages must be present.
 */
export async function submitMagazineForReviewAction(id: string, token?: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await (supabase
      .from('magazines') as any)
      .select('id, department_id, status, title, original_pdf_url, processing_status, page_count')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Publication record not found.' };
    }

    if (profile.role !== 'SUPER_ADMIN' && existing.department_id !== profile.department_id) {
      return { success: false, error: 'Forbidden: You can only manage your own department publications.' };
    }

    if (!['DRAFT', 'REJECTED'].includes(existing.status)) {
      return {
        success: false,
        error: `Publication is already in '${existing.status}' status.`,
      };
    }

    // RULE 27: SUBMISSION SAFETY CHECK
    if (!existing.original_pdf_url) {
      return {
        success: false,
        error: 'Please upload an original magazine PDF before submitting for review.',
      };
    }

    if (existing.processing_status !== 'COMPLETED') {
      return {
        success: false,
        error: 'This publication must finish processing before it can be submitted for review.',
      };
    }

    if (!existing.page_count || existing.page_count <= 0) {
      return {
        success: false,
        error: 'No processed pages found. Please reprocess the PDF before submitting.',
      };
    }

    // Verify at least one page exists in magazine_pages
    const { count: pagesCount } = await (supabase
      .from('magazine_pages') as any)
      .select('*', { count: 'exact', head: true })
      .eq('magazine_id', id);

    if (!pagesCount || pagesCount <= 0) {
      return {
        success: false,
        error: 'This publication must finish processing before it can be submitted for review.',
      };
    }

    const { error: updateError } = await (supabase
      .from('magazines') as any)
      .update({ status: 'SUBMITTED' })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message || 'Failed to submit publication for review.' };
    }
    await recordStatusTransition(id, existing.status as MagazineStatus, 'SUBMITTED', profile.id, 'Submitted for college review');

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/magazines');

    return { success: true, magazineId: id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit publication.' };
  }
}

/**
 * Server action to delete a magazine publication at any stage.
 * Department Admins can delete magazines belonging to their own department.
 * Super Admins can delete any magazine.
 * Safely removes storage assets (covers, PDFs, rendered pages, thumbnails) and deletes DB record.
 */
export async function deleteMagazineAction(id: string, token?: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await (supabase
      .from('magazines') as any)
      .select('id, department_id, status, title, slug')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Publication record not found.' };
    }

    // Permission check: Department Admins are strictly confined to their own department's magazines
    if (profile.role !== 'SUPER_ADMIN' && existing.department_id !== profile.department_id) {
      return { success: false, error: 'Forbidden: You can only delete your own department publications.' };
    }

    // 1. Purge all storage assets (cover image, original PDF, pages, and thumbnails)
    await deleteMagazineStorageAssets(supabase, existing.department_id, existing.id);

    // 2. Delete the magazine record from database (cascades to pages and audit history)
    const { error: deleteError } = await supabase
      .from('magazines')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return { success: false, error: deleteError.message || 'Failed to delete publication record.' };
    }

    // 3. Revalidate public and administrative routes
    revalidatePath('/');
    revalidatePath('/magazines');
    revalidatePath(`/magazine/${existing.slug}`);
    revalidatePath(`/reader/${existing.slug}`);
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/magazines');
    revalidatePath('/admin/review');
    revalidatePath(`/admin/review/${id}`);

    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteMagazineAction:', err);
    return { success: false, error: err.message || 'Failed to delete publication.' };
  }
}

/**
 * Backward compatibility alias for deleting drafts
 */
export async function deleteDraftMagazineAction(id: string, token?: string): Promise<ActionResult> {
  return deleteMagazineAction(id, token);
}

/**
 * Super Admin: Mark publication as UNDER_REVIEW
 */
export async function startReviewMagazineAction(id: string, token?: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || profile.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Only Super Administrators can review submissions.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();
    const { data: existing } = await (supabase.from('magazines') as any)
      .select('id, status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Publication not found.' };
    }

    if (existing.status === 'SUBMITTED') {
      await (supabase.from('magazines') as any)
        .update({ status: 'UNDER_REVIEW' })
        .eq('id', id);

      await recordStatusTransition(id, 'SUBMITTED', 'UNDER_REVIEW', profile.id, 'Super Admin began editorial review');
    }

    revalidatePath('/admin/review');
    revalidatePath(`/admin/review/${id}`);
    return { success: true, magazineId: id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to start review.' };
  }
}

/**
 * Super Admin: Approve publication (SUBMITTED / UNDER_REVIEW -> APPROVED)
 */
export async function approveMagazineAction(id: string, note?: string, token?: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || profile.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Only Super Administrators can approve publications.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();
    const { data: existing } = await (supabase.from('magazines') as any)
      .select('id, status, title')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Publication not found.' };
    }

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(existing.status)) {
      return { success: false, error: `Cannot approve publication in '${existing.status}' status.` };
    }

    const { error: updateError } = await (supabase.from('magazines') as any)
      .update({
        status: 'APPROVED',
        rejection_reason: null,
      })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message || 'Failed to approve publication.' };
    }

    await recordStatusTransition(
      id,
      existing.status as MagazineStatus,
      'APPROVED',
      profile.id,
      note || 'Publication approved by Super Admin'
    );

    revalidatePath('/admin/review');
    revalidatePath(`/admin/review/${id}`);
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/magazines');

    return { success: true, magazineId: id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to approve publication.' };
  }
}

/**
 * Super Admin: Reject publication with mandatory reason
 */
export async function rejectMagazineAction(id: string, reason: string, token?: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || profile.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Only Super Administrators can reject publications.' };
    }

    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      return { success: false, error: 'A specific rejection reason is required so the department can make revisions.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();
    const { data: existing } = await (supabase.from('magazines') as any)
      .select('id, status, title')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Publication not found.' };
    }

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(existing.status)) {
      return { success: false, error: `Cannot reject publication in '${existing.status}' status.` };
    }

    const { error: updateError } = await (supabase.from('magazines') as any)
      .update({
        status: 'REJECTED',
        rejection_reason: trimmedReason,
      })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message || 'Failed to reject publication.' };
    }

    await recordStatusTransition(
      id,
      existing.status as MagazineStatus,
      'REJECTED',
      profile.id,
      trimmedReason
    );

    revalidatePath('/admin/review');
    revalidatePath(`/admin/review/${id}`);
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/magazines');

    return { success: true, magazineId: id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reject publication.' };
  }
}

/**
 * Super Admin: Publish approved magazine (APPROVED -> PUBLISHED)
 * Sets published_at to current timestamp. Immediately makes visible across all public discovery routes.
 */
export async function publishMagazineAction(id: string, token?: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || profile.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Only Super Administrators can publish magazines.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();
    const { data: existing } = await (supabase.from('magazines') as any)
      .select('id, status, slug, title')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Publication not found.' };
    }

    if (existing.status !== 'APPROVED') {
      return { success: false, error: `Publication must be in 'APPROVED' status before publishing. Current: '${existing.status}'.` };
    }

    const publishedAt = new Date().toISOString();
    const { error: updateError } = await (supabase.from('magazines') as any)
      .update({
        status: 'PUBLISHED',
        published_at: publishedAt,
      })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message || 'Failed to publish magazine.' };
    }

    await recordStatusTransition(
      id,
      'APPROVED',
      'PUBLISHED',
      profile.id,
      'Publication officially published to the College Digital Archive.'
    );

    // Revalidate public & admin paths
    revalidatePath('/');
    revalidatePath('/magazines');
    revalidatePath(`/magazine/${existing.slug}`);
    revalidatePath(`/reader/${existing.slug}`);
    revalidatePath('/admin/review');
    revalidatePath(`/admin/review/${id}`);
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/magazines');

    return { success: true, magazineId: id, slug: existing.slug };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to publish magazine.' };
  }
}

/**
 * Super Admin: Archive a published magazine (PUBLISHED -> ARCHIVED)
 * Removes from standard public archive without deleting historical data.
 */
export async function archiveMagazineAction(id: string, token?: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || profile.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Only Super Administrators can archive magazines.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();
    const { data: existing } = await (supabase.from('magazines') as any)
      .select('id, status, slug')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Publication not found.' };
    }

    if (existing.status !== 'PUBLISHED') {
      return { success: false, error: `Only published magazines can be archived. Current: '${existing.status}'.` };
    }

    const { error: updateError } = await (supabase.from('magazines') as any)
      .update({ status: 'ARCHIVED' })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message || 'Failed to archive publication.' };
    }

    await recordStatusTransition(
      id,
      'PUBLISHED',
      'ARCHIVED',
      profile.id,
      'Publication retired to institutional archive by Super Admin.'
    );

    revalidatePath('/');
    revalidatePath('/magazines');
    revalidatePath(`/magazine/${existing.slug}`);
    revalidatePath('/admin/review');
    revalidatePath(`/admin/review/${id}`);
    revalidatePath('/admin/dashboard');

    return { success: true, magazineId: id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to archive publication.' };
  }
}

/**
 * Department Admin: Resubmit a rejected publication after making necessary revisions
 */
export async function resubmitMagazineAction(id: string, token?: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();
    const { data: existing } = await (supabase.from('magazines') as any)
      .select('id, department_id, status, original_pdf_url, processing_status, page_count')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Publication not found.' };
    }

    if (profile.role !== 'SUPER_ADMIN' && existing.department_id !== profile.department_id) {
      return { success: false, error: 'Forbidden: You can only manage your own department publications.' };
    }

    if (existing.status !== 'REJECTED') {
      return { success: false, error: `Only rejected publications can be resubmitted. Current: '${existing.status}'.` };
    }

    if (!existing.original_pdf_url || existing.processing_status !== 'COMPLETED' || !existing.page_count) {
      return { success: false, error: 'Publication must have a processed PDF before resubmitting.' };
    }

    const { error: updateError } = await (supabase.from('magazines') as any)
      .update({
        status: 'SUBMITTED',
        rejection_reason: null,
      })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message || 'Failed to resubmit publication.' };
    }

    await recordStatusTransition(
      id,
      'REJECTED',
      'SUBMITTED',
      profile.id,
      'Revised edition resubmitted for college review.'
    );

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/magazines');
    revalidatePath('/admin/review');

    return { success: true, magazineId: id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resubmit publication.' };
  }
}
