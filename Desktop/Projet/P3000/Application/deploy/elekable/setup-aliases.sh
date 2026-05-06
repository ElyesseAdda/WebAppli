#!/usr/bin/env bash
# =============================================================================
# deploy/elekable/setup-aliases.sh — Configure les alias sur le serveur Elekable
# =============================================================================
# À exécuter UNE SEULE FOIS sur le serveur Elekable après installation.
# Usage : bash setup-aliases.sh
# =============================================================================

CLIENT_NAME="elekable"
DOMAIN="elekable.fr"
PROJECT_DIR="/var/www/${CLIENT_NAME}"
APP_DIR="${PROJECT_DIR}/Desktop/Projet/P3000/Application"
VENV_PATH="${PROJECT_DIR}/venv"
SERVICE="${CLIENT_NAME}"
DEPLOY_SCRIPT="${APP_DIR}/deploy/elekable/deploy.sh"
RESTART_SCRIPT="${APP_DIR}/deploy/elekable/restart.sh"
BASHRC="$HOME/.bashrc"

echo ""
echo "🔧 Configuration des alias ${CLIENT_NAME}..."
echo ""

# Rendre les scripts exécutables
chmod +x "$DEPLOY_SCRIPT"  2>/dev/null || true
chmod +x "$RESTART_SCRIPT" 2>/dev/null || true

# Bloc d'aliases à injecter
ALIASES_BLOCK="
# ─── Aliases ${CLIENT_NAME} (auto-générés) ───────────────────────────────────

# Aller dans le projet + activer le venv (à utiliser avec 'source' ou '. ')
function ${CLIENT_NAME}-go() {
    cd \"${APP_DIR}\"
    source \"${VENV_PATH}/bin/activate\"
    export DJANGO_SETTINGS_MODULE=Application.settings_production
    echo \"✅ Environnement ${CLIENT_NAME} activé\"
    echo \"📁 \$(pwd)\"
    echo \"🐍 Python : \$(python --version)\"
}

# Déploiement complet (git pull + build + migrate + restart)
alias ${CLIENT_NAME}-deploy='bash ${DEPLOY_SCRIPT}'

# Redémarrage rapide (sans git pull ni build)
alias ${CLIENT_NAME}-restart='bash ${RESTART_SCRIPT}'

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
    echo "   ℹ️  Aliases ${CLIENT_NAME} déjà présents dans $BASHRC — mise à jour..."
    # Supprimer l'ancien bloc
    sed -i "/# ─── Aliases ${CLIENT_NAME}/,/# ───────────────/d" "$BASHRC" 2>/dev/null || true
fi

echo "$ALIASES_BLOCK" >> "$BASHRC"
echo "   ✅ Aliases ajoutés dans $BASHRC"

# Recharger le bashrc
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
echo "   ⚠️  Pour que 'elekable-go' fonctionne dans votre shell actuel :"
echo "   source ~/.bashrc"
echo ""
