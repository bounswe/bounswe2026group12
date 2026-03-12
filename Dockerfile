FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY cagan.html /usr/share/nginx/html/cagan.html
COPY app.js      /usr/share/nginx/html/app.js
COPY config.js   /usr/share/nginx/html/config.js
COPY handlers.js /usr/share/nginx/html/handlers.js

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
