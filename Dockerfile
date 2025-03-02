# Build stage for client
FROM node:18-alpine as client-builder

WORKDIR /app

COPY client/package*.json ./

RUN rm -rf node_modules
RUN npm install

COPY client/ .

EXPOSE 5173

CMD ["npm", "run", "dev"] 

# Build stage for server
FROM node:18-slim

WORKDIR /app

# Install FFmpeg and other required dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create uploads directory
RUN mkdir -p uploads/scenarios

# Expose the port the app runs on
EXPOSE 4000

# Start the application
CMD ["npm", "run", "start"] 