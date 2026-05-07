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
    "$APP_PATH/frontend/src/components/PageTitleManager.js"
    "$APP_PATH/frontend/src/components/Distributeurs/DesktopAppLayout.js"
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

    # --- Génération PDF (chemin chromium spécifique à chaque serveur) ---
    "$APP_PATH/frontend/src/components/generate_pdf.js"

    # --- Fichiers PDF générés (binaires, propres à chaque client) ---
    "$APP_PATH/frontend/src/components/devis.pdf"
    "$APP_PATH/frontend/src/components/situation.pdf"
)

PROTECTED_ELEKABLE=(
    "$APP_PATH/deploy/env-elekable.example"
    "$APP_PATH/create_users_elekable.py"
    "$APP_PATH/frontend/templates/frontend/index.html"
    "$APP_PATH/frontend/templates/frontend/index_production.html"
)

# Fichiers volontairement supprimés sur Elekable.
# Important: sans suppression explicite après merge, ils peuvent revenir depuis main.
REMOVED_ELEKABLE=(
    "$APP_PATH/api/context_processors.py"
    "$APP_PATH/api/management/commands/setup_entreprise_config.py"
    "$APP_PATH/frontend/src/services/entrepriseConfigService.js"
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
        # Nettoyer les fichiers en conflit résiduels avant le stash pop
        local needs_merge
        needs_merge=$(git ls-files -u --error-unmatch 2>/dev/null | awk '{print $4}' | sort -u || true)
        if [ -n "$needs_merge" ]; then
            log_warn "Nettoyage des fichiers en conflit avant stash pop..."
            git checkout -f HEAD -- . 2>/dev/null || true
        fi
        git stash pop && log_ok "Stash restauré" \
            || log_warn "Impossible de restaurer le stash automatiquement — faites manuellement : cd /var/www/p3000 && git stash pop"
    fi
}

restore_files() {
    local branch="$1"; shift
    local files=("$@")
    local ok=0; local skip=0
    for f in "${files[@]}"; do
        if git cat-file -e "${branch}:${f}" 2>/dev/null; then
            # -f pour forcer même si le fichier est marqué "needs merge"
            if git checkout -f "${branch}" -- "$f" 2>/dev/null; then
                # Marquer le fichier comme résolu dans l'index
                git add "$f" 2>/dev/null || true
                ((ok++))
            else
                log_warn "  Impossible de restaurer : $f"; ((skip++))
            fi
        fi
    done
    log_ok "  ${ok} fichier(s) restauré(s), ${skip} ignoré(s)"
}

remove_files() {
    local files=("$@")
    local removed=0; local skip=0
    for f in "${files[@]}"; do
        if git ls-files --error-unmatch "$f" >/dev/null 2>&1 || [ -f "$f" ]; then
            if git rm -f -- "$f" >/dev/null 2>&1; then
                ((removed++))
            else
                log_warn "  Impossible de supprimer : $f"; ((skip++))
            fi
        fi
    done
    log_ok "  ${removed} fichier(s) supprimé(s), ${skip} ignoré(s)"
}

abort_merge_and_return() {
    local original_branch="$1"
    # Annuler proprement le merge en cours avant de changer de branche
    git merge --abort 2>/dev/null || true
    # Nettoyer les fichiers en conflit restants
    git checkout -f HEAD -- . 2>/dev/null || true
    git checkout "$original_branch" 2>/dev/null || true
}

do_merge() {
    local branch="$1"
    log_section "Merge main → ${branch}"

    git checkout "$branch"
    log_info "Branche : $(git log --oneline -1)"

    # Merge sans commit pour pouvoir restaurer les fichiers protégés
    git merge main --no-commit --no-ff 2>&1 || true

    # Restaurer les fichiers identité client (force même sur fichiers en conflit)
    log_info "Restauration des fichiers d'identité..."
    restore_files "$branch" "${PROTECTED_COMMON[@]}"

    if [ "$branch" = "client/elekable" ]; then
        restore_files "$branch" "${PROTECTED_ELEKABLE[@]}"
        log_info "Suppression des fichiers retirés sur Elekable..."
        remove_files "${REMOVED_ELEKABLE[@]}"
        log_info "Restauration des migrations elekable (chaîne divergée)..."
        git checkout -f "$branch" -- "${APP_PATH}/api/migrations/" 2>/dev/null || true
        git add "${APP_PATH}/api/migrations/" 2>/dev/null || true
        log_ok "  Migrations elekable préservées"
    elif [ "$branch" = "client/mjrservice" ]; then
        restore_files "$branch" "${PROTECTED_MJRSERVICE[@]}"
        log_ok "  Migrations mjrservice : nouvelles migrations de main conservées"
    fi

    # Pour tout conflit restant non couvert par la liste de protection :
    # prendre automatiquement la version de main (comportement voulu pour les fichiers génériques)
    local remaining_conflicts
    remaining_conflicts=$(git diff --name-only --diff-filter=U 2>/dev/null || true)

    if [ -n "$remaining_conflicts" ]; then
        log_info "Résolution automatique des conflits non protégés (version main)..."
        while IFS= read -r f; do
            [ -z "$f" ] && continue
            git checkout -f main -- "$f" 2>/dev/null && git add "$f" 2>/dev/null && \
                log_ok "  Résolu (main) : $f" || \
                log_warn "  Impossible de résoudre : $f"
        done <<< "$remaining_conflicts"
    fi

    # Vérifier qu'il ne reste plus aucun conflit
    remaining_conflicts=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
    if [ -n "$remaining_conflicts" ]; then
        log_warn "Conflits non résolus — abandon :"
        echo "$remaining_conflicts" | sed 's/^/    /'
        abort_merge_and_return "$ORIGINAL_BRANCH"
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

    # Synchroniser avec origin avant de pusher (le serveur a pu pousser des commits entre-temps)
    git fetch origin "$branch" 2>/dev/null || true
    local remote_ref="origin/${branch}"
    if git rev-parse "$remote_ref" &>/dev/null; then
        if ! git merge-base --is-ancestor "$remote_ref" HEAD 2>/dev/null; then
            log_info "Synchronisation avec origin/${branch}..."
            git rebase "$remote_ref" 2>/dev/null || {
                git rebase --abort 2>/dev/null || true
                log_warn "Rebase impossible — force-push avec --force-with-lease..."
            }
        fi
    fi

    git push origin "$branch" --force-with-lease
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

# Vérifier qu'on est bien sur main (protection contre exécution depuis un serveur client)
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    log_warn "Branche courante : '$CURRENT_BRANCH' (attendu : 'main')"
    log_warn "Ce script doit être lancé depuis la branche main (machine de développement)."
    log_warn "Retour automatique sur main..."
    git checkout main 2>/dev/null || log_error "Impossible de basculer sur main. Vérifiez votre dépôt."
fi

# S'assurer que main est à jour
log_info "Fetch des dernières modifications..."
git fetch origin main:main 2>/dev/null || log_warn "Impossible de fetch origin/main"

check_git_clean

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

# Revenir sur main (toujours, quelle que soit la branche de départ)
git checkout main 2>/dev/null || true
log_ok "Retour sur la branche : main"

# Restaurer les modifications locales si elles avaient été stashées
restore_stash
echo ""
