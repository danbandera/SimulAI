# Build stage for client
FROM node:18-alpine as client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# Build stage for server
FROM node:18-alpine

# Install required dependencies
RUN apk add --no-cache \
    mysql-client \
    build-base \
    python3

WORKDIR /app

# Copy server files
COPY package*.json ./
RUN npm install
COPY . .

# Copy built client files
COPY --from=client-builder /app/client/dist ./client/dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# Start the server
CMD ["npm", "run", "dev"] 