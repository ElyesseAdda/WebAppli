#!/usr/bin/env bash
# =============================================================================
# setup_aliases.sh — Configure les alias sur le serveur P3000
# =============================================================================
# À exécuter UNE SEULE FOIS après installation sur le serveur P3000.
# Usage : bash setup_aliases.sh
# =============================================================================

CLIENT_NAME="p3000"
DOMAIN="myp3000app.com"
APP_DIR="/var/www/p3000/Desktop/Projet/P3000/Application"
VENV_PATH="/root/venv"
SERVICE="gunicorn"
BASHRC="$HOME/.bashrc"

echo ""
echo "🔧 Configuration des alias ${CLIENT_NAME}..."
echo ""

# Rendre les scripts exécutables
chmod +x "${APP_DIR}/deploy_production.sh" 2>/dev/null || true
chmod +x "${APP_DIR}/restart_app.sh"       2>/dev/null || true

# Bloc d'aliases
ALIASES_BLOCK="
# ─── Aliases ${CLIENT_NAME} (auto-générés) ───────────────────────────────────

# Aller dans le projet + activer le venv
function ${CLIENT_NAME}-go() {
    cd \"${APP_DIR}\"
    source \"${VENV_PATH}/bin/activate\"
    export DJANGO_SETTINGS_MODULE=Application.settings_production
    echo \"✅ Environnement ${CLIENT_NAME} activé\"
    echo \"📁 \$(pwd)\"
    echo \"🐍 Python : \$(python --version)\"
}

# Déploiement complet P3000 uniquement
alias ${CLIENT_NAME}-deploy='bash ${APP_DIR}/deploy_production.sh'

# Déploiement de TOUTES les applications (P3000 + Elekable + MJRService)
alias all-deploy='bash ${APP_DIR}/deploy/deploy-all.sh'

# Redémarrage rapide
alias ${CLIENT_NAME}-restart='bash ${APP_DIR}/restart_app.sh'

# Logs en direct
alias ${CLIENT_NAME}-logs='journalctl -u ${SERVICE} -f --no-pager'

# Logs des 50 dernières lignes
alias ${CLIENT_NAME}-logs-tail='journalctl -u ${SERVICE} -n 50 --no-pager'

# Statut du service
alias ${CLIENT_NAME}-status='systemctl status ${SERVICE} --no-pager'

# Manage.py rapide (depuis n'importe où)
alias ${CLIENT_NAME}-manage='cd ${APP_DIR} && source ${VENV_PATH}/bin/activate && DJANGO_SETTINGS_MODULE=Application.settings_production python manage.py'

# ─────────────────────────────────────────────────────────────────────────────
"

# Injection dans .bashrc (évite les doublons)
if grep -q "Aliases ${CLIENT_NAME}" "$BASHRC" 2>/dev/null; then
    echo "   ℹ️  Aliases ${CLIENT_NAME} déjà présents — mise à jour..."
    sed -i "/# ─── Aliases ${CLIENT_NAME}/,/# ───────────────/d" "$BASHRC" 2>/dev/null || true
fi

echo "$ALIASES_BLOCK" >> "$BASHRC"
echo "   ✅ Aliases ajoutés dans $BASHRC"

source "$BASHRC" 2>/dev/null || true

echo ""
echo "✅ Configuration terminée ! Commandes disponibles :"
echo ""
echo "   ${CLIENT_NAME}-go          → cd ${APP_DIR} + activer venv"
echo "   ${CLIENT_NAME}-deploy      → Déploiement complet"
echo "   ${CLIENT_NAME}-restart     → Redémarrage rapide"
echo "   ${CLIENT_NAME}-logs        → Logs en direct"
echo "   ${CLIENT_NAME}-logs-tail   → 50 derniers logs"
echo "   ${CLIENT_NAME}-status      → Statut du service"
echo "   ${CLIENT_NAME}-manage <cmd>→ python manage.py <cmd>"
echo ""
echo "   ⚠️  Pour que 'p3000-go' fonctionne dans votre shell actuel :"
echo "   source ~/.bashrc"
echo ""
