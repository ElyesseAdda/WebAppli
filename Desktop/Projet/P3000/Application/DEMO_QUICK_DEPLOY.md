# 🚀 Déploiement Rapide - Environnement DEMO

Guide ultra-rapide pour déployer l'environnement de démonstration P3000.

## ⚡ Déploiement en 5 Minutes

### 1️⃣ Prérequis (à faire UNE FOIS)

```bash
# DNS: Pointer demo.myp3000app.com vers votre VPS
# Dans votre console AWS Route 53 ou équivalent:
demo.myp3000app.com → A → VOTRE_IP_VPS

# Créer le bucket S3
aws s3api create-bucket \
    --bucket p3000-demo \
    --region eu-west-3 \
    --create-bucket-configuration LocationConstraint=eu-west-3

# Appliquer CORS
cd /var/www/p3000/Desktop/Projet/P3000/Application
aws s3api put-bucket-cors \
    --bucket p3000-demo \
    --cors-configuration file://deploy/cors-demo.json
```

### 2️⃣ Installation Automatique

```bash
# Se connecter au serveur
ssh production

# Lancer l'installation (tout est automatique !)
cd /var/www/p3000/Desktop/Projet/P3000/Application
./deploy/setup-new-client.sh demo demo.myp3000app.com 8003 3
```

Le script va vous demander de configurer le `.env`. Appuyez sur Entrée pour éditer.

### 3️⃣ Configuration du .env (2 minutes)

```bash
nano /var/www/demo/Desktop/Projet/P3000/Application/.env
```

**Remplir ces valeurs** :

```env
# Générer la SECRET_KEY
SECRET_KEY=VOTRE_SECRET_KEY_ICI

# Base de données (utiliser le mot de passe PostgreSQL existant)
DATABASE_URL=postgresql://p3000user:VOTRE_MOT_DE_PASSE@localhost:5432/p3000db_demo

# AWS S3
AWS_ACCESS_KEY_ID=VOTRE_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=VOTRE_SECRET_KEY

# OnlyOffice (utiliser le secret partagé)
ONLYOFFICE_JWT_SECRET=VOTRE_SECRET_ONLYOFFICE
```

💡 **Astuce** : Copiez les valeurs depuis le `.env` de P3000 principal !

```bash
# Copier depuis P3000 principal
grep "SECRET_KEY=" /var/www/p3000/Desktop/Projet/P3000/Application/.env
grep "DB_PASSWORD=" /var/www/p3000/Desktop/Projet/P3000/Application/.env
grep "AWS_" /var/www/p3000/Desktop/Projet/P3000/Application/.env
grep "ONLYOFFICE" /var/www/p3000/Desktop/Projet/P3000/Application/.env
```

Sauvegarder : `Ctrl+O` → `Entrée` → `Ctrl+X`

### 4️⃣ Initialiser les Données

```bash
cd /var/www/demo/Desktop/Projet/P3000/Application
source /var/www/demo/venv/bin/activate

# Créer les utilisateurs de test
python manage.py create_demo_users

# Charger les données exemple
python manage.py load_demo_data
```

### 5️⃣ Vérification

```bash
# Vérifier le service
systemctl status demo

# Tester l'accès
curl -I https://demo.myp3000app.com

# Vérifier les données
python manage.py shell
>>> from api.models import Chantier, Devis
>>> print(f"Chantiers: {Chantier.objects.count()}")
>>> print(f"Devis: {Devis.objects.count()}")
>>> exit()
```

## ✅ C'est Prêt !

🌐 **URL** : https://demo.myp3000app.com  
👤 **Identifiants** : `demo@entreprise.com` / `DemoP3000!`

---

## 🔧 Configuration du Reset Automatique

Pour que les données soient réinitialisées automatiquement chaque lundi :

```bash
# Rendre le script exécutable
chmod +x /var/www/p3000/Desktop/Projet/P3000/Application/deploy/reset_demo_data.sh

# Copier le script dans /root
sudo cp /var/www/p3000/Desktop/Projet/P3000/Application/deploy/reset_demo_data.sh /root/

# Ajouter au crontab
sudo crontab -e

# Ajouter cette ligne (reset tous les lundis à 2h)
0 2 * * 1 /root/reset_demo_data.sh >> /var/log/demo/reset.log 2>&1
```

---

## 📊 Monitoring

```bash
# Script de monitoring (tout-en-un)
chmod +x /var/www/p3000/Desktop/Projet/P3000/Application/deploy/monitor_demo.sh
./deploy/monitor_demo.sh

# Ou manuellement
systemctl status demo
journalctl -u demo -f
tail -f /var/log/nginx/demo_access.log
```

---

## 🔄 Mises à Jour

```bash
cd /var/www/demo/Desktop/Projet/P3000/Application
git pull origin client/demo
source /var/www/demo/venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
python manage.py migrate
python manage.py collectstatic --clear --noinput
systemctl restart demo
```

---

## 🆘 Dépannage Rapide

### Le service ne démarre pas

```bash
journalctl -u demo -n 50
# Vérifier les erreurs dans le .env
cat /var/www/demo/Desktop/Projet/P3000/Application/.env
```

### Erreur 502 Bad Gateway

```bash
# Vérifier que Gunicorn écoute sur le port 8003
ss -tlnp | grep 8003
# Redémarrer le service
systemctl restart demo
```

### Problème S3

```bash
# Vérifier les credentials AWS
aws s3 ls s3://p3000-demo --region eu-west-3
# Vérifier CORS
aws s3api get-bucket-cors --bucket p3000-demo
```

---

## 📞 Support

- Documentation complète : [DEMO_CLIENT_SETUP.md](./DEMO_CLIENT_SETUP.md)
- Architecture multi-clients : [MULTI_CLIENT_SETUP.md](./MULTI_CLIENT_SETUP.md)
- Structure du projet : [STRUCTURE_PROJET.md](./STRUCTURE_PROJET.md)

---

**Temps total de déploiement** : ~5-10 minutes ⏱️
