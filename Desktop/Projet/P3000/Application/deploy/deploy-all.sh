#!/usr/bin/env bash
# =============================================================================
# deploy/deploy-all.sh — Déploiement simultané P3000 + Elekable + MJRService
# =============================================================================
# À exécuter sur le serveur (les 3 apps sont sur le même VPS)
#
# Usage :
#   bash /var/www/p3000/Desktop/Projet/P3000/Application/deploy/deploy-all.sh
#   ou via alias :
#   all-deploy
# =============================================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()      { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
log_ok()   { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"; }
log_err()  { echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"; }

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗"
echo -e "║  Déploiement ALL — $(date '+%d/%m/%Y %H:%M')                     ║"
echo -e "╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

deploy_app() {
    local name="$1"
    local script="$2"

    echo ""
    echo -e "${BOLD}${CYAN}━━━  $name  ━━━${NC}"
    if bash "$script"; then
        log_ok "$name déployé avec succès"
    else
        log_err "$name a échoué — vérifiez les logs"
    fi
}

# P3000
deploy_app "P3000 (myp3000app.com)" \
    "/var/www/p3000/Desktop/Projet/P3000/Application/deploy_production.sh"

# Elekable
deploy_app "Elekable (elekable.fr)" \
    "/var/www/elekable/Desktop/Projet/P3000/Application/deploy/elekable/deploy.sh"

# MJRService
deploy_app "MJRService (mjrserviceapp.com)" \
    "/var/www/mjrservice/Desktop/Projet/P3000/Application/deploy/mjrservice/deploy.sh"

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗"
echo -e "║  ✅  Déploiement ALL terminé                             ║"
echo -e "╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "   🌐 myp3000app.com"
echo -e "   🌐 elekable.fr"
echo -e "   🌐 mjrserviceapp.com"
echo ""
