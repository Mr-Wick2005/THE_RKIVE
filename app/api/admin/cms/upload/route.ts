import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth/session';
import { uploadCmsAsset } from '@/lib/cms/storage';
import { recordCmsMediaAsset } from '@/lib/cms/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active || profile.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin privileges required for media uploads' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sectionTag = (formData.get('sectionTag') as string) || 'general';
    const altText = (formData.get('altText') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    const uploadResult = await uploadCmsAsset(file, sectionTag);

    const mediaAsset = await recordCmsMediaAsset(
      {
        file_path: uploadResult.filePath,
        public_url: uploadResult.publicUrl,
        file_name: uploadResult.fileName,
        file_size: uploadResult.fileSize,
        mime_type: uploadResult.mimeType,
        alt_text: altText || uploadResult.fileName,
        section_tag: sectionTag,
      },
      profile
    );

    return NextResponse.json({
      success: true,
      asset: mediaAsset,
    });
  } catch (error: any) {
    console.error('CMS media upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload media asset' },
      { status: 500 }
    );
  }
}
