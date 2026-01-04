FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json ./

RUN corepack enable && yarn

COPY src ./src
RUN yarn build

FROM node:24-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/dist ./dist

RUN corepack enable && yarn workspaces focus --production

CMD ["yarn", "start"]
