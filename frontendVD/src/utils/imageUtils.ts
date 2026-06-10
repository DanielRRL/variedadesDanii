/**
 * Utilities for image URLs.
 *
 * Google Drive direct URLs (uc?export=view&id=...) are not reliable in <img> tags
 * because Google may return an HTML page, block CORS, or check referrer headers.
 * This module routes Google Drive image URLs through a backend proxy endpoint
 * that fetches the image server-side and streams it back.
 */

const DRIVE_HOST_RE = /(?:drive|docs)\.google\.com|googleusercontent\.com/i;

/**
 * Returns the URL to use as <img src>, proxying Google Drive URLs through
 * the backend to bypass browser restrictions.
 */
export function getImageSrc(rawUrl: string | undefined | null): string | undefined {
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    if (DRIVE_HOST_RE.test(url.hostname)) {
      return `/api/images/proxy?url=${encodeURIComponent(rawUrl)}`;
    }
  } catch {
    // Not a valid URL — return as-is
  }

  return rawUrl;
}
