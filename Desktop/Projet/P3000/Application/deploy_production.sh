#!/bin/bash

# Script de déploiement P3000 Production
# Usage: ./deploy_production.sh  ou  p3000-deploy

set -e

# =============================================================================
# Configuration
# =============================================================================
PROJECT_DIR="/var/www/p3000/Desktop/Projet/P3000/Application"
VENV_PATH="/root/venv"
ENV_BACKUP_DIR="/root/p3000-env-backup"
PRODUCTION_ENV_FILE="$ENV_BACKUP_DIR/.env.production"

# Couleurs
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

log()         { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"; }
log_warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"; }
log_error()   { echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"; exit 1; }

# =============================================================================
# Activation du venv (toujours forcer le bon venv)
# =============================================================================
activate_venv() {
    source "$VENV_PATH/bin/activate"
    export DJANGO_SETTINGS_MODULE=Application.settings_production
    log "🐍 Venv activé : $VENV_PATH"
}

# =============================================================================
# Vérification des prérequis
# =============================================================================
check_prerequisites() {
    log "🔍 Vérification des prérequis P3000..."
    [ -d "$PROJECT_DIR" ] || log_error "Répertoire projet non trouvé : $PROJECT_DIR"
    [ -d "$VENV_PATH" ]   || log_error "Venv non trouvé : $VENV_PATH"
    mkdir -p "$ENV_BACKUP_DIR"
    log_ok "Prérequis OK"
}

# =============================================================================
# Sauvegarde de l'environnement de production
# =============================================================================
backup_env() {
    log "💾 Sauvegarde de l'environnement..."
    cd "$PROJECT_DIR"
    if [ ! -f "$PRODUCTION_ENV_FILE" ] && [ -f ".env" ]; then
        cp .env "$PRODUCTION_ENV_FILE"
        log_ok "Fichier .env.production créé"
    elif [ -f ".env" ]; then
        cp .env "$ENV_BACKUP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
        log_ok "Environnement sauvegardé"
    fi
}

# =============================================================================
# Mise à jour du code depuis Git (branche main uniquement)
# =============================================================================
deploy_code() {
    log "🚀 Mise à jour du code depuis Git (branche: main)..."
    cd "$PROJECT_DIR"
    find . -name "*.pyc" -delete 2>/dev/null || true
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    git fetch origin
    git checkout main
    git reset --hard origin/main
    local commit
    commit=$(git log --oneline -1)
    log_ok "Code synchronisé — $commit"
}

# =============================================================================
# Restauration du .env de production (après git reset qui peut l'écraser)
# =============================================================================
restore_env() {
    log "🔧 Restauration de l'environnement de production..."
    cd "$PROJECT_DIR"
    if [ -f "$PRODUCTION_ENV_FILE" ]; then
        cp "$PRODUCTION_ENV_FILE" .env
        log_ok "Environnement restauré"
    else
        log_error "Fichier $PRODUCTION_ENV_FILE non trouvé — créez-le d'abord"
    fi
}

# =============================================================================
# Mise à jour des dépendances Python
# =============================================================================
update_python_deps() {
    log "🐍 Mise à jour des dépendances Python..."
    cd "$PROJECT_DIR"
    activate_venv
    pip install -r requirements.txt -q
    log_ok "Dépendances Python à jour"
}

# =============================================================================
# Build du frontend React (webpack)
# Webpack écrit directement dans frontend/static/frontend/ — pas besoin de copier
# =============================================================================
build_frontend() {
    log "🎨 Build du frontend React..."
    cd "$PROJECT_DIR/frontend"

    npm install --silent
    npm run build

    # Vérifier que le build a produit les fichiers attendus
    if [ -z "$(ls -A static/frontend/*.js 2>/dev/null)" ]; then
        log_error "Aucun fichier JS trouvé dans frontend/static/frontend/ après le build"
    fi

    log_ok "Frontend buildé"
    cd "$PROJECT_DIR"
}

# =============================================================================
# Migrations Django, collectstatic, fichiers complémentaires
# =============================================================================
manage_django() {
    log "🗄️  Migrations et fichiers statiques..."
    cd "$PROJECT_DIR"
    activate_venv

    # Migrations
    python manage.py migrate --noinput

    # Créer les dossiers nécessaires avant collectstatic
    mkdir -p staticfiles/frontend

    # Collecte des fichiers statiques
    python manage.py collectstatic --noinput --clear

    # Copier les fichiers qui ne sont pas dans STATICFILES_DIRS
    # (frontend/static/ root n'est pas inclus dans les settings, seulement frontend/static/frontend/)
    for f in manifest.json manifest_rapports.json; do
        if [ -f "frontend/static/$f" ]; then
            cp -f "frontend/static/$f" "staticfiles/$f"
            log "   → staticfiles/$f copié"
        fi
    done

    # Copier les CSS client-spécifiques (couleurs, layout, etc.)
    if [ -d "frontend/static/css" ]; then
        mkdir -p staticfiles/css
        cp -rf frontend/static/css/. staticfiles/css/
        log "   → staticfiles/css/ synchronisé"
    fi

    # Permissions pour Nginx/Gunicorn
    chown -R www-data:www-data staticfiles/
    chmod -R 755 staticfiles/

    log_ok "Django configuré"
}

# =============================================================================
# Redémarrage des services
# =============================================================================
restart_services() {
    log "🔄 Redémarrage du service P3000..."
    systemctl restart gunicorn
    sleep 2
    if systemctl is-active --quiet gunicorn; then
        log_ok "Gunicorn actif"
    else
        log_error "Gunicorn n'a pas démarré — vérifiez : journalctl -u gunicorn -n 50"
    fi
    systemctl reload nginx && log_ok "Nginx rechargé"
}

# =============================================================================
# Vérification post-déploiement
# =============================================================================
post_check() {
    log "🔍 Vérification post-déploiement..."
    systemctl is-active --quiet gunicorn && log_ok "Service P3000 : actif" || log_warn "Service P3000 : inactif"
    systemctl is-active --quiet nginx    && log_ok "Nginx : actif"         || log_warn "Nginx : inactif"

    local http_code
    http_code=$(curl -sk -o /dev/null -w "%{http_code}" https://myp3000app.com/ 2>/dev/null || echo "000")
    if [[ "$http_code" =~ ^(200|301|302|400|403)$ ]]; then
        log_ok "Application accessible sur https://myp3000app.com (HTTP $http_code)"
    else
        log_warn "Application non accessible (HTTP $http_code) — vérifiez les logs"
    fi
}

# =============================================================================
# Main
# =============================================================================
main() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Déploiement P3000 — $(date '+%d/%m/%Y %H:%M')         ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
    echo ""

    check_prerequisites
    backup_env
    deploy_code
    restore_env
    update_python_deps
    build_frontend
    manage_django
    restart_services
    post_check

    echo ""
    log_ok "✅ Déploiement P3000 terminé avec succès !"
    echo -e "   🌐 https://myp3000app.com"
    echo -e "   📋 Logs : journalctl -u gunicorn -f"
    echo ""
}

main "$@"
