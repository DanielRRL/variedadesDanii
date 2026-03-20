/**
 * Error personalizado para la aplicacion.
 * Extiende la clase nativa Error y agrega codigo HTTP y tipo operacional.
 * Los errores operacionales son esperados (validacion, recurso no encontrado).
 * Los no-operacionales indican bugs internos del servidor.
 * Se usa en controllers, services y middleware para respuestas HTTP consistentes.
 */
export class AppError extends Error {
  // Codigo de estado HTTP asociado al error (400, 401, 404, etc.).
  public readonly statusCode: number;

  // true = error esperado (ej: dato invalido), false = bug interno.
  public readonly isOperational: boolean;

  /**
   * @param message - Mensaje descriptivo del error.
   * @param statusCode - Codigo HTTP a retornar al cliente.
   * @param isOperational - Si es un error controlado (por defecto true).
   */
  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    // Necesario para que instanceof funcione correctamente al extender Error.
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /** Error 400 - Solicitud invalida (datos incorrectos del cliente). */
  static badRequest(message: string): AppError {
    return new AppError(message, 400);
  }

  /** Error 401 - No autenticado (falta token o credenciales invalidas). */
  static unauthorized(message: string): AppError {
    return new AppError(message, 401);
  }

  /** Error 403 - Sin permisos (autenticado pero sin rol suficiente). */
  static forbidden(message: string): AppError {
    return new AppError(message, 403);
  }

  /** Error 404 - Recurso no encontrado en la base de datos. */
  static notFound(message: string): AppError {
    return new AppError(message, 404);
  }

  /** Error 409 - Conflicto (ej: email o telefono ya registrado). */
  static conflict(message: string): AppError {
    return new AppError(message, 409);
  }

  /** Error 500 - Error interno del servidor (no operacional, indica un bug). */
  static internal(message: string): AppError {
    return new AppError(message, 500, false);
  }
}
