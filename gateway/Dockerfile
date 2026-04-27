FROM node:22-alpine AS deps
WORKDIR /repo/gateway

COPY gateway/package.json gateway/package-lock.json* ./
RUN npm ci


FROM node:22-alpine AS runtime
WORKDIR /repo/gateway

ENV NODE_ENV=production

COPY --from=deps /repo/gateway/node_modules ./node_modules
COPY gateway/package.json ./
COPY gateway/src ./src

# Needed for runtime type imports (shared contracts)
COPY dynamic_zero_export/pwa/contracts ../dynamic_zero_export/pwa/contracts

EXPOSE 8788
CMD ["npm","run","start"]

