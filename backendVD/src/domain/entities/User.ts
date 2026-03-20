/**
 * Entidad de dominio: Usuario.
 * Representa a cualquier persona que interactua con el sistema:
 * administradores, clientes, vendedores y repartidores.
 */

/** Propiedades necesarias para construir un Usuario. */
export interface UserProps {
  id?: string;        // UUID generado por la BD, opcional al crear.
  name: string;       // Nombre completo del usuario.
  phone: string;      // Telefono unico, usado tambien para login.
  email: string;      // Correo electronico unico.
  password: string;   // Contrasena hasheada con bcrypt.
  role: UserRole;     // Rol que determina permisos en el sistema.
  active: boolean;    // Si la cuenta esta activa o deshabilitada.
  createdAt?: Date;   // Fecha de creacion, asignada por la BD.
  updatedAt?: Date;   // Fecha de ultima actualizacion, asignada por la BD.
}

/**
 * Roles disponibles en el sistema.
 * - ADMIN: gestion total (inventario, usuarios, pedidos).
 * - CLIENT: puede comprar y devolver frascos.
 * - SELLER: gestiona pedidos e inventario.
 * - DELIVERY: asignado a entregas.
 */
export enum UserRole {
  ADMIN = "ADMIN",
  CLIENT = "CLIENT",
  SELLER = "SELLER",
  DELIVERY = "DELIVERY",
}

/**
 * Clase de dominio User.
 * Encapsula los datos del usuario y ofrece metodos de negocio
 * para consultar el rol sin acceder directamente al enum.
 */
export class User {
  public readonly id?: string;
  public name: string;
  public phone: string;
  public email: string;
  public password: string;
  public role: UserRole;
  public active: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  /** Construye la entidad a partir de las propiedades recibidas. */
  constructor(props: UserProps) {
    this.id = props.id;
    this.name = props.name;
    this.phone = props.phone;
    this.email = props.email;
    this.password = props.password;
    this.role = props.role;
    this.active = props.active;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** Verifica si el usuario tiene rol de administrador. */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /** Verifica si el usuario tiene rol de cliente. */
  isClient(): boolean {
    return this.role === UserRole.CLIENT;
  }
}
