/**
 * Interface del repositorio de Usuarios.
 * Define el contrato que debe cumplir cualquier implementacion
 * de acceso a datos de usuarios (Prisma, TypeORM, etc.).
 * Esto permite cambiar la BD sin modificar la logica de negocio
 * (Principio de Inversion de Dependencias - SOLID).
 */

// User - Entidad de dominio, se usa como tipo de retorno.
// UserRole - Enum de roles, necesario para CreateUserData.
import { User, UserRole } from "../entities/User";

/**
 * Datos necesarios para crear un usuario nuevo.
 * Se define aparte de la entidad User para evitar conflictos
 * con los metodos de clase (isAdmin, isClient) al usar Omit.
 */
export interface CreateUserData {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
}

/** Contrato del repositorio de usuarios. */
export interface IUserRepository {
  /** Obtiene todos los usuarios ordenados por fecha de creacion. */
  findAll(): Promise<User[]>;

  /** Busca un usuario por su UUID. Retorna null si no existe. */
  findById(id: string): Promise<User | null>;

  /** Busca un usuario por email. Usado en login y validacion de registro. */
  findByEmail(email: string): Promise<User | null>;

  /** Busca un usuario por telefono. Usado en validacion de registro. */
  findByPhone(phone: string): Promise<User | null>;

  /** Crea un usuario nuevo y retorna la entidad con id generado. */
  create(user: CreateUserData): Promise<User>;

  /** Actualiza campos parciales de un usuario existente. */
  update(id: string, data: Partial<User>): Promise<User>;

  /** Elimina un usuario por su UUID. */
  delete(id: string): Promise<void>;

  /** Cuenta pedidos DELIVERED de un usuario. Usado para descuento de cliente frecuente. */
  countOrdersByUser(userId: string): Promise<number>;
}
