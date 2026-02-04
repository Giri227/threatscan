# Base Image
FROM node:18-bullseye

# Install ClamAV, YARA and other dependencies
RUN apt-get update && apt-get install -y \
    clamav \
    clamav-daemon \
    yara \
    libyara-dev \
    && rm -rf /var/lib/apt/lists/*

# Update ClamAV signatures
RUN freshclam || true

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Start command
CMD ["node", "src/server.js"]
