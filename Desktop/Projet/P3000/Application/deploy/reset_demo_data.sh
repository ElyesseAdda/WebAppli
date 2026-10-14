#!/bin/bash
#
# Script de réinitialisation de l'environnement de démonstration
# Usage: ./reset_demo_data.sh
#
# Ce script est exécuté automatiquement chaque lundi à 2h du matin via cron
# Il réinitialise toutes les données de l'environnement DEMO
#

set -e  # Arrêter en cas d'erreur

DEMO_DIR="/var/www/demo/Desktop/Projet/P3000/Application"
BACKUP_DIR="/var/backups/postgres"
LOG_FILE="/var/log/demo/reset.log"

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🔄 Réinitialisation Environnement DEMO${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Date: $(date '+%Y-%m-%d %H:%M:%S')\n"

# Vérifier que nous sommes sur le bon serveur
if [ ! -d "$DEMO_DIR" ]; then
    echo -e "${RED}❌ Erreur: Répertoire DEMO non trouvé${NC}"
    echo -e "${RED}   Chemin attendu: $DEMO_DIR${NC}"
    exit 1
fi

cd "$DEMO_DIR"

# Activer l'environnement virtuel
echo -e "${YELLOW}📦 Activation de l'environnement virtuel...${NC}"
source /var/www/demo/venv/bin/activate

# Backup de la base de données avant reset
echo -e "${YELLOW}💾 Sauvegarde de la base de données...${NC}"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/p3000db_demo_before_reset_$(date +%Y%m%d_%H%M%S).sql"

pg_dump p3000db_demo > "$BACKUP_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup créé: $BACKUP_FILE${NC}"
    # Compresser le backup
    gzip "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup compressé: ${BACKUP_FILE}.gz${NC}"
else
    echo -e "${RED}❌ Erreur lors du backup de la base de données${NC}"
    exit 1
fi

# Nettoyer les vieux backups (garder seulement les 10 derniers)
echo -e "${YELLOW}🗑️  Nettoyage des anciens backups...${NC}"
cd "$BACKUP_DIR"
ls -t p3000db_demo_before_reset_*.sql.gz | tail -n +11 | xargs -r rm
cd "$DEMO_DIR"

# Supprimer toutes les données (sauf les utilisateurs admin)
echo -e "${YELLOW}🗑️  Suppression des données existantes...${NC}"
python manage.py flush --no-input
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Données supprimées${NC}"
else
    echo -e "${RED}❌ Erreur lors de la suppression des données${NC}"
    exit 1
fi

# Recréer les utilisateurs de démonstration
echo -e "${YELLOW}👥 Recréation des utilisateurs de démonstration...${NC}"
python manage.py create_demo_users
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Utilisateurs créés${NC}"
else
    echo -e "${RED}❌ Erreur lors de la création des utilisateurs${NC}"
    exit 1
fi

# Charger les données de démonstration
echo -e "${YELLOW}📊 Chargement des données de démonstration...${NC}"
python manage.py load_demo_data --force
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Données de démonstration chargées${NC}"
else
    echo -e "${RED}❌ Erreur lors du chargement des données${NC}"
    exit 1
fi

# Nettoyer les fichiers S3 de plus de 7 jours
echo -e "${YELLOW}☁️  Nettoyage des fichiers S3...${NC}"
python manage.py cleanup_demo_s3 --days 7
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Fichiers S3 nettoyés${NC}"
else
    echo -e "${YELLOW}⚠️  Avertissement: Erreur lors du nettoyage S3 (non bloquant)${NC}"
fi

# Vider le cache Redis
echo -e "${YELLOW}🔄 Vidage du cache Redis (DB 3)...${NC}"
redis-cli -n 3 FLUSHDB
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Cache Redis vidé${NC}"
else
    echo -e "${YELLOW}⚠️  Avertissement: Erreur lors du vidage du cache${NC}"
fi

# Collecter les fichiers statiques
echo -e "${YELLOW}📁 Collecte des fichiers statiques...${NC}"
python manage.py collectstatic --clear --noinput > /dev/null 2>&1
echo -e "${GREEN}✅ Fichiers statiques collectés${NC}"

# Redémarrer le service
echo -e "${YELLOW}🔄 Redémarrage du service demo...${NC}"
systemctl restart demo
sleep 3

# Vérifier que le service est bien démarré
if systemctl is-active --quiet demo; then
    echo -e "${GREEN}✅ Service demo redémarré avec succès${NC}"
else
    echo -e "${RED}❌ Erreur: Le service demo n'a pas pu démarrer${NC}"
    echo -e "${RED}   Consultez les logs: journalctl -u demo -n 50${NC}"
    exit 1
fi

# Statistiques finales
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Réinitialisation terminée avec succès!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n📊 Statistiques:"
python manage.py shell << EOF
from api.models import Chantier, Devis, Client, Fournisseur, SousTraitant, User
print(f"   Chantiers: {Chantier.objects.count()}")
print(f"   Devis: {Devis.objects.count()}")
print(f"   Clients: {Client.objects.count()}")
print(f"   Fournisseurs: {Fournisseur.objects.count()}")
print(f"   Sous-traitants: {SousTraitant.objects.count()}")
print(f"   Utilisateurs: {User.objects.filter(is_active=True).count()}")
EOF

echo -e "\n📅 Prochain reset: Lundi prochain à 2h00"
echo -e "🌐 URL: https://demo.myp3000app.com"
echo -e "👤 Identifiants: demo@entreprise.com / DemoP3000!\n"

# Envoyer une notification (optionnel - nécessite configuration email)
# python manage.py send_notification "Environnement DEMO réinitialisé" "Le reset hebdomadaire a été effectué avec succès."

echo -e "${GREEN}========================================${NC}\n"

exit 0
