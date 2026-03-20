# =============================================================================
# Dockerfile - Variedades Danni Backend
# =============================================================================
# Imagen multi-stage para optimizar el tamano final.
# Stage 1 (builder): instala dependencias y compila TypeScript a JavaScript.
# Stage 2 (runner): imagen ligera solo con dependencias de produccion y el
# codigo compilado (dist/). No incluye devDependencies ni fuente TypeScript.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder
# Usa Node 20 Alpine como base (ligera, ~180MB vs ~1GB de la imagen completa).
# Instala TODAS las dependencias (incluyendo devDeps como typescript y ts-node)
# para compilar el proyecto.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar primero los archivos de dependencias para aprovechar la cache de Docker.
# Si package.json no cambia, npm install no se re-ejecuta al rebuildar.
COPY package.json package-lock.json* ./

# Instalar TODAS las dependencias (dev + prod) porque se necesita typescript
RUN npm install

# Copiar el resto del codigo fuente (respeta .dockerignore)
COPY . .

# Generar el cliente de Prisma a partir del schema.
# Esto crea los tipos y el runtime del cliente en node_modules/.prisma/client.
RUN npx prisma generate

# Compilar TypeScript a JavaScript en la carpeta dist/
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Runner (imagen final de produccion)
# Solo contiene lo necesario para ejecutar: node, deps de produccion,
# el codigo compilado y los archivos de Prisma.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar SOLO dependencias de produccion (sin devDependencies).
# --omit=dev excluye typescript, ts-node, nodemon, @types/*, etc.
RUN npm install --omit=dev

# Copiar el schema de Prisma (necesario para generar el cliente en produccion)
COPY prisma ./prisma

# Copiar la configuracion de Prisma (prisma.config.ts se necesita para migrate)
COPY prisma.config.ts ./

# Copiar el tsconfig para que los path aliases funcionen si se necesita
COPY tsconfig.json ./

# Generar el cliente Prisma en la imagen de produccion
RUN npx prisma generate

# Copiar el codigo compilado desde el builder stage
COPY --from=builder /app/dist ./dist

# Puerto que expone la aplicacion (informativo, no abre puertos realmente)
EXPOSE 4000

# Comando por defecto: ejecutar las migraciones pendientes y arrancar el servidor.
# "prisma migrate deploy" aplica migraciones en produccion (no crea nuevas).
# Luego "node dist/server.js" arranca el servidor Express compilado.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
