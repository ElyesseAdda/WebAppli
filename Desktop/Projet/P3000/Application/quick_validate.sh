#!/bin/bash

# Script de validation rapide pour P3000
# Tests essentiels uniquement

set -e

# Configuration
PROJECT_DIR="/var/www/p3000/Desktop/Projet/P3000/Application"
LOCAL_URL="http://localhost:8000"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${BLUE}🔍 $1${NC}"
}

echo "⚡ Validation rapide P3000"
echo "========================="

# Test 1: Services actifs
log_step "Vérification des services"
if systemctl is-active --quiet gunicorn && systemctl is-active --quiet nginx; then
    log_info "Services actifs"
else
    log_error "Services non actifs"
    exit 1
fi

# Test 2: Application accessible
log_step "Test de connectivité"
if curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$LOCAL_URL" | grep -q '200'; then
    log_info "Application accessible"
else
    log_error "Application non accessible"
    exit 1
fi

# Test 3: Fichiers statiques
log_step "Vérification des fichiers statiques"
cd "$PROJECT_DIR"
if [ -f "staticfiles/staticfiles.json" ] && [ -n "$(find staticfiles -name '*.js' | head -1)" ]; then
    log_info "Fichiers statiques OK"
else
    log_error "Fichiers statiques manquants"
    exit 1
fi

# Test 4: Fichier statique accessible
log_step "Test d'un fichier statique"
STATIC_FILE=$(find staticfiles -name "*.js" | head -1)
if [ -n "$STATIC_FILE" ]; then
    STATIC_URL="/static/${STATIC_FILE#staticfiles/}"
    if curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$LOCAL_URL$STATIC_URL" | grep -q '200'; then
        log_info "Fichier statique accessible: $(basename "$STATIC_FILE")"
    else
        log_error "Fichier statique non accessible"
        exit 1
    fi
fi

log_info "🎉 Validation rapide réussie!"
echo "🌐 Application fonctionnelle sur: $LOCAL_URL"
