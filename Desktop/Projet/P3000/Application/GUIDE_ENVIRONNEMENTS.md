# Guide des Environnements P3000

Ce guide explique comment configurer et utiliser les environnements local et production pour l'application P3000.

## 🏗️ Architecture des Environnements

### Structure des Fichiers

```
Application/
├── Application/
│   ├── settings.py          # Point d'entrée principal
│   ├── settings_base.py     # Configuration de base commune
│   ├── settings_local.py    # Configuration spécifique au développement
│   └── settings_production.py # Configuration spécifique à la production
├── env.local               # Variables d'environnement local
├── env.production          # Variables d'environnement production
├── manage_env.py           # Script de gestion des environnements
└── scripts/
    ├── setup_local_env.py      # Configuration automatique local
    └── setup_production_env.py # Configuration automatique production
```

## 🚀 Configuration Rapide

### 1. Environnement Local (Développement)

```bash
# Configuration automatique complète
python manage_env.py setup-local

# Ou configuration manuelle
python manage_env.py local
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 2. Environnement Production

```bash
# Configuration automatique complète
python manage_env.py setup-prod

# Ou configuration manuelle
python manage_env.py production
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

## 📋 Commandes Utiles

### Gestion des Environnements

```bash
# Voir l'environnement actuel
python manage_env.py status

# Basculer vers l'environnement local
python manage_env.py local

# Basculer vers l'environnement production
python manage_env.py production

# Afficher l'aide
python manage_env.py help
```

### Commandes Django

```bash
# Exécuter les migrations
python manage_env.py migrate

# Collecter les fichiers statiques
python manage_env.py collectstatic

# Lancer le serveur de développement
python manage_env.py runserver
```

## 🗄️ Bases de Données

### Séparation des Données

- **Local**: `p3000db_local` - Pour le développement et les tests
- **Production**: `p3000db_prod` - Pour l'environnement de production

### Configuration PostgreSQL

```sql
-- Créer l'utilisateur
CREATE USER p3000user WITH PASSWORD 'Boumediene30';

-- Créer la base locale
CREATE DATABASE p3000db_local OWNER p3000user;

-- Créer la base de production
CREATE DATABASE p3000db_prod OWNER p3000user;
```

## 🔧 Configuration des Variables d'Environnement

### Variables Locales (env.local)

```bash
DEBUG=True
SECRET_KEY=django-insecure-dev-key-change-this-for-local-development-only
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
DATABASE_URL=postgresql://p3000user:Boumediene30@localhost:5432/p3000db_local
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Variables Production (env.production)

```bash
DEBUG=False
SECRET_KEY=votre-cle-secrete-tres-longue-et-complexe-pour-la-production
ALLOWED_HOSTS=myp3000app.com,www.myp3000app.com
DATABASE_URL=postgresql://p3000user:Boumediene30@localhost:5432/p3000db_prod
CORS_ALLOWED_ORIGINS=https://myp3000app.com,https://www.myp3000app.com
```

## 🔒 Sécurité

### Environnement Local

- DEBUG activé pour le développement
- Cookies non sécurisés (HTTP)
- Logs détaillés
- Base de données locale

### Environnement Production

- DEBUG désactivé
- Cookies sécurisés (HTTPS)
- Logs de production
- Base de données de production
- Configuration de sécurité renforcée

## 📁 Répertoires Créés

### Local

```
logs/           # Logs de développement
media/          # Fichiers uploadés
static/         # Fichiers statiques de développement
```

### Production

```
logs/           # Logs de production
media/          # Fichiers uploadés
staticfiles/    # Fichiers statiques collectés
```

## 🚨 Bonnes Pratiques

### Développement

1. **Toujours utiliser l'environnement local** pour le développement
2. **Ne jamais commiter** le fichier `.env` dans Git
3. **Tester les migrations** avant de les appliquer en production
4. **Utiliser des données de test** dans l'environnement local

### Production

1. **Changer la SECRET_KEY** pour la production
2. **Configurer HTTPS** obligatoirement
3. **Sauvegarder régulièrement** la base de données
4. **Monitorer les logs** de production
5. **Tester les déploiements** dans un environnement de staging

## 🔄 Workflow de Développement

### 1. Développement Local

```bash
# Basculer en local
python manage_env.py local

# Développer et tester
python manage.py runserver

# Créer les migrations
python manage.py makemigrations

# Tester les migrations
python manage.py migrate
```

### 2. Déploiement en Production

```bash
# Basculer en production
python manage_env.py production

# Appliquer les migrations
python manage_env.py migrate

# Collecter les fichiers statiques
python manage_env.py collectstatic

# Redémarrer le serveur
sudo systemctl restart gunicorn
```

## 🛠️ Dépannage

### Problèmes Courants

#### Erreur de Base de Données

```bash
# Vérifier la connexion PostgreSQL
psql -U p3000user -d p3000db_local

# Vérifier les permissions
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE p3000db_local TO p3000user;"
```

#### Erreur de Permissions

```bash
# Corriger les permissions des logs
chmod 755 logs
chmod 644 logs/*.log

# Corriger les permissions des médias
chmod 755 media
```

#### Erreur de Configuration

```bash
# Vérifier l'environnement actuel
python manage_env.py status

# Reconfigurer l'environnement
python manage_env.py setup-local  # ou setup-prod
```

## 📞 Support

En cas de problème :

1. Vérifier les logs dans le répertoire `logs/`
2. Vérifier la configuration avec `python manage_env.py status`
3. Consulter la documentation Django
4. Contacter l'équipe de développement

---

**Note**: Ce guide doit être mis à jour à chaque modification de la configuration des environnements.
