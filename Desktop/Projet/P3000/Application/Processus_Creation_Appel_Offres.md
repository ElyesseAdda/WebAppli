# Processus de Création d'un Appel d'Offres

Ce document décrit le processus complet de création d'un appel d'offres depuis le composant `CreationDevis.js`, incluant la création du client et de la société.

## Vue d'ensemble

Un appel d'offres est créé lorsque l'utilisateur sélectionne le type de devis "Devis chantier" dans l'interface de création de devis. Contrairement à un devis normal qui est lié à un chantier existant, un appel d'offres représente un projet potentiel qui n'a pas encore été validé.

---

## Étape 1 : Sélection du Type de Devis

**Fichier :** `frontend/src/components/CreationDevis.js`  
**Lignes :** 2037-2044

L'utilisateur sélectionne le type de devis via un RadioGroup :

```javascript
const handleDevisTypeChange = (e) => {
  const newValue = e.target.value;
  setDevisType(newValue);

  if (newValue === "chantier") {
    setShowClientTypeModal(true);
  }
};
```

**Résultat :** Si "Devis chantier" est sélectionné, le modal `ClientTypeModal` s'ouvre.

---

## Étape 2 : Choix du Type de Client

**Fichier :** `frontend/src/components/ClientTypeModal.js`

L'utilisateur choisit entre :
- **Nouveau Client** : Création d'un nouveau client et d'une nouvelle société
- **Client Existant** : Sélection d'un client/société existant

**Actions :**
- `onNewClient` → Ouvre `ClientInfoModal`
- `onExistingClient` → Ouvre `SelectSocieteModal`

---

## Étape 3A : Création d'un Nouveau Client

### 3A.1 : Saisie des Informations Client

**Fichier :** `frontend/src/components/ClientInfoModal.js`

L'utilisateur saisit :
- Civilité (optionnel)
- Nom (requis)
- Prénom (requis)
- Email (requis)
- Téléphone (requis, numérique uniquement)
- Poste (optionnel)

**Validation :** Le numéro de téléphone doit être numérique.

**Soumission :** Les données sont stockées dans `pendingChantierData.client` via `handleClientInfoSubmit` (ligne 1975-1999).

### 3A.2 : Saisie des Informations Société

**Fichier :** `frontend/src/components/SocieteInfoModal.js`

L'utilisateur saisit :
- Nom de la société (requis)
- Ville (requis)
- Rue (requis)
- Code postal (requis)

**Soumission :** Les données sont stockées dans `pendingChantierData.societe` via `handleSocieteInfoSubmit` (ligne 2001-2013).

### 3A.3 : Saisie des Informations Chantier

**Fichier :** `frontend/src/components/ChantierForm.js`

L'utilisateur saisit :
- Nom du chantier (requis, vérifié pour éviter les doublons)
- Ville (requis)
- Rue (requis)
- Code postal (requis)

**Vérification :** Le nom du chantier est vérifié via `/api/check-chantier-name/` pour éviter les doublons.

**Soumission :** Les données sont stockées dans `pendingChantierData.chantier` et `selectedChantierId` est défini à `-1` (chantier en cours de création).

---

## Étape 3B : Sélection d'un Client Existant

**Fichier :** `frontend/src/components/SelectSocieteModal.js`

L'utilisateur sélectionne une société existante dans une liste.

**Action :** `handleSocieteSelect` (ligne 1281-1319) :
1. Récupère les données de la société via `/api/societe/${societeId}/`
2. Récupère les données du client via `/api/client/${societeData.client_name}/`
3. Met à jour `pendingChantierData` avec les données récupérées
4. Ouvre `ChantierForm` pour saisir les informations du chantier

---

## Étape 4 : Configuration du Devis

L'utilisateur configure le devis :
- Sélection des parties, sous-parties et lignes de détail
- Définition des quantités et prix
- Ajout de lignes spéciales (remises, suppléments, etc.)
- Configuration du taux de TVA et de la nature des travaux

**Stockage :** Toutes les données sont sauvegardées automatiquement dans le localStorage via `saveStateToLocalStorage` (ligne 2191-2211).

---

## Étape 5 : Prévisualisation (Optionnelle)

**Fichier :** `frontend/src/components/CreationDevis.js`  
**Lignes :** 594-627

L'utilisateur peut prévisualiser le devis avant de l'enregistrer via `handlePreviewDevis()`.

**Action :** Ouvre une nouvelle fenêtre avec l'URL `/api/preview-devis/?devis=${queryString}`.

---

## Étape 6 : Enregistrement du Devis

**Fichier :** `frontend/src/components/CreationDevis.js`  
**Fonction :** `handleDevisModalSubmit` (ligne 846-1237)

### 6.1 : Préparation des Données

1. **Calcul des totaux estimés** via `calculateEstimatedTotals()` (ligne 712-788) :
   - Coût estimé main d'œuvre
   - Coût estimé matériel
   - Coût avec taux fixe
   - Marge estimée

2. **Calcul du grand total** via `calculateGrandTotal` (ligne 1413-1528) :
   - Total HT (avec lignes spéciales)
   - Total TTC (avec TVA)

### 6.2 : Gestion du Client et de la Société

**Pour les nouveaux chantiers OU les devis de chantier :**

```javascript
if (selectedChantierId === -1 || devisType === "chantier") {
  // 1. Vérifier si le client existe
  const existingClient = await checkClientExists(pendingChantierData.client);
  
  if (existingClient) {
    clientId = existingClient.id;
  } else {
    // Créer le client
    const clientResponse = await axios.post("/api/client/", {
      ...pendingChantierData.client,
      phone_Number: pendingChantierData.client.phone_Number.toString(),
    });
    clientId = clientResponse.data.id;
  }

  // 2. Vérifier si la société existe
  const existingSociete = await checkSocieteExists(pendingChantierData.societe);
  
  if (existingSociete) {
    societeId = existingSociete.id;
  } else {
    // Créer la société
    const societeResponse = await axios.post("/api/societe/", {
      ...pendingChantierData.societe,
      client_name: clientId,
      codepostal_societe: pendingChantierData.societe.codepostal_societe.toString(),
    });
    societeId = societeResponse.data.id;
  }
}
```

**Endpoints de vérification :**
- `/api/check-client/` : Vérifie l'existence d'un client par email et téléphone
- `/api/check-societe/` : Vérifie l'existence d'une société par nom et code postal

### 6.3 : Préparation des Données du Devis

Les données sont préparées dans l'objet `devisData` :

```javascript
const devisData = {
  numero: devisModalData.numero,
  chantier: devisType !== "chantier" ? chantierIdToUse : null,
  client: [clientId],
  price_ht: parseFloat(totalHT.toFixed(2)),
  price_ttc: parseFloat(totalTTC.toFixed(2)),
  tva_rate: parseFloat(tvaRate),
  nature_travaux: natureTravaux || "",
  description: devisModalData.description || "",
  devis_chantier: devisType === "chantier",
  // Coûts estimés
  cout_estime_main_oeuvre: totals.cout_estime_main_oeuvre,
  cout_estime_materiel: totals.cout_estime_materiel,
  cout_avec_taux_fixe: totals.cout_avec_taux_fixe,
  marge_estimee: totals.marge_estimee,
  // Données pour l'appel d'offres si c'est un devis de chantier
  ...(devisType === "chantier" && {
    chantier_name: pendingChantierData.chantier.chantier_name.trim(),
    societe_id: societeId,
    ville: pendingChantierData.chantier.ville,
    rue: pendingChantierData.chantier.rue,
    code_postal: pendingChantierData.chantier.code_postal.toString(),
    taux_fixe: tauxFixe !== null ? tauxFixe : 20,
  }),
  lignes: [...], // Lignes de détail sélectionnées
  lignes_speciales: {...}, // Lignes spéciales (remises, suppléments)
};
```

### 6.4 : Envoi au Backend

**Endpoint :** `POST /api/create-devis/`

Les données sont envoyées via `axios.post("/api/create-devis/", devisData)`.

---

## Étape 7 : Traitement Backend

**Fichier :** `api/views.py`  
**Fonction :** `create_devis` (ligne 2845-3057)

### 7.1 : Détection du Type de Devis

```python
devis_chantier = request.data.get('devis_chantier', False)

if devis_chantier:
    # Créer un appel d'offres
else:
    # Créer un devis normal
```

### 7.2 : Création de l'Appel d'Offres

**Si `devis_chantier` est `True` :**

1. **Récupération de la société :**
   ```python
   societe_id = request.data.get('societe_id')
   societe = Societe.objects.get(id=societe_id)
   ```

2. **Création de l'appel d'offres :**
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

3. **Filtrage des lignes spéciales :**
   - Séparation des lignes de type `display` (affichage uniquement) et des lignes de calcul
   - Stockage dans `lignes_speciales_filtered` et `lignes_display`

4. **Création du devis lié :**
   ```python
   devis_data = {
       'numero': request.data['numero'],
       'appel_offres': appel_offres,  # Lien vers l'appel d'offres
       'price_ht': Decimal(str(request.data['price_ht'])),
       'price_ttc': Decimal(str(request.data['price_ttc'])),
       'tva_rate': Decimal(str(request.data.get('tva_rate', '20.00'))),
       'nature_travaux': request.data.get('nature_travaux', ''),
       'description': request.data.get('description', ''),
       'status': 'En attente',
       'devis_chantier': True,
       'lignes_speciales': lignes_speciales_filtered,
       'lignes_display': lignes_display,
       'parties_metadata': request.data.get('parties_metadata', {}),
       'cout_estime_main_oeuvre': Decimal(str(request.data.get('cout_estime_main_oeuvre', '0'))),
       'cout_estime_materiel': Decimal(str(request.data.get('cout_estime_materiel', '0')))
   }
   
   devis = Devis.objects.create(**devis_data)
   ```

### 7.3 : Association des Clients

```python
client_values = request.data.get('client') or []
if isinstance(client_values, (list, tuple)):
    client_ids = [c for c in client_values if c]
else:
    client_ids = [client_values] if client_values else []

# Si aucun client fourni, déduire depuis l'appel d'offres
if not client_ids:
    if devis.devis_chantier and devis.appel_offres and devis.appel_offres.societe:
        client_ids = [devis.appel_offres.societe.client_name.id]

if client_ids:
    devis.client.set(client_ids)
```

### 7.4 : Création des Lignes de Devis

```python
for ligne in request.data.get('lignes', []):
    ligne_data = {
        'devis': devis,
        'ligne_detail_id': ligne['ligne'],
        'quantite': Decimal(str(ligne['quantity'])),
        'prix_unitaire': Decimal(str(ligne['custom_price']))
    }
    
    if 'index_global' in ligne and ligne['index_global'] is not None:
        ligne_data['index_global'] = Decimal(str(ligne['index_global']))
    
    DevisLigne.objects.create(**ligne_data)
```

### 7.5 : Réponse au Frontend

```python
response_data = {'id': devis.id}
if devis_chantier and appel_offres:
    response_data['appel_offres_id'] = appel_offres.id
    response_data['appel_offres_name'] = appel_offres.chantier_name

return Response(response_data, status=201)
```

---

## Étape 8 : Traitement Post-Création (Frontend)

**Fichier :** `frontend/src/components/CreationDevis.js`  
**Lignes :** 1106-1154

### 8.1 : Téléchargement Automatique du PDF

Si c'est un devis de chantier, le système prépare le téléchargement automatique :

```javascript
if (devisType === "chantier") {
  const appelOffresId = response.data.appel_offres_id;
  const appelOffresName = response.data.appel_offres_name;
  const devisId = response.data.id;
  const societeName = pendingChantierData.societe.nom_societe;

  const urlParams = new URLSearchParams({
    autoDownload: "true",
    devisId: devisId,
    appelOffresId: appelOffresId,
    appelOffresName: appelOffresName,
    societeName: societeName,
    numero: devisModalData.numero,
  });

  alert("Devis créé avec succès ! Téléchargement automatique vers le Drive...");
  window.location.href = `/ListeDevis?${urlParams.toString()}`;
}
```

### 8.2 : Nettoyage de l'État

L'état sauvegardé dans le localStorage est nettoyé via `clearSavedState()` (ligne 2270-2272).

---

## Étape 9 : Génération Automatique du PDF (Optionnelle)

**Fichier :** `frontend/src/pages/ListeDevis.js` (non inclus dans ce document)

Si le paramètre `autoDownload=true` est présent dans l'URL, le système :
1. Génère automatiquement le PDF du devis
2. Le télécharge vers AWS S3 (Drive)
3. Crée la structure de dossiers si nécessaire

**Structure de dossiers créée :**
```
Appels_Offres/
  └── {nom_societe}/
      └── {id_appel_offres}_{nom_appel_offres}/
          ├── Devis/
          │   └── Devis_Marche/
          ├── Factures/
          ├── Situations/
          └── Documents/
```

---

## Résumé du Flux Complet

```
1. Utilisateur sélectionne "Devis chantier"
   ↓
2. Choix : Nouveau client OU Client existant
   ↓
3A. Nouveau client :
    → ClientInfoModal → SocieteInfoModal → ChantierForm
3B. Client existant :
    → SelectSocieteModal → ChantierForm
   ↓
4. Configuration du devis (parties, lignes, prix)
   ↓
5. (Optionnel) Prévisualisation
   ↓
6. Enregistrement :
   → Vérification/Création client
   → Vérification/Création société
   → Envoi au backend
   ↓
7. Backend :
   → Création AppelOffres
   → Création Devis (lié à AppelOffres)
   → Création DevisLigne
   ↓
8. Frontend :
   → Redirection vers ListeDevis
   → Téléchargement automatique PDF (si activé)
```

---

## Points Importants

### Gestion des Doublons

- **Client :** Vérifié par email et téléphone via `/api/check-client/`
- **Société :** Vérifiée par nom et code postal via `/api/check-societe/`
- **Chantier :** Vérifié par nom via `/api/check-chantier-name/`

### Transaction Atomique

Le backend utilise `transaction.atomic()` pour garantir que toutes les opérations (appel d'offres, devis, lignes) sont créées ensemble ou pas du tout.

### État Temporaire

Les données du client, société et chantier sont stockées dans `pendingChantierData` jusqu'à la création effective. Le chantier n'est **pas créé** pour un appel d'offres, seulement l'appel d'offres lui-même.

### Différence avec un Devis Normal

- **Devis normal :** Lié à un `Chantier` existant, affecte le prévisionnel du chantier
- **Devis chantier (Appel d'offres) :** Lié à un `AppelOffres`, ne crée pas de chantier, statut initial "en_attente"

---

## Modèles de Données Impliqués

### AppelOffres
- `chantier_name` : Nom du projet
- `societe` : ForeignKey vers Societe
- `montant_ht`, `montant_ttc` : Montants
- `ville`, `rue`, `code_postal` : Adresse
- `cout_estime_main_oeuvre`, `cout_estime_materiel` : Coûts estimés
- `marge_estimee` : Marge estimée
- `taux_fixe` : Taux fixe appliqué
- `statut` : 'en_attente', 'valide', 'refuse'
- `description` : Description du projet

### Devis
- `numero` : Numéro unique du devis
- `appel_offres` : ForeignKey vers AppelOffres (si devis_chantier=True)
- `chantier` : ForeignKey vers Chantier (si devis_chantier=False)
- `devis_chantier` : Boolean indiquant le type
- `client` : ManyToMany vers Client
- `price_ht`, `price_ttc` : Montants
- `lignes_speciales` : JSONField pour les lignes spéciales
- `lignes_display` : JSONField pour les lignes d'affichage uniquement

### Client
- `name`, `surname` : Nom et prénom
- `client_mail` : Email
- `phone_Number` : Téléphone
- `civilite` : Civilité (optionnel)
- `poste` : Poste (optionnel)

### Societe
- `nom_societe` : Nom de la société
- `ville_societe`, `rue_societe`, `codepostal_societe` : Adresse
- `client_name` : ForeignKey vers Client

---

## Notes Techniques

1. **LocalStorage :** L'état du formulaire est sauvegardé automatiquement pour permettre la reprise en cas de rafraîchissement de page.

2. **Validation :** Les validations sont effectuées à la fois côté frontend (format, champs requis) et backend (intégrité des données, relations).

3. **Gestion d'erreurs :** Les erreurs sont capturées et affichées dans une boîte de dialogue en haut de l'écran avec possibilité de copier les détails.

4. **Performance :** Les calculs de totaux utilisent `useMemo` pour éviter les recalculs inutiles.

5. **Sécurité :** Les transactions atomiques garantissent la cohérence des données même en cas d'erreur partielle.

