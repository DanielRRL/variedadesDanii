#!/bin/sh
export PORT=${PORT:-80}
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|VITE_API_URL_PLACEHOLDER|${API_URL}|g" {} \;
sed -i "s/NGINX_PORT/${PORT}/g" /etc/nginx/conf.d/default.conf
nginx -g "daemon off;"
