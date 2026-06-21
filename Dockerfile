# ─────────────────────────────────────────────────────────────────────────────
# EcoByte — Multi-Stage Dockerfile
#
# Stage 1 (builder): Node 20 Alpine — installs dependencies, runs Vite build.
# Stage 2 (runner):  Nginx 1.27 Alpine — serves /dist as static assets.
#
# Security:
#   • No secrets, keys, or environment files are embedded at any stage.
#   • Final image contains ONLY compiled static HTML/CSS/JS + Nginx binaries.
#   • Nginx server_tokens off hides version; security headers added in nginx.conf.
#   • Non-root file ownership enforced on /usr/share/nginx/html.
#
# Cloud Run compatibility:
#   • Listens on $PORT (injected by Cloud Run at runtime, default 8080).
#   • docker-entrypoint.sh performs envsubst on $PORT before Nginx starts.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching.
# node_modules are reinstalled only when package*.json changes.
COPY package.json package-lock.json ./

# Install exact locked versions; skip dev scripts; do not audit (CI flag).
RUN npm ci --prefer-offline --ignore-scripts

# Copy the full source tree (respects .dockerignore to exclude node_modules,
# .git, dist, and any local secrets).
COPY . .

# Compile the production Vite bundle into /app/dist.
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove the default Nginx placeholder config so ours is the only one loaded.
RUN rm -rf /etc/nginx/conf.d/*

# Copy our PORT-aware Nginx config template.
# docker-entrypoint.sh substitutes ${PORT} before Nginx starts.
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# Copy the custom entrypoint that performs envsubst on ${PORT}.
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy the compiled static assets from Stage 1.
COPY --from=builder /app/dist /usr/share/nginx/html

# Harden file ownership — serve as nginx user, not root.
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

# Cloud Run injects $PORT; document the default.
EXPOSE 8080

# Start: inject $PORT into nginx config, then launch Nginx in the foreground.
ENTRYPOINT ["/docker-entrypoint.sh"]
