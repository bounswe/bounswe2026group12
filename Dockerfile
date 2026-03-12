# ── Build stage ──────────────────────────────────────────────
# No build step needed — this is a plain HTML/JS app.
# We use the official nginx Alpine image to serve the static files.

FROM nginx:alpine

# Copy all static files into nginx's default serve directory
COPY . /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# nginx starts automatically — no CMD needed (inherited from base image)
