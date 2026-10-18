# Plain Node.js on Alpine Linux; the helper has no other dependencies.
# (Home Assistant passes BUILD_FROM for its own base images; this app doesn't need them.)
ARG BUILD_FROM
FROM node:24-alpine

WORKDIR /app
COPY package.json ./
COPY src/ ./src/

CMD ["node", "src/main.mjs"]
