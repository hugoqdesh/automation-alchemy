FROM node:22-alpine

WORKDIR /app
ARG GIT_SHA=development
ENV APP_VERSION=$GIT_SHA
COPY --chown=node:node server.js .

USER node
EXPOSE 3000
CMD ["node", "server.js"]
