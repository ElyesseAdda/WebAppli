#!/usr/bin/env bash
# =============================================================================
# update-clients.sh — Mise à jour des branches clients depuis main
# =============================================================================
# À exécuter sur la MACHINE DE DÉVELOPPEMENT (pas sur les serveurs)
#
# Usage :
#   bash deploy/update-clients.sh              # Met à jour tous les clients
#   bash deploy/update-clients.sh elekable     # Seulement elekable
#   bash deploy/update-clients.sh mjrservice   # Seulement mjrservice
#
# Ce script :
#   1. Merge main → branches clients (en protégeant l'identité de chaque client)
#   2. Vérifie les conflits
#   3. Push les branches mises à jour vers origin
# =============================================================================

set -e

# --- Couleurs ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[ OK ]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERR ]${NC} $1"; exit 1; }
log_section() { echo -e "\n${BOLD}${CYAN}━━━  $1  ━━━${NC}"; }

APP_PATH="Desktop/Projet/P3000/Application"

# =============================================================================
# Fichiers protégés (identité client — jamais écrasés par main)
# =============================================================================
PROTECTED_COMMON=(
    "$APP_PATH/frontend/src/constants/colors.js"
    "$APP_PATH/frontend/src/components/theme.js"
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
    "$APP_PATH/frontend/src/img/logo.png"
    "$APP_PATH/frontend/src/img/image.png"
    "$APP_PATH/frontend/src/img/signature_p3000.png"
    "$APP_PATH/frontend/static/frontend/src/img/logo.png"
    "$APP_PATH/staticfiles/logo.png"
    "$APP_PATH/staticfiles/signature_p3000.png"
    "$APP_PATH/frontend/static/manifest.json"
    "$APP_PATH/frontend/static/manifest_rapports.json"
    "$APP_PATH/staticfiles/manifest.json"
    "$APP_PATH/staticfiles/manifest_rapports.json"
    "$APP_PATH/frontend/src/components/Login.js"
    "$APP_PATH/frontend/src/components/LoginMobile.js"
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
    "$APP_PATH/Application/settings_base.py"
    "$APP_PATH/deploy/nginx-template.conf"
)

PROTECTED_ELEKABLE=(
    "$APP_PATH/deploy/env-elekable.example"
    "$APP_PATH/create_users_elekable.py"
    "$APP_PATH/frontend/templates/frontend/index.html"
    "$APP_PATH/frontend/templates/frontend/index_production.html"
)

PROTECTED_MJRSERVICE=(
    "$APP_PATH/deploy/env-mjrservice.example"
    "$APP_PATH/deploy/deploy-client.sh"
)

# =============================================================================
# Fonctions
# =============================================================================

STASH_DONE=0
check_git_clean() {
    local has_changes=0
    git diff --quiet HEAD 2>/dev/null || has_changes=1
    git diff --cached --quiet 2>/dev/null || has_changes=1

    if [ "$has_changes" -eq 1 ]; then
        log_warn "Modifications locales détectées — stash automatique..."
        git stash push -m "update-clients-auto-stash-$(date +%Y%m%d_%H%M%S)"
        STASH_DONE=1
        log_ok "Modifications mises de côté (git stash)"
    fi
}

restore_stash() {
    if [ "$STASH_DONE" -eq 1 ]; then
        log_info "Restauration du stash..."
        git stash pop && log_ok "Stash restauré" || log_warn "Impossible de restaurer le stash — faites : git stash pop"
    fi
}

restore_files() {
    local branch="$1"; shift
    local files=("$@")
    local ok=0; local skip=0
    for f in "${files[@]}"; do
        if git cat-file -e "${branch}:${f}" 2>/dev/null; then
            if git checkout "${branch}" -- "$f" 2>/dev/null; then
                ((ok++))
            else
                log_warn "  Impossible de restaurer : $f"; ((skip++))
            fi
        fi
    done
    log_ok "  ${ok} fichier(s) restauré(s), ${skip} ignoré(s)"
}

do_merge() {
    local branch="$1"
    log_section "Merge main → ${branch}"

    git checkout "$branch"
    log_info "Branche : $(git log --oneline -1)"

    # Merge sans commit pour pouvoir restaurer les fichiers protégés
    local merge_ok=0
    git merge main --no-commit --no-ff 2>&1 && merge_ok=1 || true

    # Vérifier s'il y a des vrais conflits (pas juste auto-resolve)
    local conflicts
    conflicts=$(git diff --name-only --diff-filter=U 2>/dev/null || true)

    # Restaurer les fichiers identité client
    log_info "Restauration des fichiers d'identité..."
    restore_files "$branch" "${PROTECTED_COMMON[@]}"

    if [ "$branch" = "client/elekable" ]; then
        restore_files "$branch" "${PROTECTED_ELEKABLE[@]}"
        # Elekable : migrations divergées → restaurer intégralement
        log_info "Restauration des migrations elekable (chaîne divergée)..."
        git checkout "$branch" -- "${APP_PATH}/api/migrations/" 2>/dev/null || true
        log_ok "  Migrations elekable préservées"
    elif [ "$branch" = "client/mjrservice" ]; then
        restore_files "$branch" "${PROTECTED_MJRSERVICE[@]}"
        # MJRService : migrations 0106+ de main sont compatibles → on les garde
        log_ok "  Migrations mjrservice : nouvelles migrations de main conservées"
    fi

    # Vérifier les conflits restants après restauration
    local remaining_conflicts
    remaining_conflicts=$(git diff --name-only --diff-filter=U 2>/dev/null || true)

    if [ -n "$remaining_conflicts" ]; then
        log_warn "Conflits restants à résoudre manuellement :"
        echo "$remaining_conflicts" | sed 's/^/    /'
        log_warn "Résolvez les conflits, puis relancez avec --push-only ${branch}"
        return 1
    fi

    log_ok "Merge sans conflit pour ${branch}"
    return 0
}

do_push() {
    local branch="$1"
    log_info "Push de ${branch} vers origin..."

    # Vérifier qu'il n'y a pas de conflits non résolus
    if git diff --name-only --diff-filter=U 2>/dev/null | grep -q .; then
        log_error "Il reste des conflits non résolus dans ${branch}. Résolvez-les avant de pusher."
    fi

    # Committer le merge si nécessaire
    if ! git diff --cached --quiet 2>/dev/null || [ -n "$(git status --porcelain 2>/dev/null)" ]; then
        local main_commit
        main_commit=$(git rev-parse --short main)
        git add -A
        git commit -m "chore: merge main (${main_commit}) into ${branch} — mise à jour fonctionnalités" || true
    fi

    git push origin "$branch"
    log_ok "Branch ${branch} pushée vers origin"
}

show_next_steps() {
    local branch="$1"
    local client="${branch#client/}"
    echo ""
    echo -e "${BOLD}${YELLOW}━━━  Prochaines étapes pour ${client}  ━━━${NC}"
    echo ""
    if [ "$client" = "elekable" ]; then
        echo "  Sur le serveur elekable.fr :"
        echo "    elekable-deploy     # ou : bash deploy/elekable/deploy.sh"
        echo ""
        echo "  Si nouvelles migrations nécessaires (modèles ajoutés dans main) :"
        echo "    elekable-go"
        echo "    python manage.py makemigrations"
        echo "    python manage.py migrate"
    else
        echo "  Sur le serveur mjrserviceapp.com :"
        echo "    mjrservice-deploy   # ou : bash deploy/mjrservice/deploy.sh"
    fi
    echo ""
}

# =============================================================================
# Point d'entrée
# =============================================================================
TARGET="${1:-both}"

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗"
echo -e "║  Mise à jour clients depuis main  —  $(date '+%d/%m/%Y %H:%M')   ║"
echo -e "╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Se placer automatiquement à la racine du dépôt git (fonctionne depuis n'importe quel sous-dossier)
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || log_error "Ce répertoire ne fait pas partie d'un dépôt git."
cd "$GIT_ROOT"
log_info "Racine git : $GIT_ROOT"

# S'assurer que main est à jour
log_info "Fetch des dernières modifications..."
git fetch origin main:main 2>/dev/null || log_warn "Impossible de fetch origin/main"

check_git_clean
ORIGINAL_BRANCH=$(git branch --show-current)

run_client() {
    local branch="$1"
    if do_merge "$branch"; then
        do_push "$branch"
        show_next_steps "$branch"
    else
        echo -e "${RED}Merge incomplet pour ${branch} — push annulé${NC}"
    fi
}

case "$TARGET" in
    elekable)   run_client "client/elekable" ;;
    mjrservice) run_client "client/mjrservice" ;;
    both)
        run_client "client/mjrservice"
        run_client "client/elekable"
        ;;
    *)
        log_error "Argument invalide : '$TARGET'. Utilisez : elekable | mjrservice | both"
        ;;
esac

# Revenir à la branche d'origine
git checkout "$ORIGINAL_BRANCH" 2>/dev/null || true
log_ok "Retour sur la branche : $ORIGINAL_BRANCH"

# Restaurer les modifications locales si elles avaient été stashées
restore_stash
echo ""
