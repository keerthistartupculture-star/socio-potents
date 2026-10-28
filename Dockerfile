# Socio Potents — production image
# Static site served by a small Express server.
FROM node:18-slim

WORKDIR /app

# Install deps first for layer caching. Lockfile is present and matches the
# single `express` dep, so `npm ci` is safe and reproducible.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# App source
COPY . .

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
