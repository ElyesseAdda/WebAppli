# Guide de Migration - Nouveau Système de Déploiement P3000

## 🎯 Objectif

Résoudre les problèmes de déploiement et de gestion des fichiers `.env` en production.

## ⚠️ Problèmes résolus

1. **Fichier .env écrasé** lors du `git pull origin main`
2. **Déploiement non synchronisé** avec la dernière version de `main`
3. **Gestion fragile** de la sauvegarde/restauration des variables d'environnement

## 🆕 Nouvelle Architecture

### Séparation complète des environnements

```
/root/p3000-env-backup/
├── .env.production          # Configuration de production (permanente)
├── .env.backup.YYYYMMDD_HHMMSS  # Sauvegardes horodatées
└── ...

/var/www/p3000/Desktop/Projet/P3000/Application/
├── .env                     # Fichier temporaire (écrasé à chaque déploiement)
├── deploy_production.sh     # Nouveau script de déploiement
└── setup_production_env.sh  # Script de configuration initiale
```

## 🚀 Migration (À exécuter sur le serveur de production)

### Étape 1: Sauvegarde de sécurité

```bash
# Se connecter au serveur de production
cd /var/www/p3000/Desktop/Projet/P3000/Application

# Sauvegarder la configuration actuelle
cp .env /root/.env.production.backup.$(date +%Y%m%d_%H%M%S)

# Sauvegarder la base de données (optionnel mais recommandé)
python manage.py dumpdata > backup_before_migration_$(date +%Y%m%d_%H%M%S).json
```

### Étape 2: Installation des nouveaux scripts

```bash
# Récupérer les nouveaux scripts depuis le dépôt
git pull origin main

# Rendre les scripts exécutables
chmod +x deploy_production.sh
chmod +x setup_production_env.sh
```

### Étape 3: Configuration initiale

```bash
# Exécuter la configuration initiale (une seule fois)
./setup_production_env.sh

# Éditer le fichier de configuration de production
nano /root/p3000-env-backup/.env.production
```

### Étape 4: Premier déploiement avec le nouveau système

```bash
# Recharger les alias
source ~/.bashrc

# Tester le nouveau déploiement
p3000-deploy
```

## 📋 Configuration du fichier .env de production

Le fichier `/root/p3000-env-backup/.env.production` doit contenir :

```bash
# Django
SECRET_KEY=votre-clé-secrète-de-production
DEBUG=False
ALLOWED_HOSTS=myp3000app.com,www.myp3000app.com

# Base de données PostgreSQL
DATABASE_URL=postgresql://p3000_user:mot_de_passe@localhost:5432/p3000_prod
DB_NAME=p3000_prod
DB_USER=p3000_user
DB_PASSWORD=votre_mot_de_passe_db
DB_HOST=localhost
DB_PORT=5432

# Chemins statiques
STATIC_ROOT=/var/www/p3000/static/
MEDIA_ROOT=/var/www/p3000/media/

# AWS S3 (si utilisé)
AWS_ACCESS_KEY_ID=votre_access_key
AWS_SECRET_ACCESS_KEY=votre_secret_key
AWS_STORAGE_BUCKET_NAME=votre_bucket
AWS_S3_REGION_NAME=eu-west-3

# Email (si utilisé)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=votre-email@gmail.com
EMAIL_HOST_PASSWORD=votre_mot_de_passe_email
EMAIL_USE_TLS=True
```

## ✨ Avantages du nouveau système

### 🔒 Sécurité renforcée

- Fichier `.env` de production stocké hors du dépôt Git
- Permissions restrictives (600) sur les fichiers sensibles
- Sauvegardes automatiques horodatées

### 🎯 Déploiement fiable

- `git reset --hard origin/main` force la synchronisation
- Vérification de la version déployée
- Gestion d'erreurs robuste avec `set -e`

### 📊 Monitoring amélioré

- Logs colorés et détaillés
- Vérifications post-déploiement
- Statut des services en temps réel

### 🔄 Processus automatisé

- Sauvegarde automatique avant déploiement
- Restauration automatique de l'environnement
- Build frontend intégré

## 🛠️ Utilisation quotidienne

```bash
# Déploiement simple
p3000-deploy

# En cas de problème, vérifier les logs
journalctl -u gunicorn -f

# Voir les sauvegardes disponibles
ls -la /root/p3000-env-backup/
```

## 🆘 Dépannage

### Problème: "Fichier d'environnement de production non trouvé"

```bash
# Vérifier l'existence du fichier
ls -la /root/p3000-env-backup/.env.production

# Si absent, exécuter la configuration initiale
./setup_production_env.sh
```

### Problème: "Échec du redémarrage de Gunicorn"

```bash
# Vérifier les logs Gunicorn
journalctl -u gunicorn --no-pager -l

# Vérifier la configuration
systemctl status gunicorn
```

### Problème: Variables d'environnement incorrectes

```bash
# Éditer le fichier de production
nano /root/p3000-env-backup/.env.production

# Redéployer
p3000-deploy
```

## 📚 Commandes utiles

```bash
# Voir la version actuellement déployée
cd /var/www/p3000/Desktop/Projet/P3000/Application && git log -1 --oneline

# Comparer avec la version distante
git log HEAD..origin/main --oneline

# Voir les sauvegardes d'environnement
ls -la /root/p3000-env-backup/

# Restaurer une sauvegarde spécifique
cp /root/p3000-env-backup/.env.backup.YYYYMMDD_HHMMSS /root/p3000-env-backup/.env.production
```

## 🔄 Rollback en cas de problème

Si le nouveau système pose problème, vous pouvez revenir temporairement à l'ancien :

```bash
# Utiliser l'ancien script
./deploy_auto.sh

# Ou restaurer l'ancien alias
alias p3000-deploy="/var/www/p3000/Desktop/Projet/P3000/Application/deploy_auto.sh"
```

## ✅ Validation de la migration

Après la migration, vérifiez que :

1. ✅ `p3000-deploy` utilise le nouveau script
2. ✅ Le fichier `/root/p3000-env-backup/.env.production` existe
3. ✅ Les variables d'environnement sont correctes
4. ✅ L'application fonctionne après déploiement
5. ✅ Les logs sont détaillés et colorés
