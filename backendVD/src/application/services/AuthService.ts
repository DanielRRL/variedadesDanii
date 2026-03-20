/**
 * Servicio de autenticacion.
 * Maneja registro y login de usuarios con JWT + bcrypt.
 * Es el unico lugar donde se genera y firma tokens.
 */

// bcrypt - Hashing de contrasenas con salt (12 rounds).
import bcrypt from "bcrypt";

// jsonwebtoken - Creacion y firma de JWT.
import jwt from "jsonwebtoken";

// IUserRepository - Inyeccion de dependencia del repo de usuarios.
import { IUserRepository } from "../../domain/repositories/IUserRepository";

// UserRole - Enum de roles para asignar CLIENT por defecto al registrar.
import { UserRole } from "../../domain/entities/User";

// env - Variables de entorno tipadas (jwt.secret, jwt.expiresIn).
import { env } from "../../config/env";

// AppError - Errores HTTP personalizados (conflict, unauthorized).
import { AppError } from "../../utils/AppError";

/** Datos requeridos para registrar un usuario nuevo. */
export interface RegisterDTO {
  name: string;
  phone: string;
  email: string;
  password: string;
}

/** Datos requeridos para iniciar sesion. */
export interface LoginDTO {
  email: string;
  password: string;
}

/** Respuesta estandar de autenticacion con usuario sanitizado + token. */
export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  token: string;
}

export class AuthService {
  /** Recibe el repositorio de usuarios via inyeccion de dependencias. */
  constructor(private readonly userRepo: IUserRepository) {}

  /**
   * Registra un usuario nuevo.
   * 1. Verifica que email y telefono no esten registrados.
   * 2. Hashea la contrasena con bcrypt (12 rounds).
   * 3. Crea el usuario con rol CLIENT.
   * 4. Genera JWT y retorna datos sanitizados.
   */
  async register(data: RegisterDTO): Promise<AuthResponse> {
    // Verificar unicidad de email
    const existingEmail = await this.userRepo.findByEmail(data.email);
    if (existingEmail) {
      throw AppError.conflict("Email already registered");
    }

    // Verificar unicidad de telefono
    const existingPhone = await this.userRepo.findByPhone(data.phone);
    if (existingPhone) {
      throw AppError.conflict("Phone already registered");
    }

    // Hashear contrasena con 12 rondas de salt
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Crear usuario con rol CLIENT por defecto
    const user = await this.userRepo.create({
      name: data.name,
      phone: data.phone,
      email: data.email,
      password: hashedPassword,
      role: UserRole.CLIENT,
      active: true,
    });

    // Firmar JWT con id y rol del usuario
    const token = this.generateToken(user.id!, user.role);

    return {
      user: {
        id: user.id!,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Inicia sesion de un usuario existente.
   * 1. Busca por email.
   * 2. Valida que la cuenta este activa.
   * 3. Compara contrasena con bcrypt.compare.
   * 4. Genera JWT y retorna datos sanitizados.
   */
  async login(data: LoginDTO): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) {
      throw AppError.unauthorized("Invalid credentials");
    }

    // Verificar que la cuenta no este desactivada
    if (!user.active) {
      throw AppError.unauthorized("Account is deactivated");
    }

    // Comparar contrasena plana contra el hash almacenado
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw AppError.unauthorized("Invalid credentials");
    }

    const token = this.generateToken(user.id!, user.role);

    return {
      user: {
        id: user.id!,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Genera un JWT firmado con el secret y expiracion de las env vars.
   * El payload contiene userId y role para autorizar en middleware.
   */
  private generateToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    } as jwt.SignOptions);
  }
}
