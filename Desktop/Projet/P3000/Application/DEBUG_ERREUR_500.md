# 🔧 Guide de Débogage - Erreur 500 dans CreationDevis.js

## 🚨 **Problème Identifié**

L'erreur 500 lors du chargement des lignes de détail dans `CreationDevis.js` est probablement due aux modifications apportées aux ViewSets pour supporter les éléments supprimés en mode modification.

## 🔍 **Diagnostic**

### **1. Vérifier les Logs du Serveur**

```bash
# Redémarrer le serveur Django pour voir les logs
python manage.py runserver

# Ou si vous utilisez gunicorn
gunicorn --bind 0.0.0.0:8000 Application.wsgi:application
```

### **2. Tester l'API Directement**

```bash
# Test des endpoints API
python test_api_devis_elements.py
```

### **3. Vérifier les Erreurs dans la Console**

Ouvrez la console du navigateur (F12) et regardez l'onglet "Network" pour voir la requête qui échoue.

## 🛠️ **Solutions Appliquées**

### **1. Corrections dans les ViewSets**

- ✅ Ajout de vérifications de sécurité dans `PartieViewSet`
- ✅ Ajout de vérifications de sécurité dans `SousPartieViewSet`  
- ✅ Ajout de vérifications de sécurité dans `LigneDetailViewSet`
- ✅ Gestion des exceptions avec fallback vers le comportement normal

### **2. Améliorations de Robustesse**

```python
# Avant (problématique)
for ligne in devis_lignes:
    if ligne.ligne_detail.partie:  # ❌ Peut causer une erreur si ligne_detail est None
        partie_ids.add(ligne.ligne_detail.partie.id)

# Après (sécurisé)
for ligne in devis_lignes:
    if ligne.ligne_detail and ligne.ligne_detail.partie:  # ✅ Vérification double
        partie_ids.add(ligne.ligne_detail.partie.id)
```

## 🧪 **Tests de Validation**

### **Test 1: API sans paramètres (comportement normal)**
```bash
curl "http://localhost:8000/api/parties/"
curl "http://localhost:8000/api/sous-parties/"
curl "http://localhost:8000/api/ligne-details/"
```

### **Test 2: API avec paramètres (mode modification)**
```bash
curl "http://localhost:8000/api/parties/?devis_id=1&include_deleted=true"
curl "http://localhost:8000/api/sous-parties/?devis_id=1&include_deleted=true"
curl "http://localhost:8000/api/ligne-details/?devis_id=1&include_deleted=true"
```

## 🔧 **Commandes de Redémarrage**

### **Redémarrage Complet**
```bash
# Arrêter tous les processus
pkill -f "python manage.py runserver"
pkill -f "gunicorn"
pkill -f "node"

# Redémarrer avec p3000-deploy
p3000-deploy
```

### **Redémarrage Manuel**
```bash
# Backend
python manage.py runserver

# Frontend (dans un autre terminal)
cd frontend
npm start
```

## 🐛 **Points de Vérification**

### **1. Vérifier les Imports**
```python
# Dans api/views.py, vérifier que ces imports existent :
from .models import Devis, DevisLigne, Partie, SousPartie, LigneDetail
```

### **2. Vérifier la Base de Données**
```python
# Tester dans le shell Django
python manage.py shell

# Vérifier que les modèles existent
from api.models import Devis, DevisLigne
print(Devis.objects.count())
print(DevisLigne.objects.count())
```

### **3. Vérifier les Migrations**
```bash
# Appliquer les migrations si nécessaire
python manage.py migrate
```

## 📊 **Monitoring**

### **Logs Django**
```python
# Dans settings.py, ajouter pour plus de logs :
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

### **Logs Frontend**
Dans la console du navigateur, vérifier :
- Les requêtes HTTP dans l'onglet "Network"
- Les erreurs JavaScript dans l'onglet "Console"
- Les erreurs de chargement des ressources

## 🎯 **Prochaines Étapes**

1. **Redémarrer l'application** avec `p3000-deploy`
2. **Tester l'API** avec le script de test
3. **Vérifier les logs** du serveur Django
4. **Tester le frontend** en mode création et modification

## 🆘 **Si le Problème Persiste**

1. **Vérifier les logs détaillés** du serveur Django
2. **Tester chaque endpoint** individuellement
3. **Vérifier la cohérence** de la base de données
4. **Redémarrer complètement** l'environnement

## 📝 **Notes Importantes**

- Les modifications sont **rétrocompatibles** : le comportement normal n'est pas affecté
- Le mode modification n'est activé que quand `devis_id` et `include_deleted=true` sont fournis
- Les erreurs sont gérées avec un fallback vers le comportement normal
