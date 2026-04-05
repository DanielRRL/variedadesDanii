/**
 * Servicio de autenticacion.
 * Maneja registro, login, verificacion de correo y restablecimiento de contrasena.
 * Es el unico lugar donde se generan y firman tokens JWT.
 * Sigue el principio de inyeccion de dependencias: todos los colaboradores
 * se reciben por constructor y se tipan con interfaces del dominio.
 */

// crypto - Generacion de tokens seguros de un solo uso.
import crypto from "crypto";

// bcrypt - Hashing de contrasenas con salt (12 rounds).
import bcrypt from "bcrypt";

// jsonwebtoken - Creacion y firma de JWT.
import jwt from "jsonwebtoken";

// IUserRepository - Inyeccion de dependencia del repo de usuarios.
import { IUserRepository } from "../../domain/repositories/IUserRepository";

// IEmailVerificationRepository - Repositorio de tokens de verificacion de correo.
import { IEmailVerificationRepository } from "../../domain/repositories/IEmailVerificationRepository";

// IPasswordResetRepository - Repositorio de tokens de restablecimiento de contrasena.
import { IPasswordResetRepository } from "../../domain/repositories/IPasswordResetRepository";

// IEmailService - Contrato del servicio de envio de emails.
import { IEmailService } from "./IEmailService";

// UserRole - Enum de roles para asignar CLIENT por defecto al registrar.
import { UserRole } from "../../domain/entities/User";

// env - Variables de entorno tipadas (jwt.secret, jwt.expiresIn).
import { env } from "../../config/env";

// AppError - Errores HTTP personalizados (conflict, unauthorized, etc).
import { AppError } from "../../utils/AppError";

// logger - Logger centralizado Winston para registrar eventos del servicio.
import logger from "../../utils/logger";

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
    emailVerified: boolean;
  };
  token: string;
}

export class AuthService {
  /**
   * Recibe todos los colaboradores via inyeccion de dependencias.
   * @param userRepo               - Repositorio de usuarios (CRUD).
   * @param emailVerificationRepo  - Repositorio de tokens de verificacion de correo.
   * @param passwordResetRepo      - Repositorio de tokens de restablecimiento de contrasena.
   * @param emailService           - Servicio de envio de correos electronicos.
   * @param jwtSecret              - Secreto para firmar JWT (provisto por env).
   */
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly emailVerificationRepo: IEmailVerificationRepository,
    private readonly passwordResetRepo: IPasswordResetRepository,
    private readonly emailService: IEmailService,
  ) {}

  /**
   * Registra un usuario nuevo.
   * 1. Verifica que email y telefono no esten registrados (lanza 409 si existen).
   * 2. Hashea la contrasena con bcrypt (12 rounds).
   * 3. Crea el usuario con rol CLIENT y emailVerified=false.
   * 4. Genera un token de verificacion, lo guarda con expiracion de 24h
   *    y envia el correo de activacion al usuario.
   * 5. Genera JWT y retorna datos sanitizados (sin password hash).
   * @param data - Nombre, telefono, email y contrasena plana.
   * @throws AppError 409 si el email o telefono ya estan registrados.
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

    // Generar token de verificacion de correo (256 bits de entropia)
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Guardar token con expiracion de 24 horas desde ahora
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.emailVerificationRepo.create({
      userId: user.id!,
      token: verificationToken,
      expiresAt,
    });

    // Enviar correo de activacion al usuario registrado.
    // Si el envio falla (ej: SMTP no configurado), el registro continua
    // y el usuario puede solicitar reenvio desde la pantalla de login.
    try {
      await this.emailService.sendVerificationEmail(user.email, verificationToken, user.name);
      logger.info("User registered, verification email sent", { userId: user.id });
    } catch (emailError) {
      logger.warn("User registered but verification email failed", {
        userId: user.id,
        error: emailError,
      });
    }

    // Firmar JWT con id y rol del usuario
    const token = this.generateToken(user.id!, user.role);

    return {
      user: {
        id: user.id!,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified ?? false,
      },
      token,
    };
  }

  /**
   * Inicia sesion de un usuario existente.
   * 1. Busca por email; lanza 401 si no existe (mensaje generico anti-enumeracion).
   * 2. Valida que la cuenta este activa.
   * 3. Verifica que el correo haya sido verificado; lanza 403 si no lo fue.
   * 4. Compara contrasena con bcrypt.compare.
   * 5. Genera JWT y retorna datos sanitizados.
   * @param data - Email y contrasena plana del usuario.
   * @throws AppError 401 si las credenciales son invalidas o la cuenta esta inactiva.
   * @throws AppError 403 si el email no ha sido verificado.
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

    // Admins skip email verification (seed always sets emailVerified=true).
    // Regular users must verify their email before accessing the platform.
    if (!user.emailVerified && user.role !== "ADMIN") {
      throw AppError.forbidden(
        "Please verify your email before logging in. Check your inbox."
      );
    }

    const token = this.generateToken(user.id!, user.role);

    return {
      user: {
        id: user.id!,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified ?? false,
      },
      token,
    };
  }

  /**
   * Verifica el correo electronico de un usuario mediante el token enviado.
   * 1. Busca el token en la BD; lanza 404 si no existe.
   * 2. Comprueba que no haya expirado; lanza 410 si ya expiro.
   * 3. Comprueba que no haya sido usado; lanza 409 si ya fue consumido.
   * 4. Marca el token como usado y actualiza emailVerified=true en el usuario.
   * @param token - Token de verificacion recibido por correo.
   * @throws AppError 404 si el token no existe.
   * @throws AppError 410 si el token ha expirado.
   * @throws AppError 409 si el token ya fue utilizado.
   */
  async verifyEmail(token: string): Promise<void> {
    // Buscar el registro del token en la BD
    const verification = await this.emailVerificationRepo.findByToken(token);
    if (!verification) {
      throw new AppError("Invalid or expired verification token", 404);
    }

    // Validar que el token no haya expirado
    if (verification.expiresAt < new Date()) {
      throw new AppError("Verification token has expired. Request a new one.", 410);
    }

    // Validar que el token no haya sido usado antes
    if (verification.usedAt != null) {
      throw new AppError("This token has already been used", 409);
    }

    // Marcar token como consumido y activar verificacion del usuario
    await this.emailVerificationRepo.markAsUsed(verification.id!);
    await this.userRepo.update(verification.userId, { emailVerified: true });

    logger.info("Email verified successfully", { userId: verification.userId });
  }

  /**
   * Reenv ia el correo de verificacion a un usuario que aun no ha verificado su cuenta.
   * 1. Busca el usuario por email; si no existe retorna silenciosamente (anti-enumeracion).
   * 2. Si el usuario ya verifico su cuenta, no hace nada.
   * 3. Aplica rate-limiting: si el usuario genero 3 o mas tokens en los ultimos 60 minutos
   *    lanza 429 Too Many Requests.
   * 4. Elimina tokens anteriores, crea uno nuevo (24h de expiracion) y envia el correo.
   * @param email - Direccion de correo del usuario que solicita el reenvio.
   * @throws AppError 429 si se excede el limite de 3 solicitudes en 60 minutos.
   */
  async resendVerificationEmail(email: string): Promise<void> {
    // Buscar usuario sin revelar si existe (silencioso en caso de no encontrar)
    const user = await this.userRepo.findByEmail(email);
    if (!user || user.emailVerified) {
      // No revelar si el email existe ni si ya esta verificado
      return;
    }

    // Aplicar rate-limiting: maximo 3 tokens en los ultimos 60 minutos
    const recentCount = await this.emailVerificationRepo.countRecentByUserId(
      user.id!,
      60
    );
    if (recentCount >= 3) {
      throw new AppError(
        "Too many verification email requests. Please wait before trying again.",
        429
      );
    }

    // Limpiar tokens anteriores del usuario
    await this.emailVerificationRepo.deleteByUserId(user.id!);

    // Crear un nuevo token con expiracion de 24 horas
    const newToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.emailVerificationRepo.create({
      userId: user.id!,
      token: newToken,
      expiresAt,
    });

    // Enviar el correo con el nuevo token
    await this.emailService.sendVerificationEmail(user.email, newToken, user.name);

    logger.info("Verification email resent", { userId: user.id });
  }

  /**
   * Inicia el flujo de recuperacion de contrasena.
   * 1. Busca el usuario por email; si no existe retorna silenciosamente
   *    para prevenir la enumeracion de usuarios registrados.
   * 2. Genera un token seguro, elimina resets anteriores del usuario
   *    y guarda el nuevo con expiracion de 1 hora.
   * 3. Envia el correo con el enlace de restablecimiento.
   * @param email - Direccion de correo del usuario que olvido su contrasena.
   */
  async forgotPassword(email: string): Promise<void> {
    // Buscar usuario; retorno silencioso para prevenir enumeracion
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      logger.warn("forgotPassword called for unknown email", { email });
      return;
    }

    // Invalidar tokens de reset anteriores del usuario
    await this.passwordResetRepo.deleteByUserId(user.id!);

    // Generar nuevo token con expiracion de 1 hora
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.passwordResetRepo.create({
      userId: user.id!,
      token: resetToken,
      expiresAt,
    });

    // Enviar el correo de restablecimiento
    await this.emailService.sendPasswordResetEmail(user.email, resetToken, user.name);

    logger.info("Password reset email sent", { userId: user.id });
  }

  /**
   * Completa el flujo de restablecimiento de contrasena con un token valido.
   * 1. Busca el token en la BD; lanza 404 si no existe.
   * 2. Verifica que no haya expirado (410) ni sido usado antes (409).
   * 3. Valida que newPassword tenga al menos 8 caracteres y un numero;
   *    lanza 400 si no cumple.
   * 4. Hashea la nueva contrasena con bcrypt (12 rounds).
   * 5. Actualiza la contrasena del usuario en la BD.
   * 6. Marca el token actual como usado e invalida todos los demas tokens
   *    de reset del usuario.
   * @param token       - Token de reset recibido por correo.
   * @param newPassword - Nueva contrasena plana elegida por el usuario.
   * @throws AppError 404 si el token no existe.
   * @throws AppError 410 si el token ha expirado.
   * @throws AppError 409 si el token ya fue utilizado.
   * @throws AppError 400 si la nueva contrasena no cumple los requisitos minimos.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Buscar el registro del token en la BD
    const resetRecord = await this.passwordResetRepo.findByToken(token);
    if (!resetRecord) {
      throw new AppError("Invalid or expired reset token", 404);
    }

    // Validar que el token no haya expirado
    if (resetRecord.expiresAt < new Date()) {
      throw new AppError("Reset token has expired. Request a new one.", 410);
    }

    // Validar que el token no haya sido usado antes
    if (resetRecord.usedAt != null) {
      throw new AppError("This token has already been used", 409);
    }

    // Validar requisitos minimos de la nueva contrasena
    if (newPassword.length < 8 || !/[0-9]/.test(newPassword)) {
      throw new AppError(
        "Password must be at least 8 characters and contain at least one number.",
        400
      );
    }

    // Hashear la nueva contrasena con 12 rondas de salt
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar la contrasena del usuario
    await this.userRepo.update(resetRecord.userId, { password: hashedPassword });

    // Marcar el token actual como consumido
    await this.passwordResetRepo.markAsUsed(resetRecord.id!);

    // Eliminar todos los otros tokens de reset del usuario para invalidarlos
    await this.passwordResetRepo.deleteByUserId(resetRecord.userId);

    logger.info("Password reset successfully", { userId: resetRecord.userId });
  }

  /**
   * Autentica (o registra) un usuario mediante Google Sign-In.
   * 1. Verifica el ID token con la libreria de Google.
   * 2. Si el email ya existe en la BD, inicia sesion.
   * 3. Si no existe, crea una cuenta nueva con emailVerified=true
   *    (Google ya verifico el correo) y password aleatorio.
   * @param idToken - Token JWT de Google devuelto por Sign In with Google.
   * @throws AppError 401 si el token es invalido o no contiene email.
   */
  async googleLogin(idToken: string): Promise<AuthResponse> {
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(env.google.clientId);

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: env.google.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw AppError.unauthorized("Invalid Google token");
    }

    if (!payload || !payload.email) {
      throw AppError.unauthorized("Google token does not contain email");
    }

    const { email, name, sub: googleId } = payload;

    // Buscar usuario existente por email
    let user = await this.userRepo.findByEmail(email);

    if (user) {
      // Si la cuenta existe pero esta desactivada
      if (!user.active) {
        throw AppError.unauthorized("Account is deactivated");
      }
    } else {
      // Crear cuenta nueva — password aleatorio (el usuario no lo usa)
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      user = await this.userRepo.create({
        name: name || email.split("@")[0],
        phone: "",
        email,
        password: hashedPassword,
        role: UserRole.CLIENT,
        active: true,
      });

      // Marcar email como verificado (Google ya lo verifico)
      await this.userRepo.update(user.id!, { emailVerified: true });
      user.emailVerified = true;

      logger.info("New user created via Google Sign-In", { userId: user.id, email });
    }

    // Si el usuario existia pero no habia verificado email, verificarlo ahora
    if (!user.emailVerified) {
      await this.userRepo.update(user.id!, { emailVerified: true });
      user.emailVerified = true;
    }

    const token = this.generateToken(user.id!, user.role);

    return {
      user: {
        id: user.id!,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: true,
      },
      token,
    };
  }

  /**
   * Genera un JWT firmado con el secret y expiracion de las env vars.
   * El payload contiene userId y role para autorizar en middleware.
   * @param userId - UUID del usuario autenticado.
   * @param role   - Rol del usuario (ADMIN, CLIENT, SELLER, DELIVERY).
   */
  private generateToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    } as jwt.SignOptions);
  }
}

