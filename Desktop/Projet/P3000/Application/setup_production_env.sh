#!/bin/bash

# Script de configuration initiale pour l'environnement de production
# Usage: ./setup_production_env.sh
# À exécuter une seule fois lors de la première installation

set -e

# Configuration
PROJECT_DIR="/var/www/p3000/Desktop/Projet/P3000/Application"
ENV_BACKUP_DIR="/root/p3000-env-backup"
PRODUCTION_ENV_FILE="$ENV_BACKUP_DIR/.env.production"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "🔧 Configuration initiale de l'environnement de production P3000"

# Créer le répertoire de sauvegarde
mkdir -p "$ENV_BACKUP_DIR"
log "Répertoire de sauvegarde créé: $ENV_BACKUP_DIR"

# Si un fichier .env existe déjà dans le projet, le sauvegarder
if [ -f "$PROJECT_DIR/.env" ]; then
    log "Sauvegarde du fichier .env existant..."
    cp "$PROJECT_DIR/.env" "$PRODUCTION_ENV_FILE"
    log_success "Fichier .env sauvegardé vers: $PRODUCTION_ENV_FILE"
else
    log_warning "Aucun fichier .env trouvé dans le projet"
    log "Création d'un fichier .env de production vide..."
    
    cat > "$PRODUCTION_ENV_FILE" << 'EOF'
# Configuration de production P3000
# IMPORTANT: Modifier ces valeurs selon votre environnement de production

# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=myp3000app.com,www.myp3000app.com,localhost,127.0.0.1

# Base de données
DATABASE_URL=postgresql://p3000user:Boumediene30@localhost:5432/p3000db
DB_NAME=p3000db
DB_USER=p3000user
DB_PASSWORD=Boumediene30
DB_HOST=localhost
DB_PORT=5432

# Email (optionnel)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-email-password
EMAIL_USE_TLS=True

# AWS S3 (si utilisé)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=eu-west-3

# Autres configurations
STATIC_ROOT=/var/www/p3000/static/
MEDIA_ROOT=/var/www/p3000/media/
EOF
    
    log_success "Fichier .env de production créé"
    log_warning "IMPORTANT: Vous devez modifier les valeurs dans: $PRODUCTION_ENV_FILE"
fi

# Mettre les bonnes permissions
chmod 600 "$PRODUCTION_ENV_FILE"
log "Permissions sécurisées appliquées au fichier .env"

# Mettre à jour les alias
log "Mise à jour des alias..."
DEPLOY_SCRIPT="$PROJECT_DIR/deploy_production.sh"

# Supprimer l'ancien alias s'il existe
sed -i '/alias p3000-deploy/d' ~/.bashrc 2>/dev/null || true

# Ajouter le nouveau alias
echo "alias p3000-deploy=\"$DEPLOY_SCRIPT\"" >> ~/.bashrc
log_success "Alias p3000-deploy mis à jour"

# Rendre le script de déploiement exécutable
chmod +x "$DEPLOY_SCRIPT"
log "Script de déploiement rendu exécutable"

echo ""
log_success "✅ Configuration terminée!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Modifier le fichier de configuration: $PRODUCTION_ENV_FILE"
echo "2. Recharger votre shell: source ~/.bashrc"
echo "3. Tester le déploiement: p3000-deploy"
echo ""
log_warning "⚠️ N'oubliez pas de configurer les bonnes valeurs dans le fichier .env de production!"
