/**
 * Implementacion del repositorio de usuarios con Prisma.
 * Traduce las operaciones definidas en IUserRepository a consultas
 * Prisma contra la tabla "users" de PostgreSQL.
 */

// prisma - Instancia singleton de PrismaClient para ejecutar queries.
import prisma from "../../config/database";

// IUserRepository, CreateUserData - Contrato e interface de datos
// que esta clase debe implementar.
import { IUserRepository, CreateUserData } from "../../domain/repositories/IUserRepository";

// User - Entidad de dominio, se usa para mapear los resultados de la BD.
import { User } from "../../domain/entities/User";

export class PrismaUserRepository implements IUserRepository {
  /** Obtiene todos los usuarios ordenados por fecha de creacion descendente. */
  async findAll(): Promise<User[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    // Mapea cada registro de Prisma a la entidad de dominio User.
    return users.map(
      (u: any) =>
        new User({
          id: u.id,
          name: u.name,
          phone: u.phone,
          email: u.email,
          password: u.password,
          role: u.role as any,
          active: u.active,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        })
    );
  }

  /** Busca un usuario por UUID. Retorna null si no existe. */
  async findById(id: string): Promise<User | null> {
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) return null;
    return new User({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      password: u.password,
      role: u.role as any,
      active: u.active,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });
  }

  /** Busca un usuario por email. Usado en login y validacion de registro. */
  async findByEmail(email: string): Promise<User | null> {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) return null;
    return new User({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      password: u.password,
      role: u.role as any,
      active: u.active,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });
  }

  /** Busca un usuario por telefono. Usado en validacion de registro. */
  async findByPhone(phone: string): Promise<User | null> {
    const u = await prisma.user.findUnique({ where: { phone } });
    if (!u) return null;
    return new User({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      password: u.password,
      role: u.role as any,
      active: u.active,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });
  }

  /** Crea un usuario nuevo y retorna la entidad con el UUID generado por la BD. */
  async create(user: CreateUserData): Promise<User> {
    const u = await prisma.user.create({
      data: {
        name: user.name,
        phone: user.phone,
        email: user.email,
        password: user.password,
        role: user.role as any,
        active: user.active,
      },
    });
    return new User({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      password: u.password,
      role: u.role as any,
      active: u.active,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });
  }

  /** Actualiza solo los campos proporcionados de un usuario. */
  async update(id: string, data: Partial<User>): Promise<User> {
    const u = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
        ...(data.email && { email: data.email }),
        ...(data.password && { password: data.password }),
        ...(data.role && { role: data.role as any }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    return new User({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      password: u.password,
      role: u.role as any,
      active: u.active,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    });
  }

  /** Elimina un usuario por UUID (hard delete). */
  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  /** Cuenta pedidos con status DELIVERED de un usuario. Usado para descuento de cliente frecuente. */
  async countOrdersByUser(userId: string): Promise<number> {
    return prisma.order.count({
      where: { userId, status: "DELIVERED" },
    });
  }
}
