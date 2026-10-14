#!/bin/bash
#
# Script de backup automatique PostgreSQL pour P3000
# À ajouter dans le crontab: 0 2 * * * /usr/local/bin/backup-postgres.sh
#

set -e

# Configuration
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/postgres"
DB_NAME="p3000db"
DB_USER="postgres"
RETENTION_DAYS=7

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}💾 Backup PostgreSQL P3000${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Date: $(date '+%Y-%m-%d %H:%M:%S')\n"

# Vérifier que le dossier existe
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}📁 Création du dossier de backup...${NC}"
    mkdir -p "$BACKUP_DIR"
    chown postgres:postgres "$BACKUP_DIR"
fi

# Faire le backup
echo -e "${YELLOW}💾 Création du backup...${NC}"
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_$DATE.sql"

sudo -u postgres pg_dump "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup créé: $BACKUP_FILE${NC}"
    
    # Compresser le backup
    echo -e "${YELLOW}📦 Compression du backup...${NC}"
    gzip "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup compressé: ${BACKUP_FILE}.gz${NC}"
    
    # Taille du backup
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    echo -e "${GREEN}📊 Taille: $BACKUP_SIZE${NC}"
else
    echo -e "${RED}❌ Erreur lors de la création du backup${NC}"
    exit 1
fi

# Nettoyer les vieux backups
echo -e "\n${YELLOW}🗑️  Nettoyage des backups anciens (> $RETENTION_DAYS jours)...${NC}"
DELETED_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)

if [ "$DELETED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ $DELETED_COUNT backup(s) supprimé(s)${NC}"
else
    echo -e "${GREEN}✅ Aucun backup à supprimer${NC}"
fi

# Statistiques
echo -e "\n${YELLOW}📊 Statistiques:${NC}"
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo -e "   Total backups: $TOTAL_BACKUPS"
echo -e "   Espace utilisé: $TOTAL_SIZE"

# Test de validité du backup (optionnel)
echo -e "\n${YELLOW}🔍 Test de validité du backup...${NC}"
if gunzip -t "${BACKUP_FILE}.gz" 2>/dev/null; then
    echo -e "${GREEN}✅ Backup valide et non corrompu${NC}"
else
    echo -e "${RED}❌ Attention: Le backup semble corrompu!${NC}"
    exit 1
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Backup terminé avec succès !${NC}"
echo -e "${GREEN}========================================${NC}\n"

exit 0
