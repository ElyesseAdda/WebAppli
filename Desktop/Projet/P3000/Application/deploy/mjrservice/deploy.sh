#!/usr/bin/env bash
# =============================================================================
# deploy/mjrservice/deploy.sh — Déploiement complet MJRService
# =============================================================================
# À exécuter sur le SERVEUR MJRSERVICE en tant que root ou sudo
#
# Usage :
#   bash /var/www/mjrservice/Desktop/Projet/P3000/Application/deploy/mjrservice/deploy.sh
#   ou via alias :
#   mjrservice-deploy
# =============================================================================

set -e

# --- Configuration ---
CLIENT_NAME="mjrservice"
DOMAIN="mjrserviceapp.com"
PROJECT_DIR="/var/www/${CLIENT_NAME}"
APP_DIR="${PROJECT_DIR}/Desktop/Projet/P3000/Application"
VENV_PATH="${PROJECT_DIR}/venv"
BRANCH="client/${CLIENT_NAME}"
SERVICE="${CLIENT_NAME}"
ENV_BACKUP_DIR="/root/${CLIENT_NAME}-env-backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# --- Couleurs ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()         { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"; }
log_warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"; }
log_error()   { echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"; exit 1; }

activate_venv() {
    # Toujours activer le venv du client (même si un autre est déjà actif)
    source "${VENV_PATH}/bin/activate"
}

# --- 1. Vérifications ---
check_prerequisites() {
    log "🔍 Vérification des prérequis ${CLIENT_NAME}..."
    [ ! -d "$APP_DIR" ]   && log_error "Répertoire introuvable : $APP_DIR"
    [ ! -d "$VENV_PATH" ] && log_error "Environnement virtuel introuvable : $VENV_PATH"
    mkdir -p "$ENV_BACKUP_DIR"
    log_ok "Prérequis OK"
}

# --- 2. Sauvegarde .env ---
backup_env() {
    log "💾 Sauvegarde de l'environnement..."
    cd "$APP_DIR"
    if [ -f ".env" ]; then
        cp ".env" "${ENV_BACKUP_DIR}/.env.backup.${TIMESTAMP}"
        [ ! -f "${ENV_BACKUP_DIR}/.env.production" ] && cp ".env" "${ENV_BACKUP_DIR}/.env.production"
        log_ok "Environnement sauvegardé"
    fi
}

# --- 3. Mise à jour du code ---
deploy_code() {
    log "🚀 Mise à jour du code depuis Git (branche: ${BRANCH})..."
    cd "$APP_DIR"
    find . -name "*.pyc" -delete 2>/dev/null || true
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    git fetch origin
    git checkout "$BRANCH"
    git reset --hard "origin/${BRANCH}"
    log_ok "Code synchronisé — $(git log --oneline -1)"
}

# --- 4. Restauration .env ---
restore_env() {
    log "🔧 Restauration de l'environnement de production..."
    cd "$APP_DIR"
    if [ -f "${ENV_BACKUP_DIR}/.env.production" ]; then
        cp "${ENV_BACKUP_DIR}/.env.production" .env
        log_ok "Environnement restauré"
    else
        log_error "Fichier .env.production introuvable dans ${ENV_BACKUP_DIR}"
    fi
}

# --- 5. Dépendances Python ---
update_python_deps() {
    log "🐍 Mise à jour des dépendances Python..."
    cd "$APP_DIR"
    activate_venv
    pip install --upgrade pip -q
    pip install -r requirements.txt -q
    log_ok "Dépendances Python à jour"
}

# --- 6. Build frontend React ---
build_frontend() {
    log "🎨 Build du frontend React..."
    cd "${APP_DIR}/frontend"
    npm install --silent
    npm run build
    log_ok "Frontend buildé"
}

# --- 7. Django : migrate + collectstatic ---
manage_django() {
    log "🗄️  Migrations et fichiers statiques..."
    cd "$APP_DIR"
    activate_venv
    export DJANGO_SETTINGS_MODULE=Application.settings_production

    mkdir -p staticfiles/frontend
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput --clear

    sudo chown -R www-data:www-data staticfiles/
    chmod -R 755 staticfiles/
    log_ok "Django configuré"
}

# --- 8. Redémarrage du service ---
restart_service() {
    log "🔄 Redémarrage du service ${SERVICE}..."
    systemctl stop  "${SERVICE}" 2>/dev/null || log_warn "Service déjà arrêté"
    sleep 2
    systemctl start "${SERVICE}"
    sleep 2

    if systemctl is-active --quiet "${SERVICE}"; then
        log_ok "Service ${SERVICE} actif"
    else
        log_error "Le service ${SERVICE} n'a pas démarré — vérifiez : journalctl -u ${SERVICE} -n 50"
    fi

    systemctl reload nginx 2>/dev/null || systemctl restart nginx
    log_ok "Nginx rechargé"
}

# --- 9. Vérification post-déploiement ---
post_check() {
    log "🔍 Vérification post-déploiement..."
    systemctl is-active --quiet "${SERVICE}" && log_ok "Service ${SERVICE} : actif" \
        || log_warn "Service ${SERVICE} : INACTIF"
    systemctl is-active --quiet nginx && log_ok "Nginx : actif" \
        || log_warn "Nginx : INACTIF"
    curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" | grep -q "200" \
        && log_ok "Application accessible sur https://${DOMAIN}" \
        || log_warn "Application non accessible sur https://${DOMAIN} — vérifiez les logs"
}

# --- Rollback en cas d'erreur ---
rollback() {
    echo -e "${RED}[ERREUR] Rollback en cours...${NC}"
    cd "$APP_DIR" 2>/dev/null || true
    if [ -f "${ENV_BACKUP_DIR}/.env.backup.${TIMESTAMP}" ]; then
        cp "${ENV_BACKUP_DIR}/.env.backup.${TIMESTAMP}" .env
        log_warn "Environnement restauré depuis la sauvegarde"
    fi
    systemctl restart "${SERVICE}" 2>/dev/null || true
    exit 1
}
trap rollback ERR

# --- Main ---
echo ""
echo -e "\033[1m\033[36m╔══════════════════════════════════════════════════╗"
echo -e "║  Déploiement ${CLIENT_NAME} — $(date '+%d/%m/%Y %H:%M')      ║"
echo -e "╚══════════════════════════════════════════════════╝\033[0m"
echo ""

check_prerequisites
backup_env
deploy_code
restore_env
update_python_deps
build_frontend
manage_django
restart_service
post_check

echo ""
log_ok "✅ Déploiement ${CLIENT_NAME} terminé avec succès !"
echo -e "   🌐 ${DOMAIN}"
echo -e "   📋 Logs : journalctl -u ${SERVICE} -f"
echo ""
