#!/bin/bash

echo "🔄 Redémarrage rapide de l'application..."

# Configuration (peut être surchargée par des variables d'environnement)
PROJECT_DIR="${PROJECT_DIR:-/var/www/p3000/Desktop/Projet/P3000/Application}"
VENV_PATH="${VENV_PATH:-/root/venv}"
CLIENT_BASE_URL="${CLIENT_BASE_URL:-https://myp3000app.com}"

echo "[INFO] 📁 Répertoire: $PROJECT_DIR"
cd "$PROJECT_DIR"

echo "[INFO] 🐍 Activation de l'environnement virtuel..."
source "$VENV_PATH/bin/activate"

echo "[INFO] 🛑 Arrêt de Gunicorn..."
systemctl stop gunicorn

echo "[INFO] 🚀 Redémarrage de Gunicorn..."
systemctl start gunicorn

echo "[INFO] ✅ Gunicorn redémarré avec succès"
echo "[INFO] 🌐 Application disponible sur: $CLIENT_BASE_URL"

echo "[INFO] 📊 Statut du service:"
systemctl status gunicorn --no-pager

echo "[INFO] ✅ Redémarrage terminé avec succès!"
