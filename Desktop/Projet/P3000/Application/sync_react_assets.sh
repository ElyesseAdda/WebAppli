#!/bin/bash

# Script de synchronisation automatique des assets React
# Usage: ./sync_react_assets.sh

set -e

echo "🔄 Synchronisation des assets React avec Django..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "manage.py" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet Django"
    exit 1
fi

# Vérifier que le build React existe
if [ ! -d "frontend/build/static" ]; then
    echo "❌ Erreur: Le build React n'existe pas. Lancez d'abord 'npm run build' dans le dossier frontend/"
    exit 1
fi

# Créer le répertoire de destination s'il n'existe pas
mkdir -p frontend/static/frontend

# Copier les fichiers React vers Django
echo "📁 Copie des fichiers React vers Django..."
cp -r frontend/build/static/* frontend/static/frontend/

# Copier le manifest React si il existe
if [ -f "frontend/build/asset-manifest.json" ]; then
    echo "📄 Copie du manifest React..."
    cp frontend/build/asset-manifest.json frontend/static/frontend/
fi

# Nettoyer les anciens fichiers statiques Django
echo "🧹 Nettoyage des anciens fichiers statiques..."
rm -rf staticfiles/*

# Collecter les nouveaux fichiers statiques
echo "📦 Collecte des fichiers statiques Django..."
python manage.py collectstatic --noinput

echo "✅ Synchronisation terminée avec succès!"
echo ""
echo "📊 Résumé:"
echo "  - Fichiers React copiés vers frontend/static/frontend/"
echo "  - Fichiers statiques Django collectés vers staticfiles/"
echo "  - Templates mis à jour automatiquement avec les nouveaux hash"
echo ""
echo "🚀 Vous pouvez maintenant déployer ou tester l'application!"
