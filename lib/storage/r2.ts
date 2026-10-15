/**
 * ==============================================================================
 * THE ARCHIVE — CLOUDFLARE R2 S3 CLIENT & STORAGE INTERFACE (PHASE 5)
 * ==============================================================================
 * Server-only module for interacting with Cloudflare R2 using AWS S3 SDK.
 *
 * Security Guarantees:
 * - Credentials (ACCOUNT_ID, ACCESS_KEY_ID, SECRET_ACCESS_KEY) are server-only.
 * - Original PDFs and CMS data are routed ONLY to the private bucket.
 * - Covers and page WebP images are routed to the public bucket.
 * - Private files NEVER receive public URLs.
 * - Seamless fallback to Supabase Storage if R2 credentials are not configured.
 * ==============================================================================
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2PublicBaseUrl } from './urls';

let cachedClient: S3Client | null = null;

export const DEFAULT_PUBLIC_BUCKET = 'magazine-files-public';
export const DEFAULT_PRIVATE_BUCKET = 'magazine-files-private';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBucket: string;
  privateBucket: string;
  publicBaseUrl: string | null;
}

/**
 * Returns R2 server configuration from environment variables, or null if incomplete.
 */
export function getR2ServerConfig(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const publicBucket = process.env.R2_PUBLIC_BUCKET_NAME?.trim() || DEFAULT_PUBLIC_BUCKET;
  const privateBucket = process.env.R2_PRIVATE_BUCKET_NAME?.trim() || DEFAULT_PRIVATE_BUCKET;
  const publicBaseUrl = getR2PublicBaseUrl();

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    publicBucket,
    privateBucket,
    publicBaseUrl,
  };
}

/**
 * Returns true if Cloudflare R2 server credentials are fully configured.
 */
export function isR2ServerConfigured(): boolean {
  return getR2ServerConfig() !== null;
}

/**
 * Returns a singleton instance of the S3Client configured for Cloudflare R2.
 */
export function getR2Client(): S3Client {
  const config = getR2ServerConfig();
  if (!config) {
    throw new Error('Cloudflare R2 server credentials are not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.');
  }

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return cachedClient;
}

export type BucketScope = 'public' | 'private';

/**
 * Resolves the actual R2 bucket name for a given scope.
 */
export function resolveBucketName(scope: BucketScope): string {
  const config = getR2ServerConfig();
  if (scope === 'public') {
    return config?.publicBucket || DEFAULT_PUBLIC_BUCKET;
  }
  return config?.privateBucket || DEFAULT_PRIVATE_BUCKET;
}

/**
 * Generates an S3 presigned PUT URL for direct browser uploads.
 */
export async function createR2PresignedUploadUrl(options: {
  scope: BucketScope;
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{
  signedUrl: string;
  key: string;
  bucket: string;
  publicUrl?: string;
}> {
  const client = getR2Client();
  const bucket = resolveBucketName(options.scope);
  const expiresIn = options.expiresInSeconds || 300; // 5 minutes default

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: options.key,
    ContentType: options.contentType,
  });

  const signedUrl = await getSignedUrl(client, command, { expiresIn });

  let publicUrl: string | undefined;
  if (options.scope === 'public') {
    const publicBase = getR2PublicBaseUrl();
    if (publicBase) {
      publicUrl = `${publicBase}/${options.key.replace(/^\/+/, '')}`;
    }
  }

  return {
    signedUrl,
    key: options.key,
    bucket,
    publicUrl,
  };
}

/**
 * Generates a short-lived S3 presigned GET URL for authorized access to private objects (e.g. original PDFs).
 */
export async function createR2PresignedDownloadUrl(options: {
  scope?: BucketScope;
  key: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const client = getR2Client();
  const bucket = resolveBucketName(options.scope || 'private');
  const expiresIn = options.expiresInSeconds || 180; // 3 minutes default

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: options.key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * Server-side upload to Cloudflare R2 (used by the PDF processing worker and server actions).
 */
export async function uploadToR2(options: {
  scope: BucketScope;
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
}): Promise<{
  key: string;
  bucket: string;
  publicUrl?: string;
  sizeBytes: number;
}> {
  const client = getR2Client();
  const bucket = resolveBucketName(options.scope);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: options.key,
    Body: options.body,
    ContentType: options.contentType,
    CacheControl: options.cacheControl,
  });

  await client.send(command);

  let publicUrl: string | undefined;
  if (options.scope === 'public') {
    const publicBase = getR2PublicBaseUrl();
    if (publicBase) {
      publicUrl = `${publicBase}/${options.key.replace(/^\/+/, '')}`;
    }
  }

  return {
    key: options.key,
    bucket,
    publicUrl,
    sizeBytes: options.body.length,
  };
}

/**
 * Server-side download of an object from Cloudflare R2 (used by PDF worker to acquire source PDFs).
 */
export async function downloadFromR2(options: {
  scope?: BucketScope;
  key: string;
}): Promise<Buffer | null> {
  const client = getR2Client();
  const bucket = resolveBucketName(options.scope || 'private');

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: options.key,
    });

    const response = await client.send(command);
    if (!response.Body) {
      return null;
    }

    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    console.warn(`[R2 Download] Error reading ${bucket}/${options.key}:`, err.message || err);
    return null;
  }
}

/**
 * Checks whether an object exists in Cloudflare R2.
 */
export async function checkR2ObjectExists(options: {
  scope?: BucketScope;
  key: string;
}): Promise<boolean> {
  const client = getR2Client();
  const bucket = resolveBucketName(options.scope || 'public');

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: options.key,
    });
    await client.send(command);
    return true;
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    return false;
  }
}

/**
 * Deletes a single object from Cloudflare R2.
 */
export async function deleteFromR2(options: {
  scope: BucketScope;
  key: string;
}): Promise<boolean> {
  const client = getR2Client();
  const bucket = resolveBucketName(options.scope);

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: options.key,
    });
    await client.send(command);
    return true;
  } catch (err: any) {
    console.warn(`[R2 Delete] Non-critical warning deleting ${bucket}/${options.key}:`, err.message || err);
    return false;
  }
}

/**
 * Deletes all objects matching a folder prefix in Cloudflare R2.
 */
export async function deletePrefixFromR2(options: {
  scope: BucketScope;
  prefix: string;
}): Promise<number> {
  const sanitizedPrefix = options.prefix?.trim();
  if (!sanitizedPrefix || sanitizedPrefix === '/' || sanitizedPrefix === '*' || sanitizedPrefix.length < 3) {
    console.error('[R2 Delete Prefix] Aborted: Refusing to delete unsafe or root prefix:', options.prefix);
    return 0;
  }

  const client = getR2Client();
  const bucket = resolveBucketName(options.scope);
  let deletedCount = 0;

  try {
    let continuationToken: string | undefined;
    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: sanitizedPrefix,
        ContinuationToken: continuationToken,
      });

      const listRes = await client.send(listCommand);
      const objects = listRes.Contents || [];

      if (objects.length > 0) {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects.map(o => ({ Key: o.Key })),
            Quiet: true,
          },
        });
        await client.send(deleteCommand);
        deletedCount += objects.length;
      }

      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    return deletedCount;
  } catch (err: any) {
    console.warn(`[R2 Delete Prefix] Warning deleting prefix ${bucket}/${options.prefix}:`, err.message || err);
    return deletedCount;
  }
}
