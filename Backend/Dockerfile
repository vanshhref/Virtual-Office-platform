# Backend/Dockerfile
FROM node:20-slim AS builder

WORKDIR /app

ENV NODE_OPTIONS=--max-old-space-size=2048

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist
# SQLite database file will be created if not exists, but we might want to persist it
# COPY --from=builder /app/database.sqlite . 

EXPOSE 4000

CMD ["npm", "start"]
