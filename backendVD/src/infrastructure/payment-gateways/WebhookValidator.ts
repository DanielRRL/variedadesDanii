/**
 * Validador de firmas de webhooks Wompi.
 *
 * Wompi firma cada evento enviado al webhook del comercio usando HMAC-SHA256
 * con el "Secreto de eventos" configurado en el panel de Wompi. El comercio
 * debe validar esta firma ANTES de procesar cualquier evento para garantizar:
 *
 * 1. AUTENTICIDAD: el evento realmente proviene de Wompi, no de un atacante.
 * 2. INTEGRIDAD: el cuerpo del evento no fue modificado en transito.
 *
 * Algoritmo de validacion (segun docs.wompi.co):
 *   checksum = HMAC_SHA256( timestamp + payload, eventsSecret )
 *   valid    = timingSafeEqual( checksum, signatureHeader )
 *
 * Se usa crypto.timingSafeEqual para comparar los hashes. Las comparaciones
 * de strings con === son vulnerables a "timing attacks": un atacante puede
 * medir cuanto tarda la comparacion caracter a caracter para adivinar el
 * valor esperado byte a byte. timingSafeEqual siempre tarda lo mismo.
 */

// crypto - Modulo nativo de Node.js. No requiere instalacion.
import { createHmac, timingSafeEqual } from "crypto";

// env - Para leer WOMPI_EVENTS_SECRET de forma centralizada y tipada.
import { env } from "../../config/env";

// logger - Para registrar intentos de firma invalida (intento de spoofing).
import logger from "../../utils/logger";

export class WebhookValidator {
  /**
   * Valida la firma HMAC-SHA256 de un evento de webhook de Wompi.
   *
   * @param payload   - Cuerpo del request como string (se recibe con express.raw).
   *                    Debe ser el body RAW sin parsear para que el hash coincida.
   * @param timestamp - Valor del header "x-wc-timestamp" enviado por Wompi.
   * @param signature - Valor del header "x-wc-signature" enviado por Wompi (hex).
   * @returns true si la firma es valida; false en cualquier otro caso.
   *
   * IMPORTANTE: ante firma invalida, el llamador debe responder siempre con
   * 401 SIN revelar el motivo exacto (no "firma invalida", no "secreto incorrecto").
   * Dar detalles ayuda a atacantes a calibrar sus intentos.
   */
  validateWompiSignature(
    payload: string,
    timestamp: string,
    signature: string
  ): boolean {
    try {
      const secret = env.wompi.eventsSecret;

      if (!secret) {
        // Si el secreto no esta configurado, rechazar todo: es un error de
        // configuracion del servidor, no del cliente.
        logger.error("WebhookValidator: WOMPI_EVENTS_SECRET is not configured");
        return false;
      }

      // Construir el string a firmar segun el protocolo de Wompi:
      // timestamp + cuerpo_raw (sin separador).
      const signedContent = `${timestamp}${payload}`;

      // Calcular el HMAC-SHA256 esperado usando el secreto de eventos.
      const expectedHmac = createHmac("sha256", secret)
        .update(signedContent, "utf8")
        .digest("hex");

      // Comparar en tiempo constante para prevenir timing attacks.
      // Buffer.from() con "hex" produce buffers de la misma longitud si
      // ambos strings son hex validos del mismo algoritmo (SHA-256 = 64 chars).
      const expectedBuffer = Buffer.from(expectedHmac, "hex");
      const receivedBuffer = Buffer.from(signature, "hex");

      // Si las longitudes difieren, timingSafeEqual lanzaria; comparamos
      // primero la longitud para evitar la excepcion.
      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch (err) {
      // Cualquier excepcion inesperada (ej: signature no es hex valido)
      // se trata como firma invalida para evitar bypasses por error.
      logger.warn("WebhookValidator: exception during signature check", { err });
      return false;
    }
  }
}
