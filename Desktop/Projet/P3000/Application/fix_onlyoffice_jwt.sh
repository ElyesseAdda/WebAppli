#!/bin/bash
# Script pour désactiver JWT pour les requêtes navigateur dans OnlyOffice
# Ce script modifie le fichier local.json dans le conteneur OnlyOffice

echo "🔧 Modification de la configuration OnlyOffice..."

# Vérifier que le conteneur existe
if ! docker ps | grep -q "onlyoffice"; then
    echo "❌ Le conteneur OnlyOffice n'est pas en cours d'exécution"
    exit 1
fi

# Entrer dans le conteneur et modifier le fichier
echo "📝 Modification du fichier local.json..."
docker exec -i onlyoffice bash << 'EOF'
# Vérifier que le fichier existe
if [ ! -f /etc/onlyoffice/documentserver/local.json ]; then
    echo "❌ Le fichier local.json n'existe pas"
    exit 1
fi

# Créer une sauvegarde
cp /etc/onlyoffice/documentserver/local.json /etc/onlyoffice/documentserver/local.json.backup

# Modifier le fichier avec sed
sed -i 's/"browser": true/"browser": false/g' /etc/onlyoffice/documentserver/local.json

# Vérifier la modification
if grep -q '"browser": false' /etc/onlyoffice/documentserver/local.json; then
    echo "✅ Modification réussie : browser est maintenant false"
    cat /etc/onlyoffice/documentserver/local.json | grep -A 3 '"enable"'
else
    echo "❌ La modification a échoué"
    # Restaurer la sauvegarde
    mv /etc/onlyoffice/documentserver/local.json.backup /etc/onlyoffice/documentserver/local.json
    exit 1
fi
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "🔄 Redémarrage de OnlyOffice..."
    cd /opt/onlyoffice
    docker compose restart onlyoffice
    
    echo ""
    echo "⏳ Attente du redémarrage (15 secondes)..."
    sleep 15
    
    echo ""
    echo "✅ Vérification de la configuration..."
    docker exec -it onlyoffice cat /etc/onlyoffice/documentserver/local.json | grep -A 3 '"enable"'
    
    echo ""
    echo "✅ OnlyOffice a été redémarré avec la nouvelle configuration"
    echo "📋 Testez maintenant l'ouverture d'un fichier dans OnlyOffice"
else
    echo "❌ Erreur lors de la modification"
    exit 1
fi

