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
├── OnlyOffice Docker       → Partagé (port 8080), un sous-domaine Nginx par client
│   ├── office.elekable.fr           → CSP frame-ancestors pour elekable.fr + myp3000app.com
│   └── office.mjrserviceapp.com     → CSP frame-ancestors pour mjrserviceapp.com
└── Nginx                   → Virtual hosts par domaine

Variables .env critiques pour le multi-client:
├── CLIENT_PUBLIC_DOMAIN    → Domaine public du client (utilisé par les callbacks OnlyOffice)
├── ALLOWED_HOSTS           → Domaines autorisés par Django
├── ONLYOFFICE_SERVER_URL   → https://office.<domaine-client>
└── CSRF_TRUSTED_ORIGINS    → https://<domaine-client>
```

## Clients Configurés

| Client | Branche | Domaine | OnlyOffice | Port | DB | Bucket S3 | Région | Redis |
|--------|---------|---------|------------|------|----|-----------|--------|-------|
| P3000 | `main` | myp3000app.com | office.elekable.fr | 8000 | p3000db | agency-drive-prod | — | 0 |
| Elekable | `client/elekable` | elekable.fr | office.elekable.fr | 8001 | p3000db_elekable | elekable | — | 1 |
| MJRSERVICE | `client/mjrservice` | mjrserviceapp.com | office.mjrserviceapp.com | 8002 | p3000db_mjrservice | mjrservices | eu-north-1 (Stockholm) | 2 |

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

1. Nom du client (ex. `acmecorp`) et domaine (ex. `acmecorp.com`) définis
2. DNS configuré vers le VPS :
   - `acmecorp.com` → IP du VPS
   - `www.acmecorp.com` → IP du VPS
   - `office.acmecorp.com` → IP du VPS (pour OnlyOffice)
3. Bucket S3 créé avec CORS configuré
4. Déterminer le prochain port libre et le prochain numéro Redis libre (voir tableau « Clients Configurés »)

### Étape 1 : Créer la branche Git

```bash
git checkout main
git pull origin main
git checkout -b client/acmecorp
git push -u origin client/acmecorp
```

### Étape 2 : Créer le bucket S3

1. Créer le bucket dans AWS Console (région choisie, ex. eu-north-1)
2. Appliquer la bucket policy (même que les autres clients)
3. Configurer CORS :

```bash
cp deploy/cors-elekable.json deploy/cors-acmecorp.json
nano deploy/cors-acmecorp.json
# Modifier AllowedOrigins : https://acmecorp.com, https://www.acmecorp.com
aws s3api put-bucket-cors --bucket acmecorp --cors-configuration file://deploy/cors-acmecorp.json
```

### Étape 3 : Installation sur le VPS

```bash
ssh production
cd /var/www/p3000/Desktop/Projet/P3000/Application
./deploy/setup-new-client.sh acmecorp acmecorp.com <PORT> <REDIS_DB>
```

Le script va :
1. Créer la base de données PostgreSQL
2. Cloner le repository
3. Configurer l'environnement Python
4. Demander de configurer le fichier .env
5. Builder le frontend
6. Configurer Nginx avec SSL (certbot)
7. Configurer et démarrer le service Systemd

### Étape 4 : Configurer le .env de PRODUCTION

**ATTENTION** : Le `.env` copié depuis Git est celui de développement local. Il faut **impérativement** le remplacer par un `.env` de production. Ne pas le faire causera une erreur 400 (Bad Request).

```bash
# Générer une SECRET_KEY
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

nano /var/www/acmecorp/Desktop/Projet/P3000/Application/.env
```

Contenu du `.env` de production (adapter les valeurs) :

```ini
# IDENTIFICATION
CLIENT_NAME=acmecorp
CLIENT_DOMAIN=acmecorp.com

# DJANGO
DEBUG=False
SECRET_KEY=<CLÉ_GÉNÉRÉE>
ALLOWED_HOSTS=acmecorp.com,www.acmecorp.com

# BASE DE DONNÉES
DATABASE_URL=postgresql://p3000user:<MOT_DE_PASSE>@localhost:5432/p3000db_acmecorp

# AWS S3
AWS_ACCESS_KEY_ID=<CLÉ_AWS>
AWS_SECRET_ACCESS_KEY=<SECRET_AWS>
AWS_STORAGE_BUCKET_NAME=acmecorp
AWS_S3_REGION_NAME=eu-north-1
AWS_S3_CUSTOM_DOMAIN=acmecorp.s3.eu-north-1.amazonaws.com

# SÉCURITÉ
CSRF_TRUSTED_ORIGINS=https://acmecorp.com,https://www.acmecorp.com
CORS_ALLOWED_ORIGINS=https://acmecorp.com,https://www.acmecorp.com
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SECURE=True

# REDIS
REDIS_URL=redis://localhost:6379/<REDIS_DB>

# LOGS
LOG_LEVEL=INFO
LOG_FILE=/var/log/acmecorp/django.log

# ONLYOFFICE — CLIENT_PUBLIC_DOMAIN est OBLIGATOIRE pour les callbacks
CLIENT_PUBLIC_DOMAIN=acmecorp.com
ONLYOFFICE_SERVER_URL=https://office.acmecorp.com
ONLYOFFICE_JWT_SECRET=<MÊME_SECRET_QUE_LES_AUTRES>
ONLYOFFICE_JWT_ENABLED=true
```

Variables critiques à ne pas oublier :

| Variable | Pourquoi |
|----------|----------|
| `ALLOWED_HOSTS` | Sans le bon domaine → erreur 400 Bad Request |
| `CLIENT_PUBLIC_DOMAIN` | Sans cette variable → OnlyOffice envoie les callbacks au mauvais client (myp3000app.com) et les modifications ne sont pas sauvegardées |
| `DATABASE_URL` | Doit pointer vers `p3000db_acmecorp`, pas `p3000db_local` |
| `ONLYOFFICE_SERVER_URL` | Doit pointer vers `office.acmecorp.com` |

### Étape 5 : Configurer OnlyOffice pour le nouveau client

Chaque client a besoin d'un sous-domaine OnlyOffice dédié (`office.<domaine>`) avec son propre certificat SSL et une directive CSP `frame-ancestors` autorisant le domaine du client.

**A) Créer la config Nginx pour `office.acmecorp.com` :**

```bash
nano /etc/nginx/sites-available/office.acmecorp.com
```

Contenu (version HTTP initiale, Certbot ajoutera le SSL) :

```nginx
server {
    listen 80;
    server_name office.acmecorp.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_buffering off;
        proxy_redirect off;
        proxy_hide_header X-Frame-Options;
        add_header Content-Security-Policy "frame-ancestors https://acmecorp.com https://www.acmecorp.com http://localhost:* 'self';" always;
        client_max_body_size 100M;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
}
```

**B) Activer et obtenir le certificat SSL :**

```bash
ln -s /etc/nginx/sites-available/office.acmecorp.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
certbot --nginx -d office.acmecorp.com
systemctl reload nginx
```

**C) Vérifier :**

```bash
curl -I https://office.acmecorp.com
# Doit retourner 302 avec le header Content-Security-Policy contenant acmecorp.com
```

### Étape 6 : Finaliser le déploiement

```bash
cd /var/www/acmecorp/Desktop/Projet/P3000/Application
source /var/www/acmecorp/venv/bin/activate

# Installer les dépendances Python
pip install -r requirements.txt

# Builder le frontend
cd frontend
npm install
npm run build
cd ..

# Migrations et fichiers statiques
export DJANGO_SETTINGS_MODULE=Application.settings_production
python manage.py migrate
python manage.py collectstatic --noinput

# Redémarrer le service
systemctl restart acmecorp
```

### Étape 7 : Vérification complète

```bash
# Service Django
systemctl status acmecorp
curl -I https://acmecorp.com

# OnlyOffice
curl -I https://office.acmecorp.com

# Logs (si erreur)
journalctl -u acmecorp -n 50 --no-pager
tail -f /var/log/acmecorp/django.log
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
│   ├── .env                    # Configuration PRODUCTION (pas le .env local !)
│   └── staticfiles/            # Fichiers statiques
├── venv/                       # Environnement Python
└── ...

/root/<client>-env-backup/
├── .env.production             # Backup de la config
└── .env.backup.*               # Historique des backups

/etc/nginx/sites-available/
├── <client>.conf               # Configuration Nginx du site
└── office.<domaine-client>     # Configuration Nginx OnlyOffice (CSP, proxy)

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

### Erreur 400 Bad Request

Cause la plus fréquente : le `.env` sur le serveur est celui de **développement local** au lieu du `.env` de production.

```bash
# Vérifier les ALLOWED_HOSTS configurés
cd /var/www/<client>/Desktop/Projet/P3000/Application
source /var/www/<client>/venv/bin/activate
export DJANGO_SETTINGS_MODULE=Application.settings_production
python -c "from django.conf import settings; print('ALLOWED_HOSTS:', settings.ALLOWED_HOSTS)"

# Si la sortie affiche localhost au lieu du domaine du client → le .env est mauvais
# Comparer avec le template de référence
cat deploy/env-<client>.example
```

### Le service ne démarre pas

```bash
journalctl -u <client> -n 50

# Vérifier la syntaxe du fichier .env
cat /var/www/<client>/Desktop/Projet/P3000/Application/.env

# Tester manuellement
cd /var/www/<client>/Desktop/Projet/P3000/Application
source /var/www/<client>/venv/bin/activate
python manage.py check

# Module manquant (ex. "No module named redis")
pip install -r requirements.txt
systemctl restart <client>
```

### Erreur 502 Bad Gateway

```bash
ss -tlnp | grep <PORT>
nginx -t
cat /etc/nginx/sites-available/<client>.conf | grep proxy_pass
```

### Le build frontend échoue sur le serveur (mais marche en local)

**Cause** : différence de sensibilité à la casse entre Windows (insensible) et Linux (sensible).
Un import `import "./fichier.css"` qui fonctionne sur Windows échouera sur Linux si le vrai fichier s'appelle `Fichier.css`.

```bash
# Lire l'erreur webpack pour identifier le fichier
cd /var/www/<client>/Desktop/Projet/P3000/Application/frontend
npm run build 2>&1 | grep "Module not found"

# Comparer la casse de l'import avec le fichier réel
ls -la static/css/
```

### Problème de fichiers statiques

```bash
ls -la /var/www/<client>/Desktop/Projet/P3000/Application/staticfiles/

cd /var/www/<client>/Desktop/Projet/P3000/Application
source /var/www/<client>/venv/bin/activate
python manage.py collectstatic --clear --noinput
sudo chown -R www-data:www-data staticfiles/
```

### OnlyOffice ne fonctionne pas

```bash
# Vérifier le conteneur Docker
docker ps | grep onlyoffice

# Vérifier la config Nginx du sous-domaine OnlyOffice
cat /etc/nginx/sites-available/office.<domaine-client>
# Le header Content-Security-Policy doit contenir le domaine du client dans frame-ancestors

# Tester la connectivité
curl -I https://office.<domaine-client>
```

### OnlyOffice ne sauvegarde pas les modifications (version téléchargée ≠ version éditée)

**Cause** : les callbacks OnlyOffice sont envoyés au mauvais client. Cela arrive quand `CLIENT_PUBLIC_DOMAIN` n'est pas défini dans le `.env`.

```bash
# Vérifier la variable
grep CLIENT_PUBLIC_DOMAIN /var/www/<client>/Desktop/Projet/P3000/Application/.env
# Doit afficher : CLIENT_PUBLIC_DOMAIN=<domaine-du-client>

# Vérifier ce que Django utilise réellement
cd /var/www/<client>/Desktop/Projet/P3000/Application
source /var/www/<client>/venv/bin/activate
export DJANGO_SETTINGS_MODULE=Application.settings_production
python -c "from django.conf import settings; print('CLIENT_PUBLIC_DOMAIN:', settings.CLIENT_PUBLIC_DOMAIN)"
# Doit afficher le domaine du client, PAS myp3000app.com

# Après correction, redémarrer
systemctl restart <client>
```

### OnlyOffice : iframe refusée (erreur CSP)

```bash
# Vérifier le header Content-Security-Policy retourné par OnlyOffice
curl -I https://office.<domaine-client> 2>&1 | grep -i content-security

# Le frame-ancestors doit contenir le domaine du client
# Corriger dans la config Nginx :
nano /etc/nginx/sites-available/office.<domaine-client>
# Ajouter le domaine dans frame-ancestors
nginx -t && systemctl reload nginx
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
for db in p3000db p3000db_elekable p3000db_mjrservice; do
    pg_dump $db > /var/backups/postgres/${db}_$(date +%Y%m%d).sql
done
```
