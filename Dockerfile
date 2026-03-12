# Simple Dockerfile to build and serve the static app
FROM nginx:alpine

# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy app files into nginx root
COPY index.html button1-api-page.html app.js config.js handlers.js /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# nginx runs in foreground by default in alpine image
CMD ["nginx", "-g", "daemon off;"]
