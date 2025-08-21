#!/bin/bash

echo "🔧 Configuration des alias P3000..."

# Configuration
PROJECT_DIR="/var/www/p3000/Desktop/Projet/P3000/Application"

echo "[INFO] 📁 Répertoire: $PROJECT_DIR"
cd "$PROJECT_DIR"

# Rendre les scripts exécutables
chmod +x deploy_auto.sh
chmod +x restart_app.sh

# Ajouter les alias au .bashrc
echo "[INFO] 🔧 Ajout des alias..."

# Alias pour le déploiement complet
if ! grep -q "alias p3000-deploy" ~/.bashrc; then
    echo 'alias p3000-deploy="/var/www/p3000/Desktop/Projet/P3000/Application/deploy_auto.sh"' >> ~/.bashrc
    echo "[INFO] ✅ Alias p3000-deploy ajouté"
else
    echo "[INFO] ℹ️ Alias p3000-deploy déjà présent"
fi

# Alias pour le redémarrage rapide
if ! grep -q "alias p3000-restart" ~/.bashrc; then
    echo 'alias p3000-restart="/var/www/p3000/Desktop/Projet/P3000/Application/restart_app.sh"' >> ~/.bashrc
    echo "[INFO] ✅ Alias p3000-restart ajouté"
else
    echo "[INFO] ℹ️ Alias p3000-restart déjà présent"
fi

# Recharger le .bashrc
source ~/.bashrc

echo "[INFO] ✅ Configuration terminée!"
echo "[INFO] 📝 Commandes disponibles:"
echo "   - p3000-deploy    : Déploiement complet"
echo "   - p3000-restart   : Redémarrage rapide"
