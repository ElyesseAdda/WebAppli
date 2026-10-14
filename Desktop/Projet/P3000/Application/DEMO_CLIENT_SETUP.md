# 🎯 Environnement de Démonstration P3000

Ce document décrit la configuration et le déploiement de l'environnement de **démonstration** destiné à présenter P3000 aux clients potentiels.

## 📋 Vue d'ensemble

L'environnement de démonstration est une instance complète et fonctionnelle de P3000 qui permet aux clients potentiels de :
- ✅ Tester toutes les fonctionnalités de l'application
- ✅ Explorer l'interface utilisateur
- ✅ Créer des données de test (chantiers, devis, factures, etc.)
- ✅ Évaluer la solution avant de commander leur propre instance

## 🏗️ Architecture

```
Configuration:
├── Branche Git: client/demo
├── Domaine: demo.myp3000app.com
├── Port: 8003
├── Base de données: p3000db_demo
├── Bucket S3: p3000-demo (région: eu-west-3)
├── Redis DB: 3
└── Service Systemd: demo
```

## 🎨 Caractéristiques Spécifiques de l'Environnement DEMO

### Données Pré-chargées

L'environnement de démonstration contient des **données exemples** réalistes :
- 5 chantiers types (résidentiel, commercial, rénovation, etc.)
- 10 devis avec différents états (brouillon, validé, signé)
- 3 factures émises
- 5 fournisseurs et sous-traitants
- Planning avec des tâches exemple
- Documents dans le Drive

### Limitations Volontaires

Pour protéger l'environnement de démonstration :
- ⏰ **Reset automatique** : Les données sont réinitialisées tous les lundis à 2h du matin
- 📊 **Limites de création** : Maximum 50 chantiers, 100 devis
- 👥 **Utilisateurs multiples** : Plusieurs clients potentiels peuvent tester simultanément
- 🔒 **Exports limités** : Les PDFs générés contiennent un filigrane "DÉMONSTRATION"

### Bannière de Démonstration

Une bannière visible indique clairement qu'il s'agit d'un environnement de test :

```
⚠️ ENVIRONNEMENT DE DÉMONSTRATION
Les données sont réinitialisées chaque semaine.
Contactez-nous pour votre propre instance : contact@votreentreprise.com
```

## 📦 Prérequis pour le Déploiement

### 1. DNS Configuré
```bash
# Configurer le sous-domaine demo.myp3000app.com vers votre VPS
demo.myp3000app.com → A → IP_DU_VPS
```

### 2. Bucket S3 Créé
```bash
# Créer le bucket AWS S3 (région eu-west-3 - Paris)
aws s3api create-bucket \
    --bucket p3000-demo \
    --region eu-west-3 \
    --create-bucket-configuration LocationConstraint=eu-west-3

# Appliquer la bucket policy (même que les autres clients)
aws s3api put-bucket-policy \
    --bucket p3000-demo \
    --policy file://deploy/bucket-policy-template.json

# Configurer CORS
aws s3api put-bucket-cors \
    --bucket p3000-demo \
    --cors-configuration file://deploy/cors-demo.json
```

### 3. Base de Données PostgreSQL
```bash
# La base sera créée automatiquement par le script d'installation
# Nom: p3000db_demo
```

## 🚀 Installation sur le Serveur

### Étape 1 : Se Connecter au VPS

```bash
ssh production
```

### Étape 2 : Vérifier les Prérequis

```bash
# Vérifier que les services de base fonctionnent
systemctl status postgresql
systemctl status redis
systemctl status nginx
docker ps | grep onlyoffice
```

### Étape 3 : Lancer l'Installation

```bash
cd /var/www/p3000/Desktop/Projet/P3000/Application
./deploy/setup-new-client.sh demo demo.myp3000app.com 8003 3
```

Le script va :
1. ✅ Créer la base de données PostgreSQL `p3000db_demo`
2. ✅ Cloner le repository sur la branche `client/demo`
3. ✅ Configurer l'environnement Python (virtualenv)
4. ✅ Demander la configuration du fichier `.env`
5. ✅ Installer les dépendances Python et Node.js
6. ✅ Builder le frontend React
7. ✅ Exécuter les migrations Django
8. ✅ Collecter les fichiers statiques
9. ✅ Configurer Nginx avec SSL (Let's Encrypt)
10. ✅ Créer et démarrer le service Systemd

### Étape 4 : Configuration du Fichier .env

Quand le script demande de configurer le `.env`, éditer :

```bash
nano /var/www/demo/Desktop/Projet/P3000/Application/.env
```

**Valeurs à renseigner** :

```env
# SECRET_KEY - Générer avec:
cd /var/www/demo/Desktop/Projet/P3000/Application
source /var/www/demo/venv/bin/activate
python generer_secret_key.py

# DATABASE_URL
DATABASE_URL=postgresql://p3000user:VOTRE_MOT_DE_PASSE_DB@localhost:5432/p3000db_demo

# AWS S3
AWS_ACCESS_KEY_ID=VOTRE_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=VOTRE_SECRET_KEY
AWS_STORAGE_BUCKET_NAME=p3000-demo
AWS_S3_REGION_NAME=eu-west-3

# EMAIL (optionnel)
EMAIL_HOST_USER=demo@votreentreprise.com
EMAIL_HOST_PASSWORD=VOTRE_MOT_DE_PASSE_EMAIL

# ONLYOFFICE
ONLYOFFICE_JWT_SECRET=VOTRE_SECRET_PARTAGE
```

Sauvegarder avec `Ctrl+O`, puis `Entrée`, puis `Ctrl+X`.

### Étape 5 : Initialiser les Données de Démonstration

```bash
cd /var/www/demo/Desktop/Projet/P3000/Application
source /var/www/demo/venv/bin/activate

# Créer les utilisateurs de démo
python manage.py create_demo_users

# Charger les données exemple
python manage.py load_demo_data

# Vérifier
python manage.py shell
>>> from api.models import Chantier, Devis
>>> Chantier.objects.count()
>>> Devis.objects.count()
>>> exit()
```

### Étape 6 : Vérification Finale

```bash
# Vérifier le service
systemctl status demo

# Vérifier les logs
journalctl -u demo -f

# Tester l'accès
curl -I https://demo.myp3000app.com

# Tester l'API
curl https://demo.myp3000app.com/api/status/
```

## 🔧 Scripts de Gestion Spécifiques DEMO

### Script de Reset Hebdomadaire

Créer `/root/reset_demo_data.sh` :

```bash
#!/bin/bash

echo "🔄 Réinitialisation de l'environnement de démonstration..."

cd /var/www/demo/Desktop/Projet/P3000/Application
source /var/www/demo/venv/bin/activate

# Backup avant reset
pg_dump p3000db_demo > /var/backups/postgres/p3000db_demo_before_reset_$(date +%Y%m%d).sql

# Supprimer les données (sauf utilisateurs admin)
python manage.py flush --no-input

# Recharger les données de démo
python manage.py load_demo_data

# Nettoyer les fichiers S3 temporaires
python manage.py cleanup_demo_s3

# Redémarrer le service
systemctl restart demo

echo "✅ Environnement de démonstration réinitialisé avec succès"
```

### Cron Job pour Reset Automatique

```bash
# Éditer le crontab
sudo crontab -e

# Ajouter (reset tous les lundis à 2h du matin)
0 2 * * 1 /root/reset_demo_data.sh >> /var/log/demo/reset.log 2>&1
```

### Script de Monitoring Démo

Créer `/root/monitor_demo.sh` :

```bash
#!/bin/bash

echo "📊 Statistiques de l'environnement DEMO"
echo "========================================"

cd /var/www/demo/Desktop/Projet/P3000/Application
source /var/www/demo/venv/bin/activate

python manage.py shell << EOF
from api.models import Chantier, Devis, Facture, User
from django.contrib.sessions.models import Session
from django.utils import timezone

print(f"Chantiers créés: {Chantier.objects.count()}")
print(f"Devis créés: {Devis.objects.count()}")
print(f"Factures émises: {Facture.objects.count()}")
print(f"Utilisateurs actifs: {User.objects.filter(is_active=True).count()}")
print(f"Sessions actives: {Session.objects.filter(expire_date__gte=timezone.now()).count()}")
print(f"Dernière activité: {User.objects.filter(last_login__isnull=False).order_by('-last_login').first().last_login if User.objects.filter(last_login__isnull=False).exists() else 'Aucune'}")
EOF

echo ""
echo "Service status:"
systemctl status demo --no-pager | head -3
```

## 🎓 Guide pour les Clients Potentiels

### Page d'Accueil de Démonstration

Créer une page d'accueil spécifique qui explique :

```
🎯 BIENVENUE SUR LA DÉMONSTRATION P3000

Cette instance de démonstration vous permet de tester gratuitement
toutes les fonctionnalités de P3000 pour la gestion BTP.

IDENTIFIANTS DE TEST :
- Email: demo@entreprise.com
- Mot de passe: DemoP3000!

FONCTIONNALITÉS DISPONIBLES :
✅ Gestion des chantiers
✅ Création et modification de devis
✅ Facturation et situations
✅ Planning et Gantt
✅ Gestion documentaire (Drive)
✅ Tableau de bord avec statistiques
✅ Gestion des fournisseurs et sous-traitants

⚠️ INFORMATIONS IMPORTANTES :
- Les données sont réinitialisées chaque lundi
- Environnement partagé avec d'autres testeurs
- Les PDFs générés contiennent un filigrane "DÉMONSTRATION"
- Limites : 50 chantiers max, 100 devis max

📞 INTÉRESSÉ ?
Contactez-nous pour obtenir votre propre instance personnalisée :
- Email: contact@votreentreprise.com
- Téléphone: +33 X XX XX XX XX
- Site: www.votreentreprise.com
```

### Utilisateurs de Test

Créer plusieurs profils types :
- `demo-admin@entreprise.com` → Administrateur complet
- `demo-chef@entreprise.com` → Chef de chantier
- `demo-compta@entreprise.com` → Comptable
- `demo-commercial@entreprise.com` → Commercial

Mot de passe commun : `DemoP3000!`

## 🔄 Maintenance et Mises à Jour

### Mettre à Jour l'Environnement DEMO

```bash
# Se connecter au serveur
ssh production

# Aller dans le répertoire
cd /var/www/demo/Desktop/Projet/P3000/Application

# Sauvegarder la base de données
pg_dump p3000db_demo > /var/backups/postgres/p3000db_demo_$(date +%Y%m%d).sql

# Mettre à jour le code
git fetch origin
git checkout client/demo
git pull origin client/demo

# Activer l'environnement virtuel
source /var/www/demo/venv/bin/activate

# Mettre à jour les dépendances
pip install -r requirements.txt

# Mettre à jour le frontend
cd frontend
npm install
npm run build
cd ..

# Exécuter les migrations
python manage.py migrate

# Collecter les fichiers statiques
python manage.py collectstatic --clear --noinput

# Redémarrer le service
systemctl restart demo
systemctl status demo
```

### Logs et Debugging

```bash
# Logs du service
journalctl -u demo -f

# Logs Nginx
tail -f /var/log/nginx/demo_error.log
tail -f /var/log/nginx/demo_access.log

# Logs Gunicorn
tail -f /var/log/gunicorn/demo_error.log

# Logs Django
tail -f /var/log/demo/django.log
```

## 🛡️ Sécurité

### Limites de Rate-Limiting (Nginx)

Ajouter dans `/etc/nginx/sites-available/demo.conf` :

```nginx
# Rate limiting pour l'environnement DEMO
limit_req_zone $binary_remote_addr zone=demo_limit:10m rate=10r/s;

server {
    # ... autres configurations ...
    
    location / {
        limit_req zone=demo_limit burst=20 nodelay;
        # ... reste de la config proxy ...
    }
}
```

### Nettoyage Automatique des Données Anciennes

Créer une commande Django `cleanup_demo_s3.py` :

```python
# api/management/commands/cleanup_demo_s3.py
from django.core.management.base import BaseCommand
import boto3
from datetime import datetime, timedelta
from decouple import config

class Command(BaseCommand):
    help = 'Nettoie les fichiers S3 de plus de 7 jours dans l\'environnement DEMO'

    def handle(self, *args, **options):
        s3 = boto3.client('s3')
        bucket_name = config('AWS_STORAGE_BUCKET_NAME')
        cutoff_date = datetime.now() - timedelta(days=7)
        
        self.stdout.write(f"🗑️ Nettoyage des fichiers S3 de plus de 7 jours...")
        
        # Lister et supprimer les vieux fichiers
        response = s3.list_objects_v2(Bucket=bucket_name)
        deleted_count = 0
        
        if 'Contents' in response:
            for obj in response['Contents']:
                if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                    s3.delete_object(Bucket=bucket_name, Key=obj['Key'])
                    deleted_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f"✅ {deleted_count} fichiers supprimés"
        ))
```

## 📊 Monitoring

### Métriques à Surveiller

1. **Trafic** : Nombre de visiteurs uniques par semaine
2. **Engagement** : Temps moyen passé sur la démo
3. **Utilisation** : Fonctionnalités les plus testées
4. **Conversion** : Nombre de demandes de devis suite à la démo

### Script d'Analyse

```bash
#!/bin/bash
# /root/demo_analytics.sh

echo "📈 Statistiques DEMO - Dernière semaine"
echo "========================================"

# Visiteurs uniques (via Nginx logs)
echo "Visiteurs uniques:"
awk '{print $1}' /var/log/nginx/demo_access.log | sort -u | wc -l

# Pages les plus visitées
echo -e "\nPages les plus visitées:"
awk '{print $7}' /var/log/nginx/demo_access.log | sort | uniq -c | sort -rn | head -10

# Taux d'erreur
echo -e "\nTaux d'erreur:"
total=$(wc -l < /var/log/nginx/demo_access.log)
errors=$(grep " 5[0-9][0-9] " /var/log/nginx/demo_access.log | wc -l)
echo "Total requêtes: $total"
echo "Erreurs 5xx: $errors"
```

## 🎯 Checklist de Déploiement

### Avant le Déploiement
- [ ] DNS configuré (demo.myp3000app.com → VPS)
- [ ] Bucket S3 créé (p3000-demo)
- [ ] CORS configuré sur S3
- [ ] Credentials AWS disponibles
- [ ] Port 8003 libre sur le serveur

### Pendant le Déploiement
- [ ] Script `setup-new-client.sh` exécuté
- [ ] Fichier `.env` configuré
- [ ] Migrations appliquées
- [ ] Frontend buildé
- [ ] Certificat SSL obtenu

### Après le Déploiement
- [ ] Service systemd actif
- [ ] Site accessible via HTTPS
- [ ] Données de démo chargées
- [ ] Utilisateurs de test créés
- [ ] Reset automatique configuré (cron)
- [ ] Monitoring en place

## 📞 Support et Contact

Pour toute question concernant l'environnement de démonstration :
- **Email technique** : support-technique@votreentreprise.com
- **Email commercial** : contact@votreentreprise.com
- **Documentation** : Ce fichier + MULTI_CLIENT_SETUP.md

## 🔗 Références

- [MULTI_CLIENT_SETUP.md](./MULTI_CLIENT_SETUP.md) - Architecture multi-clients
- [STRUCTURE_PROJET.md](./STRUCTURE_PROJET.md) - Structure du code
- Script d'installation : `deploy/setup-new-client.sh`
- Configuration Nginx : `deploy/nginx-template.conf`
- Service systemd : `deploy/systemd-template.service`

---

**Dernière mise à jour** : Octobre 2026  
**Version** : 1.0  
**Responsable** : Équipe DevOps P3000
