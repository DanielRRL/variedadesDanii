/**
 * Implementacion Prisma del repositorio de Restablecimiento de Contrasena.
 * Traduce las operaciones del contrato IPasswordResetRepository a
 * consultas Prisma contra la tabla "password_resets".
 */

// prisma - Instancia singleton de PrismaClient con el adapter pg.
import prisma from "../../config/database";

// IPasswordResetRepository - Contrato que esta clase implementa.
import { IPasswordResetRepository } from "../../domain/repositories/IPasswordResetRepository";

// PasswordReset - Entidad de dominio usada como tipo de retorno.
import { PasswordReset } from "../../domain/entities/PasswordReset";

// AppError - Envuelve errores de Prisma en respuestas HTTP controladas.
import { AppError } from "../../utils/AppError";

/** Mapea un registro Prisma a la entidad de dominio PasswordReset. */
function mapRecord(r: any): PasswordReset {
  return new PasswordReset({
    id:        r.id,
    userId:    r.userId,
    token:     r.token,
    expiresAt: r.expiresAt,
    usedAt:    r.usedAt ?? null,
    createdAt: r.createdAt,
  });
}

export class PrismaPasswordResetRepository implements IPasswordResetRepository {
  /**
   * Persiste un nuevo token de restablecimiento de contrasena.
   * Lanza AppError 409 si ya existe un registro con el mismo token
   * (colision de token, no deberia ocurrir con tokens criptograficamente aleatorios).
   */
  async create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<PasswordReset> {
    try {
      const r = await prisma.passwordReset.create({
        data: {
          userId:    data.userId,
          token:     data.token,
          expiresAt: data.expiresAt,
        },
      });
      return mapRecord(r);
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw AppError.conflict("Token de recuperacion duplicado.");
      }
      throw err;
    }
  }

  /**
   * Busca un token de reset por su valor exacto.
   * Usa el indice @unique en token para busqueda O(1).
   * Retorna null si el token no existe en la BD.
   */
  async findByToken(token: string): Promise<PasswordReset | null> {
    const r = await prisma.passwordReset.findUnique({ where: { token } });
    return r ? mapRecord(r) : null;
  }

  /**
   * Establece usedAt=NOW() en el registro del token.
   * Se llama una sola vez luego de confirmar el cambio de contrasena.
   * Lanza AppError 404 si el ID no existe.
   */
  async markAsUsed(id: string): Promise<void> {
    try {
      await prisma.passwordReset.update({
        where: { id },
        data:  { usedAt: new Date() },
      });
    } catch (err: any) {
      if (err?.code === "P2025") {
        throw AppError.notFound("Token de recuperacion no encontrado.");
      }
      throw err;
    }
  }

  /**
   * Elimina todos los tokens de reset del usuario de la tabla.
   * Si no existen registros, la operacion se completa sin error
   * (deleteMany no lanza P2025).
   * Usar antes de crear un token nuevo para invalidar los anteriores.
   */
  async deleteByUserId(userId: string): Promise<void> {
    await prisma.passwordReset.deleteMany({ where: { userId } });
  }
}
