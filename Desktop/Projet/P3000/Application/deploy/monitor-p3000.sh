#!/bin/bash
#
# Script de monitoring pour P3000
# Usage: ./monitor-p3000.sh
#

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📊 Monitoring P3000 Production${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Date: $(date '+%Y-%m-%d %H:%M:%S')\n"

# ============================================
# Services
# ============================================
echo -e "${YELLOW}🔧 État des Services${NC}"
echo -e "========================================${NC}"

check_service() {
    SERVICE=$1
    if systemctl is-active --quiet "$SERVICE"; then
        echo -e "   ${GREEN}✅ $SERVICE: Actif${NC}"
        # Uptime
        UPTIME=$(systemctl show "$SERVICE" --property=ActiveEnterTimestamp --value)
        if [ -n "$UPTIME" ]; then
            echo -e "      Démarré: $UPTIME"
        fi
    else
        echo -e "   ${RED}❌ $SERVICE: Inactif${NC}"
    fi
}

check_service "postgresql"
check_service "redis"
check_service "p3000"
check_service "nginx"

# Docker OnlyOffice
echo -e "\n   OnlyOffice (Docker):"
if docker ps | grep -q onlyoffice; then
    CONTAINER_STATUS=$(docker ps --filter "name=onlyoffice" --format "{{.Status}}")
    echo -e "   ${GREEN}✅ OnlyOffice: $CONTAINER_STATUS${NC}"
else
    echo -e "   ${RED}❌ OnlyOffice: Conteneur arrêté${NC}"
fi

# ============================================
# Ressources Système
# ============================================
echo -e "\n${YELLOW}💻 Ressources Système${NC}"
echo -e "========================================${NC}"

# CPU
echo -e "⚡ CPU:"
LOAD=$(uptime | awk -F'load average:' '{ print $2 }')
echo -e "   Load average:$LOAD"

# Mémoire
echo -e "\n💾 Mémoire:"
free -h | grep -E "Mem|Swap" | while read line; do
    echo -e "   $line"
done

# Disque
echo -e "\n💿 Espace Disque:"
df -h / | tail -1 | awk '{printf "   Partition racine: %s utilisé sur %s (%s)\n", $3, $2, $5}'

# Inodes (important pour beaucoup de petits fichiers)
INODE_USAGE=$(df -i / | tail -1 | awk '{print $5}')
echo -e "   Inodes utilisés: $INODE_USAGE"

# ============================================
# Base de Données PostgreSQL
# ============================================
echo -e "\n${YELLOW}🗄️  Base de Données PostgreSQL${NC}"
echo -e "========================================${NC}"

# Taille de la DB
DB_SIZE=$(sudo -u postgres psql -d p3000db -t -c "SELECT pg_size_pretty(pg_database_size('p3000db'));" 2>/dev/null | xargs)
if [ -n "$DB_SIZE" ]; then
    echo -e "   Taille DB: $DB_SIZE"
else
    echo -e "   ${YELLOW}⚠️  Impossible de récupérer la taille${NC}"
fi

# Nombre de connexions actives
ACTIVE_CONNECTIONS=$(sudo -u postgres psql -d p3000db -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='p3000db';" 2>/dev/null | xargs)
if [ -n "$ACTIVE_CONNECTIONS" ]; then
    echo -e "   Connexions actives: $ACTIVE_CONNECTIONS"
fi

# Dernières tables modifiées
echo -e "   Dernières tables actives:"
sudo -u postgres psql -d p3000db -t -c "SELECT schemaname||'.'||relname as table, last_vacuum, last_autovacuum FROM pg_stat_user_tables WHERE last_autovacuum IS NOT NULL ORDER BY last_autovacuum DESC LIMIT 3;" 2>/dev/null | head -3 | sed 's/^/      /'

# ============================================
# Redis Cache
# ============================================
echo -e "\n${YELLOW}🔄 Cache Redis${NC}"
echo -e "========================================${NC}"

REDIS_KEYS=$(redis-cli DBSIZE 2>/dev/null | awk '{print $2}')
if [ -n "$REDIS_KEYS" ]; then
    echo -e "   Clés en cache: $REDIS_KEYS"
else
    echo -e "   ${YELLOW}⚠️  Redis non accessible${NC}"
fi

REDIS_MEMORY=$(redis-cli INFO memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
if [ -n "$REDIS_MEMORY" ]; then
    echo -e "   Mémoire utilisée: $REDIS_MEMORY"
fi

# ============================================
# Logs et Erreurs
# ============================================
echo -e "\n${YELLOW}📝 Logs Récents (dernières 24h)${NC}"
echo -e "========================================${NC}"

# Erreurs P3000
ERROR_COUNT=$(sudo journalctl -u p3000 --since "24 hours ago" 2>/dev/null | grep -ic error || echo "0")
WARNING_COUNT=$(sudo journalctl -u p3000 --since "24 hours ago" 2>/dev/null | grep -ic warning || echo "0")

echo -e "   Erreurs (P3000): $ERROR_COUNT"
echo -e "   Avertissements (P3000): $WARNING_COUNT"

# Afficher les dernières erreurs si présentes
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "\n   ${RED}⚠️  Dernières erreurs:${NC}"
    sudo journalctl -u p3000 --since "24 hours ago" 2>/dev/null | grep -i error | tail -3 | sed 's/^/      /'
fi

# Erreurs Nginx
NGINX_ERRORS=$(grep -c "error" /var/log/nginx/p3000_error.log 2>/dev/null || echo "0")
echo -e "\n   Erreurs Nginx: $NGINX_ERRORS"

# ============================================
# Trafic Web (Nginx)
# ============================================
echo -e "\n${YELLOW}🌐 Trafic Web (dernières 24h)${NC}"
echo -e "========================================${NC}"

if [ -f /var/log/nginx/p3000_access.log ]; then
    TODAY=$(date '+%d/%b/%Y')
    YESTERDAY=$(date -d yesterday '+%d/%b/%Y')
    
    # Requêtes totales
    TOTAL_REQUESTS=$(grep -E "($TODAY|$YESTERDAY)" /var/log/nginx/p3000_access.log 2>/dev/null | wc -l)
    echo -e "   Requêtes totales: $TOTAL_REQUESTS"
    
    # IPs uniques
    UNIQUE_IPS=$(grep -E "($TODAY|$YESTERDAY)" /var/log/nginx/p3000_access.log 2>/dev/null | awk '{print $1}' | sort -u | wc -l)
    echo -e "   Visiteurs uniques: $UNIQUE_IPS"
    
    # Codes de statut
    STATUS_200=$(grep -E "($TODAY|$YESTERDAY)" /var/log/nginx/p3000_access.log 2>/dev/null | grep -c ' 200 ')
    STATUS_404=$(grep -E "($TODAY|$YESTERDAY)" /var/log/nginx/p3000_access.log 2>/dev/null | grep -c ' 404 ')
    STATUS_500=$(grep -E "($TODAY|$YESTERDAY)" /var/log/nginx/p3000_access.log 2>/dev/null | grep -c ' 5[0-9][0-9] ')
    
    echo -e "   Succès (200): $STATUS_200"
    echo -e "   Non trouvé (404): $STATUS_404"
    if [ "$STATUS_500" -gt 0 ]; then
        echo -e "   ${RED}Erreurs serveur (5xx): $STATUS_500${NC}"
    else
        echo -e "   ${GREEN}Erreurs serveur (5xx): $STATUS_500${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Logs Nginx non disponibles${NC}"
fi

# ============================================
# Backups
# ============================================
echo -e "\n${YELLOW}💾 Backups PostgreSQL${NC}"
echo -e "========================================${NC}"

if [ -d /var/backups/postgres ]; then
    BACKUP_COUNT=$(find /var/backups/postgres -name "p3000db_*.sql.gz" | wc -l)
    echo -e "   Nombre de backups: $BACKUP_COUNT"
    
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        LAST_BACKUP=$(ls -t /var/backups/postgres/p3000db_*.sql.gz | head -1)
        LAST_BACKUP_DATE=$(stat -c %y "$LAST_BACKUP" | cut -d' ' -f1-2)
        LAST_BACKUP_SIZE=$(du -h "$LAST_BACKUP" | cut -f1)
        echo -e "   Dernier backup: $LAST_BACKUP_DATE ($LAST_BACKUP_SIZE)"
    fi
    
    BACKUP_TOTAL_SIZE=$(du -sh /var/backups/postgres 2>/dev/null | cut -f1)
    echo -e "   Espace total: $BACKUP_TOTAL_SIZE"
else
    echo -e "   ${YELLOW}⚠️  Dossier de backup non trouvé${NC}"
fi

# ============================================
# OnlyOffice Docker
# ============================================
echo -e "\n${YELLOW}🐳 OnlyOffice Docker${NC}"
echo -e "========================================${NC}"

if docker ps | grep -q onlyoffice; then
    CONTAINER_ID=$(docker ps --filter "name=onlyoffice" --format "{{.ID}}")
    
    # CPU et Mémoire du conteneur
    CONTAINER_STATS=$(docker stats --no-stream --format "{{.CPUPerc}} CPU, {{.MemUsage}}" "$CONTAINER_ID" 2>/dev/null)
    echo -e "   Ressources: $CONTAINER_STATS"
    
    # Uptime du conteneur
    CONTAINER_UPTIME=$(docker ps --filter "name=onlyoffice" --format "{{.Status}}")
    echo -e "   Status: $CONTAINER_UPTIME"
else
    echo -e "   ${RED}❌ Conteneur OnlyOffice non actif${NC}"
fi

# ============================================
# Score de Santé
# ============================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}🏥 Score de Santé Global${NC}"
echo -e "${BLUE}========================================${NC}"

HEALTH_SCORE=100
ISSUES=()

# Vérifier les services
systemctl is-active --quiet postgresql || { HEALTH_SCORE=$((HEALTH_SCORE - 30)); ISSUES+=("PostgreSQL inactif"); }
systemctl is-active --quiet redis || { HEALTH_SCORE=$((HEALTH_SCORE - 15)); ISSUES+=("Redis inactif"); }
systemctl is-active --quiet p3000 || { HEALTH_SCORE=$((HEALTH_SCORE - 40)); ISSUES+=("P3000 inactif"); }
systemctl is-active --quiet nginx || { HEALTH_SCORE=$((HEALTH_SCORE - 20)); ISSUES+=("Nginx inactif"); }
docker ps | grep -q onlyoffice || { HEALTH_SCORE=$((HEALTH_SCORE - 10)); ISSUES+=("OnlyOffice arrêté"); }

# Vérifier les erreurs
[ "$ERROR_COUNT" -gt 10 ] && { HEALTH_SCORE=$((HEALTH_SCORE - 10)); ISSUES+=("Trop d'erreurs dans les logs"); }

# Vérifier l'espace disque
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
[ "$DISK_USAGE" -gt 90 ] && { HEALTH_SCORE=$((HEALTH_SCORE - 20)); ISSUES+=("Espace disque critique"); }
[ "$DISK_USAGE" -gt 80 ] && [ "$DISK_USAGE" -le 90 ] && { HEALTH_SCORE=$((HEALTH_SCORE - 10)); ISSUES+=("Espace disque élevé"); }

# Afficher le score
if [ "$HEALTH_SCORE" -ge 90 ]; then
    echo -e "\nScore de santé: ${GREEN}$HEALTH_SCORE/100 ✅${NC}"
    echo -e "${GREEN}✅ Tous les systèmes fonctionnent normalement${NC}"
elif [ "$HEALTH_SCORE" -ge 70 ]; then
    echo -e "\nScore de santé: ${YELLOW}$HEALTH_SCORE/100 ⚠️${NC}"
    echo -e "${YELLOW}⚠️  Problèmes mineurs détectés:${NC}"
    for issue in "${ISSUES[@]}"; do
        echo -e "   - $issue"
    done
else
    echo -e "\nScore de santé: ${RED}$HEALTH_SCORE/100 ❌${NC}"
    echo -e "${RED}❌ Problèmes critiques détectés:${NC}"
    for issue in "${ISSUES[@]}"; do
        echo -e "   - $issue"
    done
fi

# ============================================
# Informations de connexion
# ============================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "🌐 URL: https://myp3000app.com"
echo -e "📊 Admin: https://myp3000app.com/admin"
echo -e "${BLUE}========================================${NC}\n"

exit 0
