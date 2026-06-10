/**
 * Controlador de proxy de imagenes.
 * Descarga imagenes externas (Google Drive, etc.) del lado del servidor
 * y las sirve al navegador, evitando restricciones CORS/referrer.
 *
 * GET /api/images/proxy?url=<encoded_url>
 */

import { Request, Response, NextFunction } from "express";
import { Readable } from "stream";

const IMAGE_MIME_RE = /^image\/(jpeg|png|webp|gif|avif|svg\+xml|bmp|tiff)/;

const ALLOWED_HOSTS = [
  "drive.google.com",
  "lh3.googleusercontent.com",
  "googleusercontent.com",
];

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.some((h) => hostname.endsWith(h));
}

export class ImageProxyController {
  proxy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const url = typeof req.query.url === "string" ? req.query.url.trim() : "";

      if (!url) {
        res.status(400).json({ success: false, message: "Missing url query parameter" });
        return;
      }

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        res.status(400).json({ success: false, message: "Invalid URL" });
        return;
      }

      if (!isAllowedHost(parsed.hostname)) {
        res.status(403).json({ success: false, message: "Host not allowed for image proxy" });
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const upstream = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "VariedadesDanni/1.0 (image-proxy)",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);

      const contentType = upstream.headers.get("content-type") || "image/jpeg";

      if (!IMAGE_MIME_RE.test(contentType)) {
        await upstream.body?.cancel();
        res.status(400).json({ success: false, message: "URL does not point to an image" });
        return;
      }

      const contentLength = upstream.headers.get("content-length");
      res.setHeader("Content-Type", contentType);
      if (contentLength) res.setHeader("Content-Length", contentLength);
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");

      if (!upstream.body) {
        res.status(204).end();
        return;
      }

      const nodeStream = Readable.fromWeb(upstream.body as any);
      nodeStream.pipe(res);

      nodeStream.on("error", () => {
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: "Stream error" });
        }
      });
    } catch (error: any) {
      if (error?.name === "AbortError") {
        if (!res.headersSent) {
          res.status(504).json({ success: false, message: "Upstream image fetch timed out" });
        }
        return;
      }
      next(error);
    }
  };
}
