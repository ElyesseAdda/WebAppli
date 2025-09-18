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
STATIC_BACKUP_DIR="/var/backups/p3000-static"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_${TIMESTAMP}"

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

# Fonction pour activer l'environnement virtuel
activate_venv() {
    if [ -z "$VIRTUAL_ENV" ]; then
        source "$VENV_PATH/bin/activate"
        log "🐍 Environnement virtuel activé"
    fi
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
    activate_venv
    
    pip install --upgrade pip
    pip install -r requirements.txt
    
    log_success "Dépendances Python mises à jour"
}

# Fonction d'installation de Node.js
install_nodejs() {
    log "📦 Vérification et installation de Node.js..."
    
    # Vérifier si Node.js est installé
    if ! command -v node &> /dev/null; then
        log "🔧 Installation de Node.js 18.x..."
        
        # Installer Node.js 18.x (LTS)
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        apt-get install -y nodejs
        
        log_success "Node.js installé avec succès"
    else
        log_success "Node.js déjà installé: $(node --version)"
    fi
    
    # Vérifier npm
    if ! command -v npm &> /dev/null; then
        log_error "npm non trouvé après installation de Node.js"
        exit 1
    else
        log_success "npm disponible: $(npm --version)"
    fi
}

# Fonction de build du frontend avec hachage
build_frontend() {
    log "🎨 Build du frontend avec hachage..."
    
    cd "$PROJECT_DIR/frontend"
    
    # Installer les dépendances Node.js (y compris dev pour le build)
    log "📦 Installation des dépendances npm..."
    npm install
    
    # Vérifier que webpack est configuré pour le hachage
    if ! grep -q "contenthash" webpack.config.js; then
        log_warning "Webpack n'est pas configuré pour le hachage - les fichiers ne seront pas hashés"
    fi
    
    # Build de production avec hachage
    log "🔨 Build de production avec hachage..."
    npm run build
    
    # Vérifier que les fichiers hashés ont été générés
    if [ ! -d "static/frontend" ] || [ -z "$(ls -A static/frontend/*.js 2>/dev/null)" ]; then
        log_error "Aucun fichier JS hashé généré"
        exit 1
    fi
    
    log_success "Fichiers React hashés générés:"
    ls -la static/frontend/*.js static/frontend/*.css 2>/dev/null || true
    
    cd "$PROJECT_DIR"
    log_success "Frontend buildé avec succès et hachage"
}

# Fonction de gestion de Django avec hachage
manage_django() {
    log "🗄️ Gestion Django avec hachage..."
    
    cd "$PROJECT_DIR"
    activate_venv
    
    # Vérifier que ManifestStaticFilesStorage est configuré
    if ! python -c "from django.conf import settings; print(settings.STATICFILES_STORAGE)" | grep -q "ManifestStaticFilesStorage"; then
        log_warning "ManifestStaticFilesStorage non configuré - le hachage Django ne fonctionnera pas"
    fi
    
    # Collecter les fichiers statiques avec hachage
    log "📁 Collecte des fichiers statiques avec hachage..."
    python manage.py collectstatic --noinput
    
    # Vérifier que le manifest.json a été généré
    if [ ! -f "staticfiles/staticfiles.json" ]; then
        log_error "Manifest staticfiles.json non généré"
        exit 1
    fi
    
    log_success "Manifest généré avec $(python -c "import json; print(len(json.load(open('staticfiles/staticfiles.json'))))") fichiers"
    
    # Vérifier que les fichiers référencés dans le template existent
    TEMPLATE_FILE="frontend/templates/frontend/index.html"
    if [ -f "$TEMPLATE_FILE" ]; then
        log "🔍 Vérification des fichiers référencés dans le template..."
        STATIC_FILES=$(grep -o "{% static '[^']*' %}" "$TEMPLATE_FILE" | sed "s/{% static '//g" | sed "s/' %}//g")
        
        for file in $STATIC_FILES; do
            if [ ! -f "staticfiles/$file" ]; then
                log_error "Fichier statique manquant: $file"
                exit 1
            fi
        done
        
        log_success "Tous les fichiers référencés dans le template existent"
    fi
    
    # Appliquer les migrations
    log "🗄️ Application des migrations..."
    python manage.py migrate
    
    log_success "Gestion Django terminée avec hachage"
}

# Fonction de génération de version de déploiement
generate_deploy_version() {
    log "🔄 Génération de la version de déploiement..."
    
    # On est déjà dans PROJECT_DIR depuis manage_django()
    # L'environnement virtuel est déjà activé
    
    # Exécuter le script de génération de version
    if [ -f "deploy_version.py" ]; then
        log "📝 Exécution de deploy_version.py..."
        python deploy_version.py
        log_success "Version de déploiement générée"
    else
        log_warning "Script deploy_version.py non trouvé - version par défaut utilisée"
    fi
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
    
    # Vérifier le statut de Gunicorn
    if systemctl is-active --quiet gunicorn; then
        log_success "Gunicorn redémarré avec succès"
    else
        log_error "Échec du redémarrage de Gunicorn"
        systemctl status gunicorn --no-pager
        exit 1
    fi
    
    # Recharger Nginx (pas de restart complet nécessaire)
    log "🔄 Rechargement de Nginx..."
    if systemctl reload nginx; then
        log_success "Nginx rechargé avec succès"
    else
        log_warning "Échec du rechargement de Nginx"
        # Essayer un restart complet en cas d'échec
        log "🔄 Tentative de restart complet de Nginx..."
        systemctl restart nginx
    fi
}

# Fonction de sauvegarde des fichiers statiques
backup_static_files() {
    log "💾 Sauvegarde des fichiers statiques..."
    
    cd "$PROJECT_DIR"
    
    # Créer le répertoire de sauvegarde
    mkdir -p "$STATIC_BACKUP_DIR/$BACKUP_NAME"
    
    # Sauvegarder les fichiers statiques existants
    if [ -d "staticfiles" ]; then
        cp -r staticfiles "$STATIC_BACKUP_DIR/$BACKUP_NAME/"
        log_success "Fichiers statiques sauvegardés"
    fi
    
    # Sauvegarder les templates
    if [ -d "frontend/templates" ]; then
        cp -r frontend/templates "$STATIC_BACKUP_DIR/$BACKUP_NAME/"
        log_success "Templates sauvegardés"
    fi
    
    log_success "Sauvegarde créée: $BACKUP_NAME"
}

# Fonction de rollback
rollback_deployment() {
    log_error "Erreur détectée, démarrage du rollback..."
    
    if [ -d "$STATIC_BACKUP_DIR/$BACKUP_NAME" ]; then
        log "🔄 Restauration de la sauvegarde $BACKUP_NAME"
        
        cd "$PROJECT_DIR"
        
        # Restaurer les fichiers statiques
        if [ -d "$STATIC_BACKUP_DIR/$BACKUP_NAME/staticfiles" ]; then
            rm -rf staticfiles
            cp -r "$STATIC_BACKUP_DIR/$BACKUP_NAME/staticfiles" .
            log_success "Fichiers statiques restaurés"
        fi
        
        # Restaurer les templates
        if [ -d "$STATIC_BACKUP_DIR/$BACKUP_NAME/templates" ]; then
            rm -rf frontend/templates
            cp -r "$STATIC_BACKUP_DIR/$BACKUP_NAME/templates" frontend/
            log_success "Templates restaurés"
        fi
        
        # Redémarrer les services (restart complet pour le rollback)
        log "🔄 Redémarrage des services après rollback..."
        systemctl restart gunicorn
        systemctl restart nginx
        log_success "Services redémarrés après rollback"
        
        log_warning "Rollback terminé. Vérifiez l'application."
    else
        log_error "Aucune sauvegarde trouvée pour le rollback"
    fi
    
    exit 1
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
    
    # Test de connectivité
    log "🌐 Test de connectivité..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000 | grep -q "200"; then
        log_success "Application accessible"
    else
        log_warning "Application non accessible, vérifiez les logs"
    fi
    
    # Test des fichiers statiques
    STATIC_TEST_FILE=$(find staticfiles -name "*.js" | head -1)
    if [ -n "$STATIC_TEST_FILE" ]; then
        STATIC_URL="/static/${STATIC_TEST_FILE#staticfiles/}"
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000$STATIC_URL" | grep -q "200"; then
            log_success "Fichiers statiques accessibles"
        else
            log_warning "Problème d'accès aux fichiers statiques"
        fi
    fi
    
    # Afficher les logs récents en cas de problème
    log "📊 Statut des services:"
    systemctl status gunicorn --no-pager -l
    
    log_success "🌐 Application disponible sur: https://myp3000app.com"
}

# Fonction principale
main() {
    log "🚀 Début du déploiement P3000 Production v2.0 avec hachage"
    
    # Donner les permissions d'exécution à ce script
    chmod +x "$0"
    
    # Étapes du déploiement
    check_prerequisites
    backup_production_env
    backup_static_files
    deploy_code
    restore_production_env
    update_dependencies
    install_nodejs
    build_frontend
    manage_django
    generate_deploy_version
    restart_services
    post_deployment_check
    
    # Nettoyage des anciennes sauvegardes (garder les 5 dernières)
    log "🧹 Nettoyage des anciennes sauvegardes..."
    cd "$STATIC_BACKUP_DIR"
    ls -t | tail -n +6 | xargs -r rm -rf
    log_success "Anciennes sauvegardes nettoyées"
    
    # Validation post-déploiement
    log "🔍 Validation post-déploiement..."
    if [ -f "validate_deployment.sh" ]; then
        chmod +x validate_deployment.sh
        if ./validate_deployment.sh; then
            log_success "Validation post-déploiement réussie"
        else
            log_warning "Validation post-déploiement échouée - vérifiez manuellement"
        fi
    else
        log_warning "Script de validation non trouvé - validation manuelle recommandée"
    fi
    
    log_success "✅ Déploiement terminé avec succès!"
    log "📝 Logs disponibles dans les journaux système (journalctl -u gunicorn)"
    log "💾 Sauvegarde créée: $BACKUP_NAME"
    log "🔍 Validation: ./validate_deployment.sh"
}

# Gestion des erreurs avec rollback
trap 'rollback_deployment' ERR

# Exécution du script principal
main "$@"
