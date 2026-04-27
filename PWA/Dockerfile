FROM node:22-alpine AS deps
WORKDIR /app

COPY PWA/package.json PWA/package-lock.json* ./
RUN npm install


FROM node:22-alpine AS build
WORKDIR /repo/PWA

COPY --from=deps /app/node_modules ./node_modules
COPY PWA/package.json ./
COPY PWA/tsconfig*.json ./
COPY PWA/vite.config.ts ./
COPY PWA/index.html ./
COPY PWA/public ./public
COPY PWA/src ./src
COPY PWA/scripts ./scripts
COPY PWA/playwright*.config.ts ./

# Shared contracts referenced by the PWA build
COPY dynamic_zero_export ./../dynamic_zero_export

RUN npm run build


FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/PWA/dist /usr/share/nginx/html
EXPOSE 80

