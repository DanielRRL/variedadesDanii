# =============================================================================
# Dockerfile - Variedades Danni Frontend
# =============================================================================
# Imagen multi-stage para el frontend React + TypeScript (Vite).
# Stage 1 (builder): instala dependencias y compila la app.
# Stage 2 (dev): imagen de desarrollo con hot-reload via Vite dev server.
# =============================================================================

# ---------------------------------------------------------------------------
# Stage: Development (default)
# Usa Node 20 Alpine. Levanta el servidor de desarrollo de Vite
# con hot-reload para una experiencia de desarrollo rapida.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS dev

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar archivos de dependencias primero para aprovechar cache de Docker
COPY package.json package-lock.json* ./

# Instalar todas las dependencias (dev + prod)
RUN npm install

# Copiar el resto del codigo fuente
COPY . .

# Puerto que expone Vite dev server
EXPOSE 5173

# Comando por defecto: levantar Vite en modo desarrollo
# --host 0.0.0.0 permite acceso desde fuera del contenedor
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
