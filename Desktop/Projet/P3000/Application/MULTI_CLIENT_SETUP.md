# Guide Multi-Clients P3000

Ce document décrit l'architecture multi-clients de P3000 et les procédures pour ajouter, déployer et maintenir plusieurs instances clients.

## Architecture

```
Git Branches:
├── main                    → Client P3000 (production existante)
├── client/elekable         → Client Elekable
├── client/mjrservice       → Client MJRSERVICE
├── client/<nouveau>        → Futurs clients
└── client/template         → Template pour nouveaux clients

VPS Structure:
/var/www/
├── p3000/                  → P3000 (port 8000) - INCHANGÉ
├── elekable/               → Elekable (port 8001)
├── mjrservice/             → MJRSERVICE (port 8002)
└── <nouveau-client>/       → Futurs clients (ports 8003, etc.)

Infrastructure partagée:
├── PostgreSQL              → Une DB par client (p3000db, p3000db_elekable, etc.)
├── Redis                   → Une DB par client (0, 1, 2, etc.)
├── OnlyOffice Docker       → Partagé (port 8080)
└── Nginx                   → Virtual hosts par domaine
```

## Clients Configurés

| Client | Branche | Domaine | Port | DB | Bucket S3 | Région | Redis |
|--------|---------|---------|------|----|-----------|--------|-------|
| P3000 | `main` | myp3000app.com | 8000 | p3000db | agency-drive-prod | — | 0 |
| Elekable | `client/elekable` | elekable.fr | 8001 | p3000db_elekable | elekable | — | 1 |
| MJRSERVICE | `client/mjrservice` | mjrserviceapp.com | 8002 | p3000db_mjrservice | mjrservices | eu-north-1 (Stockholm) | 2 |

## Workflow Git

### Corriger un bug commun

```bash
# 1. Corriger sur main
git checkout main
# ... faire les corrections ...
git commit -m "fix: description du bug"
git push origin main

# 2. Déployer sur P3000
ssh production "cd /var/www/p3000/Desktop/Projet/P3000/Application && ./deploy_production.sh"

# 3. Merger vers les branches clients
git checkout client/elekable
git merge main
git push origin client/elekable

# 4. Déployer sur Elekable
ssh production "cd /var/www/elekable/Desktop/Projet/P3000/Application && ./deploy/deploy-client.sh elekable"
```

### Ajouter une fonctionnalité spécifique à un client

```bash
# Travailler directement sur la branche du client
git checkout client/elekable
# ... développer la fonctionnalité ...
git commit -m "feat(elekable): nouvelle fonctionnalité"
git push origin client/elekable

# Déployer uniquement ce client
ssh production "./deploy/deploy-client.sh elekable"
```

### Ajouter une fonctionnalité commune

```bash
# 1. Développer sur main
git checkout main
# ... développer ...
git commit -m "feat: nouvelle fonctionnalité commune"
git push origin main

# 2. Merger vers tous les clients
for branch in client/elekable client/autre; do
    git checkout $branch
    git merge main
    git push origin $branch
done

# 3. Déployer chaque client
ssh production "./deploy_production.sh"  # P3000
ssh production "./deploy/deploy-client.sh elekable"
```

## Installation MJRSERVICE (partir de zéro)

À faire quand la branche `client/mjrservice` doit être **entièrement remplacée** par une copie propre de `main` (DNS et AWS déjà en place).

### En local

1. **Rester sur `main`, commiter les fichiers MJRSERVICE puis pousser :**
   ```bash
   git checkout main
   git add deploy/cors-mjrservice.json MULTI_CLIENT_SETUP.md
   git commit -m "docs: config MJRSERVICE (mjrserviceapp.com, bucket mjrservices, eu-north-1)"
   git push origin main
   ```

2. **Supprimer l’ancienne branche locale et distante :**
   ```bash
   git branch -D client/mjrservice
   git push origin --delete client/mjrservice
   ```

3. **Créer une nouvelle branche propre à partir de `main` et la pousser :**
   ```bash
   git checkout -b client/mjrservice
   git push -u origin client/mjrservice
   ```

### Sur le serveur (VPS)

1. **Se connecter au serveur :**
   ```bash
   ssh production
   ```

2. **Si une ancienne installation mjrservice existe, la supprimer (optionnel) :**
   ```bash
   sudo systemctl stop mjrservice 2>/dev/null || true
   sudo systemctl disable mjrservice 2>/dev/null || true
   sudo rm -f /etc/systemd/system/mjrservice.service
   sudo rm -f /etc/nginx/sites-enabled/mjrservice.conf
   sudo rm -f /etc/nginx/sites-available/mjrservice.conf
   sudo nginx -t && sudo systemctl reload nginx
   # Supprimer le répertoire (le script proposera de re-cloner si vous ne le faites pas)
   sudo rm -rf /var/www/mjrservice
   ```

3. **Lancer l’installation du client :**
   ```bash
   cd /var/www/p3000/Desktop/Projet/P3000/Application
   ./deploy/setup-new-client.sh mjrservice mjrserviceapp.com 8002 2
   ```
   Quand le script demande « Voulez-vous le supprimer et re-cloner ? », répondre **y** si le dossier existe encore.

4. **À l’étape « Configuration du fichier .env », éditer le .env avec les valeurs MJRSERVICE :**
   ```bash
   nano /var/www/mjrservice/Desktop/Projet/P3000/Application/.env
   ```
   À renseigner (en plus de SECRET_KEY, DATABASE_URL, etc.) :
   - `AWS_STORAGE_BUCKET_NAME=mjrservices`
   - `AWS_S3_REGION_NAME=eu-north-1`
   - `ALLOWED_HOSTS=mjrserviceapp.com,www.mjrserviceapp.com`
   - `REDIS_URL=redis://localhost:6379/2`
   - Même base : `DATABASE_URL=postgresql://p3000user:MOT_DE_PASSE@localhost:5432/p3000db_mjrservice`

5. **Après avoir sauvegardé le .env, poursuivre le script** (Entrée quand il demande d’appuyer).

6. **Vérification :**
   ```bash
   systemctl status mjrservice
   curl -I https://mjrserviceapp.com
   ```

---

## Ajouter un Nouveau Client (général)

### Prérequis

1. Nom du client et domaine définis
2. DNS configuré vers le VPS
3. Bucket S3 créé avec CORS configuré

### Étape 1 : Créer la branche Git

```bash
# Depuis main (ou client/template)
git checkout main
git checkout -b client/nouveau-client

# Personnaliser si nécessaire
# ... modifications spécifiques ...

git push -u origin client/nouveau-client
```

### Étape 2 : Créer le bucket S3

1. Créer le bucket dans AWS Console (région choisie, ex. eu-north-1 pour MJRSERVICE)
2. Appliquer la bucket policy (même que les autres clients)
3. Configurer CORS :

```bash
# Pour MJRSERVICE (bucket mjrservices, région eu-north-1) :
aws s3api put-bucket-cors --bucket mjrservices --cors-configuration file://deploy/cors-mjrservice.json

# Pour un autre client : copier et adapter le fichier CORS
cp deploy/cors-elekable.json deploy/cors-nouveau-client.json
# Modifier les AllowedOrigins
nano deploy/cors-nouveau-client.json
aws s3api put-bucket-cors --bucket nouveau-client --cors-configuration file://deploy/cors-nouveau-client.json
```

### Étape 3 : Installation sur le VPS

```bash
# Se connecter au VPS
ssh production

# Exécuter le script d'installation
cd /var/www/p3000/Desktop/Projet/P3000/Application
./deploy/setup-new-client.sh nouveau-client nouveau-client.com 8002 2
```

Le script va :
1. Créer la base de données PostgreSQL
2. Cloner le repository
3. Configurer l'environnement Python
4. Demander de configurer le fichier .env
5. Builder le frontend
6. Configurer Nginx avec SSL (certbot)
7. Configurer et démarrer le service Systemd

### Étape 4 : Vérification

```bash
# Vérifier le service
systemctl status nouveau-client

# Vérifier les logs
journalctl -u nouveau-client -f

# Tester l'accès
curl -I https://nouveau-client.com
```

## Fichiers de Configuration

### Templates disponibles

| Fichier | Description |
|---------|-------------|
| `.env.template` | Variables d'environnement |
| `deploy/nginx-template.conf` | Configuration Nginx |
| `deploy/systemd-template.service` | Service Systemd |
| `deploy/deploy-client.sh` | Script de déploiement |
| `deploy/setup-new-client.sh` | Script d'installation |

### Configuration par client

Chaque client a ses propres fichiers sur le VPS :

```
/var/www/<client>/
├── Desktop/Projet/P3000/Application/
│   ├── .env                    # Configuration spécifique
│   └── staticfiles/            # Fichiers statiques
├── venv/                       # Environnement Python
└── ...

/root/<client>-env-backup/
├── .env.production             # Backup de la config
└── .env.backup.*               # Historique des backups

/etc/nginx/sites-available/
└── <client>.conf               # Configuration Nginx

/etc/systemd/system/
└── <client>.service            # Service Systemd

/var/log/
├── nginx/<client>_*.log        # Logs Nginx
├── gunicorn/<client>_*.log     # Logs Gunicorn
└── <client>/                   # Logs Django
```

## Commandes Utiles

### Gestion des services

```bash
# Statut
systemctl status p3000
systemctl status elekable

# Redémarrer
systemctl restart elekable

# Logs en temps réel
journalctl -u elekable -f
```

### Déploiement

```bash
# P3000 (client original)
./deploy_production.sh

# Autres clients
./deploy/deploy-client.sh elekable
./deploy/deploy-client.sh autre-client
```

### Base de données

```bash
# Lister les bases
sudo -u postgres psql -c "\l" | grep p3000

# Backup
pg_dump p3000db_elekable > backup_elekable.sql

# Restore
psql p3000db_elekable < backup_elekable.sql
```

### Logs

```bash
# Nginx
tail -f /var/log/nginx/elekable_error.log

# Gunicorn
tail -f /var/log/gunicorn/elekable_error.log

# Django
tail -f /var/log/elekable/django.log
```

## Troubleshooting

### Le service ne démarre pas

```bash
# Vérifier les logs
journalctl -u elekable -n 50

# Vérifier la syntaxe du fichier .env
cat /var/www/elekable/Desktop/Projet/P3000/Application/.env

# Tester manuellement
cd /var/www/elekable/Desktop/Projet/P3000/Application
source /var/www/elekable/venv/bin/activate
python manage.py check
```

### Erreur 502 Bad Gateway

```bash
# Vérifier que Gunicorn écoute sur le bon port
ss -tlnp | grep 8001

# Vérifier la config Nginx
nginx -t
cat /etc/nginx/sites-available/elekable.conf | grep proxy_pass
```

### Problème de fichiers statiques

```bash
# Vérifier les permissions
ls -la /var/www/elekable/Desktop/Projet/P3000/Application/staticfiles/

# Recréer les fichiers statiques
cd /var/www/elekable/Desktop/Projet/P3000/Application
source /var/www/elekable/venv/bin/activate
python manage.py collectstatic --clear --noinput
sudo chown -R www-data:www-data staticfiles/
```

### OnlyOffice ne fonctionne pas

OnlyOffice est partagé entre tous les clients. Vérifier :

```bash
# Le conteneur Docker
docker ps | grep onlyoffice

# Les callbacks utilisent le bon domaine
# Vérifier dans les logs du client
grep -i onlyoffice /var/log/gunicorn/elekable_error.log
```

## Maintenance

### Mises à jour de sécurité

1. Mettre à jour sur `main`
2. Merger vers toutes les branches clients
3. Déployer chaque client

### Ajout de dépendances

1. Ajouter dans `requirements.txt` sur `main`
2. Merger vers les branches clients
3. Redéployer (le script installe automatiquement les nouvelles dépendances)

### Backup des bases de données

```bash
# Script de backup pour tous les clients
for db in p3000db p3000db_elekable; do
    pg_dump $db > /var/backups/postgres/${db}_$(date +%Y%m%d).sql
done
```
