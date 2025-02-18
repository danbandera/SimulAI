# Build stage for client
FROM node:18-alpine as client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm install

# Copy client source
COPY client/ .

# Build client
RUN npm run build

# Build stage for server
FROM node:18-alpine as server-builder

WORKDIR /app

# Copy server package files
COPY package*.json ./

# Install server dependencies
RUN npm install

# Copy server source
COPY . .

# Copy client build from client-builder
COPY --from=client-builder /app/client/dist ./client/dist

# Expose the port
EXPOSE $PORT

# Start the server
CMD ["npm", "start"] 