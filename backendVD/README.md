# Variedades Danni - Backend API

API REST para la gestion de ventas de perfumes, accesorios y productos generales de Variedades Danni. Construida con Node.js, Express 5, TypeScript y PostgreSQL.

## Arquitectura

El proyecto sigue Clean Architecture con inyeccion manual de dependencias (Composition Root). Las capas se comunican hacia adentro y nunca se conocen entre si directamente.

```
src/
  domain/           -> Entidades y contratos (interfaces de repositorios)
  application/      -> Servicios de negocio y casos de uso
  infrastructure/   -> Implementaciones de repositorios con Prisma
  interfaces/       -> Controladores, rutas, validadores y middlewares
  config/           -> Variables de entorno, conexion a BD, seed
  utils/            -> Errores personalizados, logger, helpers
```

**Flujo de una request:**
Ruta -> Middleware (auth/role) -> Validator -> Controller -> Service/UseCase -> Repository -> PostgreSQL

**Composition Root** (`src/app.ts`): Instancia todas las dependencias en el orden Repositorios -> Servicios -> Casos de Uso -> Controladores -> Rutas. Ningun modulo conoce implementaciones concretas de otras capas.

## Tecnologias

| Componente | Tecnologia |
|---|---|
| Runtime | Node.js 20 Alpine |
| Framework | Express 5 |
| Lenguaje | TypeScript (ES2022, CommonJS) |
| ORM | Prisma 7 con PrismaPg adapter |
| Base de datos | PostgreSQL 16 Alpine |
| Autenticacion | JWT (jsonwebtoken) + bcrypt (12 rounds) |
| Validacion | express-validator |
| Seguridad | helmet, cors, express-rate-limit (100 req/15min) |
| Logger | Winston (console + archivos) |
| Contenedores | Docker multi-stage builds + docker-compose |

## Requisitos previos

- Docker y Docker Compose instalados
- Puerto 4000 (API), 5434 (PostgreSQL) y 5173 (frontend) disponibles

## Como ejecutar

Desde la raiz del proyecto (donde esta docker-compose.yml):

```bash
# Construir y levantar todos los servicios
docker compose up --build

# Solo el backend y la base de datos
docker compose up db api --build
```

La API estara disponible en `http://localhost:4000/api`.

### Variables de entorno

Las variables se configuran en el `docker-compose.yml` raiz. Las principales:

| Variable | Descripcion |
|---|---|
| DATABASE_URL | URL de conexion a PostgreSQL |
| JWT_SECRET | Clave secreta para firmar tokens JWT |
| PORT | Puerto del servidor (default: 4000) |
| NODE_ENV | Entorno (development/production) |
| CORS_ORIGIN | Origen permitido para CORS |
| ADMIN_EMAIL | Email del usuario admin inicial |
| ADMIN_PASSWORD | Password del usuario admin inicial |
| ADMIN_NAME | Nombre del usuario admin inicial |
| ADMIN_PHONE | Telefono del usuario admin inicial |

## Sistema de inventario

El inventario funciona por **movimientos** (event sourcing simplificado). No hay campo de stock directo en las tablas; el stock se calcula como `SUM(IN) - SUM(OUT)`.

### Tres tipos de inventario

1. **Esencias (ml):** Movimientos en mililitros. Se descuentan al crear una orden de perfume.
2. **Frascos (unidades):** Movimientos en unidades. Se descuentan al crear una orden de perfume.
3. **Productos generales (unidades):** Movimientos en unidades para productos de tipo ACCESSORY o GENERAL. Se descuentan al crear una orden de estos productos.

### Categorias de producto

El modelo `Product` es dinamico y soporta tres categorias:

- **PERFUME:** Requiere essenceId, bottleId y mlQuantity. Su stock depende de esencia + frasco disponibles.
- **ACCESSORY:** Productos como estuches, bolsas, etc. Su stock se controla con ProductMovement.
- **GENERAL:** Cualquier otro producto. Mismo control de stock que ACCESSORY.

### Auditorias de inventario

El sistema permite realizar auditorias comparando el conteo fisico con el valor del sistema. Si hay diferencia, se crea automaticamente un movimiento de ADJUSTMENT para sincronizar el inventario.

## Endpoints de la API

### Autenticacion
| Metodo | Ruta | Descripcion | Acceso |
|---|---|---|---|
| POST | /api/auth/register | Registrar usuario | Publico |
| POST | /api/auth/login | Iniciar sesion | Publico |

### Usuarios
| Metodo | Ruta | Descripcion | Acceso |
|---|---|---|---|
| GET | /api/users | Listar usuarios | ADMIN |
| GET | /api/users/:id | Ver usuario | ADMIN |
| PATCH | /api/users/:id | Actualizar usuario | ADMIN |
| DELETE | /api/users/:id | Desactivar usuario | ADMIN |
| GET | /api/users/:id/addresses | Direcciones del usuario | ADMIN |
| POST | /api/users/:id/addresses | Crear direccion | ADMIN |

### Esencias
| Metodo | Ruta | Descripcion | Acceso |
|---|---|---|---|
| GET | /api/essences | Listar esencias | Publico |
| GET | /api/essences/:id | Ver esencia | Publico |
| POST | /api/essences | Crear esencia | ADMIN |
| PUT | /api/essences/:id | Actualizar esencia | ADMIN |
| DELETE | /api/essences/:id | Eliminar esencia | ADMIN |

### Frascos
| Metodo | Ruta | Descripcion | Acceso |
|---|---|---|---|
| GET | /api/bottles | Listar frascos | Publico |
| GET | /api/bottles/:id | Ver frasco | Publico |
| POST | /api/bottles | Crear frasco | ADMIN |
| PUT | /api/bottles/:id | Actualizar frasco | ADMIN |
| DELETE | /api/bottles/:id | Eliminar frasco | ADMIN |

### Productos
| Metodo | Ruta | Descripcion | Acceso |
|---|---|---|---|
| GET | /api/products | Listar productos activos | Publico |
| GET | /api/products/:id | Ver producto | Publico |
| POST | /api/products | Crear producto | ADMIN |
| PUT | /api/products/:id | Actualizar producto | ADMIN |
| DELETE | /api/products/:id | Desactivar producto | ADMIN |

### Ordenes
| Metodo | Ruta | Descripcion | Acceso |
|---|---|---|---|
| POST | /api/orders | Crear orden | Autenticado |
| GET | /api/orders | Listar ordenes | ADMIN, SELLER |
| GET | /api/orders/:id | Ver orden | Autenticado |
| PATCH | /api/orders/:id/status | Actualizar estado | ADMIN, SELLER |
| GET | /api/orders/user/:userId | Ordenes de un usuario | Autenticado |

### Inventario
| Metodo | Ruta | Descripcion | Acceso |
|---|---|---|---|
| GET | /api/inventory/essence/:essenceId/stock | Stock de esencia (ml) | ADMIN, SELLER |
| GET | /api/inventory/essence/:essenceId/movements | Historial esencia | ADMIN, SELLER |
| POST | /api/inventory/essence/movement | Movimiento de esencia | ADMIN, SELLER |
| GET | /api/inventory/bottle/:bottleId/stock | Stock de frasco | ADMIN, SELLER |
| GET | /api/inventory/bottle/:bottleId/movements | Historial frasco | ADMIN, SELLER |
| POST | /api/inventory/bottle/movement | Movimiento de frasco | ADMIN, SELLER |
| GET | /api/inventory/product/:productId/stock | Stock de producto | ADMIN, SELLER |
| GET | /api/inventory/product/:productId/movements | Historial producto | ADMIN, SELLER |
| POST | /api/inventory/product/movement | Movimiento de producto | ADMIN, SELLER |
| POST | /api/inventory/audit | Crear auditoria | ADMIN, SELLER |
| GET | /api/inventory/audit/:entityType | Auditorias por tipo | ADMIN, SELLER |
| GET | /api/inventory/audit/entity/:entityId | Auditorias de entidad | ADMIN, SELLER |

### Devoluciones de frascos
| Metodo | Ruta | Descripcion | Acceso |
|---|---|---|---|
| POST | /api/returns | Procesar devolucion | ADMIN, SELLER |
| GET | /api/returns | Listar devoluciones | ADMIN, SELLER |
| GET | /api/returns/:id | Ver devolucion | ADMIN, SELLER |
| GET | /api/returns/user/:userId | Devoluciones de usuario | Autenticado |

### Pagos
| Metodo | Ruta | Descripcion | Acceso |
|---|---|---|---|
| GET | /api/payments/order/:orderId | Pagos de una orden | Autenticado |
| PATCH | /api/payments/:id/status | Actualizar estado pago | ADMIN |

### Administracion
| Metodo | Ruta | Descripcion | Acceso |
|---|---|---|---|
| GET | /api/admin/dashboard | Resumen del dia | ADMIN |
| GET | /api/admin/reports/daily-sales | Ventas por dia | ADMIN |
| GET | /api/admin/reports/top-products | Productos mas vendidos | ADMIN |
| GET | /api/admin/reports/low-stock | Esencias con stock bajo | ADMIN |

### Health Check
| Metodo | Ruta | Descripcion | Acceso |
|---|---|---|---|
| GET | /api/health | Estado de la API | Publico |

## Roles de usuario

- **ADMIN:** Acceso total. Gestion de productos, inventario, usuarios, reportes.
- **SELLER:** Puede gestionar inventario, ordenes y devoluciones.
- **CLIENT:** Puede crear ordenes y ver sus propios datos.
- **DELIVERY:** Puede ver ordenes asignadas para entrega.

## Seed de administrador

Al iniciar el servidor por primera vez, se crea automaticamente un usuario ADMIN con las credenciales definidas en las variables de entorno (ADMIN_EMAIL, ADMIN_PASSWORD, etc.). Si el usuario ya existe, no se duplica.

## Seguridad

- Passwords hasheados con bcrypt (12 salt rounds)
- Politica de password: minimo 8 caracteres, mayuscula, numero, caracter especial
- JWT para autenticacion stateless
- Helmet para headers HTTP seguros
- Rate limiting: 100 requests por 15 minutos por IP
- Validacion de entrada con express-validator en todos los endpoints que reciben datos
- CORS configurado para aceptar solo el origen del frontend

## Base de datos

El esquema se define en `prisma/schema.prisma`. Los modelos principales:

- **User:** Usuarios con roles y direcciones
- **Essence:** Esencias con familia olfativa
- **Bottle:** Tipos de frascos
- **Product:** Productos dinamicos (PERFUME, ACCESSORY, GENERAL)
- **Order:** Ordenes con items, descuentos y pagos
- **EssenceMovement / BottleMovement / ProductMovement:** Movimientos de inventario
- **InventoryAudit:** Registro de auditorias fisicas vs sistema
- **BottleReturn:** Devoluciones de frascos (para descuento de lealtad)
- **Payment:** Pagos con soporte para Nequi, Daviplata, Bancolombia, efectivo

Para aplicar migraciones:

```bash
docker compose exec api npx prisma migrate dev
```

Para ver la base de datos:

```bash
docker compose exec api npx prisma studio
```
