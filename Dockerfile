FROM node:20-alpine

WORKDIR /app

COPY package.json .

RUN yarn install

COPY . .

RUN yarn build

EXPOSE 8080

CMD yarn migration && node dist/main
