/**
 * Utilities for image URLs.
 *
 * Google Drive direct URLs (uc?export=view, open?id=, file/d/) are not
 * guaranteed to serve a raw image in &lt;img&gt; tags — Google may return an
 * HTML page, a virus-scan interstitial, or block the request via CORS.
 *
 * The reliable alternative is Google's thumbnail API:
 *   https://drive.google.com/thumbnail?id={FILE_ID}&sz=w2000
 *
 * This always returns a JPEG, works for publicly shared files, and is
 * served directly from Google's CDN with no authentication required.
 *
 * Two entry points:
 *  - getImageSrc()      → normalise at display time (never touches DB)
 *  - normaliseDriveUrl() → convert in admin forms before saving
 */

const DRIVE_HOST_RE = /(?:drive|docs)\.google\.com/i;

/**
 * Matches every common Google Drive sharing / file URL and captures the
 * file ID. Supports:
 *   /file/d/FILE_ID/view
 *   /open?id=FILE_ID
 *   /uc?id=FILE_ID
 *   /uc?export=view&id=FILE_ID
 *   /thumbnail?id=FILE_ID&sz=...
 */
const DRIVE_ID_RE = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=|thumbnail\?id=)([a-zA-Z0-9_-]+)/;

/**
 * Convierte cualquier URL de Google Drive al formato de thumbnail de alta
 * calidad (2000px de ancho, Google escala proporcionalmente).
 *
 * Si la URL no es de Google Drive, se retorna sin modificar.
 */
export function normaliseDriveUrl(raw: string): string {
  const match = raw.match(DRIVE_ID_RE);
  if (!match) return raw;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w2000`;
}

/**
 * Devuelve la URL normalizada para usar como src de &lt;img&gt;.
 * Las URLs de Google Drive se convierten a thumbnails; las demas se
 * retornan sin cambios. URLs nulas o vacias retornan undefined.
 */
export function getImageSrc(rawUrl: string | undefined | null): string | undefined {
  if (!rawUrl) return undefined;

  try {
    const url = new URL(rawUrl);
    if (DRIVE_HOST_RE.test(url.hostname)) {
      // Extract ID from whichever path/query format is present
      const id =
        url.pathname.split('/d/')[1]?.split('/')[0] ??
        url.searchParams.get('id');
      if (id) {
        return `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;
      }
    }
  } catch {
    // Not a valid URL — return as-is
  }

  return rawUrl;
}
