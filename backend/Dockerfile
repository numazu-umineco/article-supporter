# ---- Build Stage ----
FROM node:24 AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

# Install dependencies
RUN npm ci -w backend

# Copy backend source
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/

# Build TypeScript
RUN npm run build -w backend

# ---- Production Stage ----
FROM node:24

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

# Install production dependencies only
RUN npm ci -w backend --omit=dev

# Copy built files from builder
COPY --from=builder /app/backend/dist ./backend/dist

# Copy drizzle migrations
COPY backend/drizzle ./backend/drizzle
COPY backend/drizzle.config.ts ./backend/

EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
