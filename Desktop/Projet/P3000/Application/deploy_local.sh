#!/bin/bash

# Script de déploiement pour l'environnement de développement local
# Version simplifiée sans sauvegarde ni rollback

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "🚀 Déploiement local P3000"
echo "=========================="

# Vérifications
log_step "Vérifications préliminaires"

if [ ! -f "manage.py" ]; then
    echo "❌ manage.py non trouvé. Exécutez depuis la racine du projet."
    exit 1
fi

# Build React
log_step "Build React (développement)"
cd frontend

if [ ! -d "node_modules" ]; then
    log_step "Installation des dépendances npm"
    npm install
fi

if npm run build; then
    log_info "Build React réussi"
else
    echo "❌ Échec du build React"
    exit 1
fi

cd ..

# Collectstatic
log_step "Collecte des fichiers statiques"
if python manage.py collectstatic --noinput; then
    log_info "Collectstatic réussi"
else
    echo "❌ Échec de collectstatic"
    exit 1
fi

# Redémarrage du serveur de développement
log_step "Redémarrage du serveur Django"
if pgrep -f "python.*manage.py.*runserver" > /dev/null; then
    pkill -f "python.*manage.py.*runserver"
    log_info "Serveur Django arrêté"
fi

log_info "Déploiement local terminé!"
echo ""
echo "🔍 Pour démarrer le serveur:"
echo "  python manage.py runserver"
echo ""
echo "🔍 Pour démarrer React en mode dev:"
echo "  cd frontend && npm start"
