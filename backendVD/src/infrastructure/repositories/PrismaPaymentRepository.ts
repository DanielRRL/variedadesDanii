/**
 * Implementacion del repositorio de pagos con Prisma.
 * Cada orden tiene un unico pago (relacion 1:1).
 * Los metodos soportan Nequi, Daviplata, Bancolombia y efectivo.
 */

// prisma - Instancia singleton del cliente de base de datos.
import prisma from "../../config/database";

// IPaymentRepository - Contrato para operaciones de pago.
import { IPaymentRepository } from "../../domain/repositories/IPaymentRepository";

export class PrismaPaymentRepository implements IPaymentRepository {
  /** Crea un registro de pago asociado a una orden. */
  async create(data: {
    orderId: string;
    method: string;
    status: string;
    amount: number;
    gatewayRef?: string;
    gatewayResponse?: any;
  }): Promise<any> {
    return prisma.payment.create({
      data: {
        orderId: data.orderId,
        method: data.method as any,
        status: data.status as any,
        amount: data.amount,
        gatewayRef: data.gatewayRef,
        gatewayResponse: data.gatewayResponse,
      },
    });
  }

  /** Busca el pago de una orden (relacion 1:1). */
  async findByOrderId(orderId: string): Promise<any | null> {
    return prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });
  }

  /** Actualiza estado del pago y opcionalmente guarda respuesta del gateway. */
  async updateStatus(
    id: string,
    status: string,
    gatewayResponse?: any
  ): Promise<any> {
    return prisma.payment.update({
      where: { id },
      data: {
        status: status as any,
        ...(gatewayResponse && { gatewayResponse }),
      },
    });
  }
}
