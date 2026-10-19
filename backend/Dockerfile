FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package manifests for efficient layer caching
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose internal port
EXPOSE 5000

# Run Express server
CMD ["npm", "start"]
