#!/bin/bash
#
# Script de monitoring de l'environnement de démonstration
# Usage: ./monitor_demo.sh
#
# Affiche les statistiques et l'état de santé de l'environnement DEMO
#

DEMO_DIR="/var/www/demo/Desktop/Projet/P3000/Application"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📊 Monitoring Environnement DEMO${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Date: $(date '+%Y-%m-%d %H:%M:%S')\n"

# Vérifier que le répertoire existe
if [ ! -d "$DEMO_DIR" ]; then
    echo -e "${RED}❌ Erreur: Répertoire DEMO non trouvé${NC}"
    exit 1
fi

cd "$DEMO_DIR"
source /var/www/demo/venv/bin/activate

# État du service
echo -e "${YELLOW}🔧 État du Service${NC}"
echo -e "=================="
if systemctl is-active --quiet demo; then
    echo -e "Status: ${GREEN}✅ Actif${NC}"
    uptime_seconds=$(systemctl show demo --property=ActiveEnterTimestampMonotonic --value)
    if [ -n "$uptime_seconds" ] && [ "$uptime_seconds" -gt 0 ]; then
        current_monotonic=$(cat /proc/uptime | awk '{print int($1 * 1000000)}')
        uptime_sec=$((($current_monotonic - $uptime_seconds) / 1000000))
        uptime_days=$(($uptime_sec / 86400))
        uptime_hours=$((($uptime_sec % 86400) / 3600))
        uptime_min=$((($uptime_sec % 3600) / 60))
        echo -e "Uptime: ${uptime_days}j ${uptime_hours}h ${uptime_min}m"
    fi
else
    echo -e "Status: ${RED}❌ Inactif${NC}"
fi

# Port d'écoute
port_check=$(ss -tlnp | grep :8003)
if [ -n "$port_check" ]; then
    echo -e "Port 8003: ${GREEN}✅ En écoute${NC}"
else
    echo -e "Port 8003: ${RED}❌ Non accessible${NC}"
fi

# Statistiques de la base de données
echo -e "\n${YELLOW}📊 Statistiques Base de Données${NC}"
echo -e "================================"
python manage.py shell << 'EOF'
from api.models import Chantier, Devis, Facture, Client, Fournisseur, SousTraitant, User
from django.contrib.sessions.models import Session
from django.utils import timezone
from datetime import timedelta

print(f"Chantiers: {Chantier.objects.count()}")
print(f"Devis: {Devis.objects.count()}")
print(f"Factures: {Facture.objects.count()}")
print(f"Clients: {Client.objects.count()}")
print(f"Fournisseurs: {Fournisseur.objects.count()}")
print(f"Sous-traitants: {SousTraitant.objects.count()}")
print(f"Utilisateurs totaux: {User.objects.count()}")
print(f"Utilisateurs actifs: {User.objects.filter(is_active=True).count()}")

# Sessions actives
active_sessions = Session.objects.filter(expire_date__gte=timezone.now()).count()
print(f"Sessions actives: {active_sessions}")

# Dernière activité
last_login_user = User.objects.filter(last_login__isnull=False).order_by('-last_login').first()
if last_login_user:
    print(f"Dernière connexion: {last_login_user.username} - {last_login_user.last_login.strftime('%Y-%m-%d %H:%M:%S')}")
else:
    print("Dernière connexion: Aucune")

# Activité des dernières 24h
yesterday = timezone.now() - timedelta(hours=24)
recent_logins = User.objects.filter(last_login__gte=yesterday).count()
print(f"Connexions (24h): {recent_logins}")
EOF

# Utilisation de la base de données PostgreSQL
echo -e "\n${YELLOW}💾 Utilisation Base de Données${NC}"
echo -e "==============================="
db_size=$(psql -U p3000user -d p3000db_demo -t -c "SELECT pg_size_pretty(pg_database_size('p3000db_demo'));" 2>/dev/null | xargs)
if [ -n "$db_size" ]; then
    echo -e "Taille DB: $db_size"
else
    echo -e "Taille DB: ${YELLOW}Non disponible${NC}"
fi

# Cache Redis
echo -e "\n${YELLOW}🔄 Cache Redis (DB 3)${NC}"
echo -e "====================="
redis_info=$(redis-cli -n 3 DBSIZE 2>/dev/null)
if [ -n "$redis_info" ]; then
    echo -e "Clés en cache: $redis_info"
    redis_memory=$(redis-cli INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    echo -e "Mémoire utilisée: $redis_memory"
else
    echo -e "${YELLOW}Redis: Non disponible${NC}"
fi

# Espace disque
echo -e "\n${YELLOW}💿 Espace Disque${NC}"
echo -e "================"
disk_usage=$(df -h /var/www/demo | tail -1 | awk '{print $5 " utilisé (" $3 "/" $2 ")"}')
echo -e "Partition: $disk_usage"

# Logs récents
echo -e "\n${YELLOW}📝 Logs Récents (dernières 24h)${NC}"
echo -e "================================"

# Compter les erreurs dans les logs
error_count=$(journalctl -u demo --since "24 hours ago" | grep -i error | wc -l)
warning_count=$(journalctl -u demo --since "24 hours ago" | grep -i warning | wc -l)

echo -e "Erreurs (24h): $error_count"
echo -e "Avertissements (24h): $warning_count"

if [ $error_count -gt 0 ]; then
    echo -e "\n${RED}⚠️  Dernières erreurs:${NC}"
    journalctl -u demo --since "24 hours ago" | grep -i error | tail -3
fi

# Trafic Nginx (dernières 24h)
echo -e "\n${YELLOW}🌐 Trafic Web (dernières 24h)${NC}"
echo -e "=============================="

if [ -f /var/log/nginx/demo_access.log ]; then
    today=$(date '+%d/%b/%Y')
    yesterday=$(date -d yesterday '+%d/%b/%Y')
    
    # Requêtes totales
    total_requests=$(grep -E "($today|$yesterday)" /var/log/nginx/demo_access.log 2>/dev/null | wc -l)
    echo -e "Requêtes totales: $total_requests"
    
    # IPs uniques
    unique_ips=$(grep -E "($today|$yesterday)" /var/log/nginx/demo_access.log 2>/dev/null | awk '{print $1}' | sort -u | wc -l)
    echo -e "Visiteurs uniques: $unique_ips"
    
    # Codes de statut
    status_200=$(grep -E "($today|$yesterday)" /var/log/nginx/demo_access.log 2>/dev/null | grep ' 200 ' | wc -l)
    status_404=$(grep -E "($today|$yesterday)" /var/log/nginx/demo_access.log 2>/dev/null | grep ' 404 ' | wc -l)
    status_500=$(grep -E "($today|$yesterday)" /var/log/nginx/demo_access.log 2>/dev/null | grep ' 5[0-9][0-9] ' | wc -l)
    
    echo -e "Succès (200): $status_200"
    echo -e "Non trouvé (404): $status_404"
    echo -e "Erreurs serveur (5xx): $status_500"
    
    # Pages les plus visitées
    echo -e "\n${YELLOW}Pages les plus visitées:${NC}"
    grep -E "($today|$yesterday)" /var/log/nginx/demo_access.log 2>/dev/null | \
        awk '{print $7}' | grep -v '\.(js|css|png|jpg|ico|woff)' | \
        sort | uniq -c | sort -rn | head -5 | \
        awk '{printf "  %s - %d visites\n", $2, $1}'
else
    echo -e "${YELLOW}Logs Nginx: Non disponibles${NC}"
fi

# Prochain reset
echo -e "\n${YELLOW}📅 Prochain Reset Automatique${NC}"
echo -e "==============================="
next_monday=$(date -d "next monday" '+%Y-%m-%d 02:00:00')
echo -e "Date: $next_monday"

# Santé globale
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}🏥 État de Santé Global${NC}"
echo -e "${BLUE}========================================${NC}"

health_score=100
health_issues=()

# Vérifier le service
if ! systemctl is-active --quiet demo; then
    health_score=$((health_score - 50))
    health_issues+=("Service inactif")
fi

# Vérifier les erreurs récentes
if [ $error_count -gt 10 ]; then
    health_score=$((health_score - 20))
    health_issues+=("Trop d'erreurs dans les logs")
fi

# Vérifier l'espace disque
disk_percent=$(df -h /var/www/demo | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $disk_percent -gt 90 ]; then
    health_score=$((health_score - 30))
    health_issues+=("Espace disque critique")
fi

# Afficher le score de santé
if [ $health_score -ge 80 ]; then
    echo -e "Score de santé: ${GREEN}$health_score/100 ✅${NC}"
    echo -e "${GREEN}Tout fonctionne normalement${NC}"
elif [ $health_score -ge 50 ]; then
    echo -e "Score de santé: ${YELLOW}$health_score/100 ⚠️${NC}"
    echo -e "${YELLOW}Problèmes mineurs détectés:${NC}"
    for issue in "${health_issues[@]}"; do
        echo -e "  - $issue"
    done
else
    echo -e "Score de santé: ${RED}$health_score/100 ❌${NC}"
    echo -e "${RED}Problèmes critiques détectés:${NC}"
    for issue in "${health_issues[@]}"; do
        echo -e "  - $issue"
    done
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "🌐 URL: https://demo.myp3000app.com"
echo -e "👤 Identifiants: demo@entreprise.com / DemoP3000!"
echo -e "${BLUE}========================================${NC}\n"

exit 0
