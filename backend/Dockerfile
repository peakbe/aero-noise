FROM node:18

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY . .
EXPOSE 3000

CMD ["node", "server.js"]
# rebuild-2026-08-19
