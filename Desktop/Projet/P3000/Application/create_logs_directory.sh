#!/bin/bash

# Script pour créer le répertoire de logs Django
# À exécuter sur le serveur de production

echo "🔧 Création du répertoire de logs Django..."

# Créer le répertoire de logs
sudo mkdir -p /var/log/django

# Donner les bonnes permissions
sudo chown www-data:www-data /var/log/django
sudo chmod 755 /var/log/django

# Créer le fichier de log initial
sudo touch /var/log/django/app.log
sudo chown www-data:www-data /var/log/django/app.log
sudo chmod 644 /var/log/django/app.log

echo "✅ Répertoire de logs créé: /var/log/django/"
echo "✅ Fichier de log créé: /var/log/django/app.log"
echo "✅ Permissions configurées pour www-data"

# Vérifier que tout est en place
echo ""
echo "📋 Vérification:"
ls -la /var/log/django/
echo ""
echo "🔍 Test d'écriture dans le log..."
echo "$(date): Test d'écriture dans le log Django" | sudo tee -a /var/log/django/app.log
echo "✅ Test d'écriture réussi !"
