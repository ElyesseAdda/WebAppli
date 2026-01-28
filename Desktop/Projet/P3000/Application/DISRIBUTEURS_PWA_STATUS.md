# Distributeurs + PWA iOS — État d'avancement

Date: 2026-01-28

## Fait

### Frontend (page Distributeurs)
- Nouvelle page `DistributeursDashboard` dans `frontend/src/components/Distributeurs/DistributeursDashboard.js`
- Route ajoutée: `/distributeurs` dans `frontend/src/components/App.js`
- Titre de page ajouté dans `frontend/src/components/PageTitleManager.js`
- Entrée de menu ajoutée dans `frontend/src/components/SlideBar.js`

### Backend (API Distributeurs)
- Modèles créés dans `api/models.py`:
  - `Distributeur`
  - `DistributeurMouvement`
- Serializers ajoutés dans `api/serializers.py`
- ViewSets ajoutés dans `api/views.py`
- Routes ajoutées dans `api/urls.py`:
  - `/api/distributeurs/`
  - `/api/distributeur-mouvements/`
  - `/api/distributeurs/{id}/resume/` (résumé bénéfice)

### PWA iOS
- Meta tags iOS/PWA ajoutés dans:
  - `frontend/templates/frontend/index.html`
  - `frontend/templates/frontend/index_production.html`
- Manifest PWA ajouté: `frontend/static/manifest.json`

## À faire

### Backend
- Lancer les migrations:
  - `python manage.py makemigrations api`
  - `python manage.py migrate`

### Frontend
- Connecter la page Distributeurs aux endpoints API:
  - Liste distributeurs
  - CRUD mouvements (entrées/sorties)
  - Affichage du résumé/bénéfice via `/resume/`

### PWA iOS
- Ajouter l'icône:
  - Créer `frontend/static/img/apple-touch-icon.png` (PNG 180x180)
- S'assurer que le site est en HTTPS
- En production Django: lancer `python manage.py collectstatic`

### Déploiement
- Déployer les changements backend + frontend
- Vérifier l'accès PWA sur iPhone (Safari > Partager > Sur l'écran d'accueil)
