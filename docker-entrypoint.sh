#!/bin/sh
# docker-entrypoint.sh
#
# PURPOSE:
#   Google Cloud Run injects a $PORT environment variable at container start.
#   Nginx does not natively read environment variables in its config files.
#   This script uses envsubst to substitute ONLY ${PORT} into the Nginx
#   config template before handing off to Nginx.
#
# SECURITY NOTE:
#   We pass '${PORT}' explicitly to envsubst so it ONLY replaces that one
#   variable. Without this restriction, envsubst would also replace nginx
#   config variables like $uri, $request_uri, $host, etc., breaking routing.
#
# Usage: set as ENTRYPOINT in Dockerfile — do not invoke directly.

set -e

# Default to 8080 if Cloud Run doesn't set $PORT (local Docker testing).
PORT="${PORT:-8080}"
export PORT

echo "[entrypoint] Substituting PORT=${PORT} into Nginx config..."
envsubst '${PORT}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "[entrypoint] Nginx config written. Starting Nginx..."
exec nginx -g 'daemon off;'
