# Changements à Apporter à votre fichier .env pour la Production

## 🔧 Modifications Requises

Ajoutez ou modifiez ces lignes dans votre fichier `.env` existant :

```env
# === CONFIGURATION CSRF POUR LA PRODUCTION ===

# Cookies sécurisés (HTTPS requis)
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Configuration des origines de confiance
CSRF_TRUSTED_ORIGINS=https://myp3000app.com,https://www.myp3000app.com

# Configuration CORS pour la production
CORS_ALLOWED_ORIGINS=https://myp3000app.com,https://www.myp3000app.com

# === SÉCURITÉ HTTPS ===
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
SECURE_BROWSER_XSS_FILTER=True
SECURE_CONTENT_TYPE_NOSNIFF=True

# === MODE PRODUCTION ===
DEBUG=False
```

## 📋 Vérification de votre fichier .env actuel

Assurez-vous que votre fichier `.env` contient déjà ces éléments (ne pas modifier si déjà présents) :

```env
# Votre configuration existante (à conserver)
SECRET_KEY=votre-cle-secrete
ALLOWED_HOSTS=myp3000app.com,www.myp3000app.com
DATABASE_URL=votre-url-base-de-donnees
# ... autres configurations existantes
```

## ⚠️ Points Importants

1. **HTTPS obligatoire** : `SESSION_COOKIE_SECURE=True` et `CSRF_COOKIE_SECURE=True` nécessitent HTTPS
2. **Domaine exact** : Remplacez `myp3000app.com` par votre vrai nom de domaine
3. **Debug désactivé** : `DEBUG=False` pour la production
4. **Clé secrète** : Assurez-vous d'avoir une clé secrète forte

## 🚀 Après les modifications

1. **Redémarrer le serveur** :

   ```bash
   python manage.py runserver
   ```

2. **Tester la configuration** :

   ```bash
   python test_csrf.py
   ```

3. **Vérifier les cookies** dans le navigateur (F12 > Application > Cookies)

## 🔍 Vérification

Votre fichier `.env` final devrait ressembler à ceci :

```env
# Configuration existante
SECRET_KEY=votre-cle-secrete
ALLOWED_HOSTS=myp3000app.com,www.myp3000app.com
DATABASE_URL=votre-url-base-de-donnees

# === NOUVELLES CONFIGURATIONS POUR LA PRODUCTION ===
DEBUG=False
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
CSRF_TRUSTED_ORIGINS=https://myp3000app.com,https://www.myp3000app.com
CORS_ALLOWED_ORIGINS=https://myp3000app.com,https://www.myp3000app.com
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
SECURE_BROWSER_XSS_FILTER=True
SECURE_CONTENT_TYPE_NOSNIFF=True
```
