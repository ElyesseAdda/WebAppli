# ⚡ Référence Rapide - Déploiement P3000

Guide ultra-rapide avec les commandes essentielles.

---

## 🚀 Installation Complète (Commandes Rapides)

### 1. Mise à Jour Système

```bash
apt update && apt upgrade -y
```

### 2. Dépendances

```bash
# Python, Node, Git
apt install python3.11 python3.11-venv python3-pip nodejs npm git build-essential -y

# PostgreSQL
apt install postgresql postgresql-contrib -y

# Redis
apt install redis-server -y

# Nginx
apt install nginx -y

# Certbot
apt install certbot python3-certbot-nginx -y

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
```

### 3. PostgreSQL

```bash
sudo -u postgres psql << EOF
CREATE USER p3000user WITH PASSWORD 'VOTRE_MOT_DE_PASSE';
CREATE DATABASE p3000db OWNER p3000user;
GRANT ALL PRIVILEGES ON DATABASE p3000db TO p3000user;
\c p3000db
GRANT ALL ON SCHEMA public TO p3000user;
EOF
```

### 4. AWS S3

```bash
aws configure
aws s3api create-bucket --bucket VOTRE-BUCKET --region eu-west-3 --create-bucket-configuration LocationConstraint=eu-west-3
aws s3api put-bucket-cors --bucket VOTRE-BUCKET --cors-configuration file://deploy/cors-demo.json
```

### 5. OnlyOffice

```bash
# Générer JWT Secret
openssl rand -base64 32

# Créer dossiers
mkdir -p /app/onlyoffice/DocumentServer/{logs,data,lib,fonts}
chown -R 104:107 /app/onlyoffice

# Démarrer
cd /opt/onlyoffice
docker compose up -d
```

### 6. P3000

```bash
cd /var/www/p3000/Desktop/Projet/P3000/Application

# Venv
python3.11 -m venv /var/www/p3000/venv
source /var/www/p3000/venv/bin/activate

# Dépendances
pip install -r requirements.txt gunicorn

# Configurer .env (voir template)
nano .env

# Migrations
python manage.py migrate

# Créer superuser
python manage.py createsuperuser

# Build frontend
cd frontend && npm install && npm run build && cd ..

# Collectstatic
python manage.py collectstatic --noinput
```

### 7. Nginx + SSL

```bash
# Copier la config
cp deploy/nginx-p3000-template.conf /etc/nginx/sites-available/p3000
ln -s /etc/nginx/sites-available/p3000 /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

### 8. Systemd

```bash
# Copier le service
cp deploy/systemd-p3000-template.service /etc/systemd/system/p3000.service

# Permissions
chown -R www-data:www-data /var/www/p3000

# Démarrer
systemctl daemon-reload
systemctl enable p3000
systemctl start p3000
```

---

## 📊 Commandes de Monitoring

```bash
# Services
systemctl status p3000
systemctl status postgresql
systemctl status redis
systemctl status nginx
docker ps | grep onlyoffice

# Logs
journalctl -u p3000 -f
tail -f /var/log/nginx/p3000_access.log
tail -f /var/log/gunicorn/p3000_error.log
docker logs onlyoffice-documentserver -f

# Monitoring complet
./deploy/monitor-p3000.sh
```

---

## 🔄 Commandes de Maintenance

```bash
# Redémarrer P3000
systemctl restart p3000

# Redémarrer Nginx
systemctl reload nginx

# Redémarrer OnlyOffice
cd /opt/onlyoffice && docker compose restart

# Backup PostgreSQL
./deploy/backup-postgres.sh

# Déployer une mise à jour
./deploy_production.sh
```

---

## 🆘 Dépannage Rapide

### Service ne démarre pas

```bash
journalctl -u p3000 -n 50
python manage.py check
```

### Erreur 502

```bash
ss -tlnp | grep 8000
systemctl restart p3000
```

### Problème S3

```bash
aws s3 ls s3://VOTRE-BUCKET
aws s3api get-bucket-cors --bucket VOTRE-BUCKET
```

### OnlyOffice

```bash
docker logs onlyoffice-documentserver | tail -50
cd /opt/onlyoffice && docker compose restart
```

---

## 📁 Fichiers Importants

| Fichier | Emplacement |
|---------|-------------|
| **.env** | `/var/www/p3000/Desktop/Projet/P3000/Application/.env` |
| **Nginx** | `/etc/nginx/sites-available/p3000` |
| **Systemd** | `/etc/systemd/system/p3000.service` |
| **Logs P3000** | `/var/log/p3000/` |
| **Logs Gunicorn** | `/var/log/gunicorn/` |
| **Logs Nginx** | `/var/log/nginx/p3000_*.log` |
| **Backups** | `/var/backups/postgres/` |

---

## 🔗 URLs Utiles

- **Application** : https://myp3000app.com
- **Admin** : https://myp3000app.com/admin
- **OnlyOffice** : http://127.0.0.1:8080
- **Healthcheck** : https://myp3000app.com/healthcheck

---

## 📝 Variables .env Essentielles

```env
DEBUG=False
SECRET_KEY=...
ALLOWED_HOSTS=myp3000app.com,www.myp3000app.com
DATABASE_URL=postgresql://p3000user:PASSWORD@localhost:5432/p3000db
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_STORAGE_BUCKET_NAME=...
AWS_S3_REGION_NAME=eu-west-3
REDIS_URL=redis://localhost:6379/0
ONLYOFFICE_SERVER_URL=http://127.0.0.1:8080
ONLYOFFICE_JWT_SECRET=...
```

---

**Documentation complète** : `GUIDE_DEPLOIEMENT_VPS_COMPLET.md`
