#!/bin/bash

# Script de déploiement pour la production
# Usage: ./deploy.sh

echo "🚀 Déploiement en production..."

# 1. Arrêter le serveur
echo "📋 Arrêt du serveur..."
sudo systemctl stop gunicorn
sudo systemctl stop nginx

# 2. Mettre à jour le code
echo "📋 Mise à jour du code..."
git pull origin main

# 3. Installer/mettre à jour les dépendances
echo "📋 Installation des dépendances..."
pip install -r requirements.txt

# 4. Collecter les fichiers statiques
echo "📋 Collecte des fichiers statiques..."
python manage.py collectstatic --noinput

# 5. Appliquer les migrations
echo "📋 Application des migrations..."
python manage.py migrate

# 6. Redémarrer les services
echo "📋 Redémarrage des services..."
sudo systemctl start gunicorn
sudo systemctl start nginx

# 7. Vérifier le statut
echo "📋 Vérification du statut..."
sudo systemctl status gunicorn
sudo systemctl status nginx

echo "✅ Déploiement terminé !"
