import { supabase } from "@/integrations/supabase/client";

export type DocumentBucket = "customer-uploads" | "admin-uploads";

type SignedUrlOptions = {
  expiresIn?: number;
  downloadName?: string;
};

const FALLBACK_BUCKETS: Record<DocumentBucket, DocumentBucket[]> = {
  "customer-uploads": ["admin-uploads"],
  "admin-uploads": ["customer-uploads"],
};

export function safeDownloadName(name: string | null | undefined) {
  const cleaned = (name || "document").replace(/[\\/:*?"<>|]+/g, "_").trim();
  return cleaned || "document";
}

function storageBaseUrl(bucket: DocumentBucket) {
  const { data } = supabase.storage.from(bucket).getPublicUrl("__base__");
  return data.publicUrl.split("/object/public/")[0];
}

function normalizeSignedUrl(bucket: DocumentBucket, rawUrl: string | null | undefined) {
  if (!rawUrl) return null;
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return `${storageBaseUrl(bucket)}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;
}

export async function createDocumentSignedUrl(
  path: string,
  primaryBucket: DocumentBucket,
  options: SignedUrlOptions = {},
) {
  const buckets = Array.from(new Set([primaryBucket, ...FALLBACK_BUCKETS[primaryBucket]]));
  let lastError: Error | null = null;

  for (const bucket of buckets) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, options.expiresIn ?? 3600, options.downloadName ? { download: safeDownloadName(options.downloadName) } : undefined);

    const rawUrl = data?.signedUrl ?? (data as { signedURL?: string } | null)?.signedURL;
    const url = normalizeSignedUrl(bucket, rawUrl);
    if (!error && url) return { url, bucket };
    if (error) lastError = error;
  }

  throw lastError ?? new Error("Could not generate document link");
}

export function isBrowserPreviewableFile(mimeType: string | null | undefined, fileName = "") {
  const mime = (mimeType || "").toLowerCase();
  const name = fileName.toLowerCase();
  return (
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime.startsWith("text/") ||
    /\.(pdf|png|jpe?g|webp|gif|txt|csv)$/i.test(name)
  );
}

export async function createDocumentPreviewBlobUrl(path: string, bucket: DocumentBucket) {
  const { url } = await createDocumentSignedUrl(path, bucket);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Preview failed (${response.status})`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function downloadDocument(path: string, fileName: string, bucket: DocumentBucket) {
  const { url } = await createDocumentSignedUrl(path, bucket, { downloadName: fileName });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (${response.status})`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = safeDownloadName(fileName);
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = safeDownloadName(fileName);
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}
