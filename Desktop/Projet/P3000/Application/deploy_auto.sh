#!/bin/bash

# Se donner automatiquement les permissions d'exécution
chmod +x "$0"

echo "🚀 Déploiement automatique P3000..."

# Configuration
PROJECT_DIR="/var/www/p3000/Desktop/Projet/P3000/Application"
VENV_PATH="/root/venv"

echo "[INFO] 📁 Répertoire: $PROJECT_DIR"
cd "$PROJECT_DIR"

echo "[INFO] 🐍 Activation de l'environnement virtuel..."
source "$VENV_PATH/bin/activate"

echo "[INFO] 📄 Chargement des variables d'environnement..."
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "[INFO] ✅ Variables d'environnement chargées"
else
    echo "[WARNING] ⚠️ Fichier .env non trouvé"
fi

echo "[INFO] 🧹 Nettoyage des fichiers .pyc..."
find . -name "*.pyc" -delete
find . -name "__pycache__" -type d -exec rm -rf {} +

echo "[INFO] 🔄 Vérification des mises à jour Git..."
git fetch origin

echo "[INFO] 🔄 Mise à jour du code depuis Git..."
# Sauvegarder le fichier .env avant le reset
if [ -f ".env" ]; then
    cp .env .env.backup
    echo "[INFO] 📄 Fichier .env sauvegardé"
fi

git checkout main
git pull origin main

# Restaurer le fichier .env après le reset
if [ -f ".env.backup" ]; then
    cp .env.backup .env
    rm .env.backup
    echo "[INFO] 📄 Fichier .env restauré"
fi

echo "[INFO] 📦 Mise à jour des dépendances..."
pip install -r requirements.txt

echo "[INFO] 📁 Collecte des fichiers statiques..."
python manage.py collectstatic --noinput

echo "[INFO] 🗄️ Application des migrations..."
python manage.py migrate

echo "[INFO] 🎨 Build du frontend..."
cd frontend
npm install --production
npm run build
cd ..

echo "[INFO] 🛑 Arrêt de Gunicorn..."
systemctl stop gunicorn

echo "[INFO] 🚀 Redémarrage de Gunicorn..."
systemctl start gunicorn

echo "[INFO] ✅ Gunicorn redémarré avec succès"
echo "[INFO] 🌐 Application disponible sur: https://myp3000app.com"

echo "[INFO] 📊 Statut du service:"
systemctl status gunicorn --no-pager

echo "[INFO] ✅ Déploiement terminé avec succès!"
