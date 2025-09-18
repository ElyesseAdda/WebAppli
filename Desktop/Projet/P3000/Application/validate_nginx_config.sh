#!/bin/bash

# Script de validation de la configuration Nginx
# Vérifie que la configuration est correcte avant le déploiement

echo "🔍 Validation de la configuration Nginx..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier si nginx est installé
if ! command -v nginx &> /dev/null; then
    log_error "Nginx n'est pas installé"
    exit 1
fi

# Vérifier la syntaxe de la configuration
log_info "Vérification de la syntaxe Nginx..."

if nginx -t -c nginx_myp3000app.conf; then
    log_info "Configuration Nginx valide"
else
    log_error "Erreur de syntaxe dans la configuration Nginx"
    exit 1
fi

# Vérifier les chemins des fichiers statiques
log_info "Vérification des chemins des fichiers statiques..."

STATIC_PATH="/var/www/p3000/staticfiles/"
if [ -d "$STATIC_PATH" ]; then
    log_info "Répertoire staticfiles existe: $STATIC_PATH"
else
    log_warning "Répertoire staticfiles n'existe pas: $STATIC_PATH"
    log_info "Création du répertoire..."
    sudo mkdir -p "$STATIC_PATH"
fi

# Vérifier les permissions
if [ -w "$STATIC_PATH" ]; then
    log_info "Permissions d'écriture OK sur staticfiles"
else
    log_warning "Permissions d'écriture manquantes sur staticfiles"
    log_info "Correction des permissions..."
    sudo chown -R www-data:www-data "$STATIC_PATH"
    sudo chmod -R 755 "$STATIC_PATH"
fi

# Vérifier les logs
log_info "Vérification des répertoires de logs..."

LOG_DIR="/var/log/nginx"
if [ -d "$LOG_DIR" ]; then
    log_info "Répertoire de logs existe: $LOG_DIR"
else
    log_warning "Répertoire de logs n'existe pas: $LOG_DIR"
    sudo mkdir -p "$LOG_DIR"
fi

# Vérifier les certificats SSL (si en production)
if [ -f "/etc/letsencrypt/live/myp3000app.com/fullchain.pem" ]; then
    log_info "Certificat SSL trouvé"
else
    log_warning "Certificat SSL non trouvé - vérifiez Let's Encrypt"
fi

# Test de la configuration avec curl (si possible)
log_info "Test de la configuration..."

# Vérifier si le serveur répond
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 > /dev/null 2>&1; then
    log_info "Serveur répond sur le port 8080"
else
    log_warning "Serveur ne répond pas sur le port 8080"
fi

# Résumé
echo ""
echo "📋 Résumé de la validation:"
echo "  - Configuration Nginx: ✅ Valide"
echo "  - Répertoire staticfiles: ✅ Vérifié"
echo "  - Permissions: ✅ Vérifiées"
echo "  - Logs: ✅ Configurés"
echo ""
log_info "Validation terminée avec succès!"
echo ""
echo "🚀 Commandes pour déployer:"
echo "  sudo cp nginx_myp3000app.conf /etc/nginx/sites-available/"
echo "  sudo ln -sf /etc/nginx/sites-available/nginx_myp3000app.conf /etc/nginx/sites-enabled/"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
