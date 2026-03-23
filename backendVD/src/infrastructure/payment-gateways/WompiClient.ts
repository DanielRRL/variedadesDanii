/**
 * Cliente HTTP de bajo nivel para la API REST de Wompi.
 *
 * Responsabilidades:
 * - Centralizar la autenticacion con la clave privada (Bearer token).
 * - Reintentar una vez en errores transitorios del servidor (5xx).
 * - Lanzar WompiApiError con detalles cuando la API responde con error.
 * - Exponer metodos tipados: createTransaction, getTransaction, voidTransaction.
 *
 * Patron: esta clase es un "anti-corruption layer" que aisla el resto de la
 * aplicacion de los detalles del contrato HTTP de Wompi. Si Wompi cambia su
 * API, solo este archivo necesita actualizarse.
 *
 * Referencia oficial: https://docs.wompi.co/docs/colombia/
 */

// env - Variables de entorno centralizadas (apiUrl, privateKey, currency, etc.).
import { env } from "../../config/env";

// logger - Para trazabilidad de llamadas al gateway externo.
import logger from "../../utils/logger";

// ---------------------------------------------------------------------------
// Tipos de entrada / salida de la API Wompi
// ---------------------------------------------------------------------------

/** Datos necesarios para iniciar una transaccion Bre-B en Wompi. */
export interface WompiTransactionInput {
  /** Monto en centavos (pesos colombianos * 100). */
  amountInCents: number;
  /** Moneda: siempre "COP" para Colombia. */
  currency: string;
  /** Referencia unica del comercio (orderId). Wompi lo usa para idempotencia. */
  reference: string;
  /** URL a la que Wompi redirige al cliente despues del pago. */
  redirectUrl: string;
  /** Metodo de pago para Bre-B instant payments. */
  paymentMethod: {
    type: "BANCOLOMBIA_TRANSFER";
  };
}

/** Respuesta relevante de Wompi al crear una transaccion. */
export interface WompiTransactionCreated {
  /** UUID de la transaccion en Wompi. Se usa como gatewayRef. */
  transactionId: string;
  /** URL a la que redirigir al cliente para completar el pago. */
  paymentUrl: string;
  /** Objeto completo de la respuesta para guardarlo en BD. */
  fullResponse: any;
}

/** Respuesta al consultar el estado de una transaccion. */
export interface WompiTransactionStatus {
  /** Estado de la transaccion en Wompi. */
  status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
  /** Objeto completo para trazabilidad. */
  fullResponse: any;
}

// ---------------------------------------------------------------------------
// Error personalizado del cliente Wompi
// ---------------------------------------------------------------------------

/**
 * Error lanzado cuando la API de Wompi devuelve un codigo HTTP no exitoso
 * o cuando ocurre un fallo de red no recuperable.
 * Incluye el codigo de estado HTTP para que la capa superior pueda reaccionar.
 */
export class WompiApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body: any
  ) {
    super(message);
    this.name = "WompiApiError";
    Object.setPrototypeOf(this, WompiApiError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

export class WompiClient {
  private readonly baseUrl: string;
  private readonly privateKey: string;

  constructor() {
    this.baseUrl = env.wompi.apiUrl;
    this.privateKey = env.wompi.privateKey;
  }

  /**
   * Metodo central de comunicacion con la API Wompi.
   *
   * Caracteristicas de seguridad y resiliencia:
   * - Autenticacion via Bearer token (clave privada). NUNCA usar la clave
   *   publica aqui; la privada autoriza operaciones sensibles.
   * - Reintento automatico una sola vez en errores 5xx (servidor Wompi caido
   *   temporalmente). NO reintentar en 4xx (error del cliente, no transitorio).
   * - Registra todas las llamadas para auditoria.
   *
   * @param method - Metodo HTTP: GET, POST, etc.
   * @param path   - Ruta relativa a baseUrl (ej: "/transactions").
   * @param body   - Cuerpo JSON opcional (solo para POST/PATCH).
   */
  private async request(method: string, path: string, body?: object): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.privateKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    const init: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    logger.info(`WompiClient -> ${method} ${path}`);

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (networkErr) {
      // Error de red (DNS, timeout, etc.). No tiene sentido reintentar
      // si la causa es estructural, pero intentamos una vez mas por
      // caidas momentaneas de conectividad.
      logger.warn("WompiClient: network error, retrying once", { path, networkErr });
      response = await fetch(url, init);
    }

    // Reintento en errores de servidor (503 Service Unavailable, etc.)
    if (response.status >= 500) {
      logger.warn(`WompiClient: ${response.status} on first attempt, retrying`, { path });
      response = await fetch(url, init);
    }

    let responseBody: any;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = {};
    }

    if (!response.ok) {
      // Lanzar error con contexto completo para depuracion
      throw new WompiApiError(
        `Wompi API error ${response.status} on ${method} ${path}`,
        response.status,
        responseBody
      );
    }

    return responseBody;
  }

  /**
   * Crea una transaccion de pago en Wompi (Bre-B instant payment).
   *
   * El campo `reference` debe ser unico por transaccion y corresponde al
   * orderId interno. Wompi usa este campo para la idempotencia: si se envian
   * dos transacciones con la misma referencia en un corto periodo, Wompi
   * devuelve la misma transaccion en lugar de crear una duplicada.
   *
   * @param data - Datos de la transaccion (monto en centavos, moneda, referencia).
   */
  async createTransaction(data: WompiTransactionInput): Promise<WompiTransactionCreated> {
    const responseBody = await this.request("POST", "/transactions", data);

    const tx = responseBody?.data;
    return {
      transactionId: tx?.id,
      // payment_method.extra.async_payment_url es el enlace Bre-B para el cliente.
      paymentUrl: tx?.payment_method?.extra?.async_payment_url ?? "",
      fullResponse: responseBody,
    };
  }

  /**
   * Consulta el estado actual de una transaccion por su UUID de Wompi.
   * Utl para verificar manualmente el estado cuando no llega el webhook.
   *
   * @param transactionId - UUID de la transaccion en Wompi (gatewayRef).
   */
  async getTransaction(transactionId: string): Promise<WompiTransactionStatus> {
    const responseBody = await this.request("GET", `/transactions/${transactionId}`);
    return {
      status: responseBody?.data?.status ?? "ERROR",
      fullResponse: responseBody,
    };
  }

  /**
   * Anula (void) una transaccion aprobada.
   * Solo es posible dentro de la ventana de anulacion de Wompi (tipicamente
   * el mismo dia de la transaccion). Usar para reembolsos inmediatos.
   *
   * @param transactionId - UUID de la transaccion a anular.
   */
  async voidTransaction(transactionId: string): Promise<any> {
    return this.request("POST", `/transactions/${transactionId}/void`);
  }
}
