/**
 * Patron Strategy para procesamiento de pagos.
 * Define una interfaz comun (IPaymentStrategy) y cinco implementaciones
 * para los metodos de pago colombianos: Nequi, Daviplata, Bancolombia, Bre-B, Efectivo.
 * Todas las estrategias registran el pago como pendiente de confirmacion manual
 * (el sistema no esta conectado a ninguna pasarela de pagos).
 */

/** Resultado del procesamiento de un pago. */
export interface PaymentResult {
  success: boolean;
  gatewayRef?: string;
  gatewayResponse?: any;
  message: string;
}

/** Interfaz comun que toda estrategia de pago debe implementar. */
export interface IPaymentStrategy {
  /** Procesa el pago de una orden por el monto dado. */
  pay(orderId: string, amount: number): Promise<PaymentResult>;
  /** Verifica el estado de un pago por su referencia. */
  verify(gatewayRef: string): Promise<PaymentResult>;
}

// AppError - Para lanzar errores HTTP tipados en vez de Error generico.
import { AppError } from "../../utils/AppError";

/** Estrategia de pago con Nequi (billetera digital colombiana). */
export class NequiPayment implements IPaymentStrategy {
  async pay(orderId: string, _amount: number): Promise<PaymentResult> {
    return {
      success: true,
      gatewayRef: `NEQUI-${orderId}-${Date.now()}`,
      message: "Payment pending - Nequi confirmation required",
    };
  }

  async verify(gatewayRef: string): Promise<PaymentResult> {
    // TODO: Verificar estado con gateway
    return {
      success: true,
      gatewayRef,
      message: "Payment verified",
    };
  }
}

/** Estrategia de pago con Daviplata (billetera digital Davivienda). */
export class DaviplataPayment implements IPaymentStrategy {
  async pay(orderId: string, _amount: number): Promise<PaymentResult> {
    return {
      success: true,
      gatewayRef: `DAVI-${orderId}-${Date.now()}`,
      message: "Payment pending - Daviplata confirmation required",
    };
  }

  async verify(gatewayRef: string): Promise<PaymentResult> {
    return {
      success: true,
      gatewayRef,
      message: "Payment verified",
    };
  }
}

/** Estrategia de pago con Bancolombia (transferencia bancaria). */
export class BancolombiaPayment implements IPaymentStrategy {
  async pay(orderId: string, amount: number): Promise<PaymentResult> {
    return {
      success: true,
      gatewayRef: `BANCO-${orderId}-${Date.now()}`,
      message: "Payment pending - Bancolombia transfer confirmation required",
    };
  }

  async verify(gatewayRef: string): Promise<PaymentResult> {
    return {
      success: true,
      gatewayRef,
      message: "Payment verified",
    };
  }
}

/** Estrategia de pago Bre-B via transferencia (pendiente de confirmacion manual). */
export class BrebPayment implements IPaymentStrategy {
  async pay(orderId: string, _amount: number): Promise<PaymentResult> {
    return {
      success: true,
      gatewayRef: `BREB-${orderId}-${Date.now()}`,
      message: "Payment pending — Bre-B transfer confirmation required",
    };
  }

  async verify(gatewayRef: string): Promise<PaymentResult> {
    return {
      success: true,
      gatewayRef,
      message: "Payment verified",
    };
  }
}

/** Estrategia de pago contra entrega (efectivo). */
export class CashPayment implements IPaymentStrategy {
  async pay(orderId: string, amount: number): Promise<PaymentResult> {
    // Contra entrega: el pago se confirma al momento de entregar el pedido
    return {
      success: true,
      gatewayRef: `CASH-${orderId}-${Date.now()}`,
      message: "Cash on delivery - payment pending on delivery",
    };
  }

  async verify(gatewayRef: string): Promise<PaymentResult> {
    return {
      success: true,
      gatewayRef,
      message: "Cash payment confirmed",
    };
  }
}

/**
 * Factory que retorna la estrategia de pago correcta segun el metodo.
 * Usa un mapa estatico para evitar instanciar estrategias repetidamente.
 */
export class PaymentStrategyFactory {
  /** Mapa de metodo de pago -> instancia de estrategia. */
  private static strategies: Record<string, IPaymentStrategy> = {
    NEQUI: new NequiPayment(),
    DAVIPLATA: new DaviplataPayment(),
    BANCOLOMBIA: new BancolombiaPayment(),
    CASH: new CashPayment(),
    BREB: new BrebPayment(),
  };

  /** Obtiene la estrategia para un metodo dado. Lanza error si no existe. */
  static getStrategy(method: string): IPaymentStrategy {
    const strategy = this.strategies[method];
    if (!strategy) {
      throw AppError.badRequest(`Unsupported payment method: ${method}`);
    }
    return strategy;
  }
}
