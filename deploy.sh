#!/bin/bash
set -e

echo "=== Variedades Danni — Deploy a Railway ==="

echo ""
echo "→ Verificando Railway CLI..."
railway version

echo ""
echo "→ Iniciando deploy..."
railway up --file docker-compose.railway.yml --detach

echo ""
echo "→ Mostrando logs de la API (Ctrl+C para salir)..."
sleep 5
railway logs --service api

echo ""
echo "✓ Deploy completado"
echo "  Revisa el dashboard: https://railway.app/dashboard"
