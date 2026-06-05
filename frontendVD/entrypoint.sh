#!/bin/sh
export PORT=${PORT:-80}
# Reemplaza API URL en los archivos JS del build
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|VITE_API_URL_PLACEHOLDER|${API_URL}|g" {} \;
# Reemplaza el puerto en nginx.conf
sed -i "s/listen \${PORT}/listen ${PORT}/g" /etc/nginx/conf.d/default.conf
sed -i "s/listen 80/listen ${PORT}/g" /etc/nginx/conf.d/default.conf
nginx -g "daemon off;"
