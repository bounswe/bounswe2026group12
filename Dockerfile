FROM nginx:alpine

WORKDIR /usr/share/nginx/html

COPY index.html ./
COPY app.js ./
COPY config.js ./
COPY handlers.js ./
COPY button-uygar.html ./
COPY button-uygar.js ./

EXPOSE 80
