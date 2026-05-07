# Commandes de déploiement et de mise à jour

---

## Workflow complet : nouvelle fonctionnalité → tous les clients

```bash
# 1. Développer et committer sur main (machine de dev)
git add . && git commit -m "ma nouvelle fonctionnalité"
git push origin main

# 2. Merger main → branches clients (machine de dev UNIQUEMENT)
bash Desktop/Projet/P3000/Application/deploy/update-clients.sh

# 3. Déployer sur P3000 — sur le serveur myp3000app.com
p3000-deploy

# 4. Déployer sur chaque serveur client
#    → Sur le serveur elekable.fr :
elekable-deploy

#    → Sur le serveur mjrserviceapp.com :
mjrservice-deploy
```

> ⚠️ **Important** : `update-clients.sh` doit toujours être lancé depuis la **machine de développement** (pas depuis un serveur de production). Le script bascule temporairement les branches git — sur un serveur, cela mettrait l'application en production dans un état incorrect.

---

## Mise à jour des branches clients depuis main

> Merge `main` → branches clients, protège les fichiers d'identité (couleurs, logo, templates, migrations), commit et push vers origin.

### Depuis la machine de dev (racine du dépôt git)

```bash
# Mettre à jour tous les clients + push automatique
bash Desktop/Projet/P3000/Application/deploy/update-clients.sh

# Ou individuellement
bash Desktop/Projet/P3000/Application/deploy/update-clients.sh elekable
bash Desktop/Projet/P3000/Application/deploy/update-clients.sh mjrservice
```

---

## P3000 (serveur myp3000app.com)

### Installation des alias (une seule fois)

```bash
bash Desktop/Projet/P3000/Application/setup_aliases.sh
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

## Localisation des scripts

| Script | Rôle | Où l'exécuter |
|--------|------|---------------|
| `deploy/update-clients.sh` | Merge main → clients + push | **Machine de dev uniquement** |
| `deploy_production.sh` | Déploiement complet P3000 | Serveur P3000 |
| `restart_app.sh` | Redémarrage rapide P3000 | Serveur P3000 |
| `setup_aliases.sh` | Installe les alias P3000 | Serveur P3000 |
| `deploy/elekable/deploy.sh` | Déploiement complet Elekable | Serveur Elekable |
| `deploy/elekable/restart.sh` | Redémarrage rapide Elekable | Serveur Elekable |
| `deploy/elekable/setup-aliases.sh` | Installe les alias Elekable | Serveur Elekable |
| `deploy/mjrservice/deploy.sh` | Déploiement complet MJRService | Serveur MJRService |
| `deploy/mjrservice/restart.sh` | Redémarrage rapide MJRService | Serveur MJRService |
| `deploy/mjrservice/setup-aliases.sh` | Installe les alias MJRService | Serveur MJRService |
