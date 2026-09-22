'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/auth/session';
import { generateUniqueMagazineSlug, recordStatusTransition } from '@/lib/magazines/admin';
import { uploadMagazineCover, uploadMagazinePdf } from '@/lib/storage/upload';
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
    const profile = await getCurrentProfile();
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

    // 1. Insert Initial Magazine Record
    const initialStatus = 'DRAFT';

    const { data: magazine, error: insertError } = await (supabase
      .from('magazines') as any)
      .insert({
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
        processing_status: 'NOT_STARTED' as MagazineProcessingStatus,
      })
      .select('id, slug')
      .single();

    if (insertError || !magazine) {
      console.error('Error inserting magazine:', insertError);
      return { success: false, error: insertError?.message || 'Failed to create publication record.' };
    }

    const magazineId = magazine.id;
    let coverUrl: string | null = null;
    let pdfUrl: string | null = null;
    let hasPdfUploaded = false;

    // 2. Handle Cover Upload if attached
    const coverFile = formData.get('cover_file') as File | null;
    if (coverFile && coverFile.size > 0 && coverFile.name) {
      try {
        const { publicUrl } = await uploadMagazineCover(
          supabase,
          departmentId,
          magazineId,
          coverFile
        );
        coverUrl = publicUrl;
      } catch (err: any) {
        return { success: false, error: `Cover upload failed: ${err.message || 'unknown error'}` };
      }
    }

    // 3. Handle PDF Upload if attached
    const pdfFile = formData.get('pdf_file') as File | null;
    if (pdfFile && pdfFile.size > 0 && pdfFile.name) {
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
        return { success: false, error: `PDF upload failed: ${err.message || 'unknown error'}` };
      }
    }

    // 4. Update Magazine record with file paths
    if (coverUrl || pdfUrl) {
      const updates: Record<string, any> = {};
      if (coverUrl) updates.cover_image_url = coverUrl;
      if (pdfUrl) {
        updates.original_pdf_url = pdfUrl;
        updates.processing_status = 'QUEUED' as MagazineProcessingStatus;
      }

      const { error: fileUpdateError } = await (supabase.from('magazines') as any).update(updates).eq('id', magazineId);
      if (fileUpdateError) return { success: false, error: `Failed to save uploaded files: ${fileUpdateError.message}` };
    }

    // 5. Trigger PDF Processing Pipeline in background if PDF was uploaded
    if (hasPdfUploaded) {
      // Execute processing (non-blocking for the client response, but initiated server-side)
      processMagazinePdf(magazineId, { requestingUserId: profile.id }).catch((err) => {
        console.error(`[Background Processing] Failed for magazine ${magazineId}:`, err);
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
    const profile = await getCurrentProfile();
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    // Verify ownership and status
    const { data: existing, error: fetchError } = await (supabase
      .from('magazines') as any)
      .select('id, department_id, status, title, original_pdf_url')
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

    const pdfFile = formData.get('pdf_file') as File | null;
    if (submitForReview && ((pdfFile && pdfFile.size > 0 && pdfFile.name) || existing.processing_status !== 'COMPLETED')) {
      return { success: false, error: 'Save the PDF changes and wait for processing to complete before submitting for review.' };
    }
    if (submitForReview) updates.status = 'SUBMITTED';

    // Handle Cover Upload
    const coverFile = formData.get('cover_file') as File | null;
    if (coverFile && coverFile.size > 0 && coverFile.name) {
      const { publicUrl } = await uploadMagazineCover(
        supabase,
        existing.department_id,
        id,
        coverFile
      );
      updates.cover_image_url = publicUrl;
    }

    // Handle PDF Upload
    let newPdfUploaded = false;
    if (pdfFile && pdfFile.size > 0 && pdfFile.name) {
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
    }

    const { error: updateError } = await (supabase
      .from('magazines') as any)
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating magazine:', updateError);
      return { success: false, error: updateError.message || 'Failed to update publication.' };
    }

    // Trigger PDF processing if a new PDF was uploaded
    if (newPdfUploaded) {
      processMagazinePdf(id, { requestingUserId: profile.id }).catch((err) => {
        console.error(`[Background Processing] Failed for magazine ${id}:`, err);
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
export async function retryMagazineProcessingAction(id: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
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
export async function submitMagazineForReviewAction(id: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
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
 * Server action to delete a DRAFT magazine
 */
export async function deleteDraftMagazineAction(id: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const { data: existing, error: fetchError } = await (supabase
      .from('magazines') as any)
      .select('id, department_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: 'Publication record not found.' };
    }

    if (profile.role !== 'SUPER_ADMIN' && existing.department_id !== profile.department_id) {
      return { success: false, error: 'Forbidden: You can only delete your own department drafts.' };
    }

    if (existing.status !== 'DRAFT') {
      return {
        success: false,
        error: `Only draft publications can be deleted. Current status is '${existing.status}'.`,
      };
    }

    const { error: deleteError } = await supabase
      .from('magazines')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return { success: false, error: deleteError.message || 'Failed to delete publication draft.' };
    }

    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/magazines');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete draft.' };
  }
}

/**
 * Super Admin: Mark publication as UNDER_REVIEW
 */
export async function startReviewMagazineAction(id: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
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
export async function approveMagazineAction(id: string, note?: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
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
export async function rejectMagazineAction(id: string, reason: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
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
export async function publishMagazineAction(id: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
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
export async function archiveMagazineAction(id: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
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
export async function resubmitMagazineAction(id: string): Promise<ActionResult> {
  try {
    const profile = await getCurrentProfile();
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
