#!/bin/bash

# =============================================================================
# Script d'installation d'un nouveau client P3000
# =============================================================================
# Usage: ./setup-new-client.sh <client_name> <domain> <gunicorn_port> <redis_db>
# Exemple: ./setup-new-client.sh elekable elekable.fr 8001 1
#
# Ce script installe un nouveau client sur le VPS.
# Prérequis : 
#   - Branche client/<client_name> créée et pushée
#   - Bucket S3 créé avec CORS configuré
#   - DNS configuré vers le serveur
# =============================================================================

set -e

# Vérification des arguments
if [ "$#" -lt 4 ]; then
    echo "❌ Usage: $0 <client_name> <domain> <gunicorn_port> <redis_db>"
    echo "   Exemple: $0 elekable elekable.fr 8001 1"
    echo ""
    echo "   client_name   : Nom du client (ex: elekable)"
    echo "   domain        : Domaine du client (ex: elekable.fr)"
    echo "   gunicorn_port : Port Gunicorn (ex: 8001)"
    echo "   redis_db      : Numéro de DB Redis (ex: 1)"
    exit 1
fi

CLIENT_NAME="$1"
CLIENT_DOMAIN="$2"
GUNICORN_PORT="$3"
REDIS_DB="$4"

PROJECT_DIR="/var/www/${CLIENT_NAME}"
BRANCH="client/${CLIENT_NAME}"

# Utiliser l'URL du remote origin du repo actuel (ex: quand on lance depuis /var/www/p3000/...)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -d "$APP_DIR/.git" ]; then
    GIT_REPO="$(cd "$APP_DIR" && git remote get-url origin)"
    # Forcer l'URL SSH pour GitHub (la clé SSH du serveur fonctionne, pas le HTTPS en non-interactif)
    if [[ "$GIT_REPO" =~ ^https://github\.com/(.+)(\.git)?$ ]]; then
        GIT_REPO="git@github.com:${BASH_REMATCH[1]}${BASH_REMATCH[2]:-.git}"
    fi
else
    GIT_REPO="git@github.com:ElyesseAdda/WebAppli.git"  # Fallback si pas dans un clone git
fi

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"; }
log_error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"; }

# =============================================================================
# ÉTAPE 1 : Création de la base de données PostgreSQL
# =============================================================================
setup_database() {
    log "🗄️ Configuration de la base de données..."
    
    DB_NAME="p3000db_${CLIENT_NAME}"
    
    # Vérifier si la DB existe déjà
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log_warning "La base de données $DB_NAME existe déjà"
    else
        sudo -u postgres createdb "$DB_NAME"
        log_success "Base de données $DB_NAME créée"
    fi
    
    # Accorder les droits à l'utilisateur p3000user
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO p3000user;"
    log_success "Droits accordés à p3000user sur $DB_NAME"
}

# =============================================================================
# ÉTAPE 2 : Clonage du repository
# =============================================================================
clone_repository() {
    log "📂 Clonage du repository (${GIT_REPO})..."
    
    if [ -d "$PROJECT_DIR" ]; then
        log_warning "Le répertoire $PROJECT_DIR existe déjà"
        read -p "Voulez-vous le supprimer et re-cloner ? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$PROJECT_DIR"
        else
            log "Utilisation du répertoire existant"
            return
        fi
    fi
    
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    
    # Cloner le repo
    git clone "$GIT_REPO" .
    git checkout "$BRANCH"
    
    log_success "Repository cloné et branche $BRANCH activée"
}

# =============================================================================
# ÉTAPE 3 : Configuration de l'environnement Python
# =============================================================================
setup_python_env() {
    log "🐍 Configuration de l'environnement Python..."
    
    cd "$PROJECT_DIR"
    
    # Créer l'environnement virtuel
    python3 -m venv venv
    source venv/bin/activate
    
    pip install --upgrade pip
    pip install -r Desktop/Projet/P3000/Application/requirements.txt
    
    log_success "Environnement Python configuré"
}

# =============================================================================
# ÉTAPE 4 : Configuration du fichier .env
# =============================================================================
setup_env_file() {
    log "🔧 Configuration du fichier .env..."
    
    ENV_FILE="$PROJECT_DIR/Desktop/Projet/P3000/Application/.env"
    ENV_BACKUP="/root/${CLIENT_NAME}-env-backup"
    
    mkdir -p "$ENV_BACKUP"
    
    if [ -f "$ENV_FILE" ]; then
        log_warning "Fichier .env existant, sauvegarde..."
        cp "$ENV_FILE" "$ENV_BACKUP/.env.backup"
    fi
    
    # Générer une SECRET_KEY
    SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
    
    log_warning "⚠️  Vous devez maintenant configurer le fichier .env manuellement :"
    echo ""
    echo "   nano $ENV_FILE"
    echo ""
    echo "   Variables à configurer :"
    echo "   - SECRET_KEY=$SECRET_KEY"
    echo "   - DATABASE_URL=postgresql://p3000user:VOTRE_MOT_DE_PASSE@localhost:5432/p3000db_${CLIENT_NAME}"
    echo "   - AWS_ACCESS_KEY_ID=..."
    echo "   - AWS_SECRET_ACCESS_KEY=..."
    echo "   - AWS_STORAGE_BUCKET_NAME=${CLIENT_NAME}"
    echo "   - ALLOWED_HOSTS=${CLIENT_DOMAIN},www.${CLIENT_DOMAIN}"
    echo "   - REDIS_URL=redis://localhost:6379/${REDIS_DB}"
    echo ""
    
    read -p "Appuyez sur Entrée une fois le fichier .env configuré..."
    
    # Sauvegarder comme fichier de production
    cp "$ENV_FILE" "$ENV_BACKUP/.env.production"
    
    log_success "Configuration .env terminée"
}

# =============================================================================
# ÉTAPE 5 : Build du frontend et collectstatic
# =============================================================================
build_application() {
    log "🎨 Build de l'application..."
    
    cd "$PROJECT_DIR/Desktop/Projet/P3000/Application"
    source "$PROJECT_DIR/venv/bin/activate"
    
    # Frontend
    cd frontend
    npm install
    npm run build
    cd ..
    
    # Django
    mkdir -p staticfiles/frontend
    export DJANGO_SETTINGS_MODULE=Application.settings_production
    python manage.py collectstatic --noinput
    python manage.py migrate
    
    # Permissions
    sudo chown -R www-data:www-data staticfiles/
    chmod -R 755 staticfiles/
    
    log_success "Application buildée"
}

# =============================================================================
# ÉTAPE 6 : Configuration Nginx
# =============================================================================
setup_nginx() {
    log "🌐 Configuration Nginx..."
    
    NGINX_CONF="/etc/nginx/sites-available/${CLIENT_NAME}.conf"
    NGINX_ENABLED="/etc/nginx/sites-enabled/${CLIENT_NAME}.conf"
    TEMPLATE="$PROJECT_DIR/Desktop/Projet/P3000/Application/deploy/nginx-template.conf"
    
    # Copier et adapter le template
    if [ -f "$TEMPLATE" ]; then
        cp "$TEMPLATE" "$NGINX_CONF"
        
        # Remplacer les variables
        sed -i "s|\${CLIENT_NAME}|${CLIENT_NAME}|g" "$NGINX_CONF"
        sed -i "s|\${CLIENT_DOMAIN}|${CLIENT_DOMAIN}|g" "$NGINX_CONF"
        sed -i "s|\${GUNICORN_PORT}|${GUNICORN_PORT}|g" "$NGINX_CONF"
        sed -i "s|\${PROJECT_DIR}|${PROJECT_DIR}|g" "$NGINX_CONF"
        
        log_success "Configuration Nginx créée"
    else
        log_error "Template Nginx non trouvé: $TEMPLATE"
        exit 1
    fi
    
    # Activer le site (sans SSL pour l'instant)
    ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
    
    # Tester la configuration
    nginx -t
    
    log_success "Configuration Nginx activée"
}

# =============================================================================
# ÉTAPE 7 : Configuration du certificat SSL
# =============================================================================
setup_ssl() {
    log "🔒 Configuration SSL avec Certbot..."
    
    # Commenter temporairement les lignes SSL dans la config Nginx
    NGINX_CONF="/etc/nginx/sites-available/${CLIENT_NAME}.conf"
    
    # Recharger Nginx sans SSL d'abord
    systemctl reload nginx
    
    # Obtenir le certificat
    certbot --nginx -d "${CLIENT_DOMAIN}" -d "www.${CLIENT_DOMAIN}" --non-interactive --agree-tos --email admin@${CLIENT_DOMAIN}
    
    log_success "Certificat SSL installé"
}

# =============================================================================
# ÉTAPE 8 : Configuration Systemd
# =============================================================================
setup_systemd() {
    log "⚙️ Configuration Systemd..."
    
    SERVICE_FILE="/etc/systemd/system/${CLIENT_NAME}.service"
    TEMPLATE="$PROJECT_DIR/Desktop/Projet/P3000/Application/deploy/systemd-template.service"
    
    if [ -f "$TEMPLATE" ]; then
        cp "$TEMPLATE" "$SERVICE_FILE"
        
        # Remplacer les variables
        sed -i "s|\${CLIENT_NAME}|${CLIENT_NAME}|g" "$SERVICE_FILE"
        sed -i "s|\${GUNICORN_PORT}|${GUNICORN_PORT}|g" "$SERVICE_FILE"
        sed -i "s|\${PROJECT_DIR}|${PROJECT_DIR}|g" "$SERVICE_FILE"
        
        log_success "Service Systemd créé"
    else
        log_error "Template Systemd non trouvé: $TEMPLATE"
        exit 1
    fi
    
    # Créer les dossiers de logs
    mkdir -p /var/log/gunicorn
    mkdir -p /var/log/${CLIENT_NAME}
    chown www-data:www-data /var/log/gunicorn
    chown www-data:www-data /var/log/${CLIENT_NAME}
    
    # Activer et démarrer le service
    systemctl daemon-reload
    systemctl enable "${CLIENT_NAME}"
    systemctl start "${CLIENT_NAME}"
    
    if systemctl is-active --quiet "${CLIENT_NAME}"; then
        log_success "Service ${CLIENT_NAME} démarré"
    else
        log_error "Échec du démarrage du service"
        systemctl status "${CLIENT_NAME}" --no-pager
        exit 1
    fi
}

# =============================================================================
# ÉTAPE 9 : Vérification finale
# =============================================================================
final_check() {
    log "🔍 Vérification finale..."
    
    echo ""
    echo "========================================"
    echo "  Résumé de l'installation"
    echo "========================================"
    echo ""
    echo "Client        : ${CLIENT_NAME}"
    echo "Domaine       : ${CLIENT_DOMAIN}"
    echo "Répertoire    : ${PROJECT_DIR}"
    echo "Port Gunicorn : ${GUNICORN_PORT}"
    echo "Base de données: p3000db_${CLIENT_NAME}"
    echo "Redis DB      : ${REDIS_DB}"
    echo ""
    echo "Services :"
    systemctl is-active "${CLIENT_NAME}" && echo "  ✅ ${CLIENT_NAME}.service actif" || echo "  ❌ ${CLIENT_NAME}.service inactif"
    systemctl is-active nginx && echo "  ✅ nginx actif" || echo "  ❌ nginx inactif"
    echo ""
    echo "URLs :"
    echo "  https://${CLIENT_DOMAIN}"
    echo ""
    echo "Commandes utiles :"
    echo "  systemctl status ${CLIENT_NAME}"
    echo "  journalctl -u ${CLIENT_NAME} -f"
    echo "  ./deploy-client.sh ${CLIENT_NAME}"
    echo ""
    
    log_success "✅ Installation terminée !"
}

# =============================================================================
# MAIN
# =============================================================================
main() {
    log "🚀 Installation du client ${CLIENT_NAME}"
    log "   Domaine: ${CLIENT_DOMAIN}"
    log "   Port: ${GUNICORN_PORT}"
    log "   Redis DB: ${REDIS_DB}"
    echo ""
    
    setup_database
    clone_repository
    setup_python_env
    setup_env_file
    build_application
    setup_nginx
    setup_ssl
    setup_systemd
    final_check
}

trap 'log_error "Erreur détectée"; exit 1' ERR

main "$@"
