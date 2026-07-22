# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npm run prisma:generate

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only production dependencies
COPY package*.json ./
# Install production dependencies AND the prisma CLI (needed for migrate deploy)
RUN npm install --omit=dev && npm install prisma

# Copy compiled code and prisma from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/common/templates ./src/common/templates

# Expose the API port
EXPOSE 4000

# Start the application with migrations
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
