# Différences Backend : Processus Appel d'Offres vs DevisAvance.js

Ce document liste les différences entre le processus décrit dans `Processus_Creation_Appel_Offres.md` (basé sur `CreationDevis.js`) et le système actuel de `DevisAvance.js` pour la création backend.

---

## 1. Détection du Type de Devis

### Processus Document (CreationDevis.js)
- L'utilisateur sélectionne explicitement le type "Devis chantier" via un RadioGroup
- Le frontend envoie `devis_chantier: true` au backend
- Le backend détecte ce flag et crée un AppelOffres au lieu d'un Chantier

**Backend :**
```python
devis_chantier = request.data.get('devis_chantier', False)
if devis_chantier:
    # Créer un appel d'offres
```

### Système Actuel (DevisAvance.js)
- Aucune sélection explicite du type de devis dans l'interface
- Même pour un nouveau chantier (`selectedChantierId === -1`), le chantier est **toujours créé** en BDD
- `transformToLegacyFormat` détermine `devis_chantier` basé sur `selectedChantierId` :
  ```javascript
  const devis_chantier = !selectedChantierId || selectedChantierId === -1;
  ```
- Mais comme le chantier est créé avant l'envoi, `finalChantierId` existe toujours
- Résultat : `devis_chantier` est toujours `false` dans le payload envoyé au backend

**Ligne 1754-1767 dans DevisAvance.js :**
```javascript
// 3. Créer le chantier avec la société
const chantierResponse = await axios.post("/api/chantier/", {
  chantier_name: pendingChantierData.chantier.chantier_name.trim(),
  // ... autres champs
});
finalChantierId = chantierResponse.data.id; // Le chantier est créé
```

---

## 2. Création du Chantier / Appel d'Offres

### Processus Document (CreationDevis.js)
- Pour un devis de chantier (`devis_chantier: true`), le chantier **n'est PAS créé**
- À la place, le backend crée un **AppelOffres** avec les données suivantes :
  ```python
  appel_offres_data = {
      'chantier_name': request.data.get('chantier_name', ''),
      'societe': societe,
      'montant_ht': Decimal(str(request.data['price_ht'])),
      'montant_ttc': Decimal(str(request.data['price_ttc'])),
      'ville': request.data.get('ville', ''),
      'rue': request.data.get('rue', ''),
      'code_postal': request.data.get('code_postal', ''),
      'cout_estime_main_oeuvre': Decimal(str(request.data.get('cout_estime_main_oeuvre', '0'))),
      'cout_estime_materiel': Decimal(str(request.data.get('cout_estime_materiel', '0'))),
      'marge_estimee': Decimal(str(request.data.get('marge_estimee', '0'))),
      'taux_fixe': Decimal(str(request.data.get('taux_fixe', '20'))),
      'description': request.data.get('description', ''),
      'statut': 'en_attente'
  }
  appel_offres = AppelOffres.objects.create(**appel_offres_data)
  ```

### Système Actuel (DevisAvance.js)
- Le chantier est **toujours créé** en BDD (ligne 1756-1767)
- Aucun AppelOffres n'est créé
- Les données d'adresse du chantier (ville, rue, code_postal) ne sont pas envoyées au backend pour créer un AppelOffres
- Le backend ne reçoit que l'ID du chantier créé

**Ligne 1756-1765 dans DevisAvance.js :**
```javascript
const chantierResponse = await axios.post("/api/chantier/", {
  chantier_name: pendingChantierData.chantier.chantier_name.trim(),
  ville: pendingChantierData.chantier.ville,
  rue: pendingChantierData.chantier.rue,
  code_postal: pendingChantierData.chantier.code_postal.toString(),
  montant_ht: total_ht,
  montant_ttc: montant_ttc,
  societe_id: finalSocieteId,
  client: finalClientId,
});
```

---

## 3. Liaison du Devis

### Processus Document (CreationDevis.js)
- Pour un devis de chantier, le Devis est lié à l'**AppelOffres** :
  ```python
  devis_data = {
      'numero': request.data['numero'],
      'appel_offres': appel_offres,  # Lien vers l'appel d'offres
      'devis_chantier': True,
      # ... autres champs
  }
  ```

### Système Actuel (DevisAvance.js)
- Le Devis est **toujours lié à un Chantier** :
  ```python
  devis_data = {
      'numero': request.data['numero'],
      'chantier_id': request.data['chantier'],  # Toujours un Chantier
      'devis_chantier': False,  # Toujours False
      # ... autres champs
  }
  ```

---

## 4. Calcul des Coûts Estimés

### Processus Document (CreationDevis.js)
- Le frontend calcule les coûts estimés via `calculateEstimatedTotals()` :
  - `cout_estime_main_oeuvre`
  - `cout_estime_materiel`
  - `cout_avec_taux_fixe`
  - `marge_estimee`
- Ces valeurs sont envoyées au backend et stockées dans l'AppelOffres
- Le backend reçoit également `taux_fixe` pour l'AppelOffres

**Frontend (CreationDevis.js lignes 712-788) :**
```javascript
const totals = calculateEstimatedTotals();
```

**Payload envoyé :**
```javascript
{
  cout_estime_main_oeuvre: totals.cout_estime_main_oeuvre,
  cout_estime_materiel: totals.cout_estime_materiel,
  marge_estimee: totals.marge_estimee,
  taux_fixe: tauxFixe !== null ? tauxFixe : 20,
}
```

### Système Actuel (DevisAvance.js)
- Les coûts estimés sont calculés via `calculateEstimatedCosts()` (ligne 416 dans DevisLegacyTransformer.js)
- Mais **seulement** `cout_estime_main_oeuvre` et `cout_estime_materiel` sont calculés et envoyés
- `marge_estimee` et `taux_fixe` **ne sont pas calculés ni envoyés** au backend
- Ces champs ne sont donc pas stockés dans l'AppelOffres (qui n'est pas créé de toute façon)

**DevisLegacyTransformer.js lignes 49-69 :**
```javascript
const calculateEstimatedCosts = (devisItems) => {
  let cout_main_oeuvre_total = 0;
  let cout_materiel_total = 0;
  // ... calcul seulement de ces deux valeurs
  return {
    cout_estime_main_oeuvre: cout_main_oeuvre_total,
    cout_estime_materiel: cout_materiel_total
  };
};
```

---

## 5. Données d'Adresse du Chantier

### Processus Document (CreationDevis.js)
- Les données d'adresse du chantier (ville, rue, code_postal) sont envoyées au backend :
  ```javascript
  ...(devisType === "chantier" && {
    chantier_name: pendingChantierData.chantier.chantier_name.trim(),
    societe_id: societeId,
    ville: pendingChantierData.chantier.ville,
    rue: pendingChantierData.chantier.rue,
    code_postal: pendingChantierData.chantier.code_postal.toString(),
    taux_fixe: tauxFixe !== null ? tauxFixe : 20,
  })
  ```
- Ces données sont utilisées pour créer l'AppelOffres

### Système Actuel (DevisAvance.js)
- Les données d'adresse sont utilisées pour créer le Chantier côté frontend (ligne 1756-1760)
- Elles ne sont **pas envoyées** dans le payload pour créer un AppelOffres car aucun AppelOffres n'est créé
- Le backend ne reçoit que l'ID du chantier créé dans `chantier: finalChantierId`

---

## 6. Association des Clients

### Processus Document (CreationDevis.js)
- Le frontend envoie l'ID du client dans `client: [clientId]`
- Le backend associe le client directement :
  ```python
  client_ids = [c for c in client_values if c]
  if client_ids:
      devis.client.set(client_ids)
  ```
- Si aucun client fourni, le backend déduit depuis l'AppelOffres :
  ```python
  if not client_ids:
      if devis.devis_chantier and devis.appel_offres and devis.appel_offres.societe:
          client_ids = [devis.appel_offres.societe.client_name.id]
  ```

### Système Actuel (DevisAvance.js)
- Le frontend envoie également l'ID du client dans `client: clientIds`
- Le backend associe le client de la même manière
- Mais si aucun client fourni, le backend déduit depuis le **Chantier** :
  ```python
  elif devis.chantier and devis.chantier.societe and devis.chantier.societe.client_name:
      client_ids = [devis.chantier.societe.client_name.id]
  ```

---

## 7. Réponse du Backend

### Processus Document (CreationDevis.js)
- Le backend renvoie :
  ```python
  response_data = {'id': devis.id}
  if devis_chantier and appel_offres:
      response_data['appel_offres_id'] = appel_offres.id
      response_data['appel_offres_name'] = appel_offres.chantier_name
  ```
- Le frontend détecte `appel_offres_id` et déclenche le téléchargement automatique du PDF vers AWS S3

### Système Actuel (DevisAvance.js)
- Le backend renvoie seulement `{'id': devis.id}` car aucun AppelOffres n'est créé
- Le code de vérification existe (ligne 1819-1820) mais ne sera jamais exécuté :
  ```javascript
  if (response.data.appel_offres_id) {
    alert(`Appel d'offres créé : ${response.data.appel_offres_name}`);
  }
  ```

---

## 8. Statut Initial

### Processus Document (CreationDevis.js)
- Le devis créé a le statut `'En attente'` :
  ```python
  'status': 'En attente',
  'devis_chantier': True,
  ```
- L'AppelOffres créé a le statut `'en_attente'` :
  ```python
  'statut': 'en_attente'
  ```

### Système Actuel (DevisAvance.js)
- Le devis créé a également le statut `'En attente'` (via `transformToLegacyFormat` ligne 439)
- Mais comme c'est un devis normal lié à un chantier existant, il est considéré comme valide (pas d'AppelOffres avec statut `en_attente`)

---

## Résumé des Différences Principales

| Aspect | Processus Document | DevisAvance.js Actuel |
|--------|-------------------|----------------------|
| **Type de devis** | Sélection explicite "Devis chantier" | Pas de sélection, toujours devis normal |
| **Flag devis_chantier** | `true` pour appel d'offres | Toujours `false` |
| **Création Chantier** | ❌ Pas créé pour appel d'offres | ✅ Toujours créé |
| **Création AppelOffres** | ✅ Créé avec toutes les données | ❌ Jamais créé |
| **Liaison Devis** | Lié à AppelOffres | Toujours lié à Chantier |
| **Données adresse** | Envoyées pour AppelOffres | Utilisées pour créer Chantier |
| **Marge estimée** | ✅ Calculée et envoyée | ❌ Non calculée |
| **Taux fixe** | ✅ Envoyé | ❌ Non envoyé |
| **Coûts estimés** | Tous calculés | Seulement main d'œuvre et matériel |
| **Réponse backend** | Inclut `appel_offres_id` | Seulement `devis.id` |

---

## Impact

Ces différences signifient que `DevisAvance.js` **ne peut pas créer d'appels d'offres** actuellement. Il crée toujours des devis normaux liés à des chantiers, même pour un nouveau chantier qui devrait être un appel d'offres potentiel.

Pour aligner `DevisAvance.js` sur le processus décrit, il faudrait :
1. Ajouter une sélection du type de devis (normal vs chantier)
2. Ne pas créer le chantier si c'est un appel d'offres
3. Envoyer `devis_chantier: true` avec toutes les données nécessaires pour créer l'AppelOffres
4. Calculer et envoyer `marge_estimee` et `taux_fixe`
5. Gérer la réponse avec `appel_offres_id` pour le téléchargement automatique du PDF

