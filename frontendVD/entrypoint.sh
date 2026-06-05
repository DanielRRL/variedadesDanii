#!/bin/sh
export PORT=${PORT:-80}
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|__VITE_GOOGLE_CLIENT_ID__|${VITE_GOOGLE_CLIENT_ID:-}|g" {} \;
sed -i "s/NGINX_PORT/${PORT}/g" /etc/nginx/conf.d/default.conf
nginx -g "daemon off;"
