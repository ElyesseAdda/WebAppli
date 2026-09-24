#!/bin/bash

# =============================================================================
# Script de déploiement pour les clients P3000
# =============================================================================
# Usage: ./deploy-client.sh <client_name>
# Exemple: ./deploy-client.sh elekable
#
# Ce script déploie les mises à jour pour un client spécifique.
# Le client P3000 original utilise son propre script deploy_production.sh
# =============================================================================

set -e

# Vérification des arguments
if [ -z "$1" ]; then
    echo "❌ Usage: $0 <client_name>"
    echo "   Exemple: $0 elekable"
    exit 1
fi

CLIENT_NAME="$1"
PROJECT_DIR="/var/www/${CLIENT_NAME}"
VENV_PATH="${PROJECT_DIR}/venv"
BRANCH="client/${CLIENT_NAME}"
ENV_BACKUP_DIR="/root/${CLIENT_NAME}-env-backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"; }
log_error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"; }

# Fonction pour activer l'environnement virtuel
activate_venv() {
    if [ -z "$VIRTUAL_ENV" ]; then
        source "$VENV_PATH/bin/activate"
        log "🐍 Environnement virtuel activé"
    fi
}

# Vérification des prérequis
check_prerequisites() {
    log "🔍 Vérification des prérequis pour ${CLIENT_NAME}..."
    
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "Répertoire du projet non trouvé: $PROJECT_DIR"
        exit 1
    fi
    
    if [ ! -d "$VENV_PATH" ]; then
        log_error "Environnement virtuel non trouvé: $VENV_PATH"
        exit 1
    fi
    
    mkdir -p "$ENV_BACKUP_DIR"
    log_success "Prérequis vérifiés"
}

# Sauvegarde de l'environnement
backup_env() {
    log "💾 Sauvegarde de l'environnement..."
    
    cd "$PROJECT_DIR/Desktop/Projet/P3000/Application"
    
    if [ -f ".env" ]; then
        cp .env "$ENV_BACKUP_DIR/.env.backup.${TIMESTAMP}"
        if [ ! -f "$ENV_BACKUP_DIR/.env.production" ]; then
            cp .env "$ENV_BACKUP_DIR/.env.production"
        fi
        log_success "Environnement sauvegardé"
    fi
}

# Déploiement du code
deploy_code() {
    log "🚀 Déploiement du code depuis Git (branche: ${BRANCH})..."
    
    cd "$PROJECT_DIR/Desktop/Projet/P3000/Application"
    
    # Nettoyage
    find . -name "*.pyc" -delete 2>/dev/null || true
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Récupération et synchronisation
    git fetch origin
    git checkout "$BRANCH"
    git reset --hard "origin/${BRANCH}"
    
    log_success "Code synchronisé avec ${BRANCH}"
}

# Restauration de l'environnement
restore_env() {
    log "🔧 Restauration de l'environnement de production..."
    
    cd "$PROJECT_DIR/Desktop/Projet/P3000/Application"
    
    if [ -f "$ENV_BACKUP_DIR/.env.production" ]; then
        cp "$ENV_BACKUP_DIR/.env.production" .env
        log_success "Environnement restauré"
    else
        log_error "Fichier .env.production non trouvé"
        exit 1
    fi
}

# Mise à jour des dépendances
update_dependencies() {
    log "📦 Mise à jour des dépendances..."
    
    cd "$PROJECT_DIR/Desktop/Projet/P3000/Application"
    activate_venv
    
    pip install --upgrade pip
    pip install -r requirements.txt
    
    log_success "Dépendances Python mises à jour"
}

# Installation de Google Chrome (non-snap) pour Puppeteer
install_chromium() {
    log "🌐 Vérification du navigateur pour la génération PDF..."
    
    # Vérifier si Google Chrome est installé (non-snap, compatible www-data)
    if command -v google-chrome-stable &> /dev/null; then
        log_success "Google Chrome déjà installé: $(google-chrome-stable --version 2>/dev/null)"
        return
    fi
    
    # Vérifier si un chromium non-snap est disponible
    for bin in chromium-browser chromium; do
        if command -v "$bin" &> /dev/null; then
            if ! "$bin" --version 2>&1 | grep -qi "snap"; then
                log_success "$bin (non-snap) déjà installé"
                return
            else
                log_warning "$bin est installé via snap (incompatible avec www-data/Gunicorn)"
            fi
        fi
    done
    
    # Installer Google Chrome .deb (pas snap, fonctionne avec www-data)
    log "🔧 Installation de Google Chrome (compatible Gunicorn/www-data)..."
    wget -q -O /tmp/google-chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    apt-get install -y /tmp/google-chrome.deb || true
    rm -f /tmp/google-chrome.deb
    
    # Installer les dépendances de polices
    apt-get install -y --no-install-recommends \
        fonts-liberation fonts-noto-color-emoji 2>/dev/null || true
    
    if command -v google-chrome-stable &> /dev/null; then
        log_success "Google Chrome installé: $(google-chrome-stable --version 2>/dev/null)"
    else
        log_error "Échec de l'installation de Google Chrome"
    fi
}

# Build du frontend
build_frontend() {
    log "🎨 Build du frontend..."
    
    cd "$PROJECT_DIR/Desktop/Projet/P3000/Application/frontend"
    
    PUPPETEER_SKIP_DOWNLOAD=true npm install
    npm run build
    
    log_success "Frontend buildé"
}

# Gestion Django
manage_django() {
    log "🗄️ Gestion Django..."
    
    cd "$PROJECT_DIR/Desktop/Projet/P3000/Application"
    activate_venv
    
    mkdir -p staticfiles/frontend
    
    export DJANGO_SETTINGS_MODULE=Application.settings_production
    python manage.py collectstatic --noinput --clear
    python manage.py migrate
    
    # Permissions
    sudo chown -R www-data:www-data staticfiles/
    chmod -R 755 staticfiles/
    
    log_success "Django configuré"
}

# Redémarrage des services
restart_services() {
    log "🔄 Redémarrage des services..."
    
    systemctl stop "${CLIENT_NAME}" || log_warning "Service ${CLIENT_NAME} était déjà arrêté"
    sleep 2
    systemctl start "${CLIENT_NAME}"
    
    if systemctl is-active --quiet "${CLIENT_NAME}"; then
        log_success "Service ${CLIENT_NAME} redémarré"
    else
        log_error "Échec du redémarrage de ${CLIENT_NAME}"
        systemctl status "${CLIENT_NAME}" --no-pager
        exit 1
    fi
    
    systemctl reload nginx
    log_success "Nginx rechargé"
}

# Vérification post-déploiement
post_check() {
    log "🔍 Vérification post-déploiement..."
    
    if systemctl is-active --quiet "${CLIENT_NAME}"; then
        log_success "✅ Service ${CLIENT_NAME} actif"
    else
        log_error "❌ Service ${CLIENT_NAME} inactif"
    fi
    
    if systemctl is-active --quiet nginx; then
        log_success "✅ Nginx actif"
    else
        log_warning "⚠️ Nginx inactif"
    fi
}

# Fonction principale
main() {
    log "🚀 Début du déploiement pour ${CLIENT_NAME}"
    
    check_prerequisites
    backup_env
    deploy_code
    restore_env
    update_dependencies
    install_chromium
    build_frontend
    manage_django
    restart_services
    post_check
    
    log_success "✅ Déploiement terminé pour ${CLIENT_NAME}!"
}

# Gestion des erreurs
trap 'log_error "Erreur détectée, vérifiez les logs"; exit 1' ERR

main "$@"
