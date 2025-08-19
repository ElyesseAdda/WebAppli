# 🚀 Guide de déploiement en production

## 📋 Prérequis

### 1. Serveur

- **VPS/Cloud** : Ubuntu 20.04/22.04 LTS
- **Spécifications** : 2-4 CPU, 4-8 GB RAM, 50-100 GB SSD
- **Prix estimé** : 20-50€/mois

### 2. Domaine

- **Registrar** : OVH, Namecheap, GoDaddy
- **Prix** : 10-15€/an pour un .com/.fr

### 3. Services externes

- **AWS S3** : Pour le drive (5-10€/mois)
- **Base de données** : PostgreSQL (inclus ou 10-20€/mois)

## 🔧 Installation du serveur

### 1. Connexion et mise à jour

```bash
ssh root@IP_SERVEUR
apt update && apt upgrade -y
```

### 2. Installation des dépendances

```bash
# Python et pip
apt install python3 python3-pip python3-venv -y

# PostgreSQL
apt install postgresql postgresql-contrib -y

# Nginx
apt install nginx -y

# Certbot (SSL)
apt install certbot python3-certbot-nginx -y

# Git
apt install git -y
```

### 3. Configuration PostgreSQL

```bash
sudo -u postgres psql
CREATE DATABASE p3000db;
CREATE USER p3000user WITH PASSWORD 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE p3000db TO p3000user;
\q
```

## 📁 Déploiement de l'application

### 1. Cloner le projet

```bash
cd /var/www
git clone https://github.com/votre-username/votre-repo.git p3000
cd p3000
```

### 2. Configuration de l'environnement

```bash
# Créer l'environnement virtuel
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Copier le fichier d'environnement
cp env.production.example .env
nano .env  # Éditer avec vos vraies valeurs
```

### 3. Configuration Django

```bash
# Collecter les fichiers statiques
python manage.py collectstatic --noinput

# Appliquer les migrations
python manage.py migrate

# Créer un superuser
python manage.py createsuperuser
```

## 🔒 Configuration SSL

### 1. Certificat Let's Encrypt

```bash
# Obtenir le certificat
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Renouvellement automatique
crontab -e
# Ajouter : 0 12 * * * /usr/bin/certbot renew --quiet
```

## ⚙️ Configuration des services

### 1. Service Gunicorn

```bash
# Créer le service
sudo nano /etc/systemd/system/gunicorn.service
```

Contenu du service :

```ini
[Unit]
Description=Gunicorn daemon for P3000
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/p3000
Environment="PATH=/var/www/p3000/venv/bin"
ExecStart=/var/www/p3000/venv/bin/gunicorn --config gunicorn.conf.py Application.wsgi:application

[Install]
WantedBy=multi-user.target
```

### 2. Configuration Nginx

```bash
# Copier la configuration
sudo cp nginx.conf /etc/nginx/sites-available/votre-domaine.com

# Activer le site
sudo ln -s /etc/nginx/sites-available/votre-domaine.com /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

### 3. Démarrer les services

```bash
# Démarrer Gunicorn
sudo systemctl start gunicorn
sudo systemctl enable gunicorn

# Vérifier le statut
sudo systemctl status gunicorn
sudo systemctl status nginx
```

## 🔧 Configuration AWS S3

### 1. Bucket S3

- Créer un bucket dans AWS S3
- Configurer les permissions CORS
- Noter l'ARN du bucket

### 2. Utilisateur IAM

- Créer un utilisateur IAM avec accès S3
- Attacher la politique S3 appropriée
- Noter les clés d'accès

### 3. Configuration CORS S3

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
      "AllowedOrigins": ["https://votre-domaine.com"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

## 🚀 Déploiement

### 1. Script de déploiement

```bash
# Rendre le script exécutable
chmod +x deploy.sh

# Déployer
./deploy.sh
```

### 2. Vérification

- Tester l'URL : https://votre-domaine.com
- Vérifier les logs : `sudo journalctl -u gunicorn`
- Tester le drive et l'upload de fichiers

## 📊 Monitoring

### 1. Logs

```bash
# Logs Gunicorn
sudo tail -f /var/log/gunicorn/error.log

# Logs Nginx
sudo tail -f /var/log/nginx/error.log

# Logs Django
sudo tail -f /var/log/django/app.log
```

### 2. Surveillance

- **Uptime Robot** : Monitoring gratuit
- **Google Analytics** : Statistiques de trafic
- **AWS CloudWatch** : Monitoring S3

## 🔄 Mise à jour

### 1. Mise à jour automatique

```bash
# Ajouter au crontab
crontab -e
# 0 2 * * * /var/www/p3000/deploy.sh
```

### 2. Sauvegarde

```bash
# Script de sauvegarde
pg_dump p3000db > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 💰 Coûts estimés

### Mensuel :

- **Serveur VPS** : 20-50€
- **Domaine** : 1€ (annuel)
- **AWS S3** : 5-10€
- **Total** : 25-60€/mois

### Annuel :

- **Total** : 300-720€/an

## 🆘 Dépannage

### Problèmes courants :

1. **Erreur 502** : Vérifier Gunicorn
2. **Erreur SSL** : Renouveler le certificat
3. **Erreur S3** : Vérifier les permissions IAM
4. **Erreur DB** : Vérifier PostgreSQL

### Commandes utiles :

```bash
# Redémarrer tout
sudo systemctl restart gunicorn nginx

# Vérifier les ports
sudo netstat -tlnp

# Vérifier les permissions
ls -la /var/www/p3000/
```
