import { put, del } from "@vercel/blob";

/** Path prefix categories for organized blob storage */
export type BlobFolder = "products" | "pages" | "icons" | "hero" | "avatars";

interface UploadOptions {
  file: File | Buffer;
  filename: string;
  folder: BlobFolder;
  subfolder?: string;
}

/**
 * Upload a file to Vercel Blob storage.
 *
 * Path format: {folder}/{subfolder?}/{timestamp}-{sanitizedName}
 */
export async function uploadToBlob({
  file,
  filename,
  folder,
  subfolder,
}: UploadOptions): Promise<{ url: string }> {
  const timestamp = Date.now();
  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

  const pathParts: string[] = [folder];
  if (subfolder) pathParts.push(subfolder);
  pathParts.push(`${timestamp}-${sanitizedName}`);

  const pathname = pathParts.join("/");

  const blob = await put(pathname, file, { access: "public" });

  return { url: blob.url };
}

/**
 * Delete a file from Vercel Blob storage.
 * Silently handles non-existent files or errors.
 */
export async function deleteFromBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error("Failed to delete blob:", error);
  }
}

/** Check if a URL is a Vercel Blob URL (vs a relative local path). */
export function isBlobUrl(url: string): boolean {
  return url.startsWith("https://") && url.includes(".blob.vercel-storage.com");
}
