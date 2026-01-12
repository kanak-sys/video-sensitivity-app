# Use official Node.js LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install system dependencies for FFmpeg and graphics
RUN apk add --no-cache \
    ffmpeg \
    imagemagick \
    graphicsmagick \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create necessary directories
RUN mkdir -p uploads uploads/thumbnails temp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Run as non-root user
USER node

# Start the application
CMD ["node", "server.js"]