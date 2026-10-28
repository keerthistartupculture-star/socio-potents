# Path AI — served at sociopotents.in/path-ai behind the Socio Potents site server.
FROM node:20-slim

# Prisma's query engine needs OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# basePath is baked into the build, so it must be set here, not only at runtime.
ARG NEXT_PUBLIC_BASE_PATH=/path-ai
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
RUN npx prisma generate && npx next build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Apply DB migrations and seed questions/careers/admin on every start (both are idempotent).
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx next start -p ${PORT}"]
