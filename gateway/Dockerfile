FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci


FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

EXPOSE 8788
CMD ["npm","run","start"]

