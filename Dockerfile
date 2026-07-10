# Socio Potents — production image
# Static site + small Express backend. Persists data to /app/data (mounted PVC).
FROM node:18-slim

WORKDIR /app

# Install deps first for layer caching. Lockfile is present and matches the
# single `express` dep, so `npm ci` is safe and reproducible.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# App source
COPY . .

# Data dir for submissions.json + config.json. A PVC mounts here at runtime
# (typically root-owned), so we run as root to guarantee writes never fail.
RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
