/**
 * Contrato del servicio de notificaciones por correo electronico.
 * Defines todas las operaciones de envio de emails para la aplicacion.
 * Aplica el principio de inversion de dependencias (DIP): la capa de
 * aplicacion depende de esta interfaz, no de la implementacion concreta.
 * La implementacion concreta (EmailService con Nodemailer + Brevo) reside
 * en src/infrastructure/notifications/EmailService.ts.
 */

import { SimpleInvoiceData } from "./SimpleInvoiceService";

/** Representa un item individual dentro de un pedido. */
export interface OrderItemEmailData {
  name: string;  // Nombre del producto.
  qty: number;   // Cantidad de unidades.
  price: number; // Precio unitario al momento de la compra.
}

/**
 * Interfaz del servicio de correo electronico.
 * Cualquier implementacion concreta (Nodemailer, SendGrid, SES, etc.)
 * debe cumplir este contrato para ser intercambiable sin afectar
 * la capa de aplicacion.
 */
export interface IEmailService {
  /**
   * Envia el correo de activacion de cuenta con el enlace de verificacion.
   * El enlace se construye como: BASE_URL/auth/verify-email?token={{token}}
   * El token expira en 24 horas segun la politica del sistema.
   * @param to    - Direccion de correo del destinatario.
   * @param token - Token UUID de un solo uso para verificar el correo.
   * @param name  - Nombre del usuario para personalizar el saludo.
   */
  sendVerificationEmail(to: string, token: string, name: string): Promise<void>;

  /**
   * Envia el correo de recuperacion de contrasena con el enlace de reset.
   * El enlace se construye como: BASE_URL/auth/reset-password?token={{token}}
   * El token expira en 1 hora; pasada esa ventana debe solicitarse otro.
   * @param to    - Direccion de correo del destinatario.
   * @param token - Token UUID de un solo uso para autorizar el reset.
   * @param name  - Nombre del usuario para personalizar el saludo.
   */
  sendPasswordResetEmail(to: string, token: string, name: string): Promise<void>;

  /**
   * Envia la confirmacion del pedido con el detalle de items, descuentos y total.
   * Se dispara inmediatamente despues de crear el pedido en el sistema.
   * @param to              - Correo del cliente.
   * @param data.orderNumber - Numero legible del pedido (ej: VD-20260001).
   * @param data.items       - Lista de productos comprados con cantidad y precio.
   * @param data.total       - Monto total a pagar (despues de descuentos).
   * @param data.discounts   - Total de descuentos aplicados al pedido.
   */
  sendOrderConfirmation(
    to: string,
    data: {
      orderNumber: string;
      items: OrderItemEmailData[];
      total: number;
      discounts: number;
    }
  ): Promise<void>;

  /**
   * Notifica al cliente cuando el estado de su pedido cambia.
   * Se llama cada vez que se ejecuta un cambio de estado en el servicio de pedidos.
   * @param to              - Correo del cliente.
   * @param data.orderNumber - Numero del pedido afectado.
   * @param data.newStatus  - Nuevo estado en espanol o clave del enum (PENDING, PAID, etc.).
   * @param data.clientName - Nombre del cliente para el saludo personalizado.
   */
  sendOrderStatusUpdate(
    to: string,
    data: {
      orderNumber: string;
      newStatus: string;
      clientName: string;
    }
  ): Promise<void>;

  /**
   * Envia la factura electronica al cliente con el enlace de descarga del PDF.
   * Se dispara cuando la factura cambia a estado ACCEPTED en la DIAN.
   * @param to                   - Correo del cliente.
   * @param data.orderNumber      - Numero del pedido asociado a la factura.
   * @param data.invoicePdfUrl    - URL publica y firmada del PDF de la factura.
   * @param data.clientName       - Nombre del cliente para el saludo.
   */
  sendInvoiceEmail(
    to: string,
    data: {
      orderNumber: string;
      invoicePdfUrl: string;
      clientName: string;
    }
  ): Promise<void>;

  /**
   * Felicita al cliente cuando sube de nivel en el programa de fidelizacion.
   * Se dispara despues de que el servicio de loyalty actualiza el nivel de la cuenta.
   * @param to                 - Correo del cliente.
   * @param data.clientName    - Nombre del cliente.
   * @param data.newLevel      - Nombre del nuevo nivel (PREFERRED, VIP).
   * @param data.discountPct   - Porcentaje de descuento activo a partir de ahora.
   */
  sendLoyaltyLevelUp(
    to: string,
    data: {
      clientName: string;
      newLevel: string;
      discountPct: number;
    }
  ): Promise<void>;

  /**
   * Notifica al cliente que uno de sus referidos uso su codigo y le otorga puntos.
   * Se dispara cuando el servicio de referidos procesa la recompensa (rewardGiven=true).
   * @param to              - Correo del cliente referidor.
   * @param data.clientName - Nombre del cliente referidor.
   * @param data.points     - Cantidad de puntos acreditados por el referido.
   * @param data.friendName - Nombre del amigo que uso el codigo.
   */
  sendReferralReward(
    to: string,
    data: {
      clientName: string;
      points: number;
      friendName: string;
    }
  ): Promise<void>;

  /**
   * Alerta al administrador cuando el stock de una esencia cae por debajo del minimo.
   * Se dispara desde el servicio de inventario al detectar stock critico.
   * @param to                   - Correo del administrador.
   * @param data.essenceName      - Nombre de la esencia con stock critico.
   * @param data.currentGrams     - Stock actual en gramos segun el sistema.
   * @param data.minGrams         - Umbral minimo configurado para esta esencia.
   */
  sendLowStockAlert(
    to: string,
    data: {
      essenceName: string;
      currentGrams: number;
      minGrams: number;
    }
  ): Promise<void>;

  /**
   * Envia la factura simple (no DIAN) al cliente por correo.
   * Si to esta vacio (cliente presencial sin email), la implementacion
   * debe loguear warn y retornar sin lanzar error.
   * @param to      - Correo del cliente.
   * @param invoice - Datos completos de la factura simple.
   */
  sendSimpleInvoice(to: string, invoice: SimpleInvoiceData): Promise<void>;
}
