# Multi-stage build for production
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# We run npm ci without --production to keep tsx and drizzle-kit
# which were moved to dependencies, but just in case, this ensures
# the environment is exactly as package-lock specifies.
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
EXPOSE 3001
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
