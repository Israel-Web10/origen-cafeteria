# API de ORIGEN — imagen de producción
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
# Usuario sin privilegios
RUN addgroup -S origen && adduser -S origen -G origen
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations
COPY content ./content
RUN mkdir -p /app/uploads && chown -R origen:origen /app/uploads
USER origen
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
# Aplica migraciones pendientes y arranca
CMD ["sh", "-c", "node scripts/migrate.js && node scripts/seed-reference.js && node src/cluster.js"]
