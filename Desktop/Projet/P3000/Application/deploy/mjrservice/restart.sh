#!/usr/bin/env bash
# =============================================================================
# deploy/mjrservice/restart.sh — Redémarrage rapide MJRService (sans déploiement)
# =============================================================================
# Usage : bash restart.sh  |  mjrservice-restart

CLIENT_NAME="mjrservice"
DOMAIN="mjrserviceapp.com"
SERVICE="${CLIENT_NAME}"
APP_DIR="/var/www/${CLIENT_NAME}/Desktop/Projet/P3000/Application"
VENV_PATH="/var/www/${CLIENT_NAME}/venv"

echo "🔄 Redémarrage rapide ${CLIENT_NAME}..."
echo "   Répertoire : ${APP_DIR}"
echo "   Service    : ${SERVICE}"
echo ""

cd "$APP_DIR"
source "${VENV_PATH}/bin/activate"

systemctl stop  "${SERVICE}" 2>/dev/null && echo "   ⏹  Service arrêté" || echo "   ℹ️  Service déjà arrêté"
sleep 2
systemctl start "${SERVICE}"

if systemctl is-active --quiet "${SERVICE}"; then
    echo "   ✅ Service ${SERVICE} redémarré"
else
    echo "   ❌ Échec du démarrage — logs :"
    journalctl -u "${SERVICE}" --no-pager -n 20
    exit 1
fi

systemctl reload nginx 2>/dev/null && echo "   ✅ Nginx rechargé" || true

echo ""
echo "   🌐 https://${DOMAIN}"
echo "   📋 Logs en direct : journalctl -u ${SERVICE} -f"
echo ""
