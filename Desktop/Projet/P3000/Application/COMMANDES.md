# Commandes de déploiement et de mise à jour

---

## Workflow complet : nouvelle fonctionnalité → tous les clients

### Étape 1 — Machine de développement (Windows)

```bash
# Committer les changements sur main
git add . && git commit -m "ma nouvelle fonctionnalité"
git push origin main

# Merger main → client/elekable et client/mjrservice + push automatique
# ⚠️ À lancer UNIQUEMENT depuis la machine de dev — jamais depuis un serveur
& "C:\Program Files\Git\bin\bash.exe" "Desktop/Projet/P3000/Application/deploy/update-clients.sh"
```

> Ce script incorpore les nouveautés de `main` dans chaque branche client (`client/elekable`, `client/mjrservice`) en préservant leur identité (couleurs, logo, templates), puis push vers GitHub.

### Étape 2 — Serveur P3000 (déploie les 3 apps d'un coup)

```bash
# Déploie P3000 + Elekable + MJRService en une seule commande
all-deploy
```

> Ou individuellement si besoin :
> ```bash
> p3000-deploy       # P3000 uniquement    — branche main
> elekable-deploy    # Elekable uniquement — branche client/elekable
> mjrservice-deploy  # MJRService uniquement — branche client/mjrservice
> ```

> ⚠️ **Important** : `elekable-deploy` et `mjrservice-deploy` déploient depuis leur propre branche, **pas depuis `main`**. Il faut toujours exécuter `update-clients.sh` en premier pour que ces branches contiennent les dernières fonctionnalités de `main`.

---

## Mise à jour des branches clients depuis main

> Merge `main` → branches clients, protège les fichiers d'identité (couleurs, logo, templates, migrations), commit et push vers origin.

### Depuis la machine de dev (racine du dépôt git)

```bash
# Mettre à jour tous les clients + push automatique
& "C:\Program Files\Git\bin\bash.exe" "Desktop/Projet/P3000/Application/deploy/update-clients.sh"

# Ou individuellement
& "C:\Program Files\Git\bin\bash.exe" "Desktop/Projet/P3000/Application/deploy/update-clients.sh" elekable
& "C:\Program Files\Git\bin\bash.exe" "Desktop/Projet/P3000/Application/deploy/update-clients.sh" mjrservice
```

---

## P3000 (serveur myp3000app.com)

### Installation des alias (une seule fois)

```bash
cd /var/www/p3000
bash Desktop/Projet/P3000/Application/setup_aliases.sh
source ~/.bashrc
```

### Commandes disponibles

```bash
p3000-go           # cd dans le projet + activer le venv
p3000-deploy       # déploiement complet P3000 (git pull + build + migrate + restart)
p3000-restart      # redémarrage rapide (sans git pull ni build)
p3000-logs         # logs Gunicorn en direct
p3000-logs-tail    # 50 derniers logs
p3000-status       # statut du service Gunicorn
p3000-manage <cmd> # python manage.py <cmd>
all-deploy         # déploiement des 3 apps (P3000 + Elekable + MJRService)
```

---

## Elekable (serveur elekable.fr)

### Installation des alias (une seule fois)

```bash
cd /var/www/elekable
bash Desktop/Projet/P3000/Application/deploy/elekable/setup-aliases.sh
source ~/.bashrc
```

### Commandes disponibles

```bash
elekable-go           # cd dans le projet + activer le venv
elekable-deploy       # déploiement complet (git pull + build + migrate + restart)
elekable-restart      # redémarrage rapide (sans git pull ni build)
elekable-logs         # logs en direct
elekable-logs-tail    # 50 derniers logs
elekable-status       # statut du service
elekable-manage <cmd> # python manage.py <cmd>
```

---

## MJRService (serveur mjrserviceapp.com)

### Installation des alias (une seule fois)

```bash
cd /var/www/mjrservice
bash Desktop/Projet/P3000/Application/deploy/mjrservice/setup-aliases.sh
source ~/.bashrc
```

### Commandes disponibles

```bash
mjrservice-go           # cd dans le projet + activer le venv
mjrservice-deploy       # déploiement complet (git pull + build + migrate + restart)
mjrservice-restart      # redémarrage rapide (sans git pull ni build)
mjrservice-logs         # logs en direct
mjrservice-logs-tail    # 50 derniers logs
mjrservice-status       # statut du service
mjrservice-manage <cmd> # python manage.py <cmd>
```

---

## Localisation des scripts

| Script | Rôle | Où l'exécuter |
|--------|------|---------------|
| `deploy/update-clients.sh` | Merge main → clients + push | **Machine de dev uniquement** |
| `deploy/deploy-all.sh` | Déploie les 3 apps d'un coup | Serveur P3000 (alias `all-deploy`) |
| `deploy_production.sh` | Déploiement complet P3000 | Serveur P3000 |
| `restart_app.sh` | Redémarrage rapide P3000 | Serveur P3000 |
| `setup_aliases.sh` | Installe les alias P3000 | Serveur P3000 |
| `deploy/elekable/deploy.sh` | Déploiement complet Elekable | Serveur Elekable |
| `deploy/elekable/restart.sh` | Redémarrage rapide Elekable | Serveur Elekable |
| `deploy/elekable/setup-aliases.sh` | Installe les alias Elekable | Serveur Elekable |
| `deploy/mjrservice/deploy.sh` | Déploiement complet MJRService | Serveur MJRService |
| `deploy/mjrservice/restart.sh` | Redémarrage rapide MJRService | Serveur MJRService |
| `deploy/mjrservice/setup-aliases.sh` | Installe les alias MJRService | Serveur MJRService |
