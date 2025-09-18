#!/bin/bash

# Script de validation des headers HTTP pour P3000
# Vérifie spécifiquement les headers de cache

set -e

# Configuration
LOCAL_URL="http://localhost:8000"
BASE_URL="https://myp3000app.com"

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

# Fonction pour tester les headers d'une URL
test_headers() {
    local url="$1"
    local description="$2"
    
    log_step "Test des headers: $description"
    echo "URL: $url"
    
    local headers=$(curl -s -I --max-time 10 "$url")
    
    if [ $? -eq 0 ]; then
        echo "Headers reçus:"
        echo "$headers" | sed 's/^/  /'
        echo ""
        
        # Vérifier le code de statut
        local status_code=$(echo "$headers" | head -1 | cut -d' ' -f2)
        if [ "$status_code" = "200" ]; then
            log_info "Code de statut: $status_code"
        else
            log_error "Code de statut: $status_code"
        fi
        
        return 0
    else
        log_error "Impossible de récupérer les headers"
        return 1
    fi
}

# Fonction pour vérifier les headers de cache
check_cache_headers() {
    local url="$1"
    local description="$2"
    local expected_cache="$3"
    
    log_step "Vérification des headers de cache: $description"
    
    local headers=$(curl -s -I --max-time 10 "$url")
    local cache_control=$(echo "$headers" | grep -i "cache-control" || echo "")
    
    if [ -n "$cache_control" ]; then
        echo "Cache-Control: $cache_control"
        
        if echo "$cache_control" | grep -q "$expected_cache"; then
            log_info "Header de cache correct: $expected_cache"
        else
            log_warning "Header de cache inattendu: $cache_control"
        fi
    else
        log_warning "Header Cache-Control manquant"
    fi
    
    echo ""
}

# Fonction pour tester un fichier statique
test_static_file() {
    local file_path="$1"
    local description="$2"
    
    log_step "Test du fichier statique: $description"
    
    # Construire l'URL
    local static_url="$LOCAL_URL/static/$file_path"
    
    # Tester l'accessibilité
    if curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$static_url" | grep -q '200'; then
        log_info "Fichier accessible: $file_path"
        
        # Vérifier les headers de cache
        check_cache_headers "$static_url" "$description" "immutable"
        
        return 0
    else
        log_error "Fichier non accessible: $file_path"
        return 1
    fi
}

# Fonction principale
main() {
    echo "🔍 Validation des headers HTTP P3000"
    echo "===================================="
    echo ""
    
    # Test 1: Page principale (doit avoir no-cache)
    test_headers "$LOCAL_URL" "Page principale"
    check_cache_headers "$LOCAL_URL" "Page principale" "no-store"
    
    # Test 2: Fichiers statiques (doivent avoir cache long)
    log_step "Test des fichiers statiques"
    
    # Trouver des fichiers statiques à tester
    if [ -d "/var/www/p3000/staticfiles" ]; then
        # Test d'un fichier JS
        local js_file=$(find /var/www/p3000/staticfiles -name "*.js" | head -1)
        if [ -n "$js_file" ]; then
            local js_relative_path="${js_file#/var/www/p3000/staticfiles/}"
            test_static_file "$js_relative_path" "Fichier JS"
        fi
        
        # Test d'un fichier CSS
        local css_file=$(find /var/www/p3000/staticfiles -name "*.css" | head -1)
        if [ -n "$css_file" ]; then
            local css_relative_path="${css_file#/var/www/p3000/staticfiles/}"
            test_static_file "$css_relative_path" "Fichier CSS"
        fi
    else
        log_warning "Répertoire staticfiles non trouvé"
    fi
    
    # Test 3: Production (si accessible)
    if curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE_URL" | grep -q '200'; then
        echo ""
        log_step "Test de la version production"
        test_headers "$BASE_URL" "Production"
        check_cache_headers "$BASE_URL" "Production" "no-store"
    else
        log_warning "Version production non accessible - test ignoré"
    fi
    
    echo ""
    log_info "🎉 Validation des headers terminée!"
    echo ""
    echo "📋 Résumé des vérifications:"
    echo "  - Page principale: Cache-Control: no-store"
    echo "  - Fichiers statiques: Cache-Control: public, immutable"
    echo "  - Codes de statut: 200 OK"
    echo ""
    echo "💡 Pour vérifier manuellement:"
    echo "  curl -I $LOCAL_URL"
    echo "  curl -I $LOCAL_URL/static/js/main.js"
}

# Exécution du script
main "$@"
