# Build stage for client
FROM node:20-alpine as client-builder

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
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libjpeg-dev \
    libcairo2-dev \
    libgif-dev \
    libpango1.0-dev \
    libtool \
    autoconf \
    automake \
    pkg-config \
    libpixman-1-dev \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

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