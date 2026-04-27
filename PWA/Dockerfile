FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install


FROM node:22-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY tsconfig*.json ./
COPY index.html ./
COPY public ./public
COPY src ./src
COPY scripts ./scripts
COPY playwright*.config.ts ./

RUN npm run build


FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

