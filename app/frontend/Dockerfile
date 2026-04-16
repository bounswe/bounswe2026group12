# syntax=docker/dockerfile:1

# ---- Stage 1: build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG REACT_APP_API_URL=http://localhost
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
