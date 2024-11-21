FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
ENV TZ=Asia/Ho_Chi_Minh

CMD ["node", "src/index.js"]
