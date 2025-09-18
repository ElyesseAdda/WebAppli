#!/bin/bash
set -e

echo "🚀 Build et test complet du système React + Django"
echo "=================================================="

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "manage.py" ]; then
    log_error "Ce script doit être exécuté depuis la racine du projet Django"
    exit 1
fi

# 1. Build React
log_info "📦 Build de l'application React..."
cd frontend

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    log_info "Installation des dépendances npm..."
    npm install
fi

# Build en mode production
log_info "🔨 Build React en mode production..."
npm run build

# Vérifier que le build a généré les fichiers
if [ ! -d "static/frontend" ]; then
    log_error "Le build React n'a pas généré le dossier static/frontend"
    exit 1
fi

log_success "Build React terminé"

# 2. Vérifier la génération du manifest
log_info "📄 Vérification du manifest..."
if [ -f "static/frontend/asset-manifest.json" ]; then
    log_success "Manifest asset-manifest.json généré"
    echo "Contenu du manifest:"
    cat static/frontend/asset-manifest.json | head -20
else
    log_warning "Manifest asset-manifest.json non trouvé"
fi

# 3. Lister les fichiers générés
log_info "📁 Fichiers générés par React:"
ls -la static/frontend/

cd ..

# 4. Test du template tag
log_info "🧪 Test du template tag react_static..."
python test_react_static.py

# 5. Test Django collectstatic
log_info "🗄️ Test Django collectstatic..."
python manage.py collectstatic --noinput --verbosity=2

# 6. Vérifier que les fichiers sont dans staticfiles
log_info "📁 Vérification des fichiers dans staticfiles..."
if [ -d "staticfiles/frontend" ]; then
    log_success "Fichiers React copiés dans staticfiles"
    ls -la staticfiles/frontend/
else
    log_error "Fichiers React non trouvés dans staticfiles"
fi

# 7. Test de la page de debug
log_info "🔍 Test de la page de debug..."
echo "Tu peux maintenant tester la page de debug à:"
echo "http://localhost:8000/debug/react-static/"

log_success "✅ Build et test terminés avec succès!"
echo ""
echo "🎯 Prochaines étapes:"
echo "1. Lance le serveur Django: python manage.py runserver"
echo "2. Teste la page principale: http://localhost:8000/"
echo "3. Teste la page de debug: http://localhost:8000/debug/react-static/"
echo "4. Vérifie que les fichiers CSS/JS se chargent correctement"
