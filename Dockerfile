FROM nginx:alpine
<<<<<<< feature/stub-app-ahmetakdag-button
COPY . /usr/share/nginx/html
EXPOSE 80
=======

COPY index.html  /usr/share/nginx/html/index.html
COPY joke.html   /usr/share/nginx/html/joke.html
COPY app.js      /usr/share/nginx/html/app.js
COPY config.js   /usr/share/nginx/html/config.js
COPY handlers.js /usr/share/nginx/html/handlers.js

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
>>>>>>> feature/stub-app
