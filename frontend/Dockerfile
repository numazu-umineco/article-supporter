# ---- Build Stage ----
FROM node:24 AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm ci -w frontend

# Copy frontend source
COPY frontend/src ./frontend/src
COPY frontend/index.html ./frontend/
COPY frontend/vite.config.ts ./frontend/
COPY frontend/tsconfig.json frontend/tsconfig.node.json ./frontend/

# Build
RUN npm run build -w frontend

# ---- Production Stage ----
FROM nginx

# Copy nginx template
COPY frontend/nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Copy built static files
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

ENV BACKEND_URL=http://backend:3000

EXPOSE 80
