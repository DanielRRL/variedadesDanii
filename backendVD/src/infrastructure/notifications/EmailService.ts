/**
 * Implementacion concreta del servicio de correo electronico.
 *
 * Usa Nodemailer como cliente SMTP y Handlebars para renderizar
 * las plantillas HTML. El relay de envio es Brevo (smtp-relay.brevo.com).
 *
 * Patron de diseno: Infrastructure Service que implementa IEmailService
 * (Dependency Inversion Principle — la capa de aplicacion solo conoce
 * la interfaz, no este archivo).
 *
 * Ubicacion en Clean Architecture:
 *   src/infrastructure/notifications/EmailService.ts
 *
 * Variables de entorno requeridas (ver .env.example):
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS,
 *   EMAIL_FROM, EMAIL_FROM_NAME, BASE_URL
 */

import fs from "fs";
import path from "path";
import nodemailer, { Transporter } from "nodemailer";
import Handlebars from "handlebars";

import { IEmailService, OrderItemEmailData } from "../../application/services/IEmailService";
import logger from "../../utils/logger";

// ---------------------------------------------------------------------------
// Registro de helpers de Handlebars usados en las plantillas
// ---------------------------------------------------------------------------

/**
 * Helper {{#ifeq a b}}...{{/ifeq}}
 * Renderiza el bloque solo si los dos valores son estrictamente iguales.
 * Usado en order-status-change.hbs para resaltar el estado activo
 * en la linea de tiempo.
 */
Handlebars.registerHelper("ifeq", function (
  this: unknown,
  a: unknown,
  b: unknown,
  options: Handlebars.HelperOptions
): string {
  return a === b ? options.fn(this) : options.inverse(this);
});

// ---------------------------------------------------------------------------
// Directorio donde residen las plantillas .hbs
// ---------------------------------------------------------------------------
const TEMPLATES_DIR = path.join(__dirname, "email-templates");

// ---------------------------------------------------------------------------
// Clase
// ---------------------------------------------------------------------------

export class EmailService implements IEmailService {
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly baseUrl: string;

  constructor() {
    const host     = process.env.EMAIL_HOST     || "smtp-relay.brevo.com";
    const port     = parseInt(process.env.EMAIL_PORT || "587", 10);
    const user     = process.env.EMAIL_USER     || "";
    const pass     = process.env.EMAIL_PASS     || "";
    const fromAddr = process.env.EMAIL_FROM     || "no-reply@variedadesdanii.com";
    const fromName = process.env.EMAIL_FROM_NAME || "Variedades DANII Perfumeria";

    this.from    = `"${fromName}" <${fromAddr}>`;
    this.baseUrl = (process.env.BASE_URL || "http://localhost:4000").replace(/\/$/, "");

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,   // STARTTLS (no SSL directo en el puerto 587)
      requireTLS: true,
      auth: { user, pass },
    });
  }

  // -------------------------------------------------------------------------
  // Helpers privados
  // -------------------------------------------------------------------------

  /**
   * Carga el archivo .hbs, lo compila con Handlebars y devuelve el HTML final.
   * Los archivos se leen de disco en cada llamada (sin cache) para permitir
   * hot-reload en desarrollo sin reiniciar el proceso.
   */
  private renderTemplate(templateName: string, context: Record<string, unknown>): string {
    const filePath = path.join(TEMPLATES_DIR, `${templateName}.hbs`);
    const source = fs.readFileSync(filePath, "utf-8");
    const template = Handlebars.compile(source);
    return template(context);
  }

  /**
   * Wrapper sobre transporter.sendMail con un reintento unico tras 2 segundos.
   * Si el segundo intento tambien falla, lanza la excepcion para que el caller
   * decida si hacer fallback (ej: encolar en BullMQ o registrar el error).
   */
  private async sendMail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const mailOptions = {
      from: this.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`[EmailService] Correo enviado a ${options.to} | Asunto: "${options.subject}"`);
    } catch (firstError) {
      logger.warn(
        `[EmailService] Primer intento fallido para ${options.to}. Reintentando en 2 s...`,
        { error: firstError }
      );

      await new Promise<void>((resolve) => setTimeout(resolve, 2000));

      try {
        await this.transporter.sendMail(mailOptions);
        logger.info(
          `[EmailService] Reintento exitoso para ${options.to} | Asunto: "${options.subject}"`
        );
      } catch (secondError) {
        logger.error(
          `[EmailService] Fallo definitivo al enviar a ${options.to} | Asunto: "${options.subject}"`,
          { error: secondError }
        );
        throw secondError;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Implementacion de IEmailService
  // -------------------------------------------------------------------------

  /** Envia el correo de verificacion de cuenta recien registrada. */
  async sendVerificationEmail(to: string, token: string, name: string): Promise<void> {
    const verificationUrl = `${this.baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
    const html = this.renderTemplate("verification", { name, verificationUrl });
    await this.sendMail({
      to,
      subject: "Verifica tu correo – Variedades DANII",
      html,
    });
  }

  /** Envia el enlace de recuperacion de contrasena, valido 1 hora. */
  async sendPasswordResetEmail(to: string, token: string, name: string): Promise<void> {
    const resetUrl = `${this.baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
    const html = this.renderTemplate("password-reset", { name, resetUrl });
    await this.sendMail({
      to,
      subject: "Restablecer contrasena – Variedades DANII",
      html,
    });
  }

  /** Envia la confirmacion del pedido con el resumen detallado de items. */
  async sendOrderConfirmation(
    to: string,
    data: {
      orderNumber: string;
      items: OrderItemEmailData[];
      total: number;
      discounts: number;
    }
  ): Promise<void> {
    const html = this.renderTemplate("order-confirmation", data);
    await this.sendMail({
      to,
      subject: `Confirmacion de pedido ${data.orderNumber} – Variedades DANII`,
      html,
    });
  }

  /**
   * Notifica el cambio de estado de un pedido.
   * Mapea el valor del enum OrderStatus a su clave (statusKey) para que la
   * plantilla pueda resaltar el paso correcto en la linea de tiempo visual.
   *
   * El campo newStatus contiene el texto legible en espanol (ej: "En preparacion")
   * y statusKey contiene la clave del enum en ingles (ej: "PREPARING").
   */
  async sendOrderStatusUpdate(
    to: string,
    data: {
      orderNumber: string;
      newStatus: string;
      clientName: string;
    }
  ): Promise<void> {
    // La clave del enum y el texto legible se reciben juntos en newStatus
    // cuando el caller los formatea como "CLAVE:Texto legible".
    // Si el formato no incluye ":", se usa el valor completo como statusKey
    // y como texto mostrado para mantener compatibilidad hacia atras.
    const [statusKey, statusLabel] = data.newStatus.includes(":")
      ? data.newStatus.split(":", 2)
      : [data.newStatus, data.newStatus];

    const html = this.renderTemplate("order-status-change", {
      clientName: data.clientName,
      orderNumber: data.orderNumber,
      newStatus: statusLabel,
      statusKey,
    });

    await this.sendMail({
      to,
      subject: `Tu pedido ${data.orderNumber} fue actualizado – Variedades DANII`,
      html,
    });
  }

  /** Envia la factura electronica con el enlace de descarga del PDF. */
  async sendInvoiceEmail(
    to: string,
    data: {
      orderNumber: string;
      invoicePdfUrl: string;
      clientName: string;
      invoiceNumber?: string;
    }
  ): Promise<void> {
    const html = this.renderTemplate("invoice", {
      clientName: data.clientName,
      orderNumber: data.orderNumber,
      invoiceNumber: data.invoiceNumber ?? "",
      invoicePdfUrl: data.invoicePdfUrl,
    });
    await this.sendMail({
      to,
      subject: `Tu factura electronica ${data.invoiceNumber ?? ""} – Variedades DANII`,
      html,
    });
  }

  /** Felicita al cliente por alcanzar un nuevo nivel de fidelizacion. */
  async sendLoyaltyLevelUp(
    to: string,
    data: {
      clientName: string;
      newLevel: string;
      discountPct: number;
    }
  ): Promise<void> {
    const html = this.renderTemplate("loyalty-level-up", data);
    await this.sendMail({
      to,
      subject: "¡Subiste de nivel en el programa de fidelidad! – Variedades DANII",
      html,
    });
  }

  /** Avisa al cliente que un amigo uso su codigo y le acredita puntos. */
  async sendReferralReward(
    to: string,
    data: {
      clientName: string;
      points: number;
      friendName: string;
    }
  ): Promise<void> {
    const html = this.renderTemplate("referral-reward", data);
    await this.sendMail({
      to,
      subject: "¡Ganaste puntos por referido! – Variedades DANII",
      html,
    });
  }

  /** Alerta al administrador sobre stock critico de una esencia. */
  async sendLowStockAlert(
    to: string,
    data: {
      essenceName: string;
      currentGrams: number;
      minGrams: number;
    }
  ): Promise<void> {
    const html = this.renderTemplate("low-stock-alert", data);
    await this.sendMail({
      to,
      subject: `[ALERTA] Stock bajo – ${data.essenceName} | Variedades DANII`,
      html,
    });
  }
}
