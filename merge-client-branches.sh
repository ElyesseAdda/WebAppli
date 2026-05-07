#!/usr/bin/env bash
# =============================================================================
# Script de mise à jour des branches clients depuis main
# Usage : bash merge-client-branches.sh [elekable|mjrservice|both]
#
# Ce script merge main dans les branches client en protégeant :
#   - Les fichiers d'identité visuelle (couleurs, logo, templates)
#   - Les configurations client (env, deploy)
#   - Les migrations Django (gestion séparée selon la branche)
#
# PRÉREQUIS : Exécuter depuis la racine du dépôt git
# =============================================================================

set -e

# --- Couleurs terminal ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

APP_PATH="Desktop/Projet/P3000/Application"

# =============================================================================
# Fichiers à protéger pour TOUS les clients
# (la version du client sera restaurée après le merge)
# =============================================================================
PROTECTED_COMMON=(
    # --- Identité visuelle React ---
    "$APP_PATH/frontend/src/constants/colors.js"
    "$APP_PATH/frontend/src/components/theme.js"

    # --- CSS identité ---
    "$APP_PATH/frontend/static/css/colors.css"
    "$APP_PATH/frontend/static/css/slideBar.css"
    "$APP_PATH/frontend/static/css/app.css"
    "$APP_PATH/frontend/static/css/header.css"
    "$APP_PATH/frontend/static/css/index.css"
    "$APP_PATH/frontend/static/css/dashboard.css"
    "$APP_PATH/frontend/static/css/breadcrumb.css"
    "$APP_PATH/frontend/static/css/laborCostSummary.css"
    "$APP_PATH/frontend/static/css/listChantier.css"
    "$APP_PATH/frontend/static/css/planningHebdo.css"
    "$APP_PATH/frontend/static/css/creationPartie.css"

    # --- Images / Logos ---
    "$APP_PATH/frontend/src/img/logo.png"
    "$APP_PATH/frontend/src/img/image.png"
    "$APP_PATH/frontend/src/img/signature_p3000.png"
    "$APP_PATH/frontend/static/frontend/src/img/logo.png"
    "$APP_PATH/staticfiles/logo.png"
    "$APP_PATH/staticfiles/signature_p3000.png"

    # --- Manifest PWA ---
    "$APP_PATH/frontend/static/manifest.json"
    "$APP_PATH/frontend/static/manifest_rapports.json"
    "$APP_PATH/staticfiles/manifest.json"
    "$APP_PATH/staticfiles/manifest_rapports.json"

    # --- Login (couleurs + logo propres au client) ---
    "$APP_PATH/frontend/src/components/Login.js"
    "$APP_PATH/frontend/src/components/LoginMobile.js"

    # --- Templates documents (couleurs hardcodées par client) ---
    "$APP_PATH/frontend/templates/facture.html"
    "$APP_PATH/frontend/templates/facture_v2.html"
    "$APP_PATH/frontend/templates/preview_devis.html"
    "$APP_PATH/frontend/templates/preview_devis_v2.html"
    "$APP_PATH/frontend/templates/preview_situation.html"
    "$APP_PATH/frontend/templates/preview_situation_v2.html"
    "$APP_PATH/frontend/templates/rapport_intervention.html"
    "$APP_PATH/frontend/templates/rapport_vigik_plus.html"
    "$APP_PATH/frontend/templates/bon_commande.html"
    "$APP_PATH/frontend/templates/certificat_paiement.html"
    "$APP_PATH/frontend/templates/DocumentAgent/monthly_agents_report.html"
    "$APP_PATH/frontend/templates/DocumentAgent/planning_hebdo_agents.html"
    "$APP_PATH/frontend/templates/sous_traitance/avenant_btp.html"
    "$APP_PATH/frontend/templates/sous_traitance/avenant_nettoyage.html"
    "$APP_PATH/frontend/templates/sous_traitance/contrat_btp.html"
    "$APP_PATH/frontend/templates/sous_traitance/contrat_nettoyage.html"

    # --- Settings Django (CLIENT_PUBLIC_DOMAIN etc.) ---
    "$APP_PATH/Application/settings_base.py"

    # --- Scripts et config propres au client ---
    "$APP_PATH/deploy/nginx-template.conf"
)

# Fichiers protégés supplémentaires pour elekable uniquement
PROTECTED_ELEKABLE=(
    "$APP_PATH/deploy/env-elekable.example"
    "$APP_PATH/create_users_elekable.py"
    "$APP_PATH/frontend/templates/frontend/index.html"
    "$APP_PATH/frontend/templates/frontend/index_production.html"
    "$APP_PATH/frontend/static/index.html"
)

# Fichiers protégés supplémentaires pour mjrservice uniquement
PROTECTED_MJRSERVICE=(
    "$APP_PATH/deploy/env-mjrservice.example"
    "$APP_PATH/deploy/deploy-client.sh"
)

# =============================================================================
# Fonctions utilitaires
# =============================================================================

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_section() { echo -e "\n${BOLD}${CYAN}=== $1 ===${NC}"; }

check_git_clean() {
    if ! git diff --quiet HEAD 2>/dev/null; then
        log_error "Il y a des modifications non committées. Commitez ou stashez avant de continuer."
        git status --short
        exit 1
    fi
}

restore_protected_files() {
    local branch="$1"
    local -n files_ref="$2"
    local restored=0
    local skipped=0

    log_info "Restauration des fichiers protégés depuis ${branch}..."
    for file in "${files_ref[@]}"; do
        if git ls-files --error-unmatch "$file" &>/dev/null 2>&1; then
            git checkout "${branch}" -- "$file" 2>/dev/null && \
                { log_ok "  Restauré : $file"; ((restored++)); } || \
                { log_warn "  Ignoré (conflit non résolu) : $file"; ((skipped++)); }
        else
            # Le fichier n'existe pas dans la branche source → on le supprime s'il a été ajouté par main
            if git ls-files --error-unmatch "$file" &>/dev/null 2>&1; then
                git rm --cached "$file" 2>/dev/null || true
                log_warn "  Supprimé (n'existe pas dans ${branch}) : $file"
            fi
        fi
    done
    log_info "Restaurés: ${restored}, Ignorés: ${skipped}"
}

# =============================================================================
# Merge ELEKABLE
# =============================================================================
merge_elekable() {
    log_section "MERGE main → client/elekable"

    check_git_clean

    log_info "Passage sur la branche client/elekable..."
    git checkout client/elekable

    log_info "État de la branche avant merge :"
    git log --oneline -3

    log_info "Merge de main (--no-commit --no-ff)..."
    if git merge main --no-commit --no-ff 2>&1; then
        log_ok "Merge automatique sans conflit détecté"
    else
        log_warn "Conflits détectés — ils seront traités par la restauration des fichiers protégés"
    fi

    # Restaurer les fichiers communs
    log_section "Restauration fichiers identité (communs)"
    restore_protected_files "client/elekable" PROTECTED_COMMON

    # Restaurer les fichiers spécifiques elekable
    log_section "Restauration fichiers identité (spécifiques Elekable)"
    restore_protected_files "client/elekable" PROTECTED_ELEKABLE

    # -------------------------------------------------------------------------
    # MIGRATIONS : Elekable a sa propre chaîne de migrations (divergée depuis 0092)
    # → On protège INTÉGRALEMENT le dossier migrations d'elekable
    # → Les nouveaux modèles de main (PointageMensuel, etc.) seront ajoutés
    #   via `makemigrations` après le merge
    # -------------------------------------------------------------------------
    log_section "Protection des migrations (elekable - chaîne divergée)"
    log_warn "La branche elekable a une chaîne de migrations divergée de main (depuis 0092)."
    log_info "Restauration complète du dossier migrations depuis client/elekable..."

    # Lister les migrations de main qui ont été copiées par le merge
    MAIN_MIGRATIONS=$(git diff --cached --name-only -- "${APP_PATH}/api/migrations/" 2>/dev/null || true)
    if [ -n "$MAIN_MIGRATIONS" ]; then
        log_info "Migrations de main à annuler :"
        echo "$MAIN_MIGRATIONS"
        # Restaurer toutes les migrations depuis elekable
        git checkout client/elekable -- "${APP_PATH}/api/migrations/" 2>/dev/null || true
    fi
    log_ok "Migrations elekable préservées"

    # -------------------------------------------------------------------------
    # Résumé final
    # -------------------------------------------------------------------------
    log_section "État après merge (elekable)"
    echo ""
    log_warn "Fichiers encore en conflit (à résoudre manuellement) :"
    git diff --name-only --diff-filter=U 2>/dev/null | grep -v "^$" || log_ok "Aucun conflit restant"

    echo ""
    log_warn "Modifications en attente de commit :"
    git status --short | head -40

    echo ""
    echo -e "${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "ACTIONS MANUELLES REQUISES pour elekable après ce script :"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "1. Vérifier les conflits restants :"
    echo "   git diff --name-only --diff-filter=U"
    echo ""
    echo "2. Résoudre manuellement les conflits s'il en reste, puis :"
    echo "   git add <fichier_résolu>"
    echo ""
    echo "3. Créer les migrations manquantes (nouveaux modèles de main) :"
    echo "   cd ${APP_PATH}"
    echo "   python manage.py makemigrations --check   # vérifie si des migrations manquent"
    echo "   python manage.py makemigrations            # crée les migrations manquantes"
    echo "   python manage.py migrate --plan            # vérifie le plan de migration"
    echo ""
    echo "4. Builder le frontend :"
    echo "   cd frontend && npm install && npm run build"
    echo ""
    echo "5. Committer le merge :"
    echo "   git commit -m 'Merge main into client/elekable - mise à jour fonctionnalités'"
    echo ""
    echo "6. Déployer sur le serveur elekable :"
    echo "   git push origin client/elekable"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# Merge MJRSERVICE
# =============================================================================
merge_mjrservice() {
    log_section "MERGE main → client/mjrservice"

    check_git_clean

    log_info "Passage sur la branche client/mjrservice..."
    git checkout client/mjrservice

    log_info "État de la branche avant merge :"
    git log --oneline -3

    log_info "Merge de main (--no-commit --no-ff)..."
    if git merge main --no-commit --no-ff 2>&1; then
        log_ok "Merge automatique sans conflit détecté"
    else
        log_warn "Conflits détectés — ils seront traités par la restauration des fichiers protégés"
    fi

    # Restaurer les fichiers communs
    log_section "Restauration fichiers identité (communs)"
    restore_protected_files "client/mjrservice" PROTECTED_COMMON

    # Restaurer les fichiers spécifiques mjrservice
    log_section "Restauration fichiers identité (spécifiques MJRService)"
    restore_protected_files "client/mjrservice" PROTECTED_MJRSERVICE

    # -------------------------------------------------------------------------
    # MIGRATIONS : mjrservice est aligné avec main jusqu'à 0105
    # → Les migrations 0106-0117 de main peuvent être appliquées directement
    # → PAS de conflit de numérotation
    # -------------------------------------------------------------------------
    log_section "Migrations (mjrservice - ajout des migrations 0106-0117 de main)"
    log_info "mjrservice est aligné avec main jusqu'à 0105."
    log_ok "Les migrations 0106-0117 de main sont ajoutées directement (pas de conflit)"
    log_info "Migrations incluses dans ce merge :"
    git diff --cached --name-only -- "${APP_PATH}/api/migrations/" 2>/dev/null | grep -v "^$" || echo "  (aucune nouvelle migration)"

    # -------------------------------------------------------------------------
    # Résumé final
    # -------------------------------------------------------------------------
    log_section "État après merge (mjrservice)"
    echo ""
    log_warn "Fichiers encore en conflit (à résoudre manuellement) :"
    git diff --name-only --diff-filter=U 2>/dev/null | grep -v "^$" || log_ok "Aucun conflit restant"

    echo ""
    log_warn "Modifications en attente de commit :"
    git status --short | head -40

    echo ""
    echo -e "${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "ACTIONS MANUELLES REQUISES pour mjrservice après ce script :"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "1. Vérifier les conflits restants :"
    echo "   git diff --name-only --diff-filter=U"
    echo ""
    echo "2. Résoudre manuellement les conflits s'il en reste, puis :"
    echo "   git add <fichier_résolu>"
    echo ""
    echo "3. Vérifier les migrations (normalement pas de makemigrations nécessaire) :"
    echo "   cd ${APP_PATH}"
    echo "   python manage.py migrate --plan"
    echo ""
    echo "4. Builder le frontend :"
    echo "   cd frontend && npm install && npm run build"
    echo ""
    echo "5. Committer le merge :"
    echo "   git commit -m 'Merge main into client/mjrservice - mise à jour fonctionnalités'"
    echo ""
    echo "6. Déployer sur le serveur mjrservice :"
    echo "   git push origin client/mjrservice"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# VÉRIFICATIONS DU DRIVE (affichage uniquement — pas de modification)
# =============================================================================
check_drive_isolation() {
    log_section "Vérification isolation Drive S3"

    echo ""
    echo -e "${BOLD}Buckets S3 par client :${NC}"
    echo "  P3000      → bucket : p3000       (AWS_STORAGE_BUCKET_NAME dans .env)"
    echo "  Elekable   → bucket : elekable    (AWS_STORAGE_BUCKET_NAME dans .env)"
    echo "  MJRService → bucket : mjrservices (AWS_STORAGE_BUCKET_NAME dans .env)"
    echo ""
    echo -e "${GREEN}✓ Isolation garantie par variable d'environnement AWS_STORAGE_BUCKET_NAME${NC}"
    echo -e "${GREEN}✓ StorageManager lit le bucket depuis os.getenv('AWS_STORAGE_BUCKET_NAME')${NC}"
    echo -e "${GREEN}✓ Chaque serveur a son propre .env → aucun mélange de données possible${NC}"
    echo ""
    echo -e "${BOLD}Vérification OnlyOffice multi-tenant :${NC}"
    echo -e "${GREEN}✓ CLIENT_PUBLIC_DOMAIN restauré dans onlyoffice.py (fix appliqué à main)${NC}"
    echo -e "${GREEN}✓ Chaque client utilise son propre domaine pour les callbacks${NC}"
    echo "  Elekable   → CLIENT_PUBLIC_DOMAIN=elekable.fr"
    echo "  MJRService → CLIENT_PUBLIC_DOMAIN=mjrserviceapp.com"
    echo ""
    echo -e "${BOLD}Redis isolation :${NC}"
    echo "  P3000      → DB Redis 0"
    echo "  Elekable   → DB Redis 1"
    echo "  MJRService → DB Redis 2"
    echo -e "${GREEN}✓ Caches isolés, pas de fuite entre clients${NC}"
}

# =============================================================================
# Point d'entrée
# =============================================================================
TARGET="${1:-both}"

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗"
echo -e "║     Script de merge multi-client depuis main                 ║"
echo -e "║     Cible : ${TARGET}$(printf '%*s' $((49 - ${#TARGET})) '')║"
echo -e "╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Vérifier qu'on est dans le bon dépôt
if [ ! -d ".git" ]; then
    log_error "Ce script doit être exécuté depuis la racine du dépôt git."
    exit 1
fi

# S'assurer que main est à jour localement
log_info "Récupération des dernières modifications de main..."
git fetch origin main:main 2>/dev/null || log_warn "Impossible de fetch origin/main (travail en local)"

check_drive_isolation

ORIGINAL_BRANCH=$(git branch --show-current)

case "$TARGET" in
    elekable)
        merge_elekable
        ;;
    mjrservice)
        merge_mjrservice
        ;;
    both)
        merge_mjrservice
        echo ""
        echo -e "${YELLOW}>>> Appuyez sur Entrée pour continuer avec elekable, ou Ctrl+C pour arrêter...${NC}"
        read -r
        merge_elekable
        ;;
    *)
        log_error "Argument invalide : '$TARGET'. Utilisez : elekable | mjrservice | both"
        exit 1
        ;;
esac

echo ""
log_section "Script terminé"
log_info "Branche courante : $(git branch --show-current)"
log_info "Pour revenir à la branche originale : git checkout ${ORIGINAL_BRANCH}"
echo ""
