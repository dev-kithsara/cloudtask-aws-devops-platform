FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY functions/audit-consumer/package.json functions/audit-consumer/package.json
RUN npm ci

FROM deps AS build
COPY apps/api apps/api
RUN npm run prisma:generate -w @cloudtask/api && npm run build -w @cloudtask/api

FROM node:22-alpine AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY functions/audit-consumer/package.json functions/audit-consumer/package.json
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
RUN addgroup -S cloudtask && adduser -S cloudtask -G cloudtask
COPY --from=production-deps --chown=cloudtask:cloudtask /app/node_modules ./node_modules
COPY --from=build --chown=cloudtask:cloudtask /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=cloudtask:cloudtask /app/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=cloudtask:cloudtask /app/node_modules/.prisma ./node_modules/.prisma
USER cloudtask
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/server.js"]
