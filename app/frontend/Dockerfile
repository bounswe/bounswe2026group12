# syntax=docker/dockerfile:1

# ---- Stage 1: build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
# react-simple-maps@3 declares its peer as react 16/17/18 only, but runs
# fine against react 19 (the wrapper only uses refs + useState). Use
# --legacy-peer-deps so `npm ci` doesn't reject the resolved tree.
RUN npm ci --legacy-peer-deps

COPY . .

ARG REACT_APP_API_URL=http://localhost
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ARG REACT_APP_USE_MOCK=false
ENV REACT_APP_USE_MOCK=$REACT_APP_USE_MOCK
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
