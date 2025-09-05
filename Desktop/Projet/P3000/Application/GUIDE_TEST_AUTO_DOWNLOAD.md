# 🧪 **GUIDE DE TEST - TÉLÉCHARGEMENT AUTOMATIQUE**

## **📋 Vue d'ensemble**

Ce guide explique comment tester le nouveau système de téléchargement automatique des devis de chantier vers le Drive.

## **🔄 Fonctionnement du nouveau système**

### **1. Création d'un devis de chantier**

- L'utilisateur crée un devis de chantier dans `CreationDevis.js`
- Le système récupère les données de la réponse API
- Redirection vers `ListeDevis` avec les paramètres nécessaires

### **2. Téléchargement automatique**

- `ListeDevis` détecte les paramètres d'auto-download
- Utilise le système universel `generatePDFDrive`
- Lance automatiquement la génération PDF vers le Drive

## **🧪 Étapes de test**

### **Test 1: Création d'un devis de chantier**

1. **Aller sur la page de création de devis**

   ```
   http://localhost:3000/CreationDevis
   ```

2. **Sélectionner "Devis chantier"**

   - Cocher le radio button "Devis chantier"

3. **Remplir les informations du client**

   - Nom, prénom, email, téléphone
   - Informations de la société
   - Informations du chantier

4. **Sélectionner des lignes de devis**

   - Choisir des parties, sous-parties et lignes
   - Définir des quantités et prix

5. **Cliquer sur "Voir le devis" puis "Enregistrer le devis"**

### **Test 2: Vérification de la redirection**

1. **Vérifier l'URL de redirection**

   ```
   http://localhost:3000/ListeDevis?autoDownload=true&devisId=XX&appelOffresId=XX&appelOffresName=XXX&societeName=XXX&numero=DEV-XXX-25
   ```

2. **Vérifier les paramètres URL**
   - `autoDownload=true` ✅
   - `devisId` (ID du devis créé) ✅
   - `appelOffresId` (ID de l'appel d'offres) ✅
   - `appelOffresName` (nom du chantier) ✅
   - `societeName` (nom de la société) ✅
   - `numero` (numéro du devis) ✅

### **Test 3: Vérification du téléchargement automatique**

1. **Ouvrir la console du navigateur** (F12)

2. **Vérifier les logs**

   ```
   🔍 NOUVEAU: Vérification du téléchargement automatique depuis l'URL
   🚀 NOUVEAU: Téléchargement automatique détecté: {...}
   🎯 NOUVEAU: Lancement du téléchargement automatique avec le système universel
   ```

3. **Attendre 2 secondes** (délai de chargement)

4. **Vérifier le lancement du système universel**
   ```
   🚀 Génération du devis Test Chantier vers le Drive...
   📋 Données du devis: {...}
   🎯 Appel API: /api/generate-devis-marche-pdf-drive/
   ```

### **Test 4: Vérification du résultat**

1. **En cas de succès**

   ```
   ✅ NOUVEAU: Téléchargement automatique réussi: {...}
   ```

   - Notification de succès affichée
   - URL nettoyée (plus de paramètres)
   - Redirection vers le Drive

2. **En cas d'erreur**
   ```
   ❌ NOUVEAU: Erreur lors du téléchargement automatique: {...}
   ```
   - Alert d'erreur affichée
   - URL nettoyée
   - Possibilité de relancer manuellement

## **🔍 Points de vérification**

### **✅ Succès attendu**

- [ ] Redirection correcte vers ListeDevis avec paramètres
- [ ] Détection automatique des paramètres d'auto-download
- [ ] Lancement du système universel après 2 secondes
- [ ] Génération PDF réussie
- [ ] Notification de succès
- [ ] Nettoyage de l'URL
- [ ] Redirection vers le Drive

### **❌ Erreurs possibles**

- [ ] Paramètres manquants dans l'URL
- [ ] Erreur lors de l'appel API
- [ ] Conflit de fichier détecté
- [ ] Timeout de génération
- [ ] Erreur de permissions

## **🐛 Debug et résolution**

### **Problème: Paramètres manquants**

```
⚠️ NOUVEAU: Paramètres manquants pour le téléchargement automatique
```

**Solution:** Vérifier que l'API retourne bien `appel_offres_id` et `appel_offres_name`

### **Problème: Erreur API**

```
❌ NOUVEAU: Erreur lors du téléchargement automatique: {...}
```

**Solution:** Vérifier les logs de l'API Django et les permissions

### **Problème: Conflit de fichier**

```
⚠️ Conflit détecté: Appels_Offres/.../DEV-XXX-25.pdf
```

**Solution:** Le modal de conflit devrait s'ouvrir automatiquement

## **📊 Logs de test**

### **Logs attendus dans la console**

```javascript
// 1. Détection des paramètres
🔍 NOUVEAU: Vérification du téléchargement automatique depuis l'URL
🔍 URL actuelle: http://localhost:3000/ListeDevis?autoDownload=true&...

// 2. Lancement du téléchargement
🚀 NOUVEAU: Téléchargement automatique détecté: {
  devisId: "15",
  appelOffresId: "19",
  appelOffresName: "Test Chantier",
  societeName: "Test Société",
  numero: "DEV-015-25"
}

// 3. Système universel
🎯 NOUVEAU: Lancement du téléchargement automatique avec le système universel
🚀 Génération du devis Test Chantier vers le Drive...
📋 Données du devis: {...}
🎯 Appel API: /api/generate-devis-marche-pdf-drive/

// 4. Résultat
✅ NOUVEAU: Téléchargement automatique réussi: {...}
```

## **🎯 Cas de test spécifiques**

### **Test A: Premier téléchargement**

- Créer un nouveau devis de chantier
- Vérifier que le PDF est généré et stocké
- Vérifier la redirection vers le Drive

### **Test B: Conflit de fichier**

- Créer un devis avec le même nom
- Vérifier que le modal de conflit s'ouvre
- Tester le remplacement avec historique

### **Test C: Erreur de données**

- Créer un devis avec des données manquantes
- Vérifier la gestion d'erreur
- Vérifier que l'utilisateur peut continuer

## **📝 Notes importantes**

1. **Délai de 2 secondes** : Le système attend que les devis soient chargés
2. **Nettoyage URL** : L'URL est nettoyée après traitement (succès ou erreur)
3. **Gestion d'erreur** : Les erreurs n'empêchent pas l'utilisation de ListeDevis
4. **Système universel** : Utilise le nouveau système avec gestion de l'historique

## **🚀 Prochaines étapes**

1. **Tester** le système avec de vrais devis de chantier
2. **Vérifier** la gestion des conflits
3. **Optimiser** les délais si nécessaire
4. **Documenter** les cas d'erreur spécifiques

---

**📝 Note** : Ce guide sera mis à jour selon les retours de test.
