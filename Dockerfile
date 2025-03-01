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

# Build client
RUN npm run build

# Final stage
FROM node:18-slim

WORKDIR /app

# Install FFmpeg and other required dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    ffmpeg -version && \
    which ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create uploads directory with proper permissions
RUN mkdir -p uploads/scenarios && \
    chmod -R 777 uploads

# Set environment variable
ENV NODE_ENV=production

# Verify FFmpeg installation and directory permissions
RUN ffmpeg -version && \
    ls -la /usr/bin/ffmpeg && \
    ls -la uploads

# Expose the port the app runs on
EXPOSE 4000

# Start the application
CMD ["npm", "start"] 