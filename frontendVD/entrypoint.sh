#!/bin/sh
set -e
export PORT=${PORT:-80}
if [ -n "$API_URL" ]; then
  find /usr/share/nginx/html -name "*.js" -exec sed -i "s|__VITE_API_URL__|${API_URL}|g" {} \;
fi
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf > /tmp/default.conf
mv /tmp/default.conf /etc/nginx/conf.d/default.conf
exec nginx -g "daemon off;"
