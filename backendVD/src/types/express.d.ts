/**
 * Augmentacion del namespace Express para incluir campos personalizados
 * en el objeto Request inyectados por los middlewares.
 *
 * authMiddleware inyecta userId y userRole desde el JWT decodificado.
 * requestIdMiddleware inyecta un UUID unico por request.
 *
 * Al usar estas declaraciones, no se necesita (req as any) en ningun
 * controlador o middleware.
 */
declare namespace Express {
  interface Request {
    /** UUID del usuario autenticado. Inyectado por authMiddleware. */
    userId?: string;
    /** Rol del usuario autenticado (ADMIN, CLIENT, SELLER, DELIVERY). */
    userRole?: string;
    /** UUID unico de la request para trazabilidad en logs. */
    requestId?: string;
  }
}
