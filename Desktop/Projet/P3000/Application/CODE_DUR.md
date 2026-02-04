# Code en dur — Multi-client

Ce document recense les **valeurs codées en dur** dans le projet à adapter pour la gestion multi-client (P3000, Elekable, futurs clients). À modifier plus tard pour centraliser la configuration (variables d’environnement, settings par client).

---

## 1. Settings Django et base de données

### Cas corrigé : script utilisateurs et mauvaise base

**Problème** : Un script lancé avec `Application.settings` se connecte à la base codée en dur (`p3000db`). En production Elekable, l’app utilise `Application.settings_production` et `DATABASE_URL` du `.env` → `p3000db_elekable`. Les mots de passe étaient donc modifiés dans la mauvaise base.

**Solution appliquée** : `create_users_elekable.py` utilise désormais `Application.settings_production`.

### Fichiers à adapter

| Fichier | Code en dur | Action recommandée |
|---------|-------------|--------------------|
| `Application/wsgi.py` | `DJANGO_SETTINGS_MODULE = 'Application.settings'` | Utiliser `os.getenv('DJANGO_SETTINGS_MODULE', 'Application.settings_production')` ou laisser le service systemd/entrypoint définir la variable |
| `Application/asgi.py` | `DJANGO_SETTINGS_MODULE = 'Application.settings'` | Idem |
| `manage.py` | `DJANGO_SETTINGS_MODULE = 'Application.settings'` | Garder pour dev local ; en prod utiliser `Application.settings_production` via env |
| `create_users.py` | `Application.settings` | Si utilisé sur un client : utiliser `Application.settings_production` ou lire `DJANGO_SETTINGS_MODULE` depuis l’env |
| `create_users_simple.py` | `Application.settings` | Idem |
| `create_users_amelioration.py` | `Application.settings` | Idem (script P3000) ; pour un client, utiliser `settings_production` |
| `configure_s3_cors.py` | `Application.settings` | Utiliser `Application.settings_production` si exécuté en prod client |
| `rollback_migration.py` | `Application.settings` | Idem |
| `force_logout.py` | `Application.settings` | Idem |
| `check_db_structure.py` | `Application.settings` | Idem |
| `backup_safe.py` | `Application.settings` | Idem |

### Base de données

| Fichier | Code en dur | Action recommandée |
|---------|-------------|--------------------|
| `Application/settings.py` | `'NAME': 'p3000db_local'`, `'NAME': 'p3000db'`, `'PASSWORD': 'Boumediene30'` | Ne pas utiliser ce settings en prod client ; tout passer par `settings_production` + `DATABASE_URL` dans `.env` |
| `Application/settings_base.py` | `default_hosts = 'myp3000app.com,...'`, `'NAME': os.getenv('DB_NAME', 'p3000db')`, `'PASSWORD': os.getenv('DB_PASSWORD', 'Boumediene30')` | Les défauts sont P3000 ; les clients surchargent via `.env` (OK). Documenter que les valeurs par défaut = P3000 |
| `Application/settings_local.py` | `'NAME': 'p3000db_local'`, `'PASSWORD': 'Boumediene30'` | Réservé au dev local ; OK |

---

## 2. Domaines et hôtes

| Fichier | Code en dur | Action recommandée |
|---------|-------------|--------------------|
| `Application/settings.py` | `ALLOWED_HOSTS = ['myp3000app.com', ...]`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` | En prod client, tout doit venir du `.env` (déjà le cas si on utilise `settings_production` qui hérite de `settings_base` + env) |
| `Application/settings_base.py` | `default_hosts = 'myp3000app.com,www.myp3000app.com,72.60.90.127,...'` | Défaut P3000 ; les clients définissent `ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS` / `CORS_ALLOWED_ORIGINS` dans `.env` |
| `api/views_drive/onlyoffice.py` | `myp3000app.com`, `www.myp3000app.com`, `72.60.90.127` en dur dans `normalize_file_url` et `normalize_callback_url` | Remplacer par `settings.ALLOWED_HOSTS` ou une variable du type `CLIENT_DOMAIN` / `BASE_URL` lue depuis `settings` (ex. `getattr(settings, 'CLIENT_PUBLIC_DOMAIN', None)` ou premier élément de `ALLOWED_HOSTS` sans localhost) |
| `api/views_drive/views.py` | `72.60.90.127` pour `verify_ssl` | Utiliser une config dérivée du domaine client (env ou settings) |
| `frontend/views.py` | Commentaire `https://office.myp3000app.com` | Documenter ou remplacer par une config dynamique si sous-domaine par client |
| `verifier_myp3000app.py` | `domaine = "myp3000app.com"`, `ip_attendue = "72.60.90.127"` | Script spécifique P3000 ; renommer ou paramétrer par client (arg/env) |
| `deploy_production.sh` | `https://myp3000app.com` dans messages | Variable `BASE_URL` ou `CLIENT_DOMAIN` selon déploiement |
| `validate_deployment.sh` | `BASE_URL="https://myp3000app.com"` | Lire depuis env ou argument |
| `validate_headers.sh` | `BASE_URL`, `LOCAL_URL` avec myp3000app / 8000 | Paramétrer par client |
| `validate_nginx_config.sh` | `nginx_myp3000app.conf`, `myp3000app.com` | Nom de config et domaine en argument ou env |
| `restart_app.sh` | `https://myp3000app.com` | Variable selon client |
| `deploy_auto.sh` | `https://myp3000app.com` | Idem |
| `cors_s3_config.json` | `myp3000app.com`, `72.60.90.127:8080` | Générer ou choisir par client (ex. script qui lit le .env du client) |
| `configure_s3_cors.py` | `myp3000app.com`, `127.0.0.1:8000`, `72.60.90.127:8080` | Lire domaines et origines depuis settings/env |

---

## 3. Ports

| Fichier | Code en dur | Action recommandée |
|---------|-------------|--------------------|
| `gunicorn.conf.py` | `bind = '127.0.0.1:8000'` | Réservé P3000 ; les clients ont leur propre service (ex. 8001). Ne pas partager ce fichier ou le surcharger par env (ex. `GUNICORN_PORT`) |
| `api/views_drive/onlyoffice.py` | `host.docker.internal:8000` en dev | Variable type `DJANGO_PORT` ou déduire de `RUNSERVER_PORT` / config dev |
| `frontend/src/utils/universalDriveGenerator.js` | `http://localhost:8000/api` | Déjà conditionnel (dev) ; s’assurer que l’API de prod vient d’une config (env au build ou reverse proxy) |
| `frontend/src/components/pdf_drive_functions.js` | `http://localhost:8000/api` | Idem |
| `frontend/src/components/pdf_drive_functions_new.js` | Idem | Idem |
| `api/management/commands/regenerate_pdfs.py` | `http://localhost:8000/api/...` | Utiliser `settings.SITE_URL` ou variable d’env (ex. `BASE_URL`) pour construire l’URL |

---

## 4. Emails et identité client (scripts utilisateurs)

| Fichier | Code en dur | Action recommandée |
|---------|-------------|--------------------|
| `create_users_elekable.py` | `@elekable.fr` pour les emails, `admin@elekable.fr` | Variable `CLIENT_DOMAIN` ou `EMAIL_DOMAIN` (env) pour rendre le script réutilisable pour d’autres clients |

---

## 5. S3 / Stockage

| Fichier | Code en dur | Action recommandée |
|---------|-------------|--------------------|
| `configure_s3_cors.py` | `bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME', 'agency-drive-prod')` | Défaut P3000 ; les clients ont leur bucket dans `.env` (déjà le cas). Documenter que le défaut = P3000 |
| `.env` / exemples | `AWS_STORAGE_BUCKET_NAME=agency-drive-prod` | Par déploiement ; ne pas commiter de secrets ; garder des exemples par client (comme `env-elekable.example`) |

---

## 6. Mots de passe et secrets (documentation uniquement)

Ne pas mettre de vrais mots de passe dans le dépôt. Les fichiers suivants contiennent des références à des mots de passe ou noms de base ; à garder en exemples / templates uniquement, avec des placeholders :

| Fichier | Note |
|---------|------|
| `Application/settings.py` | `PASSWORD` en dur pour dev local |
| `Application/settings_base.py` | Défaut `DB_PASSWORD` |
| `myp3000app.env`, `setup_production_env.sh`, `scripts/setup_production_env.py` | Exemples ; utiliser des placeholders type `VOTRE_MOT_DE_PASSE` |

---

## 7. Nginx et déploiement

| Fichier | Code en dur | Action recommandée |
|---------|-------------|--------------------|
| `nginx_myp3000app.conf` | `myp3000app.com`, chemins certs LetsEncrypt | Fichier spécifique P3000 ; les clients ont leur propre conf (ex. `deploy/nginx-template.conf` + substitution) |
| `deploy/setup-new-client.sh` | Noms de base `p3000db_${CLIENT_NAME}`, exemples elekable/8001 | Déjà paramétré par arguments ; documenter la convention |
| `deploy/systemd-template.service` | `DJANGO_SETTINGS_MODULE=Application.settings_production` | OK ; commun à tous les clients. Seul le port / chemin changent par client |
| `deploy/deploy-client.sh` | `Application.settings_production` | OK |

---

## 8. Récapitulatif des actions prioritaires

1. **OnlyOffice / domaines** : Dans `api/views_drive/onlyoffice.py`, remplacer les domaines et IP en dur par une config (ex. `CLIENT_PUBLIC_DOMAIN` ou premier hôte public dans `ALLOWED_HOSTS`).
2. **Scripts Django (create_users, backup, rollback, etc.)** : Lorsqu’ils sont exécutés sur un environnement client, utiliser `Application.settings_production` (ou `DJANGO_SETTINGS_MODULE` défini par l’env) pour pointer vers la bonne base et la bonne config.
3. **Frontend** : Vérifier que l’URL de l’API en production ne dépend pas d’un host/port en dur (utilisation du même domaine que le front, ou variable d’environnement au build).
4. **Validation / déploiement** : Paramétrer les scripts de validation (URL, config Nginx) par client (arguments ou variables d’environnement).

---

*Dernière mise à jour : suite à la correction du script `create_users_elekable.py` (utilisation de `Application.settings_production` pour cibler la base Elekable).*
