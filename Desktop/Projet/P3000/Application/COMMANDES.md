# Commandes de déploiement et de mise à jour

## Mise à jour des clients depuis main (machine de dev)

```bash
# Mettre à jour tous les clients + push automatique
bash Desktop/Projet/P3000/Application/deploy/update-clients.sh

# Ou individuellement
bash Desktop/Projet/P3000/Application/deploy/update-clients.sh elekable
bash Desktop/Projet/P3000/Application/deploy/update-clients.sh mjrservice
```

> Ce script merge `main` → branche client, protège les fichiers identité (couleurs, logo, templates, migrations), commit et push vers origin.

---

## P3000 (serveur principal)

### Installation des alias (une seule fois)
```bash
bash setup_aliases.sh
source ~/.bashrc
```

### Commandes disponibles
```bash
p3000-go           # cd dans le projet + activer le venv
p3000-deploy       # déploiement complet (git pull + build + migrate + restart)
p3000-restart      # redémarrage rapide (sans git pull ni build)
p3000-logs         # logs Gunicorn en direct
p3000-logs-tail    # 50 derniers logs
p3000-status       # statut du service Gunicorn
p3000-manage <cmd> # python manage.py <cmd>
```

---

## Elekable (serveur elekable.fr)

### Installation des alias (une seule fois)
```bash
bash deploy/elekable/setup-aliases.sh
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
bash deploy/mjrservice/setup-aliases.sh
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

## Workflow complet : nouvelle fonctionnalité → tous les clients

```bash
# 1. Développer et committer sur main (machine de dev)
git add . && git commit -m "ma nouvelle fonctionnalité"
git push origin main

# 2. Mettre à jour les branches clients + push
bash Desktop/Projet/P3000/Application/deploy/update-clients.sh

# 3. Déployer sur chaque serveur client
#    → Sur le serveur elekable.fr :
elekable-deploy

#    → Sur le serveur mjrserviceapp.com :
mjrservice-deploy

#    → Sur le serveur P3000 (déjà déployé via main) :
p3000-deploy
```

---

## Localisation des scripts

| Script | Rôle |
|--------|------|
| `deploy/update-clients.sh` | Merge main → clients + push (machine dev) |
| `deploy/elekable/deploy.sh` | Déploiement complet sur serveur Elekable |
| `deploy/elekable/restart.sh` | Redémarrage rapide Elekable |
| `deploy/elekable/setup-aliases.sh` | Installe les alias sur le serveur Elekable |
| `deploy/mjrservice/deploy.sh` | Déploiement complet sur serveur MJRService |
| `deploy/mjrservice/restart.sh` | Redémarrage rapide MJRService |
| `deploy/mjrservice/setup-aliases.sh` | Installe les alias sur le serveur MJRService |
| `deploy_production.sh` | Déploiement complet P3000 |
| `restart_app.sh` | Redémarrage rapide P3000 |
| `setup_aliases.sh` | Installe les alias sur le serveur P3000 |
| `merge-client-branches.sh` | Version interactive du merge (avec revue manuelle) |
