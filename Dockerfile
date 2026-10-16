# ビルド
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite はビルド時に環境変数を埋め込むので build-arg で渡す
ARG VITE_RAILS_URL
ARG VITE_GO_URL
ARG VITE_WS_URL
ENV VITE_RAILS_URL=$VITE_RAILS_URL \
    VITE_GO_URL=$VITE_GO_URL \
    VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# 配信（Cloud Run は 8080 番で待ち受ける）
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
