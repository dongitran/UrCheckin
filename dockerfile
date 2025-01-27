FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
ENV TZ=Asia/Ho_Chi_Minh

CMD ["/bin/sh", "-c", ". /vault/secrets/env-config && node src/index.js"]