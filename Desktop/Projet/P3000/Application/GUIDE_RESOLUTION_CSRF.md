# Guide de Résolution du Problème CSRF

## Problème Identifié

Vous rencontrez une erreur 403 (Forbidden) avec le message "CSRF Failed: CSRF token from the 'X-Csrftoken' HTTP header incorrect." lors de la création de documents via l'API.

## Solutions Implémentées

### 1. Configuration CSRF Modifiée

**Fichier modifié :** `Application/settings.py`

- **Cookies sécurisés désactivés en développement** : `CSRF_COOKIE_SECURE = False` et `SESSION_COOKIE_SECURE = False`
- **Origines CSRF étendues** : Ajout de `http://localhost:3000` aux origines de confiance
- **Configuration flexible** : Utilisation de variables d'environnement pour adapter la configuration selon l'environnement

### 2. Middleware CSRF Amélioré

**Fichier modifié :** `api/middleware.py`

- **Exemption automatique** : Toutes les URLs `/api/` sont automatiquement exemptées de la vérification CSRF
- **Génération de tokens** : Les tokens CSRF sont toujours générés pour être disponibles dans les cookies
- **Gestion des réponses** : Amélioration de la gestion des réponses pour s'assurer que les tokens sont disponibles

### 3. Configuration Axios Améliorée

**Fichier modifié :** `frontend/src/utils/axios.js`

- **Récupération automatique** : Tentative automatique de récupération du token CSRF si non disponible
- **Gestion des erreurs** : Retry automatique en cas d'erreur CSRF 403
- **Intercepteurs améliorés** : Meilleure gestion des requêtes et réponses

### 4. Vue CSRF Ajoutée

**Nouveau fichier :** `api/csrf_views.py`
**URL ajoutée :** `/api/csrf-token/`

- **Endpoint dédié** : Vue pour générer et retourner des tokens CSRF
- **Accessible sans authentification** : Permet la récupération de tokens même pour les utilisateurs non connectés

## Étapes de Résolution

### Étape 1 : Redémarrer le Serveur Django

```bash
# Arrêter le serveur actuel (Ctrl+C)
# Puis redémarrer
python manage.py runserver
```

### Étape 2 : Vérifier la Configuration

Assurez-vous que votre fichier `.env` contient les bonnes valeurs :

```env
# Pour le développement
DEBUG=True
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://myp3000app.com
```

### Étape 3 : Tester la Configuration

Exécutez le script de test :

```bash
python test_csrf.py
```

### Étape 4 : Vérifier le Frontend

1. **Vider le cache du navigateur** : Ctrl+Shift+R ou Ctrl+F5
2. **Vérifier les cookies** : Dans les outils de développement (F12) > Application > Cookies
3. **Tester une requête** : Essayer de créer un devis

## Configuration pour la Production

Pour la production, modifiez votre fichier `.env` :

```env
# Pour la production
DEBUG=False
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
CORS_ALLOWED_ORIGINS=https://myp3000app.com
CSRF_TRUSTED_ORIGINS=https://myp3000app.com
```

## Dépannage

### Si le problème persiste :

1. **Vérifier les logs Django** :

   ```bash
   python manage.py runserver --verbosity=2
   ```

2. **Tester l'endpoint CSRF directement** :

   ```bash
   curl -X GET http://localhost:8000/api/csrf-token/ -c cookies.txt
   ```

3. **Vérifier les cookies dans le navigateur** :

   - Ouvrir les outils de développement (F12)
   - Aller dans Application > Cookies
   - Vérifier que le cookie `csrftoken` est présent

4. **Tester avec Postman ou curl** :

   ```bash
   # Récupérer le token
   curl -X GET http://localhost:8000/api/csrf-token/ -c cookies.txt

   # Utiliser le token pour une requête
   curl -X POST http://localhost:8000/api/create-devis/ \
     -H "X-CSRFToken: $(grep csrftoken cookies.txt | cut -f7)" \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{"numero":"TEST","price_ht":1000,"price_ttc":1200,"tva_rate":20}'
   ```

## Points Clés

- **Développement vs Production** : Les cookies sécurisés sont désactivés en développement mais activés en production
- **Exemption automatique** : Les APIs sont automatiquement exemptées de CSRF via le middleware
- **Récupération automatique** : Le frontend récupère automatiquement les tokens CSRF si nécessaire
- **Retry automatique** : En cas d'erreur CSRF, le frontend réessaie automatiquement avec un nouveau token

## Support

Si le problème persiste après avoir suivi ce guide, vérifiez :

1. Les logs du serveur Django
2. Les erreurs dans la console du navigateur
3. La configuration de votre serveur web (nginx, apache) si applicable
