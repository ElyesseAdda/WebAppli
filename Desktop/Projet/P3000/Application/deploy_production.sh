#!/bin/bash

# Script de déploiement robuste pour P3000 Production
# Usage: ./deploy_production.sh ou p3000-deploy
# Auteur: Assistant IA
# Version: 2.0

set -e  # Arrêter le script en cas d'erreur

# Configuration
PROJECT_DIR="/var/www/p3000/Desktop/Projet/P3000/Application"
VENV_PATH="/root/venv"
ENV_BACKUP_DIR="/root/p3000-env-backup"
PRODUCTION_ENV_FILE="$ENV_BACKUP_DIR/.env.production"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Fonction de vérification des prérequis
check_prerequisites() {
    log "🔍 Vérification des prérequis..."
    
    # Vérifier que nous sommes sur le serveur de production
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "Répertoire du projet non trouvé: $PROJECT_DIR"
        exit 1
    fi
    
    # Vérifier l'environnement virtuel
    if [ ! -d "$VENV_PATH" ]; then
        log_error "Environnement virtuel non trouvé: $VENV_PATH"
        exit 1
    fi
    
    # Créer le répertoire de sauvegarde des env s'il n'existe pas
    mkdir -p "$ENV_BACKUP_DIR"
    
    log_success "Prérequis vérifiés"
}

# Fonction de sauvegarde de l'environnement de production
backup_production_env() {
    log "💾 Sauvegarde de l'environnement de production..."
    
    cd "$PROJECT_DIR"
    
    # Si c'est la première fois, créer le fichier de production
    if [ ! -f "$PRODUCTION_ENV_FILE" ] && [ -f ".env" ]; then
        log "📄 Première sauvegarde - création du fichier de production permanent"
        cp .env "$PRODUCTION_ENV_FILE"
        log_success "Fichier d'environnement de production créé: $PRODUCTION_ENV_FILE"
    elif [ -f ".env" ]; then
        # Sauvegarder la version actuelle avec timestamp
        cp .env "$ENV_BACKUP_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
        log_success "Environnement sauvegardé avec timestamp"
    fi
}

# Fonction de déploiement du code
deploy_code() {
    log "🚀 Déploiement du code depuis Git..."
    
    cd "$PROJECT_DIR"
    
    # Nettoyer les fichiers temporaires
    log "🧹 Nettoyage des fichiers temporaires..."
    find . -name "*.pyc" -delete 2>/dev/null || true
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Récupérer les dernières modifications
    log "📡 Récupération des dernières modifications..."
    git fetch origin
    
    # Vérifier s'il y a des modifications locales non commitées
    if ! git diff-index --quiet HEAD --; then
        log_warning "Modifications locales détectées, elles seront perdues"
    fi
    
    # Reset hard vers la dernière version de main
    log "🔄 Synchronisation forcée avec origin/main..."
    git reset --hard origin/main
    
    # Vérifier que nous sommes bien sur la dernière version
    LOCAL_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse origin/main)
    
    if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
        log_success "Code synchronisé avec la dernière version de main ($LOCAL_COMMIT)"
    else
        log_error "Échec de la synchronisation avec origin/main"
        exit 1
    fi
}

# Fonction de restauration de l'environnement
restore_production_env() {
    log "🔧 Restauration de l'environnement de production..."
    
    cd "$PROJECT_DIR"
    
    if [ -f "$PRODUCTION_ENV_FILE" ]; then
        cp "$PRODUCTION_ENV_FILE" .env
        log_success "Environnement de production restauré"
    else
        log_error "Fichier d'environnement de production non trouvé: $PRODUCTION_ENV_FILE"
        log_error "Veuillez créer manuellement le fichier .env avec les bonnes variables de production"
        exit 1
    fi
}

# Fonction de mise à jour des dépendances
update_dependencies() {
    log "📦 Mise à jour des dépendances Python..."
    
    cd "$PROJECT_DIR"
    source "$VENV_PATH/bin/activate"
    
    pip install --upgrade pip
    pip install -r requirements.txt
    
    log_success "Dépendances Python mises à jour"
}

# Fonction de build du frontend
build_frontend() {
    log "🎨 Build du frontend..."
    
    cd "$PROJECT_DIR/frontend"
    
    # Installer les dépendances Node.js (y compris dev pour le build)
    npm install
    
    # Build de production
    npm run build
    
    cd "$PROJECT_DIR"
    log_success "Frontend buildé avec succès"
}

# Fonction de gestion de Django
manage_django() {
    log "🗄️ Gestion Django..."
    
    cd "$PROJECT_DIR"
    source "$VENV_PATH/bin/activate"
    
    # Collecter les fichiers statiques
    log "📁 Collecte des fichiers statiques..."
    python manage.py collectstatic --noinput
    
    # Appliquer les migrations
    log "🗄️ Application des migrations..."
    python manage.py migrate
    
    log_success "Gestion Django terminée"
}

# Fonction de redémarrage des services
restart_services() {
    log "🔄 Redémarrage des services..."
    
    # Arrêter Gunicorn
    log "🛑 Arrêt de Gunicorn..."
    systemctl stop gunicorn || log_warning "Gunicorn était déjà arrêté"
    
    # Attendre un peu
    sleep 2
    
    # Démarrer Gunicorn
    log "🚀 Démarrage de Gunicorn..."
    systemctl start gunicorn
    
    # Vérifier le statut
    if systemctl is-active --quiet gunicorn; then
        log_success "Gunicorn redémarré avec succès"
    else
        log_error "Échec du redémarrage de Gunicorn"
        systemctl status gunicorn --no-pager
        exit 1
    fi
    
    # Redémarrer Nginx si nécessaire
    log "🔄 Rechargement de Nginx..."
    systemctl reload nginx || log_warning "Nginx non rechargé"
}

# Fonction de vérification post-déploiement
post_deployment_check() {
    log "🔍 Vérification post-déploiement..."
    
    # Vérifier les services
    if systemctl is-active --quiet gunicorn; then
        log_success "✅ Gunicorn est actif"
    else
        log_error "❌ Gunicorn n'est pas actif"
    fi
    
    if systemctl is-active --quiet nginx; then
        log_success "✅ Nginx est actif"
    else
        log_warning "⚠️ Nginx n'est pas actif"
    fi
    
    # Afficher les logs récents en cas de problème
    log "📊 Statut des services:"
    systemctl status gunicorn --no-pager -l
    
    log_success "🌐 Application disponible sur: https://myp3000app.com"
}

# Fonction principale
main() {
    log "🚀 Début du déploiement P3000 Production v2.0"
    
    # Donner les permissions d'exécution à ce script
    chmod +x "$0"
    
    # Étapes du déploiement
    check_prerequisites
    backup_production_env
    deploy_code
    restore_production_env
    update_dependencies
    build_frontend
    manage_django
    restart_services
    post_deployment_check
    
    log_success "✅ Déploiement terminé avec succès!"
    log "📝 Logs disponibles dans les journaux système (journalctl -u gunicorn)"
}

# Gestion des erreurs
trap 'log_error "Erreur détectée à la ligne $LINENO. Arrêt du déploiement."; exit 1' ERR

# Exécution du script principal
main "$@"
