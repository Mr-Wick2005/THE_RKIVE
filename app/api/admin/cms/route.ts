import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/auth/session';
import {
  getLandingPageStudioData,
  saveLandingPageDraft,
  publishLandingPageConfig,
  restoreLandingPageVersion,
  resetLandingPageToDefaults,
  deleteCmsMediaAsset,
} from '@/lib/cms/store';

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

    if (profile.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Landing Page Studio requires Super Admin privileges' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case 'get-data': {
        const data = await getLandingPageStudioData(profile);
        return NextResponse.json(data);
      }

      case 'save-draft': {
        const { draft } = body;
        if (!draft) {
          return NextResponse.json({ error: 'Missing draft data' }, { status: 400 });
        }
        const saveResult = await saveLandingPageDraft(draft, profile);
        if (!saveResult.success) {
          return NextResponse.json({ error: saveResult.error }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: 'Draft saved successfully' });
      }

      case 'publish': {
        const { note } = body;
        const pubResult = await publishLandingPageConfig(profile, note);
        if (!pubResult.success) {
          return NextResponse.json({ error: pubResult.error }, { status: 400 });
        }
        try {
          revalidatePath('/');
        } catch {}
        return NextResponse.json({
          success: true,
          version: pubResult.version,
          message: `Homepage version ${pubResult.version} published successfully`,
        });
      }

      case 'restore-version': {
        const { versionNumber } = body;
        if (typeof versionNumber !== 'number') {
          return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
        }
        const restoreResult = await restoreLandingPageVersion(versionNumber, profile);
        if (!restoreResult.success) {
          return NextResponse.json({ error: restoreResult.error }, { status: 400 });
        }
        try {
          revalidatePath('/');
        } catch {}
        return NextResponse.json({
          success: true,
          version: restoreResult.version,
          message: `Restored to version ${versionNumber}`,
        });
      }

      case 'reset-defaults': {
        await resetLandingPageToDefaults(profile);
        try {
          revalidatePath('/');
        } catch {}
        return NextResponse.json({
          success: true,
          message: 'Draft reset to system defaults',
        });
      }

      case 'delete-media': {
        const { mediaId } = body;
        if (!mediaId) {
          return NextResponse.json({ error: 'Missing media ID' }, { status: 400 });
        }
        await deleteCmsMediaAsset(mediaId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Landing Page Studio API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error processing CMS request' },
      { status: 500 }
    );
  }
}
