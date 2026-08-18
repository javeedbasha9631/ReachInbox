FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm install

COPY backend/ ./
RUN npx prisma generate
RUN npx tsc

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --skip-generate 2>&1 || true && node dist/server.js"]
