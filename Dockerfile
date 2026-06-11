# Stage 1: build React frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: production image
FROM node:20-alpine
WORKDIR /app

# Install server dependencies only
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy built frontend and server code
COPY --from=builder /app/dist ./dist
COPY server ./server

EXPOSE 3002
ENV NODE_ENV=production
WORKDIR /app/server
CMD ["node", "index.js"]
