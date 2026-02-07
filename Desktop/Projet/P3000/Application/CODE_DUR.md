# Code en dur — Multi-client

Ce document recense les **valeurs codées en dur** dans le projet à adapter pour la gestion multi-client (P3000, Elekable, futurs clients). Il trace aussi les **modifications déjà effectuées** sur la branche `client/elekable` pour pouvoir les reproduire sur `main`.

---

## Modifications effectuées (branche client/elekable)

### A. Modèle EntrepriseConfig (nouveau)

| Fichier | Modification | Détails |
|---------|-------------|---------|
| `api/models.py` | **AJOUTÉ** : modèle `EntrepriseConfig` (singleton, pk=1) | Stocke l'identité de l'entreprise : nom, adresse, RCS, email, téléphone, représentant, nom_application, domaine_public. Méthode `get_config()` pour récupérer/créer le singleton. |
| `api/context_processors.py` | **CRÉÉ** | Context processor Django qui injecte `{{ entreprise }}` dans tous les templates automatiquement. |
| `Application/settings_base.py` | **MODIFIÉ** : ajout du context processor `api.context_processors.entreprise_config` dans `TEMPLATES` | Permet l'injection automatique dans les templates. |
| `Application/settings_base.py` | **AJOUTÉ** : `CLIENT_PUBLIC_DOMAIN` et `CLIENT_APP_NAME` | Lus depuis `.env`, utilisés par OnlyOffice et le frontend. |
| `api/serializers.py` | **AJOUTÉ** : `EntrepriseConfigSerializer` + import `EntrepriseConfig` | Serializer lecture seule pour l'endpoint API. |
| `api/views.py` | **AJOUTÉ** : vue `get_entreprise_config` | Endpoint `GET /api/entreprise-config/` pour le frontend. |
| `api/urls.py` | **AJOUTÉ** : `path('entreprise-config/', ...)` + import | Route API pour la config entreprise. |
| `api/management/commands/setup_entreprise_config.py` | **CRÉÉ** | Commande `python manage.py setup_entreprise_config --preset elekable` pour initialiser la config. |
| `api/migrations/0092_add_entreprise_config.py` | **CRÉÉ** | Migration pour le nouveau modèle. |

### B. OnlyOffice — domaines dynamiques

| Fichier | Modification | Détails |
|---------|-------------|---------|
| `api/views_drive/onlyoffice.py` | **REFACTORÉ** : `normalize_file_url()` et `normalize_callback_url()` | Remplacement de `myp3000app.com`, `www.myp3000app.com`, `72.60.90.127` en dur par des méthodes dynamiques `_get_public_domain()` (lit `settings.CLIENT_PUBLIC_DOMAIN` ou premier hôte public de `ALLOWED_HOSTS`) et `_get_known_hostnames()`. |
| `api/views_drive/onlyoffice.py` | **REFACTORÉ** : `check_availability()` — vérification SSL | Remplacement de `72.60.90.127` en dur par détection dynamique d'IP via `_is_ip_address()`. |
| `api/views_drive/onlyoffice.py` | **AJOUTÉ** : méthodes helpers `_get_public_domain()`, `_get_known_hostnames()`, `_is_ip_address()` | Méthodes utilitaires pour la résolution dynamique des domaines. |
| `api/views_drive/views.py` | **MODIFIÉ** : `verify_ssl` dans `check_onlyoffice` | Remplacement de `72.60.90.127` en dur par détection dynamique d'adresse IP via regex. |
| `frontend/views.py` | **MODIFIÉ** : `get_context_data()` — URL OnlyOffice pour le template | Détection automatique : si `ONLYOFFICE_SERVER_URL` pointe vers localhost/127.0.0.1 et la page est en HTTPS, redirige vers `https://{domaine_public}/onlyoffice/` (reverse proxy Nginx). Corrige le chargement de `api.js` pour les clients multi-VPS. |
| `deploy/env-elekable.example` | **MODIFIÉ** : ajout section MULTI-CLIENT + documentation OnlyOffice | Ajout `CLIENT_PUBLIC_DOMAIN`, `CLIENT_APP_NAME`. Documentation de la détection automatique OnlyOffice. |

### C. Frontend — titre et liens dynamiques

| Fichier | Modification | Détails |
|---------|-------------|---------|
| `frontend/src/services/entrepriseConfigService.js` | **CRÉÉ** | Service singleton pour appeler `GET /api/entreprise-config/` avec cache. |
| `frontend/src/components/PageTitleManager.js` | **MODIFIÉ** : `BASE_TITLE` remplacé par config dynamique | Charge le `nom_application` depuis l'API via `entrepriseConfigService`. Fallback : `"Webapplication P3000"`. |
| `frontend/src/components/Distributeurs/DesktopAppLayout.js` | **MODIFIÉ** : lien retour et tooltip | `href="https://myp3000app.com/"` → `href={returnUrl}` (dynamique depuis config). `"Retour à P3000"` → `returnLabel` dynamique. |
| `frontend/src/components/Distributeurs/MouvementReapproPage.js` | **MODIFIÉ** : clé localStorage | `"myp3000_reappro_en_cours"` → `"app_reappro_en_cours"` (suppression préfixe client). |
| `frontend/templates/frontend/index.html` | **MODIFIÉ** : `<title>` et `<meta description>` | Valeurs en dur `"Webapplication P3000"` et `"Application P3000"` → `{{ entreprise.nom_application\|default:... }}` via context processor. |
| `frontend/templates/frontend/index_production.html` | **MODIFIÉ** : `<title>`, `<meta description>`, `apple-mobile-web-app-title` | Idem — remplacé par variables Django template. |

### D. Scripts de déploiement — paramétrage

| Fichier | Modification | Détails |
|---------|-------------|---------|
| `configure_s3_cors.py` | **REFACTORÉ** : origines CORS dynamiques | Les origines sont construites depuis `CLIENT_PUBLIC_DOMAIN`, `ALLOWED_HOSTS`, et `ONLYOFFICE_SERVER_URL` (env). `DJANGO_SETTINGS_MODULE` lit aussi la variable d'env au lieu de forcer `Application.settings`. |
| `cors_s3_config.json` | **MODIFIÉ** : suppression domaines en dur | Seules les origines locales restent. Commentaire ajouté pour utiliser `configure_s3_cors.py`. |
| `validate_deployment.sh` | **MODIFIÉ** : `BASE_URL`, `PROJECT_DIR` | Lus depuis `$CLIENT_BASE_URL` / `$PROJECT_DIR` (env) avec fallback P3000. |
| `validate_headers.sh` | **MODIFIÉ** : `BASE_URL` | Lu depuis `$CLIENT_BASE_URL` (env) avec fallback P3000. |
| `restart_app.sh` | **MODIFIÉ** : `PROJECT_DIR`, `VENV_PATH`, URL affichée | Paramétrables via env avec fallback P3000. |
| `deploy_production.sh` | **MODIFIÉ** : URL affichée en fin de déploiement | `https://myp3000app.com` → `${CLIENT_BASE_URL:-https://myp3000app.com}`. |
| `deploy_auto.sh` | **MODIFIÉ** : URL affichée en fin de déploiement | Idem. |

---

## Valeurs encore en dur (à traiter manuellement par client)

### 1. Templates HTML (PDF, contrats, factures)

**Géré manuellement** : les templates ci-dessous contiennent l'identité Elekable en dur. Ils doivent être adaptés manuellement pour chaque client.

| Fichier | Valeurs en dur |
|---------|---------------|
| `frontend/templates/preview_devis.html` | `SAS ELEKABLE`, adresse, email, téléphone |
| `frontend/templates/preview_devis_v2.html` | Idem |
| `frontend/templates/preview_situation.html` | Idem |
| `frontend/templates/preview_situation_v2.html` | Idem |
| `frontend/templates/facture.html` | Idem |
| `frontend/templates/facture_v2.html` | Idem + `signature_p3000.png` |
| `frontend/templates/bon_commande.html` | Idem |
| `frontend/templates/sous_traitance/contrat_btp.html` | `SAS ELEKABLE`, `Amara MAJRI`, adresse, RCS, capital |
| `frontend/templates/sous_traitance/contrat_nettoyage.html` | Idem |
| `frontend/templates/sous_traitance/avenant_btp.html` | Idem + `Info p3000.png` |
| `frontend/templates/sous_traitance/avenant_nettoyage.html` | Idem |

**Note** : Le context processor `{{ entreprise }}` est disponible dans ces templates si vous souhaitez les rendre dynamiques ultérieurement.

### 2. Assets statiques (logos, signatures, tampons)

| Fichier/Asset | Note |
|---------------|------|
| `logo.png` | Logo de l'entreprise — à remplacer par client |
| `signature_p3000.png` | Signature/cachet P3000 — à remplacer par client |
| `Info p3000.png` | Tampon info P3000 — à remplacer par client |

### 3. Couleurs

| Fichier | Note |
|---------|------|
| `frontend/src/constants/colors.js` | Commentaire "Client: Elekable" — couleurs à adapter par client |
| `frontend/static/css/colors.css` | Idem |

### 4. Settings Django et base de données

| Fichier | Code en dur | Note |
|---------|-------------|------|
| `Application/settings.py` | `ALLOWED_HOSTS`, `CORS`, `CSRF` avec `myp3000app.com` | En prod client, tout vient du `.env` via `settings_production` |
| `Application/settings_base.py` | `default_hosts = 'myp3000app.com,...'` | Défaut P3000 ; surchargé par `.env` |
| `Application/settings.py` | `'NAME': 'p3000db'`, `'PASSWORD': 'Boumediene30'` | Dev local uniquement |
| `Application/settings_base.py` | `os.getenv('DB_NAME', 'p3000db')`, `os.getenv('DB_PASSWORD', 'Boumediene30')` | Défauts P3000 ; surchargés par `.env` |

### 5. Scripts Django (settings module)

| Fichier | Code en dur | Note |
|---------|-------------|------|
| `Application/wsgi.py` | `Application.settings` | Service systemd définit la variable |
| `Application/asgi.py` | `Application.settings` | Idem |
| `manage.py` | `Application.settings` | OK pour dev local |
| `create_users.py`, `create_users_simple.py`, `create_users_amelioration.py` | `Application.settings` | Utiliser `settings_production` en prod client |
| `rollback_migration.py`, `force_logout.py`, `check_db_structure.py`, `backup_safe.py` | `Application.settings` | Idem |

### 6. Emails et identité client (scripts)

| Fichier | Code en dur |
|---------|-------------|
| `create_users_elekable.py` | `@elekable.fr`, `admin@elekable.fr` |

### 7. Ports

| Fichier | Code en dur | Note |
|---------|-------------|------|
| `gunicorn.conf.py` | `bind = '127.0.0.1:8000'` | Chaque client a son port |
| `api/views_drive/onlyoffice.py` | `host.docker.internal:8000` en dev | Port de dev |
| `frontend/src/utils/universalDriveGenerator.js` | `http://localhost:8000/api` | Dev uniquement |
| `frontend/src/components/pdf_drive_functions.js` | `http://localhost:8000/api` | Dev uniquement |
| `api/management/commands/regenerate_pdfs.py` | `http://localhost:8000/api/...` | À paramétrer par `BASE_URL` |

### 8. Nginx et déploiement

| Fichier | Code en dur | Note |
|---------|-------------|------|
| `nginx_myp3000app.conf` | `myp3000app.com`, certs LetsEncrypt | Spécifique P3000 |
| `verifier_myp3000app.py` | `myp3000app.com`, `72.60.90.127` | Script spécifique P3000 |
| `validate_nginx_config.sh` | `nginx_myp3000app.conf`, `myp3000app.com` | À paramétrer |

### 9. Mots de passe et secrets

Ne pas commiter de secrets. Utiliser des placeholders dans les exemples.

| Fichier | Note |
|---------|------|
| `Application/settings.py` | `PASSWORD` en dur pour dev local |
| `Application/settings_base.py` | Défaut `DB_PASSWORD` |
| `myp3000app.env`, `setup_production_env.sh`, `scripts/setup_production_env.py` | Exemples avec valeurs réelles à remplacer par des placeholders |

---

## Variables d'environnement multi-client

Variables à définir dans le `.env` de chaque client :

```bash
# Identité client (utilisé par Django et les scripts)
CLIENT_PUBLIC_DOMAIN=myp3000app.com        # Domaine public de l'application
CLIENT_APP_NAME=Webapplication P3000       # Nom affiché de l'application
CLIENT_BASE_URL=https://myp3000app.com     # URL complète (pour les scripts shell)

# Infrastructure (déjà existant)
ALLOWED_HOSTS=myp3000app.com,www.myp3000app.com,...
CORS_ALLOWED_ORIGINS=https://myp3000app.com,...
CSRF_TRUSTED_ORIGINS=https://myp3000app.com,...
AWS_STORAGE_BUCKET_NAME=agency-drive-prod
ONLYOFFICE_SERVER_URL=http://72.60.90.127:8080
DATABASE_URL=postgresql://...
```

---

## Comment configurer un nouveau client

1. Créer le `.env` avec les variables ci-dessus
2. Exécuter la migration : `python manage.py migrate`
3. Initialiser la config entreprise :
   ```bash
   python manage.py setup_entreprise_config --preset elekable
   # ou manuellement :
   python manage.py setup_entreprise_config --nom "SAS MON CLIENT" --email "contact@client.fr" ...
   ```
4. Adapter manuellement : templates HTML (PDF), assets (logo, signature), couleurs
5. Configurer CORS S3 : `python manage.py configure_s3_cors` (ou `python configure_s3_cors.py`)

---

*Dernière mise à jour : refactoring multi-client — modèle EntrepriseConfig, OnlyOffice dynamique, frontend dynamique, scripts paramétrés.*
