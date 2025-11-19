# Modifications Nécessaires : Création d'Appels d'Offres dans DevisAvance.js

Ce document liste toutes les modifications nécessaires pour que `DevisAvance.js` puisse créer des appels d'offres comme l'ancien système (`CreationDevis.js`).

---

## Vue d'ensemble

Actuellement, `DevisAvance.js` crée toujours des devis normaux liés à des chantiers, même pour un nouveau chantier. Il faut ajouter la possibilité de créer des appels d'offres (devis de chantier) qui ne créent pas de chantier mais un `AppelOffres` à la place.

---

## 1. Ajouter la Sélection du Type de Devis

### 📍 Localisation
`frontend/src/components/DevisAvance.js`

### 🔧 Modifications nécessaires

#### 1.1. Ajouter un état pour le type de devis
**Ligne ~108** (près de `const [devisType, setDevisType] = useState("normal")`)

```javascript
// État pour le type de devis (existant mais pas utilisé pour l'appel d'offres)
const [devisType, setDevisType] = useState("normal"); // 'normal' ou 'chantier'
const [showClientTypeModal, setShowClientTypeModal] = useState(false); // Nouveau état
```

#### 1.2. Importer ClientTypeModal
**Ligne ~12-15** (section imports)

```javascript
import ClientTypeModal from './ClientTypeModal'; // Ajouter cet import
```

#### 1.3. Ajouter le RadioGroup pour sélectionner le type
**Ligne ~1884** (Section 0: Sélection du chantier, avant le FormControl)

```javascript
{/* Nouvelle section : Sélection du type de devis */}
<div style={{
  backgroundColor: '#fff3cd',
  border: '2px solid #ffc107',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '20px'
}}>
  <h3 style={{
    color: '#856404',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 15px 0'
  }}>
    Type de devis
  </h3>
  
  <FormControl component="fieldset">
    <RadioGroup
      row
      value={devisType}
      onChange={(e) => {
        const newValue = e.target.value;
        setDevisType(newValue);
        
        if (newValue === "chantier") {
          // Si "Devis chantier" est sélectionné, ouvrir le modal de choix client
          setShowClientTypeModal(true);
        } else {
          // Si "Devis normal" est sélectionné, réinitialiser à un chantier normal
          setSelectedChantierId(null);
          setPendingChantierData({
            client: { name: "", surname: "", client_mail: "", phone_Number: "" },
            societe: { nom_societe: "", ville_societe: "", rue_societe: "", codepostal_societe: "" },
            chantier: { id: -1, chantier_name: "", ville: "", rue: "", code_postal: "" },
            devis: null,
          });
        }
      }}
    >
      <FormControlLabel 
        value="normal" 
        control={<Radio />} 
        label="Devis normal (chantier existant)" 
      />
      <FormControlLabel 
        value="chantier" 
        control={<Radio />} 
        label="Devis chantier (appel d'offres)" 
      />
    </RadioGroup>
  </FormControl>
</div>
```

#### 1.4. Importer RadioGroup et FormControlLabel
**Ligne ~3** (section imports Material-UI)

```javascript
import { Select, MenuItem, FormControl, InputLabel, Button, Box, Typography, RadioGroup, FormControlLabel, Radio } from '@mui/material';
```

#### 1.5. Ajouter le ClientTypeModal
**Ligne ~2361** (avant la fermeture du composant)

```javascript
{/* Modal de choix du type de client (pour appel d'offres) */}
<ClientTypeModal
  open={showClientTypeModal}
  onClose={() => setShowClientTypeModal(false)}
  onNewClient={() => {
    setShowClientTypeModal(false);
    setShowClientInfoModal(true);
  }}
  onExistingClient={() => {
    setShowClientTypeModal(false);
    setShowSelectSocieteModal(true);
  }}
/>
```

---

## 2. Calculer les Coûts Estimés (marge_estimee, taux_fixe)

### 📍 Localisation
`frontend/src/components/DevisAvance.js`

### 🔧 Modifications nécessaires

#### 2.1. Ajouter un état pour taux_fixe
**Ligne ~108** (près des autres états)

```javascript
const [tauxFixe, setTauxFixe] = useState(20); // Taux fixe global (par défaut 20%)
```

#### 2.2. Ajouter la fonction calculateEstimatedTotals
**Ligne ~1560** (après calculateGlobalTotal)

```javascript
// Fonction pour calculer les totaux estimés (main d'œuvre, matériel, marge)
const calculateEstimatedTotals = () => {
  let totals = {
    cout_estime_main_oeuvre: 0,
    cout_estime_materiel: 0,
    cout_avec_taux_fixe: 0,
    marge_estimee: 0,
  };

  // 1. Calculer les coûts directs à partir de devisItems
  const lignesDetails = devisItems.filter(item => item.type === 'ligne_detail');
  
  lignesDetails.forEach(ligne => {
    const quantity = parseFloat(ligne.quantity || 0);
    const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre || 0);
    const cout_materiel = parseFloat(ligne.cout_materiel || 0);

    totals.cout_estime_main_oeuvre += cout_main_oeuvre * quantity;
    totals.cout_estime_materiel += cout_materiel * quantity;
  });

  // 2. Calculer le total des coûts directs
  const coutsDirects = totals.cout_estime_main_oeuvre + totals.cout_estime_materiel;

  // 3. Calculer le montant du taux fixe (moyenne pondérée des taux_fixe des lignes)
  let totalTauxFixe = 0;
  let totalQuantite = 0;
  
  lignesDetails.forEach(ligne => {
    const quantity = parseFloat(ligne.quantity || 0);
    const tauxPersonnalise = parseFloat(ligne.taux_fixe || tauxFixe || 20);
    totalTauxFixe += tauxPersonnalise * quantity;
    totalQuantite += quantity;
  });

  const tauxFixeMoyen = totalQuantite > 0 ? totalTauxFixe / totalQuantite : (tauxFixe || 20);
  const montantTauxFixe = coutsDirects * (tauxFixeMoyen / 100);
  totals.cout_avec_taux_fixe = coutsDirects + montantTauxFixe;

  // 4. Obtenir le total HT (calculé automatiquement)
  const totalHT = calculateGlobalTotal();

  // 5. Calculer la marge (Total HT - Coût avec taux fixe)
  totals.marge_estimee = totalHT - totals.cout_avec_taux_fixe;

  // 6. Arrondir tous les résultats à 2 décimales
  totals.cout_estime_main_oeuvre = parseFloat(totals.cout_estime_main_oeuvre.toFixed(2));
  totals.cout_estime_materiel = parseFloat(totals.cout_estime_materiel.toFixed(2));
  totals.cout_avec_taux_fixe = parseFloat(totals.cout_avec_taux_fixe.toFixed(2));
  totals.marge_estimee = parseFloat(totals.marge_estimee.toFixed(2));

  return totals;
};
```

---

## 3. Modifier la Fonction handleSaveDevis

### 📍 Localisation
`frontend/src/components/DevisAvance.js` - Fonction `handleSaveDevis` (ligne ~1674)

### 🔧 Modifications nécessaires

#### 3.1. Ne pas créer le chantier si c'est un appel d'offres
**Ligne ~1694** (remplacer la condition `if (selectedChantierId === -1)`)

```javascript
// Gestion du client et de la société pour nouveau chantier OU appel d'offres
if (selectedChantierId === -1 || devisType === "chantier") {
  if (!pendingChantierData.client || !pendingChantierData.societe || !pendingChantierData.chantier) {
    const missingData = {
      client: !pendingChantierData.client ? "Client manquant" : null,
      societe: !pendingChantierData.societe ? "Société manquante" : null,
      chantier: !pendingChantierData.chantier ? "Chantier manquant" : null,
    };
    throw new Error(
      `Données manquantes: ${Object.values(missingData).filter(Boolean).join(", ")}`
    );
  }

  // 1. Vérifier si le client existe
  const existingClient = await checkClientExists(pendingChantierData.client);
  if (existingClient) {
    finalClientId = existingClient.id;
  } else {
    // Créer le client avec tous les champs (incluant civilite et poste)
    const clientResponse = await axios.post("/api/client/", {
      name: pendingChantierData.client.name,
      surname: pendingChantierData.client.surname,
      phone_Number: pendingChantierData.client.phone_Number.toString(),
      client_mail: pendingChantierData.client.client_mail || "",
      civilite: pendingChantierData.client.civilite || "",
      poste: pendingChantierData.client.poste || "",
    });
    finalClientId = clientResponse.data.id;
  }

  // 2. Vérifier si la société existe
  const existingSociete = await checkSocieteExists(pendingChantierData.societe);
  if (existingSociete) {
    finalSocieteId = existingSociete.id;
  } else {
    // Créer la société
    const societeData = {
      nom_societe: pendingChantierData.societe.nom_societe || "",
      ville_societe: pendingChantierData.societe.ville_societe || "",
      rue_societe: pendingChantierData.societe.rue_societe || "",
      client_name: finalClientId,
    };
    
    if (pendingChantierData.societe.codepostal_societe) {
      societeData.codepostal_societe = pendingChantierData.societe.codepostal_societe.toString();
    }
    
    const societeResponse = await axios.post("/api/societe/", societeData);
    finalSocieteId = societeResponse.data.id;
  }

  // 3. Créer le chantier SEULEMENT si ce n'est PAS un appel d'offres
  if (devisType !== "chantier") {
    // Vérifier que finalSocieteId est bien défini avant de créer le chantier
    if (!finalSocieteId) {
      throw new Error("Erreur : L'ID de la société n'a pas pu être obtenu. Impossible de créer le chantier.");
    }

    // Créer le chantier avec la société
    const totals = calculateEstimatedTotals(); // Calculer les totaux estimés
    
    const chantierResponse = await axios.post("/api/chantier/", {
      chantier_name: pendingChantierData.chantier.chantier_name.trim(),
      ville: pendingChantierData.chantier.ville,
      rue: pendingChantierData.chantier.rue,
      code_postal: pendingChantierData.chantier.code_postal.toString(),
      montant_ht: total_ht,
      montant_ttc: montant_ttc,
      societe_id: finalSocieteId,
      client: finalClientId,
      // Coûts estimés
      cout_estime_main_oeuvre: totals.cout_estime_main_oeuvre,
      cout_estime_materiel: totals.cout_estime_materiel,
      cout_avec_taux_fixe: totals.cout_avec_taux_fixe,
      marge_estimee: totals.marge_estimee,
      taux_fixe: tauxFixe !== null ? tauxFixe : 20,
    });
    finalChantierId = chantierResponse.data.id;
  }
}
```

#### 3.2. Modifier la transformation pour inclure les données d'appel d'offres
**Ligne ~1788** (avant `transformToLegacyFormat`)

```javascript
// Calculer les totaux estimés
const totals = calculateEstimatedTotals();

// Transformer les données vers le format legacy
const legacyDevis = transformToLegacyFormat({
  devisItems,
  devisData: {
    ...devisData,
    price_ht: total_ht,
    price_ttc: montant_ttc
  },
  selectedChantierId: finalChantierId,
  clientIds: finalClientId ? [finalClientId] : [],
  // ✅ NOUVEAU : Données pour appel d'offres
  devisType: devisType, // Passer le type de devis
  pendingChantierData: devisType === "chantier" ? pendingChantierData : null,
  societeId: finalSocieteId,
  totals: totals, // Totals estimés (marge_estimee, cout_avec_taux_fixe)
  tauxFixe: tauxFixe,
});
```

---

## 4. Modifier DevisLegacyTransformer.js

### 📍 Localisation
`frontend/src/utils/DevisLegacyTransformer.js`

### 🔧 Modifications nécessaires

#### 4.1. Modifier transformToLegacyFormat pour gérer les appels d'offres
**Ligne ~403** (fonction `transformToLegacyFormat`)

```javascript
export const transformToLegacyFormat = ({
  devisItems,
  devisData,
  selectedChantierId,
  clientIds = [],
  // ✅ NOUVEAUX PARAMÈTRES
  devisType = "normal", // 'normal' ou 'chantier'
  pendingChantierData = null,
  societeId = null,
  totals = null, // { cout_estime_main_oeuvre, cout_estime_materiel, cout_avec_taux_fixe, marge_estimee }
  tauxFixe = 20,
}) => {
  // Extraire les lignes de détail
  const lignes = extractLignes(devisItems);
  
  // Organiser les lignes spéciales (séparer display des autres)
  const { lignes_speciales, lignes_display } = organizeSpecialLines(devisItems);
  
  // Calculer les coûts estimés (utiliser totals si fourni, sinon calculer)
  const costs = totals || calculateEstimatedCosts(devisItems);
  
  // Extraire les parties/sous-parties avec leurs numéros pour parties_metadata
  const parties_metadata = extractPartiesMetadata(devisItems);
  
  // Déterminer si c'est un devis de chantier (appel d'offres)
  const devis_chantier = devisType === "chantier";
  
  // Convertir la date de création au format ISO 8601 complet
  const date_creation_iso = convertDateToISO(devisData.date_creation);
  
  // Construire le payload legacy
  const legacyDevis = {
    // Informations de base
    numero: devisData.numero || '',
    date_creation: date_creation_iso,
    chantier: !devis_chantier && selectedChantierId && selectedChantierId !== -1 ? selectedChantierId : null,
    price_ht: devisData.price_ht || 0,
    price_ttc: devisData.price_ttc || 0,
    tva_rate: devisData.tva_rate || 20,
    nature_travaux: devisData.nature_travaux || '',
    description: devisData.description || '',
    status: 'En attente',
    devis_chantier: devis_chantier,
    
    // Lignes de détail
    lignes: lignes,
    
    // Lignes spéciales (sans les lignes 'display')
    lignes_speciales: lignes_speciales,
    
    // Lignes display (uniquement les lignes de type 'display')
    lignes_display: lignes_display,
    
    // Métadonnées des parties avec numéros pour l'affichage
    parties_metadata: parties_metadata,
    
    // Coûts estimés
    cout_estime_main_oeuvre: parseFloat(costs.cout_estime_main_oeuvre || 0).toFixed(2),
    cout_estime_materiel: parseFloat(costs.cout_estime_materiel || 0).toFixed(2),
    
    // Clients
    client: clientIds.length > 0 ? clientIds : [],
    
    // ✅ NOUVEAU : Données pour l'appel d'offres si c'est un devis de chantier
    ...(devis_chantier && pendingChantierData && societeId && {
      chantier_name: pendingChantierData.chantier.chantier_name.trim(),
      societe_id: societeId,
      ville: pendingChantierData.chantier.ville,
      rue: pendingChantierData.chantier.rue,
      code_postal: pendingChantierData.chantier.code_postal.toString(),
      taux_fixe: tauxFixe !== null ? tauxFixe : 20,
      // Coûts supplémentaires si disponibles dans totals
      ...(totals && {
        cout_avec_taux_fixe: parseFloat(totals.cout_avec_taux_fixe || 0).toFixed(2),
        marge_estimee: parseFloat(totals.marge_estimee || 0).toFixed(2),
      }),
    }),
  };
  
  return legacyDevis;
};
```

---

## 5. Gérer la Réponse du Backend

### 📍 Localisation
`frontend/src/components/DevisAvance.js` - Fonction `handleSaveDevis` (ligne ~1801)

### 🔧 Modifications nécessaires

#### 5.1. Gérer la réponse avec appel_offres_id
**Ligne ~1803** (après `if (response.data)`)

```javascript
if (response.data) {
  // Succès : mettre à jour l'ID du devis pour les futures modifications
  setDevisData(prev => ({ ...prev, id: response.data.id }));
  
  // Recalculer automatiquement les coûts du devis créé
  try {
    await axios.post(`/api/devis/${response.data.id}/recalculer-couts/`);
    console.log("✅ Coûts du devis recalculés avec succès");
  } catch (recalcError) {
    console.error("❌ Erreur lors du recalcul des coûts:", recalcError);
  }
  
  // ✅ NOUVEAU : Gérer le téléchargement automatique pour les appels d'offres
  if (devisType === "chantier" && response.data.appel_offres_id) {
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
      numero: devisData.numero,
    });

    alert("Devis créé avec succès ! Téléchargement automatique vers le Drive...");
    window.location.href = `/ListeDevis?${urlParams.toString()}`;
    return; // Ne pas continuer vers le alert normal
  }
  
  alert('Devis sauvegardé avec succès!');
  
  // Rediriger vers la liste des devis
  window.location.href = '/ListeDevis';
}
```

---

## 6. Modifier la Génération du Numéro de Devis

### 📍 Localisation
`frontend/src/components/DevisAvance.js` - Fonction `generateDevisNumber` (ligne ~507)

### 🔧 Modifications nécessaires

#### 6.1. Prendre en compte le type de devis
**Ligne ~514** (dans `generateDevisNumber`)

```javascript
const generateDevisNumber = async (chantierIdParam = null) => {
  try {
    setIsGeneratingNumber(true);
    
    const chantierIdToUse = chantierIdParam !== null ? chantierIdParam : selectedChantierId;
    
    // ✅ NOUVEAU : Si c'est un appel d'offres, utiliser le format "Devis travaux"
    if (devisType === "chantier") {
      const params = { devis_chantier: 'true' };
      const response = await axios.get("/api/get-next-devis-number/", { params });
      const baseNumber = response.data.numero;
      const finalNumber = `${baseNumber} - Devis travaux`;
      setDevisData(prev => ({ ...prev, numero: finalNumber }));
      return finalNumber;
    }
    
    // Logique existante pour les devis normaux
    const isChantierExistant = chantierIdToUse && chantierIdToUse !== -1;
    
    const params = {};
    if (isChantierExistant) {
      params.chantier_id = chantierIdToUse;
      params.devis_chantier = 'false';
    } else {
      params.devis_chantier = 'true';
    }
    
    const response = await axios.get("/api/get-next-devis-number/", { params });
    
    let baseNumber = response.data.numero;
    
    if (isChantierExistant && response.data.next_ts) {
      baseNumber = `${baseNumber} - TS n°${response.data.next_ts}`;
      setNextTsNumber(response.data.next_ts);
    } else if (!isChantierExistant) {
      baseNumber = `${baseNumber} - Devis travaux`;
    }
    
    setDevisData(prev => ({ ...prev, numero: baseNumber }));
    return baseNumber;
  } catch (error) {
    const currentYear = new Date().getFullYear();
    const fallbackNumber = `Devis n°001.${currentYear}`;
    setDevisData(prev => ({ ...prev, numero: fallbackNumber }));
    return fallbackNumber;
  } finally {
    setIsGeneratingNumber(false);
  }
};
```

#### 6.2. Régénérer le numéro quand le type change
**Ligne ~2037** (dans le handler du RadioGroup)

```javascript
onChange={(e) => {
  const newValue = e.target.value;
  setDevisType(newValue);
  
  if (newValue === "chantier") {
    setShowClientTypeModal(true);
    // Régénérer le numéro avec le format "Devis travaux"
    generateDevisNumber(null);
  } else {
    setSelectedChantierId(null);
    setPendingChantierData({
      client: { name: "", surname: "", client_mail: "", phone_Number: "" },
      societe: { nom_societe: "", ville_societe: "", rue_societe: "", codepostal_societe: "" },
      chantier: { id: -1, chantier_name: "", ville: "", rue: "", code_postal: "" },
      devis: null,
    });
    // Régénérer le numéro selon le chantier sélectionné
    generateDevisNumber(null);
  }
}}
```

---

## 7. Mettre à Jour la Section Sélection du Chantier

### 📍 Localisation
`frontend/src/components/DevisAvance.js` - Section 0 (ligne ~1884)

### 🔧 Modifications nécessaires

#### 7.1. Désactiver la sélection de chantier pour les appels d'offres
**Ligne ~1903** (dans la Box de sélection du chantier)

```javascript
<FormControl sx={{ minWidth: 300, flex: 1 }}>
  <InputLabel shrink>Chantier existant</InputLabel>
  <Select
    value={selectedChantierId || ''}
    onChange={(e) => handleChantierSelection(e.target.value)}
    disabled={isLoadingChantiers || devisType === "chantier"} // ✅ Désactiver si appel d'offres
    displayEmpty
    notched
  >
    <MenuItem value="">
      <em>-- Choisir un chantier --</em>
    </MenuItem>
    {chantiers
      .filter((chantier) => chantier.chantier_name !== "École - Formation")
      .map((chantier) => (
        <MenuItem key={chantier.id} value={chantier.id}>
          {chantier.chantier_name}
        </MenuItem>
      ))}
  </Select>
</FormControl>

<Typography sx={{ color: '#6c757d', fontSize: '14px' }}>
  ou
</Typography>

<Button
  variant="contained"
  startIcon={<FiPlus />}
  onClick={() => {
    if (devisType === "chantier") {
      // Pour appel d'offres, ouvrir le modal de choix client
      setShowClientTypeModal(true);
    } else {
      // Pour devis normal, ouvrir le modal de création client
      setShowClientInfoModal(true);
    }
  }}
  disabled={devisType === "chantier"} // ✅ Désactiver le bouton si appel d'offres (géré par RadioGroup)
  sx={{
    backgroundColor: '#28a745',
    '&:hover': { backgroundColor: '#218838' },
    textTransform: 'none',
    fontWeight: 'bold'
  }}
>
  {devisType === "chantier" ? "Créer un appel d'offres" : "Créer un nouveau chantier"}
</Button>
```

#### 7.2. Afficher un message d'information pour les appels d'offres
**Ligne ~1945** (après la Box de sélection)

```javascript
{devisType === "chantier" && (
  <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
    <Typography variant="body2" color="text.secondary">
      <strong>Appel d'offres :</strong> Aucun chantier ne sera créé. Les informations du chantier seront stockées dans l'appel d'offres.
    </Typography>
  </Box>
)}
```

---

## 8. ClientTypeModal existe déjà ✅

### 📍 Localisation
`frontend/src/components/ClientTypeModal.js`

### ✅ Statut
Le composant `ClientTypeModal.js` existe déjà et correspond exactement à ce qui est attendu. Il permet de choisir entre "Nouveau Client" et "Client Existant".

**Pas d'action nécessaire pour ce composant.**

---

## Résumé des Fichiers à Modifier

1. **`frontend/src/components/DevisAvance.js`**
   - Ajouter sélection du type de devis (RadioGroup)
   - Ajouter fonction `calculateEstimatedTotals`
   - Modifier `handleSaveDevis` pour gérer les appels d'offres
   - Modifier `generateDevisNumber` pour le type de devis
   - Ajouter gestion de la réponse avec `appel_offres_id`

2. **`frontend/src/utils/DevisLegacyTransformer.js`**
   - Modifier `transformToLegacyFormat` pour accepter les paramètres d'appel d'offres
   - Ajouter les données nécessaires au payload (chantier_name, ville, rue, code_postal, societe_id, taux_fixe, marge_estimee)

3. **`frontend/src/components/ClientTypeModal.js`** ✅
   - Déjà existant, pas de modification nécessaire

---

## Ordre d'Implémentation Recommandé

1. **Étape 1** : ✅ `ClientTypeModal.js` existe déjà - Aucune action nécessaire
2. **Étape 2** : Ajouter la sélection du type de devis (RadioGroup) dans `DevisAvance.js`
3. **Étape 3** : Ajouter la fonction `calculateEstimatedTotals` dans `DevisAvance.js`
4. **Étape 4** : Modifier `DevisLegacyTransformer.js` pour gérer les appels d'offres
5. **Étape 5** : Modifier `handleSaveDevis` pour ne pas créer le chantier si appel d'offres
6. **Étape 6** : Modifier `generateDevisNumber` pour prendre en compte le type
7. **Étape 7** : Tester la création d'un appel d'offres
8. **Étape 8** : Vérifier le téléchargement automatique du PDF vers AWS S3

---

## Points d'Attention

- ✅ S'assurer que `devisType` est bien géré partout où `selectedChantierId === -1` est utilisé
- ✅ Les coûts estimés (`marge_estimee`, `cout_avec_taux_fixe`) doivent être calculés AVANT l'envoi au backend
- ✅ Pour un appel d'offres, `selectedChantierId` doit rester à `-1` ou `null`, ne pas créer de chantier
- ✅ Le backend attend `societe_id` (pas `societe`) pour créer l'AppelOffres
- ✅ Tous les champs requis pour l'AppelOffres doivent être envoyés dans le payload

---

## Tests à Effectuer

1. **Création d'un appel d'offres avec nouveau client**
   - Sélectionner "Devis chantier"
   - Choisir "Nouveau Client"
   - Remplir ClientInfoModal → SocieteInfoModal → ChantierForm
   - Ajouter des lignes et sauvegarder
   - Vérifier qu'un AppelOffres est créé (pas de Chantier)
   - Vérifier le téléchargement automatique du PDF

2. **Création d'un appel d'offres avec client existant**
   - Sélectionner "Devis chantier"
   - Choisir "Client Existant"
   - Sélectionner une société existante
   - Remplir ChantierForm
   - Sauvegarder et vérifier

3. **Création d'un devis normal (chantier existant)**
   - Sélectionner "Devis normal"
   - Choisir un chantier existant
   - Vérifier que le flux fonctionne comme avant

4. **Vérifier les calculs**
   - Vérifier que `marge_estimee` et `cout_avec_taux_fixe` sont bien calculés
   - Vérifier que `taux_fixe` est bien envoyé au backend

