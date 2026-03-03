FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache optimization)
COPY package*.json ./
RUN npm ci --only=production

# Install typescript + tsx for build step
RUN npm install --save-dev typescript tsx

# Copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc --outDir dist

# Remove dev dependencies after build
RUN npm prune --production

CMD ["node", "dist/index.js"]
