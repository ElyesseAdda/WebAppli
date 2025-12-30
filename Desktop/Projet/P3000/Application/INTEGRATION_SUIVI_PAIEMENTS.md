# Guide d'Intégration - Suivi des Paiements Sous-Traitants

## ✅ Étapes Complétées

1. ✅ **Modèles Django créés** : `SuiviPaiementSousTraitantMensuel` et `FactureSuiviSousTraitant`
2. ✅ **Serializers créés** : `SuiviPaiementSousTraitantMensuelSerializer` et `FactureSuiviSousTraitantSerializer`
3. ✅ **ViewSets créés** : API REST complète avec actions personnalisées
4. ✅ **Routes configurées** : Endpoints disponibles dans `api/urls.py`
5. ✅ **Migration appliquée** : Base de données mise à jour
6. ✅ **Intégration backend** : `_get_tableau_sous_traitant_data` mis à jour

---

## 🔗 Endpoints API Disponibles

### 1. Suivi des Paiements Mensuels

**Base URL** : `/api/suivi-paiements-sous-traitant-mensuel/`

#### Récupérer tous les suivis
```javascript
GET /api/suivi-paiements-sous-traitant-mensuel/

// Avec filtres
GET /api/suivi-paiements-sous-traitant-mensuel/?chantier=5&mois=12&annee=2024
```

#### Créer ou mettre à jour un suivi (recommandé)
```javascript
POST /api/suivi-paiements-sous-traitant-mensuel/update_or_create_suivi/

Body: {
  "mois": 12,
  "annee": 2024,
  "sous_traitant": "Entreprise ABC",
  "chantier_id": 5,  // null ou omis pour agents journaliers regroupés
  "montant_paye_ht": 5000.00,
  "date_paiement_reel": "2024-12-15",
  "date_envoi_facture": "2024-11-01",
  "delai_paiement": 45
}

Response: {
  "id": 1,
  "mois": 12,
  "annee": 2024,
  "sous_traitant": "Entreprise ABC",
  "chantier": 5,
  "chantier_name": "Chantier Test",
  "montant_paye_ht": "5000.00",
  "date_paiement_reel": "2024-12-15",
  "date_envoi_facture": "2024-11-01",
  "date_paiement_prevue": "2024-12-16",  // Calculé automatiquement
  "delai_paiement": 45,
  "factures_suivi": [],
  "mois_annee": "12/24",
  "ecart_paiement_jours": -1,  // Calculé automatiquement
  "created_at": "2024-12-01T10:00:00Z",
  "updated_at": "2024-12-01T10:00:00Z"
}
```

#### Créer un suivi (standard)
```javascript
POST /api/suivi-paiements-sous-traitant-mensuel/

Body: {
  "mois": 12,
  "annee": 2024,
  "sous_traitant": "Entreprise ABC",
  "chantier": 5,
  "montant_paye_ht": 5000.00
}
```

#### Mettre à jour un suivi
```javascript
PUT /api/suivi-paiements-sous-traitant-mensuel/{id}/
PATCH /api/suivi-paiements-sous-traitant-mensuel/{id}/

Body: {
  "date_paiement_reel": "2024-12-20",
  "montant_paye_ht": 5500.00
}
```

#### Supprimer un suivi
```javascript
DELETE /api/suivi-paiements-sous-traitant-mensuel/{id}/
```

---

### 2. Factures de Suivi

**Base URL** : `/api/factures-suivi-sous-traitant/`

#### Récupérer les factures d'un suivi
```javascript
GET /api/factures-suivi-sous-traitant/?suivi_paiement=1
```

#### Créer une facture
```javascript
POST /api/factures-suivi-sous-traitant/

Body: {
  "suivi_paiement": 1,
  "numero_facture": "FACT-2024-001",
  "montant_facture_ht": 2500.00,
  "payee": false,
  "date_paiement_facture": null
}
```

#### Mettre à jour une facture (marquer comme payée)
```javascript
PATCH /api/factures-suivi-sous-traitant/{id}/

Body: {
  "payee": true,
  "date_paiement_facture": "2024-12-15"
}
```

#### Supprimer une facture
```javascript
DELETE /api/factures-suivi-sous-traitant/{id}/
```

---

## 💻 Intégration dans TableauSousTraitant.js

### Étape 1 : Modifier la fonction `savePaiement`

Remplacer la fonction actuelle par celle-ci qui sauvegarde dans le nouveau modèle :

```javascript
const savePaiement = useCallback(async (mois, sous_traitant, chantierId, montantPaye, factures = null, datePaiement = null, dateEnvoi = null) => {
  // Ne pas sauvegarder si chantierId === 0 (lignes AgencyExpenseMonth gérées par un autre endpoint)
  if (chantierId === 0) {
    return;
  }

  // Annuler le timer précédent
  if (saveTimerRef.current) {
    clearTimeout(saveTimerRef.current);
  }

  // Définir un nouveau timer pour sauvegarder après 1 seconde d'inactivité
  saveTimerRef.current = setTimeout(async () => {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const [moisNum, annee2digits] = mois.split("/").map(Number);
      // Convertir l'année à 2 chiffres en année complète (25 -> 2025, 24 -> 2024, etc.)
      const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
      
      // Préparer les données pour le suivi
      const payload = {
        mois: moisNum,
        annee: anneeComplete,
        sous_traitant: sous_traitant,
        chantier_id: chantierId || null,
        montant_paye_ht: montantPaye || 0,
      };

      // Ajouter les dates si fournies
      if (datePaiement !== undefined && datePaiement !== null) {
        payload.date_paiement_reel = datePaiement;
      }
      if (dateEnvoi !== undefined && dateEnvoi !== null) {
        payload.date_envoi_facture = dateEnvoi;
      }

      // Utiliser l'endpoint update_or_create_suivi pour créer ou mettre à jour
      const response = await axios.post(
        `/api/suivi-paiements-sous-traitant-mensuel/update_or_create_suivi/`,
        payload
      );

      setSaveSuccess(true);
      
      // Recharger les données après sauvegarde
      await fetchData();
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      setError("Erreur lors de la sauvegarde.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, 1000);
}, [fetchData]);
```

### Étape 2 : Modifier `handleSaveDateEnvoi`

```javascript
const handleSaveDateEnvoi = async (dateEnvoi) => {
  if (currentEnvoi) {
    const { mois, sous_traitant, chantierId } = currentEnvoi;
    const [moisNum, annee2digits] = mois.split("/").map(Number);
    const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
    
    try {
      setSaving(true);
      
      // Sauvegarder directement avec le nouveau système
      await axios.post('/api/suivi-paiements-sous-traitant-mensuel/update_or_create_suivi/', {
        mois: moisNum,
        annee: anneeComplete,
        sous_traitant: sous_traitant,
        chantier_id: chantierId || null,
        date_envoi_facture: dateEnvoi,
        delai_paiement: 45, // Ou récupérer depuis les données
      });
      
      await fetchData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      setError("Erreur lors de la sauvegarde de la date d'envoi");
    } finally {
      setSaving(false);
    }
  }
  setDateEnvoiModalOpen(false);
  setCurrentEnvoi(null);
};
```

### Étape 3 : Modifier `handleSaveFactureModal`

```javascript
const handleSaveFactureModal = async () => {
  if (!currentFacture || !factureModalData.numero.trim()) {
    return;
  }

  const { mois, sous_traitant, chantierId, factureIndex } = currentFacture;
  
  // Vérifier si c'est une ligne AgencyExpenseMonth
  const currentData = data.find(d => 
    d.mois === mois && 
    d.sous_traitant === sous_traitant && 
    d.chantier_id === chantierId
  );
  
  // Si c'est une ligne AgencyExpenseMonth, utiliser l'ancienne méthode
  if (currentData?.source_type === 'agency_expense' && currentData?.agency_expense_id) {
    // ... garder l'ancien code pour AgencyExpenseMonth
    return;
  }

  try {
    setSaving(true);
    
    const [moisNum, annee2digits] = mois.split("/").map(Number);
    const anneeComplete = annee2digits < 50 ? 2000 + annee2digits : 1900 + annee2digits;
    
    // 1. Créer ou récupérer le suivi de paiement
    const suiviResponse = await axios.post('/api/suivi-paiements-sous-traitant-mensuel/update_or_create_suivi/', {
      mois: moisNum,
      annee: anneeComplete,
      sous_traitant: sous_traitant,
      chantier_id: chantierId || null,
    });
    
    const suiviId = suiviResponse.data.id;
    
    // 2. Créer ou mettre à jour la facture
    const factureData = {
      suivi_paiement: suiviId,
      numero_facture: factureModalData.numero.trim(),
      montant_facture_ht: parseFloat(factureModalData.montant) || 0,
    };
    
    if (factureIndex !== null && currentData?.suivi_paiement_id) {
      // Mode édition : récupérer l'ID de la facture depuis le frontend
      const key = chantierId === 0 || chantierId === null 
        ? `${mois}_${sous_traitant}_AGENT_JOURNALIER`
        : `${mois}_${sous_traitant}_${chantierId}`;
      const factures = editedFactures[key] || [];
      const factureToEdit = factures[factureIndex];
      
      if (factureToEdit && factureToEdit.id && factureToEdit.id.toString().startsWith('suivi_')) {
        // C'est une facture de suivi, on peut la mettre à jour
        const factureId = factureToEdit.id.replace('suivi_', '');
        await axios.patch(`/api/factures-suivi-sous-traitant/${factureId}/`, factureData);
      } else {
        // Nouvelle facture
        await axios.post('/api/factures-suivi-sous-traitant/', factureData);
      }
    } else {
      // Mode ajout
      await axios.post('/api/factures-suivi-sous-traitant/', factureData);
    }
    
    // Recharger les données
    await fetchData();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la facture:", error);
    setError("Erreur lors de la sauvegarde de la facture");
  } finally {
    setSaving(false);
  }
  
  handleCloseFactureModal();
};
```

### Étape 4 : Modifier `handleRemoveFacture`

```javascript
const handleRemoveFacture = async (mois, sous_traitant, chantierId, factureIndex) => {
  // Vérifier si c'est une ligne AgencyExpenseMonth
  const currentData = data.find(d => 
    d.mois === mois && 
    d.sous_traitant === sous_traitant && 
    d.chantier_id === chantierId
  );
  
  // Si c'est une ligne AgencyExpenseMonth, utiliser l'ancienne méthode
  if (currentData?.source_type === 'agency_expense' && currentData?.agency_expense_id) {
    // ... garder l'ancien code
    return;
  }

  const key = chantierId === 0 || chantierId === null 
    ? `${mois}_${sous_traitant}_AGENT_JOURNALIER`
    : `${mois}_${sous_traitant}_${chantierId}`;
  const factures = editedFactures[key] || [];
  const factureToDelete = factures[factureIndex];
  
  if (!factureToDelete) return;
  
  // Vérifier si c'est une facture de suivi
  if (factureToDelete.id && factureToDelete.id.toString().startsWith('suivi_')) {
    try {
      setSaving(true);
      const factureId = factureToDelete.id.replace('suivi_', '');
      await axios.delete(`/api/factures-suivi-sous-traitant/${factureId}/`);
      
      await fetchData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Erreur lors de la suppression de la facture:", error);
      setError("Erreur lors de la suppression de la facture");
    } finally {
      setSaving(false);
    }
  }
};
```

### Étape 5 : Modifier `handleSaveFacturePaiement`

```javascript
const handleSaveFacturePaiement = async (datePaiementFacture) => {
  if (!currentFacturePaiement) {
    return;
  }

  const { mois, sous_traitant, chantierId, factureIndex } = currentFacturePaiement;
  const key = chantierId === 0 || chantierId === null 
    ? `${mois}_${sous_traitant}_AGENT_JOURNALIER`
    : `${mois}_${sous_traitant}_${chantierId}`;
  const currentFactures = editedFactures[key] || [];
  const facture = currentFactures[factureIndex];
  
  if (!facture) {
    return;
  }

  // Vérifier si c'est une facture de suivi
  if (facture.id && facture.id.toString().startsWith('suivi_')) {
    try {
      setSaving(true);
      const factureId = facture.id.replace('suivi_', '');
      
      // Marquer la facture comme payée
      await axios.patch(`/api/factures-suivi-sous-traitant/${factureId}/`, {
        payee: true,
        date_paiement_facture: datePaiementFacture
      });
      
      // Recharger les données
      await fetchData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Erreur:", error);
      setError("Erreur lors de la mise à jour de la facture");
    } finally {
      setSaving(false);
    }
  }
  
  // Fermer le modal
  setDatePaiementFactureModalOpen(false);
  setCurrentFacturePaiement(null);
};
```

---

## 🔍 Données Retournées par l'API

L'endpoint `/api/tableau-sous-traitant-global/` retourne maintenant un champ supplémentaire :

```javascript
{
  "mois": "12/24",
  "sous_traitant": "Entreprise ABC",
  "chantier_id": 5,
  "chantier_name": "Chantier Test",
  "a_payer": 10000.00,
  "paye": 5000.00,
  "ecart": 5000.00,
  "factures": [
    {
      "id": "suivi_1",  // Préfixe "suivi_" pour les factures de suivi
      "numero_facture": "FACT-001",
      "montant_facture": 2500.00,
      "payee": true,
      "date_paiement_facture": "2024-12-15"
    }
  ],
  "date_paiement": "2024-12-15",
  "date_envoi": "2024-11-01",
  "date_paiement_prevue": "2024-12-16",
  "ecart_paiement_reel": -1,
  "delai_paiement": 45,
  "source_type": "facture_sous_traitant",
  "agency_expense_id": null,
  "suivi_paiement_id": 1  // ✨ NOUVEAU : ID du suivi pour les mises à jour
}
```

---

## 🎯 Avantages de l'Implémentation

1. **Séparation des données** : Les données de suivi sont stockées indépendamment des sources métier
2. **Priorité claire** : Les données du suivi ont la priorité sur les autres sources
3. **Calculs automatiques** : `date_paiement_prevue` et `ecart_paiement_jours` calculés automatiquement
4. **Flexibilité** : Fonctionne avec toutes les sources (FactureSousTraitant, LaborCost, AgencyExpenseMonth)
5. **Traçabilité** : Champs `created_at` et `updated_at` pour suivre les modifications
6. **Performance** : Index sur les colonnes fréquemment filtrées

---

## 🧪 Tests Recommandés

1. **Créer un suivi** pour un mois/sous-traitant/chantier
2. **Modifier le montant payé** et vérifier le calcul de l'écart
3. **Ajouter une date d'envoi** et vérifier le calcul de la date prévue
4. **Ajouter des factures** au suivi
5. **Marquer une facture comme payée** avec une date
6. **Vérifier que les données du suivi** ont la priorité sur les autres sources
7. **Tester avec des agents journaliers** (chantier_id = null)
8. **Tester avec AgencyExpenseMonth** pour vérifier la cohabitation

---

## 📞 Support

Si vous rencontrez des problèmes lors de l'intégration, vérifiez :
- Que la migration a bien été appliquée
- Que les endpoints API répondent correctement
- Que les données sont bien fusionnées dans la réponse de `/api/tableau-sous-traitant-global/`
- Les logs du backend Django pour les erreurs potentielles

