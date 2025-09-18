#!/bin/bash

# Script de validation pour l'environnement de développement local
# Tests adaptés au développement

set -e

# Configuration
LOCAL_URL="http://localhost:8000"
REACT_URL="http://localhost:3000"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_step() {
    echo -e "${BLUE}🔍 $1${NC}"
}

echo "🔍 Validation développement local P3000"
echo "======================================="
echo ""

# Test 1: Django accessible
log_step "Test Django (port 8000)"
if curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$LOCAL_URL" | grep -q '200'; then
    log_info "Django accessible sur $LOCAL_URL"
else
    log_error "Django non accessible sur $LOCAL_URL"
    echo "💡 Lancez: python manage.py runserver"
    exit 1
fi

# Test 2: React dev server (optionnel)
log_step "Test React dev server (port 3000)"
if curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$REACT_URL" | grep -q '200'; then
    log_info "React dev server accessible sur $REACT_URL"
else
    log_warning "React dev server non accessible sur $REACT_URL"
    echo "💡 Lancez: cd frontend && npm start"
fi

# Test 3: Fichiers statiques Django
log_step "Test des fichiers statiques Django"
if [ -d "staticfiles" ] && [ -f "staticfiles/staticfiles.json" ]; then
    log_info "Fichiers statiques Django OK"
else
    log_warning "Fichiers statiques Django manquants"
    echo "💡 Lancez: python manage.py collectstatic"
fi

# Test 4: Configuration Django
log_step "Vérification de la configuration Django"
if python -c "from django.conf import settings; print('DEBUG:', settings.DEBUG)" | grep -q "DEBUG: True"; then
    log_info "Mode DEBUG activé (développement)"
else
    log_warning "Mode DEBUG non activé"
fi

# Test 5: Base de données
log_step "Test de la base de données"
if python manage.py check --database default > /dev/null 2>&1; then
    log_info "Base de données accessible"
else
    log_error "Problème avec la base de données"
    echo "💡 Vérifiez la configuration DATABASES dans settings_local.py"
fi

# Test 6: Migrations
log_step "Vérification des migrations"
if python manage.py showmigrations --plan | grep -q "\[ \]"; then
    log_warning "Migrations en attente détectées"
    echo "💡 Lancez: python manage.py migrate"
else
    log_info "Toutes les migrations sont appliquées"
fi

# Test 7: Fichiers React buildés
log_step "Vérification des fichiers React"
if [ -d "frontend/static/frontend" ] && [ -n "$(find frontend/static/frontend -name '*.js' | head -1)" ]; then
    log_info "Fichiers React buildés présents"
else
    log_warning "Fichiers React buildés manquants"
    echo "💡 Lancez: cd frontend && npm run build"
fi

echo ""
log_info "🎉 Validation développement terminée!"
echo ""
echo "📋 Résumé:"
echo "  - Django: $LOCAL_URL"
echo "  - React dev: $REACT_URL (optionnel)"
echo "  - Mode: Développement (DEBUG=True)"
echo ""
echo "🚀 Commandes utiles:"
echo "  - Django: python manage.py runserver"
echo "  - React: cd frontend && npm start"
echo "  - Build: cd frontend && npm run build"
echo "  - Collectstatic: python manage.py collectstatic"
