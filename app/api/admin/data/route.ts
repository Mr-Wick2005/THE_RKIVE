import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDepartmentsWithStats, getDepartmentById, getActiveDepartments } from '@/lib/departments';
import {
  calculateStatsFromMagazines,
  getMyDepartmentMagazines,
  getMyDepartmentMagazineById,
  getReviewQueueMagazines,
  getMagazineForReview,
} from '@/lib/magazines/admin';
import { getEditorialUsers, getEditorialUserStats } from '@/lib/auth/bootstrap';
import { getCoverStoragePath, getPdfStoragePath } from '@/lib/storage/upload';
import { processMagazinePdf } from '@/lib/pdf/pipeline';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return NextResponse.json({ error: 'Unauthorized profile' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, id } = body;

    switch (action) {
      case 'dashboard': {
        if (profile.role !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Forbidden: Super Admin required' }, { status: 403 });
        }
        const [departments, userStats, recentSubmissions] = await Promise.all([
          getDepartmentsWithStats(),
          getEditorialUserStats(),
          getMyDepartmentMagazines(profile),
        ]);
        const stats = calculateStatsFromMagazines(recentSubmissions);
        return NextResponse.json({
          profile,
          stats,
          departments,
          userStats,
          recentSubmissions,
        });
      }

      case 'magazines': {
        const [department, magazines] = await Promise.all([
          profile.department_id ? getDepartmentById(profile.department_id) : null,
          getMyDepartmentMagazines(profile),
        ]);
        return NextResponse.json({
          profile,
          department,
          magazines,
        });
      }

      case 'new-publication': {
        const isSuper = profile.role === 'SUPER_ADMIN';
        const [department, departments] = await Promise.all([
          profile.department_id ? getDepartmentById(profile.department_id) : null,
          isSuper ? getActiveDepartments() : [],
        ]);
        return NextResponse.json({
          profile,
          department,
          departments,
        });
      }

      case 'edit-publication': {
        if (!id) {
          return NextResponse.json({ error: 'Missing publication ID' }, { status: 400 });
        }
        const magazine = await getMyDepartmentMagazineById(id, profile);
        if (!magazine) {
          return NextResponse.json({ error: 'Publication not found' }, { status: 404 });
        }
        const department = magazine.department_id
          ? await getDepartmentById(magazine.department_id)
          : null;
        return NextResponse.json({
          profile,
          magazine,
          department,
        });
      }

      case 'review': {
        if (profile.role !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Forbidden: Super Admin required' }, { status: 403 });
        }
        const magazines = await getReviewQueueMagazines('ALL');
        return NextResponse.json({
          profile,
          magazines,
        });
      }

      case 'review-detail': {
        if (profile.role !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Forbidden: Super Admin required' }, { status: 403 });
        }
        if (!id) {
          return NextResponse.json({ error: 'Missing publication ID' }, { status: 400 });
        }
        const magazine = await getMagazineForReview(id);
        if (!magazine) {
          return NextResponse.json({ error: 'Publication not found' }, { status: 404 });
        }
        return NextResponse.json({
          profile,
          magazine,
        });
      }

      case 'users': {
        if (profile.role !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Forbidden: Super Admin required' }, { status: 403 });
        }
        const [users, departments] = await Promise.all([
          getEditorialUsers(),
          getActiveDepartments(),
        ]);
        const stats = await getEditorialUserStats(users);
        return NextResponse.json({
          profile,
          users,
          stats,
          departments,
        });
      }

      case 'departments': {
        if (profile.role !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Forbidden: Super Admin required' }, { status: 403 });
        }
        const departments = await getDepartmentsWithStats();
        return NextResponse.json({
          profile,
          departments,
        });
      }

      case 'get-upload-url': {
        const { fileType, departmentId, magazineId, fileName } = body;
        if (!departmentId || !magazineId) {
          return NextResponse.json({ error: 'Missing departmentId or magazineId' }, { status: 400 });
        }
        if (profile.role !== 'SUPER_ADMIN' && profile.department_id !== departmentId) {
          return NextResponse.json({ error: 'Forbidden: Department mismatch' }, { status: 403 });
        }

        const supabase = createAdminClient();
        if (fileType === 'pdf') {
          const filePath = getPdfStoragePath(departmentId, magazineId);
          const { data: signData, error: signError } = await supabase.storage
            .from('magazine-pdfs')
            .createSignedUploadUrl(filePath);

          if (signError || !signData) {
            return NextResponse.json({ error: signError?.message || 'Failed to generate upload URL' }, { status: 500 });
          }
          return NextResponse.json({
            signedUrl: signData.signedUrl,
            token: signData.token,
            path: filePath,
            bucket: 'magazine-pdfs',
          });
        } else if (fileType === 'cover') {
          const filePath = getCoverStoragePath(departmentId, magazineId, fileName || 'cover.jpg');
          const { data: signData, error: signError } = await supabase.storage
            .from('magazine-covers')
            .createSignedUploadUrl(filePath);

          if (signError || !signData) {
            return NextResponse.json({ error: signError?.message || 'Failed to generate upload URL' }, { status: 500 });
          }
          const { data: { publicUrl } } = supabase.storage.from('magazine-covers').getPublicUrl(filePath);
          return NextResponse.json({
            signedUrl: signData.signedUrl,
            token: signData.token,
            path: filePath,
            publicUrl,
            bucket: 'magazine-covers',
          });
        }
        return NextResponse.json({ error: 'Invalid fileType' }, { status: 400 });
      }

      case 'process-pdf': {
        if (!id) {
          return NextResponse.json({ error: 'Missing publication ID' }, { status: 400 });
        }
        const force = body.force === true;
        const processResult = await processMagazinePdf(id, {
          requestingUserId: profile.id,
          forceReprocess: force,
        });
        return NextResponse.json(processResult);
      }

      case 'process-step': {
        if (!id) {
          return NextResponse.json({ error: 'Missing publication ID' }, { status: 400 });
        }
        const maxPages = typeof body.maxPages === 'number' ? body.maxPages : 4;
        const processResult = await processMagazinePdf(id, {
          requestingUserId: profile.id,
          maxPagesPerRun: maxPages,
        });
        return NextResponse.json(processResult);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Error in /api/admin/data:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
