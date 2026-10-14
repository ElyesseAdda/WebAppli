# 🚀 Guide Complet de Déploiement VPS P3000

Guide ultra-détaillé pour déployer P3000 de A à Z sur un VPS Ubuntu avec Drive S3, OnlyOffice et configuration CORS complète.

---

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Configuration du VPS](#configuration-du-vps)
3. [Installation des Dépendances](#installation-des-dépendances)
4. [Configuration PostgreSQL](#configuration-postgresql)
5. [Configuration Redis](#configuration-redis)
6. [Configuration AWS S3 (Drive)](#configuration-aws-s3-drive)
7. [Installation OnlyOffice Docker](#installation-onlyoffice-docker)
8. [Déploiement P3000](#déploiement-p3000)
9. [Configuration Nginx](#configuration-nginx)
10. [SSL avec Let's Encrypt](#ssl-avec-lets-encrypt)
11. [Tests et Vérifications](#tests-et-vérifications)
12. [Monitoring et Maintenance](#monitoring-et-maintenance)

---

## 📌 Prérequis

### Serveur VPS

- **OS** : Ubuntu 22.04 LTS ou 24.04 LTS
- **RAM** : Minimum 4 GB (8 GB recommandé)
- **CPU** : 2 cores minimum (4 cores recommandé)
- **Disque** : 50 GB minimum (100 GB recommandé)
- **IP publique** : Adresse IP fixe

### Domaine

- Nom de domaine configuré (ex: myp3000app.com)
- Accès aux DNS (A record pointant vers le VPS)

### Comptes Externes

- **AWS Account** : Pour S3 (Drive)
- **Email** : Pour les certificats SSL

---

## 🖥️ Configuration du VPS

### Étape 1 : Connexion Initiale

```bash
# Se connecter au VPS
ssh root@VOTRE_IP_VPS

# Mettre à jour le système
apt update && apt upgrade -y
```

### Étape 2 : Créer un Utilisateur Non-Root (Optionnel mais Recommandé)

```bash
# Créer l'utilisateur
adduser p3000admin

# Ajouter aux sudoers
usermod -aG sudo p3000admin

# Copier les clés SSH (si nécessaire)
rsync --archive --chown=p3000admin:p3000admin ~/.ssh /home/p3000admin

# Se connecter avec le nouvel utilisateur
su - p3000admin
```

### Étape 3 : Configuration Firewall

```bash
# Installer UFW
sudo apt install ufw -y

# Configurer les règles
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp  # OnlyOffice

# Activer le firewall
sudo ufw enable

# Vérifier le statut
sudo ufw status
```

### Étape 4 : Configurer le Hostname

```bash
# Définir le hostname
sudo hostnamectl set-hostname p3000-production

# Mettre à jour /etc/hosts
sudo nano /etc/hosts

# Ajouter:
127.0.0.1 localhost
127.0.1.1 p3000-production
VOTRE_IP_VPS myp3000app.com www.myp3000app.com
```

---

## 📦 Installation des Dépendances

### Étape 1 : Python et Outils de Build

```bash
# Python 3.11
sudo apt install python3.11 python3.11-venv python3.11-dev python3-pip -y

# Outils de build
sudo apt install build-essential libssl-dev libffi-dev -y

# Git
sudo apt install git -y
```

### Étape 2 : Node.js et npm

```bash
# Installer Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# Vérifier les versions
node --version  # v20.x.x
npm --version   # 10.x.x
```

### Étape 3 : PostgreSQL

```bash
# Installer PostgreSQL 16
sudo apt install postgresql postgresql-contrib -y

# Vérifier le statut
sudo systemctl status postgresql
sudo systemctl enable postgresql
```

### Étape 4 : Redis

```bash
# Installer Redis
sudo apt install redis-server -y

# Configurer Redis pour systemd
sudo nano /etc/redis/redis.conf

# Trouver et modifier:
supervised systemd

# Redémarrer Redis
sudo systemctl restart redis
sudo systemctl enable redis

# Vérifier
redis-cli ping  # Doit retourner PONG
```

### Étape 5 : Nginx

```bash
# Installer Nginx
sudo apt install nginx -y

# Démarrer et activer
sudo systemctl start nginx
sudo systemctl enable nginx

# Vérifier
sudo systemctl status nginx
```

### Étape 6 : Certbot (SSL)

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx -y
```

### Étape 7 : Docker et Docker Compose (pour OnlyOffice)

```bash
# Installer les dépendances
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y

# Ajouter la clé GPG Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Ajouter le repository Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER

# Vérifier l'installation
docker --version
docker compose version

# Redémarrer la session (ou se reconnecter)
newgrp docker
```

---

## 🗄️ Configuration PostgreSQL

### Étape 1 : Créer l'Utilisateur et la Base de Données

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Dans psql:
CREATE USER p3000user WITH PASSWORD 'VOTRE_MOT_DE_PASSE_SECURISE';
CREATE DATABASE p3000db OWNER p3000user;
GRANT ALL PRIVILEGES ON DATABASE p3000db TO p3000user;

# Donner les permissions sur le schéma public
\c p3000db
GRANT ALL ON SCHEMA public TO p3000user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO p3000user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO p3000user;

# Quitter
\q
```

### Étape 2 : Configuration PostgreSQL pour Connexions Locales

```bash
# Éditer pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Vérifier/ajouter ces lignes:
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# Redémarrer PostgreSQL
sudo systemctl restart postgresql
```

### Étape 3 : Test de Connexion

```bash
# Tester la connexion
psql -U p3000user -d p3000db -h localhost -W

# Entrer le mot de passe
# Si connecté avec succès:
\dt  # Lister les tables (vide pour l'instant)
\q   # Quitter
```

### Étape 4 : Configuration des Backups Automatiques

```bash
# Créer le dossier de backup
sudo mkdir -p /var/backups/postgres
sudo chown postgres:postgres /var/backups/postgres

# Créer le script de backup
sudo nano /usr/local/bin/backup-postgres.sh
```

Contenu du script :

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/postgres"
pg_dump -U postgres p3000db > "$BACKUP_DIR/p3000db_$DATE.sql"
gzip "$BACKUP_DIR/p3000db_$DATE.sql"

# Garder seulement les 7 derniers backups
find $BACKUP_DIR -name "p3000db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: p3000db_$DATE.sql.gz"
```

```bash
# Rendre exécutable
sudo chmod +x /usr/local/bin/backup-postgres.sh

# Ajouter au cron (backup quotidien à 2h)
sudo crontab -e

# Ajouter:
0 2 * * * /usr/local/bin/backup-postgres.sh >> /var/log/postgres_backup.log 2>&1
```

---

## 🔄 Configuration Redis

### Étape 1 : Configuration Redis pour Production

```bash
# Éditer la configuration
sudo nano /etc/redis/redis.conf
```

**Modifications importantes** :

```conf
# Bind sur localhost uniquement (sécurité)
bind 127.0.0.1 ::1

# Mot de passe (recommandé)
requirepass VOTRE_MOT_DE_PASSE_REDIS_SECURISE

# Persistence
save 900 1
save 300 10
save 60 10000

# Mémoire maximum (adapter selon votre RAM)
maxmemory 512mb
maxmemory-policy allkeys-lru

# Logs
logfile /var/log/redis/redis-server.log
loglevel notice
```

```bash
# Redémarrer Redis
sudo systemctl restart redis

# Tester avec mot de passe
redis-cli
> AUTH VOTRE_MOT_DE_PASSE_REDIS_SECURISE
> PING  # Doit retourner PONG
> exit
```

---

## ☁️ Configuration AWS S3 (Drive)

### Étape 1 : Créer un Compte AWS et IAM User

1. **Aller sur AWS Console** : https://console.aws.amazon.com
2. **IAM → Users → Create User**
   - Nom : `p3000-s3-user`
   - Accès : Programmatic access
3. **Attacher la politique** : `AmazonS3FullAccess` (ou créer une politique personnalisée)
4. **Télécharger les credentials** : `Access Key ID` et `Secret Access Key`

### Étape 2 : Créer le Bucket S3

```bash
# Installer AWS CLI
sudo apt install awscli -y

# Configurer AWS CLI
aws configure

# Entrer:
# AWS Access Key ID: VOTRE_ACCESS_KEY
# AWS Secret Access Key: VOTRE_SECRET_KEY
# Default region name: eu-west-3  (Paris - ou votre région)
# Default output format: json
```

**Créer le bucket** :

```bash
# Créer le bucket (nom unique globalement)
aws s3api create-bucket \
    --bucket agency-drive-prod \
    --region eu-west-3 \
    --create-bucket-configuration LocationConstraint=eu-west-3

# Vérifier
aws s3 ls
```

### Étape 3 : Configuration CORS du Bucket S3

**Créer le fichier CORS** :

```bash
# Créer le fichier de configuration CORS
nano ~/cors-config.json
```

**Contenu** :

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "https://myp3000app.com",
        "https://www.myp3000app.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
      ],
      "AllowedMethods": [
        "GET",
        "PUT",
        "POST",
        "DELETE",
        "HEAD"
      ],
      "AllowedHeaders": [
        "*"
      ],
      "ExposeHeaders": [
        "ETag",
        "x-amz-request-id",
        "x-amz-id-2"
      ],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

**Appliquer CORS** :

```bash
# Appliquer la configuration CORS
aws s3api put-bucket-cors \
    --bucket agency-drive-prod \
    --cors-configuration file://~/cors-config.json

# Vérifier
aws s3api get-bucket-cors --bucket agency-drive-prod
```

### Étape 4 : Configuration de la Bucket Policy (Public Read)

**Si vous voulez que les fichiers soient accessibles publiquement** :

```bash
nano ~/bucket-policy.json
```

**Contenu** :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::agency-drive-prod/*"
    }
  ]
}
```

**Appliquer** :

```bash
# Désactiver le blocage public (si nécessaire)
aws s3api put-public-access-block \
    --bucket agency-drive-prod \
    --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Appliquer la policy
aws s3api put-bucket-policy \
    --bucket agency-drive-prod \
    --policy file://~/bucket-policy.json
```

### Étape 5 : Configuration Lifecycle (Optionnel - Nettoyage Automatique)

**Pour supprimer automatiquement les fichiers temporaires** :

```bash
nano ~/lifecycle-config.json
```

**Contenu** :

```json
{
  "Rules": [
    {
      "Id": "DeleteTempFilesAfter30Days",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "temp/"
      },
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket agency-drive-prod \
    --lifecycle-configuration file://~/lifecycle-config.json
```

### Étape 6 : Test Upload/Download S3

```bash
# Test upload
echo "Test file" > test.txt
aws s3 cp test.txt s3://agency-drive-prod/test.txt

# Test download
aws s3 cp s3://agency-drive-prod/test.txt test-downloaded.txt

# Vérifier
cat test-downloaded.txt

# Nettoyer
aws s3 rm s3://agency-drive-prod/test.txt
rm test.txt test-downloaded.txt
```

---

## 🐳 Installation OnlyOffice Docker

### Étape 1 : Pull de l'Image OnlyOffice

```bash
# Télécharger l'image OnlyOffice Document Server
docker pull onlyoffice/documentserver:latest

# Vérifier
docker images | grep onlyoffice
```

### Étape 2 : Créer le Dossier de Configuration

```bash
# Créer les dossiers pour la persistance
sudo mkdir -p /app/onlyoffice/DocumentServer/logs
sudo mkdir -p /app/onlyoffice/DocumentServer/data
sudo mkdir -p /app/onlyoffice/DocumentServer/lib
sudo mkdir -p /app/onlyoffice/DocumentServer/fonts

# Permissions
sudo chown -R 104:107 /app/onlyoffice
```

### Étape 3 : Générer un JWT Secret

```bash
# Générer un secret JWT fort
openssl rand -base64 32

# Sauvegarder le résultat (ex: ABC123XYZ456...)
```

### Étape 4 : Créer le Docker Compose

```bash
# Créer le fichier docker-compose
sudo mkdir -p /opt/onlyoffice
cd /opt/onlyoffice
sudo nano docker-compose.yml
```

**Contenu** :

```yaml
version: '3.8'

services:
  onlyoffice-documentserver:
    image: onlyoffice/documentserver:latest
    container_name: onlyoffice-documentserver
    restart: always
    ports:
      - "8080:80"
    environment:
      - JWT_ENABLED=true
      - JWT_SECRET=VOTRE_JWT_SECRET_ICI
      - JWT_HEADER=Authorization
      - JWT_IN_BODY=true
    volumes:
      - /app/onlyoffice/DocumentServer/logs:/var/log/onlyoffice
      - /app/onlyoffice/DocumentServer/data:/var/www/onlyoffice/Data
      - /app/onlyoffice/DocumentServer/lib:/var/lib/onlyoffice
      - /app/onlyoffice/DocumentServer/fonts:/usr/share/fonts/truetype/custom
    networks:
      - onlyoffice-network

networks:
  onlyoffice-network:
    driver: bridge
```

### Étape 5 : Démarrer OnlyOffice

```bash
# Démarrer OnlyOffice
sudo docker compose up -d

# Vérifier les logs
sudo docker compose logs -f

# Vérifier que le conteneur tourne
docker ps | grep onlyoffice

# Tester l'accès
curl http://localhost:8080/healthcheck
```

### Étape 6 : Configuration Nginx pour OnlyOffice (Reverse Proxy)

```bash
sudo nano /etc/nginx/sites-available/onlyoffice
```

**Contenu** :

```nginx
map $http_host $this_host {
    "" $host;
    default $http_host;
}

map $http_x_forwarded_proto $the_scheme {
    default $http_x_forwarded_proto;
    "" $scheme;
}

map $http_x_forwarded_host $the_host {
    default $http_x_forwarded_host;
    "" $this_host;
}

map $http_upgrade $proxy_connection {
    default upgrade;
    "" close;
}

server {
    listen 80;
    server_name onlyoffice.myp3000app.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $proxy_connection;
        proxy_set_header X-Forwarded-Host $the_host;
        proxy_set_header X-Forwarded-Proto $the_scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        client_max_body_size 100M;
        proxy_read_timeout 3600s;
        proxy_connect_timeout 3600s;
    }
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/onlyoffice /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### Étape 7 : SSL pour OnlyOffice (Optionnel mais Recommandé)

```bash
# Obtenir le certificat SSL
sudo certbot --nginx -d onlyoffice.myp3000app.com

# Suivre les instructions
# Choisir l'option 2 (Redirect HTTP to HTTPS)
```

---

## 🚀 Déploiement P3000

### Étape 1 : Créer la Structure de Dossiers

```bash
# Créer le dossier principal
sudo mkdir -p /var/www/p3000
sudo chown -R $USER:$USER /var/www/p3000
```

### Étape 2 : Cloner le Repository

```bash
cd /var/www/p3000

# Cloner le repository (remplacer par votre URL)
git clone https://github.com/ElyesseAdda/WebAppli.git .

# Ou si vous avez déjà un dossier "Desktop/Projet/P3000/Application"
# Naviguer vers le bon dossier
cd /var/www/p3000/Desktop/Projet/P3000/Application
```

### Étape 3 : Créer l'Environnement Virtuel Python

```bash
cd /var/www/p3000/Desktop/Projet/P3000/Application

# Créer le venv
python3.11 -m venv /var/www/p3000/venv

# Activer le venv
source /var/www/p3000/venv/bin/activate

# Mettre à jour pip
pip install --upgrade pip setuptools wheel
```

### Étape 4 : Installer les Dépendances Python

```bash
# Toujours avec le venv activé
pip install -r requirements.txt

# Installer Gunicorn
pip install gunicorn
```

### Étape 5 : Configuration du Fichier .env

```bash
# Copier le template (si disponible)
cp .env.template .env

# Ou créer le fichier
nano .env
```

**Contenu complet du .env** :

```env
# =============================================================================
# CONFIGURATION PRODUCTION P3000
# =============================================================================

# -----------------------------------------------------------------------------
# DJANGO - Configuration de base
# -----------------------------------------------------------------------------
DEBUG=False
SECRET_KEY=VOTRE_SECRET_KEY_ICI_GENERER_AVEC_SCRIPT
ALLOWED_HOSTS=myp3000app.com,www.myp3000app.com

# -----------------------------------------------------------------------------
# BASE DE DONNÉES PostgreSQL
# -----------------------------------------------------------------------------
DATABASE_URL=postgresql://p3000user:VOTRE_MOT_DE_PASSE_DB@localhost:5432/p3000db

# -----------------------------------------------------------------------------
# AWS S3 - Stockage des fichiers (Drive)
# -----------------------------------------------------------------------------
AWS_ACCESS_KEY_ID=VOTRE_AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=VOTRE_AWS_SECRET_KEY
AWS_STORAGE_BUCKET_NAME=agency-drive-prod
AWS_S3_REGION_NAME=eu-west-3
AWS_S3_CUSTOM_DOMAIN=agency-drive-prod.s3.eu-west-3.amazonaws.com

# -----------------------------------------------------------------------------
# SÉCURITÉ - CORS et CSRF
# -----------------------------------------------------------------------------
CSRF_TRUSTED_ORIGINS=https://myp3000app.com,https://www.myp3000app.com
CORS_ALLOWED_ORIGINS=https://myp3000app.com,https://www.myp3000app.com

# Sécurité HTTPS
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
SECURE_BROWSER_XSS_FILTER=True
SECURE_CONTENT_TYPE_NOSNIFF=True

# Cookies sécurisés
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_HTTPONLY=False
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax
CSRF_COOKIE_SAMESITE=Lax

# -----------------------------------------------------------------------------
# EMAIL (optionnel - pour les notifications)
# -----------------------------------------------------------------------------
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=votre-email@gmail.com
EMAIL_HOST_PASSWORD=VOTRE_MOT_DE_PASSE_APP_GMAIL

# -----------------------------------------------------------------------------
# CACHE REDIS
# -----------------------------------------------------------------------------
REDIS_URL=redis://:VOTRE_MOT_DE_PASSE_REDIS@localhost:6379/0

# -----------------------------------------------------------------------------
# LOGS
# -----------------------------------------------------------------------------
LOG_LEVEL=INFO
LOG_FILE=/var/log/p3000/django.log

# -----------------------------------------------------------------------------
# ONLYOFFICE
# -----------------------------------------------------------------------------
ONLYOFFICE_SERVER_URL=http://127.0.0.1:8080
ONLYOFFICE_JWT_SECRET=VOTRE_JWT_SECRET_ONLYOFFICE
```

**Générer la SECRET_KEY** :

```bash
# Si vous avez un script generer_secret_key.py
python generer_secret_key.py

# Ou générer manuellement
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Étape 6 : Préparer les Dossiers de Logs

```bash
# Créer le dossier de logs
sudo mkdir -p /var/log/p3000
sudo chown -R $USER:$USER /var/log/p3000

# Créer le dossier pour Gunicorn
sudo mkdir -p /var/log/gunicorn
sudo chown -R $USER:$USER /var/log/gunicorn
```

### Étape 7 : Migrations Django

```bash
# Toujours avec le venv activé
cd /var/www/p3000/Desktop/Projet/P3000/Application

# Effectuer les migrations
python manage.py makemigrations
python manage.py migrate

# Créer un superutilisateur
python manage.py createsuperuser
# Suivre les instructions (email, mot de passe)
```

### Étape 8 : Builder le Frontend React

```bash
cd /var/www/p3000/Desktop/Projet/P3000/Application/frontend

# Installer les dépendances
npm install

# Build pour production
npm run build

# Retourner au dossier principal
cd /var/www/p3000/Desktop/Projet/P3000/Application
```

### Étape 9 : Collecter les Fichiers Statiques

```bash
# Avec le venv activé
python manage.py collectstatic --noinput

# Vérifier les permissions
sudo chown -R www-data:www-data staticfiles/
```

### Étape 10 : Test de l'Application avec Gunicorn

```bash
# Test manuel (Ctrl+C pour arrêter)
gunicorn --bind 127.0.0.1:8000 Application.wsgi:application

# Si ça fonctionne, passer à l'étape suivante
```

---

## 🔧 Configuration Nginx

### Étape 1 : Créer la Configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/p3000
```

**Contenu** :

```nginx
# Limite de taux pour la sécurité
limit_req_zone $binary_remote_addr zone=p3000_limit:10m rate=10r/s;

# Upstream Gunicorn
upstream p3000_app {
    server 127.0.0.1:8000 fail_timeout=0;
}

server {
    listen 80;
    listen [::]:80;
    server_name myp3000app.com www.myp3000app.com;

    # Logs
    access_log /var/log/nginx/p3000_access.log;
    error_log /var/log/nginx/p3000_error.log;

    # Taille maximale des uploads
    client_max_body_size 100M;

    # Headers de sécurité
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Fichiers statiques
    location /static/ {
        alias /var/www/p3000/Desktop/Projet/P3000/Application/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Fichiers media (si utilisés localement)
    location /media/ {
        alias /var/www/p3000/Desktop/Projet/P3000/Application/media/;
        expires 7d;
    }

    # Favicon
    location = /favicon.ico {
        access_log off;
        log_not_found off;
    }

    # Robots.txt
    location = /robots.txt {
        access_log off;
        log_not_found off;
    }

    # Application Django
    location / {
        # Rate limiting
        limit_req zone=p3000_limit burst=20 nodelay;

        # Proxy vers Gunicorn
        proxy_pass http://p3000_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffers
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # Healthcheck
    location /healthcheck {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Étape 2 : Activer le Site

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/p3000 /etc/nginx/sites-enabled/

# Supprimer le site par défaut (optionnel)
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

---

## 🔐 SSL avec Let's Encrypt

### Étape 1 : Obtenir le Certificat SSL

```bash
# Obtenir le certificat pour le domaine principal
sudo certbot --nginx -d myp3000app.com -d www.myp3000app.com

# Suivre les instructions:
# - Entrer votre email
# - Accepter les termes
# - Choisir l'option 2 (Redirect HTTP to HTTPS)
```

### Étape 2 : Vérifier le Renouvellement Automatique

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Le renouvellement automatique est déjà configuré via systemd
sudo systemctl status certbot.timer
```

### Étape 3 : Vérifier la Configuration SSL

```bash
# Vérifier que Nginx a été mis à jour
sudo cat /etc/nginx/sites-available/p3000 | grep ssl

# Tester l'accès HTTPS
curl -I https://myp3000app.com
```

---

## ⚙️ Configuration Systemd (Service)

### Étape 1 : Créer le Service Gunicorn

```bash
sudo nano /etc/systemd/system/p3000.service
```

**Contenu** :

```ini
[Unit]
Description=P3000 Gunicorn Application
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=www-data
Group=www-data
RuntimeDirectory=gunicorn
WorkingDirectory=/var/www/p3000/Desktop/Projet/P3000/Application
Environment="PATH=/var/www/p3000/venv/bin"
EnvironmentFile=/var/www/p3000/Desktop/Projet/P3000/Application/.env

ExecStart=/var/www/p3000/venv/bin/gunicorn \
    --workers 4 \
    --threads 2 \
    --worker-class gthread \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/gunicorn/p3000_access.log \
    --error-logfile /var/log/gunicorn/p3000_error.log \
    --log-level info \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5 \
    Application.wsgi:application

ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### Étape 2 : Ajuster les Permissions

```bash
# Donner les bonnes permissions à www-data
sudo chown -R www-data:www-data /var/www/p3000
sudo chown -R www-data:www-data /var/log/p3000
sudo chown -R www-data:www-data /var/log/gunicorn

# Permissions sur staticfiles
sudo chmod -R 755 /var/www/p3000/Desktop/Projet/P3000/Application/staticfiles
```

### Étape 3 : Démarrer le Service

```bash
# Recharger systemd
sudo systemctl daemon-reload

# Activer le service (démarrage automatique)
sudo systemctl enable p3000

# Démarrer le service
sudo systemctl start p3000

# Vérifier le statut
sudo systemctl status p3000

# Voir les logs
sudo journalctl -u p3000 -f
```

---

## ✅ Tests et Vérifications

### Test 1 : Vérifier les Services

```bash
# PostgreSQL
sudo systemctl status postgresql
psql -U p3000user -d p3000db -h localhost -W -c "SELECT 1;"

# Redis
sudo systemctl status redis
redis-cli -a VOTRE_MOT_DE_PASSE ping

# OnlyOffice
docker ps | grep onlyoffice
curl http://localhost:8080/healthcheck

# Gunicorn (P3000)
sudo systemctl status p3000

# Nginx
sudo systemctl status nginx
```

### Test 2 : Tester l'Accès Web

```bash
# Test HTTP (doit rediriger vers HTTPS)
curl -I http://myp3000app.com

# Test HTTPS
curl -I https://myp3000app.com

# Test avec navigateur
# Ouvrir: https://myp3000app.com
```

### Test 3 : Tester S3 Drive

```bash
# Se connecter à l'admin Django
# https://myp3000app.com/admin

# Uploader un fichier via l'interface Drive
# Vérifier dans AWS S3:
aws s3 ls s3://agency-drive-prod/
```

### Test 4 : Tester OnlyOffice

```bash
# Créer un document test via l'interface P3000
# Vérifier les logs OnlyOffice
docker logs onlyoffice-documentserver | tail -50
```

### Test 5 : Vérifier CORS

**Créer un fichier test HTML** :

```html
<!-- test-cors.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Test CORS</title>
</head>
<body>
    <h1>Test CORS S3</h1>
    <script>
        fetch('https://agency-drive-prod.s3.eu-west-3.amazonaws.com/test.txt')
            .then(response => response.text())
            .then(data => {
                console.log('Success:', data);
                document.body.innerHTML += '<p>CORS fonctionne !</p>';
            })
            .catch(error => {
                console.error('Error:', error);
                document.body.innerHTML += '<p>Erreur CORS</p>';
            });
    </script>
</body>
</html>
```

### Test 6 : Performance et Charge

```bash
# Installer Apache Bench
sudo apt install apache2-utils -y

# Test de charge (100 requêtes, 10 concurrentes)
ab -n 100 -c 10 https://myp3000app.com/

# Analyser les résultats
```

---

## 📊 Monitoring et Maintenance

### Configuration des Logs

```bash
# Créer la rotation des logs
sudo nano /etc/logrotate.d/p3000
```

**Contenu** :

```
/var/log/p3000/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload p3000
    endscript
}

/var/log/gunicorn/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}

/var/log/nginx/p3000*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        nginx -s reload
    endscript
}
```

### Script de Monitoring

```bash
sudo nano /usr/local/bin/monitor-p3000.sh
```

**Contenu** :

```bash
#!/bin/bash

echo "==================================="
echo "📊 Monitoring P3000"
echo "==================================="
echo ""

# Services
echo "🔧 Services Status:"
echo "-----------------------------------"
systemctl is-active postgresql && echo "✅ PostgreSQL: Active" || echo "❌ PostgreSQL: Inactive"
systemctl is-active redis && echo "✅ Redis: Active" || echo "❌ Redis: Inactive"
systemctl is-active p3000 && echo "✅ P3000: Active" || echo "❌ P3000: Inactive"
systemctl is-active nginx && echo "✅ Nginx: Active" || echo "❌ Nginx: Inactive"
docker ps | grep -q onlyoffice && echo "✅ OnlyOffice: Active" || echo "❌ OnlyOffice: Inactive"

echo ""

# Espace disque
echo "💿 Disk Usage:"
echo "-----------------------------------"
df -h / | tail -1

echo ""

# Mémoire
echo "💾 Memory Usage:"
echo "-----------------------------------"
free -h | grep Mem

echo ""

# Charge CPU
echo "⚡ CPU Load:"
echo "-----------------------------------"
uptime

echo ""

# Logs récents
echo "📝 Recent Errors (last 10):"
echo "-----------------------------------"
sudo journalctl -u p3000 --since "1 hour ago" | grep -i error | tail -10

echo ""
echo "==================================="
```

```bash
# Rendre exécutable
sudo chmod +x /usr/local/bin/monitor-p3000.sh

# Exécuter
/usr/local/bin/monitor-p3000.sh
```

### Script de Déploiement (Mises à Jour)

```bash
nano /var/www/p3000/Desktop/Projet/P3000/Application/deploy_production.sh
```

**Contenu** :

```bash
#!/bin/bash

echo "🚀 Déploiement P3000 Production"
echo "================================"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /var/www/p3000/Desktop/Projet/P3000/Application

# Backup DB
echo -e "${YELLOW}💾 Backup base de données...${NC}"
sudo -u postgres pg_dump p3000db > /var/backups/postgres/p3000db_$(date +%Y%m%d_%H%M%S).sql
echo -e "${GREEN}✅ Backup créé${NC}"

# Pull du code
echo -e "${YELLOW}📥 Pull du code...${NC}"
git pull origin main
echo -e "${GREEN}✅ Code mis à jour${NC}"

# Activer venv
source /var/www/p3000/venv/bin/activate

# Dépendances Python
echo -e "${YELLOW}📦 Installation dépendances Python...${NC}"
pip install -r requirements.txt
echo -e "${GREEN}✅ Dépendances Python installées${NC}"

# Migrations
echo -e "${YELLOW}🗄️  Migrations Django...${NC}"
python manage.py migrate
echo -e "${GREEN}✅ Migrations effectuées${NC}"

# Build frontend
echo -e "${YELLOW}⚛️  Build Frontend...${NC}"
cd frontend
npm install
npm run build
cd ..
echo -e "${GREEN}✅ Frontend buildé${NC}"

# Collectstatic
echo -e "${YELLOW}📁 Collecte fichiers statiques...${NC}"
python manage.py collectstatic --noinput
sudo chown -R www-data:www-data staticfiles/
echo -e "${GREEN}✅ Fichiers statiques collectés${NC}"

# Restart service
echo -e "${YELLOW}🔄 Redémarrage service...${NC}"
sudo systemctl restart p3000
sleep 3

# Vérifier
if systemctl is-active --quiet p3000; then
    echo -e "${GREEN}✅ Service redémarré avec succès${NC}"
else
    echo -e "${YELLOW}❌ Erreur: Le service n'a pas démarré${NC}"
    sudo journalctl -u p3000 -n 50
    exit 1
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Déploiement terminé !${NC}"
echo -e "${GREEN}================================${NC}"
```

```bash
# Rendre exécutable
chmod +x deploy_production.sh

# Utiliser:
./deploy_production.sh
```

---

## 🆘 Dépannage

### Problème : Le service P3000 ne démarre pas

```bash
# Voir les logs
sudo journalctl -u p3000 -n 50

# Vérifier les permissions
ls -la /var/www/p3000/Desktop/Projet/P3000/Application/

# Vérifier le .env
cat /var/www/p3000/Desktop/Projet/P3000/Application/.env

# Test manuel
cd /var/www/p3000/Desktop/Projet/P3000/Application
source /var/www/p3000/venv/bin/activate
python manage.py check
```

### Problème : Erreur 502 Bad Gateway

```bash
# Vérifier que Gunicorn écoute
ss -tlnp | grep 8000

# Vérifier Nginx
sudo nginx -t
sudo systemctl status nginx

# Redémarrer
sudo systemctl restart p3000
sudo systemctl restart nginx
```

### Problème : Fichiers S3 non accessibles

```bash
# Vérifier CORS
aws s3api get-bucket-cors --bucket agency-drive-prod

# Vérifier la bucket policy
aws s3api get-bucket-policy --bucket agency-drive-prod

# Test manuel
aws s3 ls s3://agency-drive-prod/
```

### Problème : OnlyOffice ne fonctionne pas

```bash
# Vérifier le conteneur
docker ps | grep onlyoffice
docker logs onlyoffice-documentserver | tail -50

# Redémarrer
cd /opt/onlyoffice
sudo docker compose restart

# Vérifier le JWT secret
grep ONLYOFFICE /var/www/p3000/Desktop/Projet/P3000/Application/.env
```

### Problème : Erreurs de base de données

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql p3000db

# Vérifier les tables
\dt

# Vérifier les connexions
SELECT * FROM pg_stat_activity WHERE datname = 'p3000db';

# Restore depuis un backup
psql -U p3000user -d p3000db < /var/backups/postgres/p3000db_XXXXXX.sql
```

---

## 📋 Checklist Complète de Déploiement

### Infrastructure
- [ ] VPS configuré (Ubuntu 22.04/24.04)
- [ ] Firewall configuré (UFW)
- [ ] DNS configuré (A record)
- [ ] Hostname défini

### Dépendances
- [ ] Python 3.11 installé
- [ ] Node.js 20.x installé
- [ ] PostgreSQL 16 installé et configuré
- [ ] Redis installé et configuré
- [ ] Nginx installé
- [ ] Docker et Docker Compose installés
- [ ] Certbot installé

### Base de Données
- [ ] Utilisateur PostgreSQL créé
- [ ] Base de données créée
- [ ] Permissions configurées
- [ ] Backup automatique configuré

### AWS S3
- [ ] IAM User créé
- [ ] Access Keys générées
- [ ] Bucket S3 créé
- [ ] CORS configuré
- [ ] Bucket Policy appliquée

### OnlyOffice
- [ ] Image Docker téléchargée
- [ ] JWT Secret généré
- [ ] Docker Compose configuré
- [ ] Conteneur démarré
- [ ] Reverse proxy Nginx configuré
- [ ] SSL configuré (optionnel)

### P3000
- [ ] Repository cloné
- [ ] Virtualenv créé
- [ ] Dépendances Python installées
- [ ] Fichier .env configuré
- [ ] Migrations effectuées
- [ ] Superutilisateur créé
- [ ] Frontend buildé
- [ ] Fichiers statiques collectés
- [ ] Service systemd créé
- [ ] Service démarré

### Nginx
- [ ] Configuration créée
- [ ] Site activé
- [ ] Configuration testée
- [ ] Service rechargé

### SSL
- [ ] Certificat Let's Encrypt obtenu
- [ ] Redirection HTTPS configurée
- [ ] Renouvellement automatique vérifié

### Tests
- [ ] Accès web fonctionnel (HTTPS)
- [ ] Upload S3 fonctionnel
- [ ] OnlyOffice fonctionnel
- [ ] Admin Django accessible
- [ ] CORS vérifié

### Monitoring
- [ ] Rotation des logs configurée
- [ ] Script de monitoring créé
- [ ] Script de déploiement créé
- [ ] Backups PostgreSQL automatiques

---

## 🎉 Félicitations !

Votre application P3000 est maintenant **complètement déployée** avec :

✅ **Backend Django** avec Gunicorn  
✅ **Frontend React** buildé  
✅ **PostgreSQL** pour la base de données  
✅ **Redis** pour le cache  
✅ **AWS S3** pour le Drive (avec CORS)  
✅ **OnlyOffice** pour l'édition de documents  
✅ **Nginx** comme reverse proxy  
✅ **SSL/HTTPS** avec Let's Encrypt  
✅ **Systemd** pour le service  
✅ **Monitoring** et logs  
✅ **Backups automatiques**  

---

## 📞 Ressources Supplémentaires

- **Django Deployment Checklist** : https://docs.djangoproject.com/en/stable/howto/deployment/checklist/
- **Gunicorn Documentation** : https://docs.gunicorn.org/
- **Nginx Documentation** : https://nginx.org/en/docs/
- **AWS S3 CORS** : https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html
- **OnlyOffice Docker** : https://helpcenter.onlyoffice.com/installation/docs-developer-edition-docker.aspx

---

**Version** : 1.0  
**Date** : Octobre 2026  
**Auteur** : Agent Cloud Cursor  
**Durée estimée** : 2-3 heures pour un déploiement complet
