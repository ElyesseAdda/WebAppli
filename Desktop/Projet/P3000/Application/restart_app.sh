#!/bin/bash

echo "🔄 Redémarrage rapide P3000..."

# Configuration
PROJECT_DIR="/var/www/p3000/Desktop/Projet/P3000/Application"
VENV_PATH="/root/venv"

echo "[INFO] 📁 Répertoire: $PROJECT_DIR"
cd "$PROJECT_DIR"

echo "[INFO] 🐍 Activation de l'environnement virtuel..."
source "$VENV_PATH/bin/activate"

echo "[INFO] 🛑 Arrêt de Gunicorn..."
systemctl stop gunicorn

echo "[INFO] 🚀 Redémarrage de Gunicorn..."
systemctl start gunicorn

echo "[INFO] ✅ Gunicorn redémarré avec succès"
echo "[INFO] 🌐 Application disponible sur: https://myp3000app.com"

echo "[INFO] 📊 Statut du service:"
systemctl status gunicorn --no-pager

echo "[INFO] ✅ Redémarrage terminé avec succès!"
