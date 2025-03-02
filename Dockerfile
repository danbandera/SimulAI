# Build stage for client
FROM node:18-alpine as client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN rm -rf node_modules
RUN npm install

# Copy client source
COPY client/ .

EXPOSE 5173

# Build client
RUN npm run build

# Final stage
FROM node:18-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy server package files
COPY package*.json ./

# Install server dependencies
RUN npm install

# Copy server source
COPY . .

RUN mkdir -p uploads/scenarios

# Copy client build from client-builder
COPY --from=client-builder /app/client/dist ./client/dist

# Expose the port
EXPOSE 4000

# Start the server
CMD ["npm", "start"] 