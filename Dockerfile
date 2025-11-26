###############################
# 1) Builder stage
###############################

FROM node:24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

###############################
# 2) Runtime stage
###############################

FROM node:24-alpine AS runtime

WORKDIR /app

COPY --from=builder /app /app

ENV DATA_DIR=/data
RUN mkdir -p /data

ENV WEB_PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start-all"]
