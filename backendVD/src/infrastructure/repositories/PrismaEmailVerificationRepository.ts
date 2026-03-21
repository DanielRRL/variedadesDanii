/**
 * Implementacion Prisma del repositorio de Verificacion de Correo.
 * Traduce las operaciones del contrato IEmailVerificationRepository a
 * consultas Prisma contra la tabla "email_verifications".
 */

// prisma - Instancia singleton de PrismaClient con el adapter pg.
import prisma from "../../config/database";

// IEmailVerificationRepository - Contrato que esta clase implementa.
import { IEmailVerificationRepository } from "../../domain/repositories/IEmailVerificationRepository";

// EmailVerification - Entidad de dominio usada como tipo de retorno.
import { EmailVerification } from "../../domain/entities/EmailVerification";

// AppError - Envuelve errores de Prisma en respuestas HTTP controladas.
import { AppError } from "../../utils/AppError";

/** Mapea un registro Prisma a la entidad de dominio EmailVerification. */
function mapRecord(r: any): EmailVerification {
  return new EmailVerification({
    id:        r.id,
    userId:    r.userId,
    token:     r.token,
    expiresAt: r.expiresAt,
    usedAt:    r.usedAt ?? null,
    createdAt: r.createdAt,
  });
}

export class PrismaEmailVerificationRepository implements IEmailVerificationRepository {
  /**
   * Persiste un nuevo token de verificacion de correo.
   * Lanza AppError 409 si ya existe un registro con el mismo token
   * (collision de token, no deberia ocurrir con tokens criptograficamente aleatorios).
   */
  async create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<EmailVerification> {
    try {
      const r = await prisma.emailVerification.create({
        data: {
          userId:    data.userId,
          token:     data.token,
          expiresAt: data.expiresAt,
        },
      });
      return mapRecord(r);
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw AppError.conflict("Token de verificacion duplicado.");
      }
      throw err;
    }
  }

  /**
   * Busca un token de verificacion por su valor exacto.
   * Usa el indice @unique en token para busqueda O(1).
   * Retorna null si el token no existe en la BD.
   */
  async findByToken(token: string): Promise<EmailVerification | null> {
    const r = await prisma.emailVerification.findUnique({ where: { token } });
    return r ? mapRecord(r) : null;
  }

  /**
   * Establece usedAt=NOW() en el registro del token.
   * Se llama una sola vez al completar exitosamente la verificacion.
   * Lanza AppError 404 si el ID no existe.
   */
  async markAsUsed(id: string): Promise<void> {
    try {
      await prisma.emailVerification.update({
        where: { id },
        data:  { usedAt: new Date() },
      });
    } catch (err: any) {
      if (err?.code === "P2025") {
        throw AppError.notFound("Token de verificacion no encontrado.");
      }
      throw err;
    }
  }

  /**
   * Elimina todos los tokens del usuario de la tabla.
   * Si no existen registros, la operacion se completa sin error
   * (deleteMany no lanza P2025).
   */
  async deleteByUserId(userId: string): Promise<void> {
    await prisma.emailVerification.deleteMany({ where: { userId } });
  }

  /**
   * Cuenta los tokens creados por el usuario en los ultimos N minutos.
   * La ventana temporal se calcula restando sinceMinutes al momento actual.
   * Usado por el servicio para aplicar rate-limiting de correos.
   */
  async countRecentByUserId(userId: string, sinceMinutes: number): Promise<number> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    return prisma.emailVerification.count({
      where: {
        userId,
        createdAt: { gte: since },
      },
    });
  }
}
