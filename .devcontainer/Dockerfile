FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Set up non-root user for development
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 node \
    && chown -R node:nodejs /app

# Install required packages for development
RUN apk add --no-cache git openssh-client curl

# Use non-root user
USER node

# Command to keep container running
CMD [ "sleep", "infinity" ] 