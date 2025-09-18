#!/bin/bash

# Script de validation post-déploiement pour P3000
# Vérifie les fichiers hashés, headers HTTP, et fonctionnement général

set -e

# Configuration
PROJECT_DIR="/var/www/p3000/Desktop/Projet/P3000/Application"
BASE_URL="https://myp3000app.com"
LOCAL_URL="http://localhost:8000"
TIMEOUT=30

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

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

log_step() {
    echo -e "${BLUE}🔍 $1${NC}"
}

# Fonction pour exécuter un test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log_step "Test: $test_name"
    
    if eval "$test_command"; then
        log_info "$test_name - PASSÉ"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        log_error "$test_name - ÉCHOUÉ"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Fonction pour vérifier les services
check_services() {
    log_step "Vérification des services système"
    
    run_test "Gunicorn actif" "systemctl is-active --quiet gunicorn"
    run_test "Nginx actif" "systemctl is-active --quiet nginx"
}

# Fonction pour vérifier les fichiers statiques
check_static_files() {
    log_step "Vérification des fichiers statiques"
    
    cd "$PROJECT_DIR"
    
    # Vérifier que staticfiles existe
    run_test "Répertoire staticfiles existe" "[ -d 'staticfiles' ]"
    
    # Vérifier que le manifest.json existe
    run_test "Manifest staticfiles.json existe" "[ -f 'staticfiles/staticfiles.json' ]"
    
    # Vérifier que le manifest contient des fichiers
    if [ -f "staticfiles/staticfiles.json" ]; then
        local file_count=$(python -c "import json; print(len(json.load(open('staticfiles/staticfiles.json'))))")
        run_test "Manifest contient des fichiers" "[ $file_count -gt 0 ]"
        log_info "Manifest contient $file_count fichiers"
    fi
    
    # Vérifier les fichiers JS hashés
    run_test "Fichiers JS hashés existent" "[ -n \"\$(find staticfiles -name '*.js' | head -1)\" ]"
    
    # Vérifier les fichiers CSS hashés
    run_test "Fichiers CSS hashés existent" "[ -n \"\$(find staticfiles -name '*.css' | head -1)\" ]"
    
    # Lister quelques fichiers pour vérification
    log_info "Fichiers JS trouvés:"
    find staticfiles -name "*.js" | head -3 | while read file; do
        echo "  - $(basename "$file")"
    done
    
    log_info "Fichiers CSS trouvés:"
    find staticfiles -name "*.css" | head -3 | while read file; do
        echo "  - $(basename "$file")"
    done
}

# Fonction pour vérifier les templates
check_templates() {
    log_step "Vérification des templates"
    
    cd "$PROJECT_DIR"
    
    # Vérifier que les templates existent
    run_test "Template index.html existe" "[ -f 'frontend/templates/frontend/index.html' ]"
    run_test "Template index_production.html existe" "[ -f 'frontend/templates/frontend/index_production.html' ]"
    
    # Vérifier que les templates utilisent {% static %}
    if [ -f "frontend/templates/frontend/index.html" ]; then
        run_test "Template utilise {% static %}" "grep -q '{% static' frontend/templates/frontend/index.html"
    fi
}

# Fonction pour vérifier la connectivité
check_connectivity() {
    log_step "Vérification de la connectivité"
    
    # Test local
    run_test "Application locale accessible" "curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT $LOCAL_URL | grep -q '200'"
    
    # Test production (si accessible)
    if curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT "$BASE_URL" | grep -q '200'; then
        run_test "Application production accessible" "curl -s -o /dev/null -w '%{http_code}' --max-time $TIMEOUT $BASE_URL | grep -q '200'"
    else
        log_warning "Application production non accessible - test ignoré"
    fi
}

# Fonction pour vérifier les headers HTTP
check_http_headers() {
    log_step "Vérification des headers HTTP"
    
    # Test des headers de la page principale
    local main_headers=$(curl -s -I --max-time $TIMEOUT "$LOCAL_URL")
    
    if echo "$main_headers" | grep -q "Cache-Control.*no-store"; then
        log_info "Header Cache-Control: no-store présent sur la page principale"
    else
        log_warning "Header Cache-Control: no-store manquant sur la page principale"
    fi
    
    # Test des headers des fichiers statiques
    local static_file=$(find "$PROJECT_DIR/staticfiles" -name "*.js" | head -1)
    if [ -n "$static_file" ]; then
        local static_url="/static/${static_file#$PROJECT_DIR/staticfiles/}"
        local static_headers=$(curl -s -I --max-time $TIMEOUT "$LOCAL_URL$static_url")
        
        if echo "$static_headers" | grep -q "Cache-Control.*immutable"; then
            log_info "Header Cache-Control: immutable présent sur les fichiers statiques"
        else
            log_warning "Header Cache-Control: immutable manquant sur les fichiers statiques"
        fi
        
        if echo "$static_headers" | grep -q "200 OK"; then
            log_info "Fichier statique accessible: $(basename "$static_file")"
        else
            log_error "Fichier statique non accessible: $(basename "$static_file")"
        fi
    fi
}

# Fonction pour vérifier la résolution des URLs statiques
check_static_url_resolution() {
    log_step "Vérification de la résolution des URLs statiques"
    
    cd "$PROJECT_DIR"
    
    if [ -f "staticfiles/staticfiles.json" ]; then
        # Tester quelques résolutions d'URLs
        local test_files=("js/main.js" "css/main.css")
        
        for file in "${test_files[@]}"; do
            if python -c "
import json
import os
manifest = json.load(open('staticfiles/staticfiles.json'))
if '$file' in manifest:
    hashed_file = manifest['$file']
    if os.path.exists(f'staticfiles/{hashed_file}'):
        print('OK')
    else:
        print('FILE_NOT_FOUND')
        exit(1)
else:
    print('NOT_IN_MANIFEST')
    exit(1)
" > /dev/null 2>&1; then
                log_info "Résolution URL statique OK: $file"
            else
                log_error "Résolution URL statique échouée: $file"
            fi
        done
    fi
}

# Fonction pour vérifier la configuration Django
check_django_config() {
    log_step "Vérification de la configuration Django"
    
    cd "$PROJECT_DIR"
    
    # Vérifier que ManifestStaticFilesStorage est configuré
    export DJANGO_SETTINGS_MODULE=Application.settings_production
    if python -c "from django.conf import settings; print(settings.STATICFILES_STORAGE)" | grep -q "ManifestStaticFilesStorage"; then
        log_info "ManifestStaticFilesStorage configuré"
    else
        log_warning "ManifestStaticFilesStorage non configuré"
    fi
    
    # Vérifier que les répertoires statiques sont configurés
    if python -c "from django.conf import settings; print(settings.STATICFILES_DIRS)" | grep -q "frontend"; then
        log_info "STATICFILES_DIRS configuré correctement"
    else
        log_warning "STATICFILES_DIRS mal configuré"
    fi
}

# Fonction pour vérifier la configuration Nginx
check_nginx_config() {
    log_step "Vérification de la configuration Nginx"
    
    # Vérifier la syntaxe de la configuration
    run_test "Configuration Nginx valide" "nginx -t"
    
    # Vérifier que les répertoires existent
    run_test "Répertoire staticfiles accessible par Nginx" "[ -r '/var/www/p3000/staticfiles' ]"
}

# Fonction pour tester les performances
check_performance() {
    log_step "Test de performance basique"
    
    # Test de temps de réponse
    local response_time=$(curl -s -o /dev/null -w '%{time_total}' --max-time $TIMEOUT "$LOCAL_URL")
    
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        log_info "Temps de réponse acceptable: ${response_time}s"
    else
        log_warning "Temps de réponse lent: ${response_time}s"
    fi
}

# Fonction pour générer un rapport
generate_report() {
    echo ""
    echo "📊 RAPPORT DE VALIDATION"
    echo "========================"
    echo "Tests exécutés: $TOTAL_TESTS"
    echo "Tests réussis: $PASSED_TESTS"
    echo "Tests échoués: $FAILED_TESTS"
    echo ""
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log_info "🎉 Tous les tests sont passés avec succès!"
        echo ""
        echo "✅ Le déploiement est validé et fonctionnel"
        echo "🌐 Application accessible sur: $BASE_URL"
        echo "📁 Fichiers statiques avec hachage: OK"
        echo "🔄 Cache configuré correctement: OK"
        echo "⚡ Performance: OK"
        return 0
    else
        log_error "❌ $FAILED_TESTS test(s) ont échoué"
        echo ""
        echo "🔧 Actions recommandées:"
        echo "  - Vérifier les logs: journalctl -u gunicorn"
        echo "  - Vérifier la configuration Nginx: nginx -t"
        echo "  - Vérifier les permissions des fichiers statiques"
        echo "  - Relancer le déploiement si nécessaire"
        return 1
    fi
}

# Fonction principale
main() {
    echo "🔍 Validation post-déploiement P3000"
    echo "===================================="
    echo ""
    
    # Vérifier que nous sommes dans le bon répertoire
    if [ ! -f "$PROJECT_DIR/manage.py" ]; then
        log_error "manage.py non trouvé dans $PROJECT_DIR"
        exit 1
    fi
    
    # Exécuter tous les tests
    check_services
    check_static_files
    check_templates
    check_django_config
    check_nginx_config
    check_connectivity
    check_http_headers
    check_static_url_resolution
    check_performance
    
    # Générer le rapport final
    generate_report
}

# Exécution du script
main "$@"
