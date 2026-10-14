# 🎯 Environnement de Démonstration P3000

## 📋 Vue d'ensemble

L'environnement de démonstration est une instance complète de P3000 destinée à permettre aux **clients potentiels** de tester l'application avant de commander leur propre instance personnalisée.

### 🎯 Objectifs

- ✅ Permettre aux prospects de tester toutes les fonctionnalités
- ✅ Fournir des données exemple réalistes (chantiers, devis, factures)
- ✅ Environnement isolé et sécurisé
- ✅ Reset automatique hebdomadaire pour maintenir la qualité

### 🏗️ Configuration

| Paramètre | Valeur |
|-----------|--------|
| **Branche Git** | `client/demo` |
| **Domaine** | demo.myp3000app.com |
| **Port** | 8003 |
| **Base de données** | p3000db_demo |
| **Bucket S3** | p3000-demo (région eu-west-3) |
| **Redis DB** | 3 |
| **Service** | demo.service |

---

## 📁 Fichiers Créés

### 🔧 Configuration

| Fichier | Description |
|---------|-------------|
| `deploy/.env.demo` | Template de configuration environnement DEMO |
| `deploy/cors-demo.json` | Configuration CORS pour le bucket S3 |

### 📚 Documentation

| Fichier | Description |
|---------|-------------|
| `DEMO_CLIENT_SETUP.md` | Documentation complète (40+ pages) |
| `DEMO_QUICK_DEPLOY.md` | Guide de déploiement rapide (5 min) |
| `DEMO_README.md` | Ce fichier - Vue d'ensemble |

### 🐍 Commandes Django

| Fichier | Commande | Description |
|---------|----------|-------------|
| `api/management/commands/create_demo_users.py` | `python manage.py create_demo_users` | Crée les utilisateurs de test |
| `api/management/commands/load_demo_data.py` | `python manage.py load_demo_data` | Charge les données exemple |
| `api/management/commands/cleanup_demo_s3.py` | `python manage.py cleanup_demo_s3` | Nettoie les vieux fichiers S3 |

### 🔄 Scripts Bash

| Fichier | Description |
|---------|-------------|
| `deploy/reset_demo_data.sh` | Reset automatique (cron hebdomadaire) |
| `deploy/monitor_demo.sh` | Monitoring et statistiques |

---

## 🚀 Déploiement Rapide

### 1. Prérequis (à faire une fois)

```bash
# DNS
demo.myp3000app.com → A → VOTRE_IP_VPS

# Bucket S3
aws s3api create-bucket --bucket p3000-demo --region eu-west-3 \
    --create-bucket-configuration LocationConstraint=eu-west-3
```

### 2. Installation (automatique)

```bash
ssh production
cd /var/www/p3000/Desktop/Projet/P3000/Application
./deploy/setup-new-client.sh demo demo.myp3000app.com 8003 3
```

### 3. Configuration du .env

```bash
nano /var/www/demo/Desktop/Projet/P3000/Application/.env
```

Remplir : `SECRET_KEY`, `DATABASE_URL`, `AWS_*`, `ONLYOFFICE_JWT_SECRET`

### 4. Initialisation

```bash
cd /var/www/demo/Desktop/Projet/P3000/Application
source /var/www/demo/venv/bin/activate
python manage.py create_demo_users
python manage.py load_demo_data
```

### 5. Vérification

```bash
systemctl status demo
curl -I https://demo.myp3000app.com
```

**Temps total** : ~5-10 minutes ⏱️

---

## 👥 Utilisateurs de Test

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| demo@entreprise.com | DemoP3000! | Utilisateur standard |
| demo-admin@entreprise.com | DemoP3000! | Administrateur |
| demo-chef@entreprise.com | DemoP3000! | Chef de chantier |
| demo-compta@entreprise.com | DemoP3000! | Comptable |
| demo-commercial@entreprise.com | DemoP3000! | Commercial |

---

## 📊 Données Exemple

Après l'initialisation, l'environnement contient :

- **5 chantiers** (différents états : en cours, planifié, terminé)
- **10 devis** (brouillon, envoyé, validé, signé)
- **4 clients** (particuliers et professionnels)
- **3 fournisseurs**
- **2 sous-traitants**
- **3 factures**

Données réalistes basées sur des cas d'usage BTP concrets.

---

## 🔄 Maintenance

### Reset Automatique Hebdomadaire

Les données sont réinitialisées **tous les lundis à 2h00** automatiquement.

```bash
# Configurer le cron (à faire une fois)
chmod +x /var/www/p3000/Desktop/Projet/P3000/Application/deploy/reset_demo_data.sh
sudo cp /var/www/p3000/Desktop/Projet/P3000/Application/deploy/reset_demo_data.sh /root/
sudo crontab -e
# Ajouter:
0 2 * * 1 /root/reset_demo_data.sh >> /var/log/demo/reset.log 2>&1
```

### Reset Manuel

```bash
/root/reset_demo_data.sh
```

Le script :
1. ✅ Sauvegarde la base de données
2. ✅ Supprime les anciennes données
3. ✅ Recrée les utilisateurs
4. ✅ Recharge les données exemple
5. ✅ Nettoie les fichiers S3
6. ✅ Vide le cache Redis
7. ✅ Redémarre le service

---

## 📈 Monitoring

### Script de Monitoring Complet

```bash
cd /var/www/p3000/Desktop/Projet/P3000/Application
./deploy/monitor_demo.sh
```

Affiche :
- État du service
- Statistiques base de données
- Utilisation disque et mémoire
- Cache Redis
- Logs récents
- Trafic web (24h)
- Score de santé

### Commandes Rapides

```bash
# État du service
systemctl status demo

# Logs en temps réel
journalctl -u demo -f

# Logs Nginx
tail -f /var/log/nginx/demo_access.log
tail -f /var/log/nginx/demo_error.log

# Statistiques base de données
cd /var/www/demo/Desktop/Projet/P3000/Application
source /var/www/demo/venv/bin/activate
python manage.py shell
>>> from api.models import Chantier, Devis
>>> print(f"Chantiers: {Chantier.objects.count()}")
>>> print(f"Devis: {Devis.objects.count()}")
```

---

## 🛡️ Sécurité et Limitations

### Protections en Place

- ✅ **Reset automatique** : Données réinitialisées chaque semaine
- ✅ **Limites de création** : Maximum 50 chantiers, 100 devis
- ✅ **Rate limiting** : 10 requêtes/seconde par IP
- ✅ **Isolation** : Base de données et bucket S3 dédiés
- ✅ **Filigrane** : PDFs générés avec mention "DÉMONSTRATION"

### Nettoyage S3 Automatique

Les fichiers S3 de plus de 7 jours sont automatiquement supprimés.

```bash
# Manuel
python manage.py cleanup_demo_s3

# Avec options
python manage.py cleanup_demo_s3 --days 14 --dry-run
```

---

## 🔗 Workflow Git

### Mettre à Jour l'Environnement DEMO

```bash
# 1. Développer sur main (fonctionnalités communes)
git checkout main
# ... développer ...
git commit -m "feat: nouvelle fonctionnalité"
git push origin main

# 2. Merger vers client/demo
git checkout client/demo
git merge main
git push origin client/demo

# 3. Déployer sur le serveur
ssh production
cd /var/www/demo/Desktop/Projet/P3000/Application
git pull origin client/demo
source /var/www/demo/venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
python manage.py migrate
python manage.py collectstatic --clear --noinput
systemctl restart demo
```

### Fonctionnalité Spécifique DEMO

```bash
# Développer directement sur client/demo
git checkout client/demo
# ... développer ...
git commit -m "feat(demo): bannière de démonstration"
git push origin client/demo
```

---

## 📞 Support

### Documentation

- **Guide complet** : [DEMO_CLIENT_SETUP.md](./DEMO_CLIENT_SETUP.md) (40+ pages)
- **Déploiement rapide** : [DEMO_QUICK_DEPLOY.md](./DEMO_QUICK_DEPLOY.md)
- **Architecture** : [MULTI_CLIENT_SETUP.md](./MULTI_CLIENT_SETUP.md)
- **Structure** : [STRUCTURE_PROJET.md](./STRUCTURE_PROJET.md)

### Dépannage

| Problème | Solution |
|----------|----------|
| Service ne démarre pas | `journalctl -u demo -n 50` |
| Erreur 502 | `ss -tlnp \| grep 8003` |
| Problème S3 | `aws s3 ls s3://p3000-demo` |
| Base corrompue | Restore backup dans `/var/backups/postgres/` |

---

## 📊 Métriques de Succès

### À Surveiller

- **Trafic** : Nombre de visiteurs uniques par semaine
- **Engagement** : Temps moyen passé sur la plateforme
- **Fonctionnalités** : Pages/fonctionnalités les plus testées
- **Conversion** : Demandes commerciales suite à la démo

### Analytics

```bash
# Script d'analyse (créer si nécessaire)
./deploy/demo_analytics.sh
```

---

## 🎓 Guide pour les Clients

### Message d'Accueil

Créer une bannière visible sur l'environnement DEMO :

```
🎯 BIENVENUE SUR LA DÉMONSTRATION P3000

Testez gratuitement toutes les fonctionnalités !

IDENTIFIANTS : demo@entreprise.com / DemoP3000!

⚠️ Les données sont réinitialisées chaque lundi

📞 Intéressé ? Contactez-nous :
   contact@votreentreprise.com
```

### Scénarios de Test Recommandés

1. **Création d'un chantier** (5 min)
2. **Génération d'un devis** (10 min)
3. **Gestion du planning** (5 min)
4. **Suivi des dépenses** (5 min)
5. **Consultation du dashboard** (5 min)

---

## ✅ Checklist de Déploiement

### Avant Déploiement
- [ ] DNS configuré
- [ ] Bucket S3 créé
- [ ] CORS S3 configuré
- [ ] Credentials AWS disponibles
- [ ] Port 8003 libre

### Pendant Déploiement
- [ ] Script setup exécuté
- [ ] .env configuré
- [ ] Migrations appliquées
- [ ] Frontend buildé
- [ ] SSL/Certificat obtenu

### Après Déploiement
- [ ] Service actif
- [ ] Site accessible (HTTPS)
- [ ] Utilisateurs créés
- [ ] Données chargées
- [ ] Reset automatique configuré
- [ ] Monitoring actif

---

## 🎯 Prochaines Étapes

Après avoir déployé l'environnement DEMO :

1. **Tester** : Se connecter et vérifier toutes les fonctionnalités
2. **Personnaliser** : Ajouter logo/couleurs de votre entreprise
3. **Communiquer** : Partager le lien avec vos prospects
4. **Monitorer** : Suivre l'utilisation et les retours
5. **Convertir** : Transformer les testeurs en clients !

---

**Version** : 1.0  
**Date** : Octobre 2026  
**Responsable** : Équipe P3000  
**URL** : https://demo.myp3000app.com
