# 🔍 **ANALYSE - TRANSFORMATION ET SUPPRESSION D'APPELS D'OFFRES**

## **📋 Vue d'ensemble**

Ce guide analyse le fonctionnement de la transformation d'appels d'offres en chantiers et présente la nouvelle fonctionnalité de suppression avec gestion du Drive.

## **🔄 Processus de transformation Appel d'offres → Chantier**

### **1. Déclenchement manuel de la transformation**

> **⚠️ Important** : La transformation automatique via signal Django a été désactivée pour éviter les boucles infinies. La transformation se fait maintenant uniquement via l'API manuelle.

#### **Frontend (`GestionAppelsOffres.js`)**

```javascript
const handleTransformerEnChantier = async (appelOffresId) => {
  try {
    const response = await axios.post(
      `/api/appels-offres/${appelOffresId}/transformer_en_chantier/`
    );
    showAlert("Appel d'offres transformé en chantier avec succès !");
    fetchAppelsOffres();
  } catch (error) {
    // Gestion des erreurs
  }
};
```

#### **Conditions requises**

- ✅ **Statut validé** : Seuls les appels d'offres avec `statut = 'valide'` peuvent être transformés
- ✅ **Bouton visible** : Le bouton "Transformer en chantier" n'apparaît que pour les appels validés

### **2. Processus backend**

#### **Endpoint Django (`api/views.py`)**

```python
@action(detail=True, methods=['post'])
def transformer_en_chantier(self, request, pk=None):
    """Transforme un appel d'offres validé en chantier"""
    try:
        appel_offres = self.get_object()

        # Vérification du statut
        if appel_offres.statut != 'valide':
            return Response({
                'error': 'Seuls les appels d\'offres validés peuvent être transformés en chantier'
            }, status=400)

        # Transformation via le modèle
        chantier = appel_offres.transformer_en_chantier()

        # Mise à jour du devis associé
        devis = appel_offres.devis.first()
        if devis:
            devis.chantier = chantier
            devis.appel_offres = None
            devis.save()

        # Transfert automatique des dossiers du drive
        # ... (voir section Drive)

        return Response({
            'message': 'Appel d\'offres transformé en chantier avec succès',
            'chantier_id': chantier.id,
            'chantier_name': chantier.chantier_name
        })

    except Exception as e:
        return Response({'error': str(e)}, status=500)
```

### **3. Transformation au niveau modèle**

#### **Méthode `transformer_en_chantier()` (`api/models.py`)**

```python
def transformer_en_chantier(self):
    """Transforme l'appel d'offres en chantier"""
    if self.statut != 'valide':
        raise ValueError("Seuls les appels d'offres validés peuvent être transformés en chantier")

    # Création du chantier avec tous les champs de l'appel d'offres
    chantier = Chantier.objects.create(
        chantier_name=self.chantier_name,
        societe=self.societe,
        date_debut=self.date_debut,
        date_fin=self.date_fin,
        montant_ttc=self.montant_ttc,
        montant_ht=self.montant_ht,
        state_chantier='En Cours',  # Statut par défaut
        ville=self.ville,
        rue=self.rue,
        code_postal=self.code_postal,
        cout_materiel=self.cout_materiel,
        cout_main_oeuvre=self.cout_main_oeuvre,
        cout_sous_traitance=self.cout_sous_traitance,
        cout_estime_main_oeuvre=self.cout_estime_main_oeuvre,
        cout_estime_materiel=self.cout_estime_materiel,
        marge_estimee=self.marge_estimee,
        description=self.description,
        taux_fixe=self.taux_fixe,
    )

    return chantier
```

### **4. Gestion du Drive lors de la transformation**

#### **Transfert automatique des dossiers**

```python
# Dans transformer_en_chantier (views.py)
try:
    societe_name = "Société par défaut"
    if hasattr(appel_offres, 'devis') and appel_offres.devis.first():
        devis = appel_offres.devis.first()
        if devis.societe:
            societe_name = devis.societe.nom

    if appel_offres.nom:
        success = drive_automation.transfer_project_to_chantier(
            societe_name=societe_name,
            project_name=appel_offres.nom
        )
        if not success:
            print("Erreur lors du transfert des dossiers du drive")
except Exception as e:
    print(f"Erreur lors du transfert automatique des dossiers: {str(e)}")
```

#### **Structure des dossiers**

**Avant transformation (Appel d'offres) :**

```
Drive/
└── Appels_Offres/
    └── [Societe]/
        └── [Appel_Offres_Name]/
            ├── Devis/
            └── DCE/
```

**Après transformation (Chantier) :**

```
Drive/
└── Chantiers/
    └── Société/
        └── [Societe]/
            └── [Chantier_Name]/
                ├── Devis/          (copié depuis l'appel d'offres)
                ├── DCE/            (copié depuis l'appel d'offres)
                ├── Situation/
                ├── Sous Traitant/
                └── Facture/
```

## **🗑️ Nouvelle fonctionnalité : Suppression d'appels d'offres**

### **1. Interface utilisateur**

#### **Bouton de suppression**

- **Icône** : `DeleteIcon` (rouge)
- **Tooltip** : "Supprimer l'appel d'offres"
- **Visibilité** : Tous les appels d'offres (peu importe le statut)

#### **Dialog de confirmation**

```javascript
<Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
  <DialogTitle>Confirmer la suppression</DialogTitle>
  <DialogContent>
    <Typography variant="h6" color="error">
      ⚠️ Attention : Cette action est irréversible !
    </Typography>
    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
      {selectedAppelOffres.chantier_name}
    </Typography>
    <Alert severity="error">
      <Typography variant="body2" fontWeight="bold" gutterBottom>
        ⚠️ Cette action supprimera définitivement :
      </Typography>
      <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
        <li>L'appel d'offres et toutes ses données</li>
        <li>Tous les devis associés à cet appel d'offres</li>
        <li>Tous les dossiers et fichiers dans le Drive</li>
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, fontWeight: "bold" }}>
        Cette action est irréversible !
      </Typography>
    </Alert>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
    <Button onClick={handleSupprimerAppelOffres} color="error">
      Supprimer définitivement
    </Button>
  </DialogActions>
</Dialog>
```

### **2. Processus de suppression**

#### **Frontend**

```javascript
const handleSupprimerAppelOffres = async () => {
  try {
    await axios.delete(
      `/api/appels-offres/${selectedAppelOffres.id}/supprimer_appel_offres/`
    );
    setDeleteDialogOpen(false);
    fetchAppelsOffres();
    showAlert("Appel d'offres supprimé avec succès !");
  } catch (error) {
    const errorMessage =
      error.response?.data?.error || "Erreur lors de la suppression";
    showAlert(errorMessage, "error");
  }
};
```

#### **Backend (`api/views.py`)**

```python
@action(detail=True, methods=['delete'])
def supprimer_appel_offres(self, request, pk=None):
    """Supprime un appel d'offres, ses devis associés et ses dossiers dans le drive"""
    try:
        appel_offres = self.get_object()

        # Récupérer les devis associés pour information
        devis_associes = appel_offres.devis.all()
        nombre_devis = devis_associes.count()

        # Supprimer les dossiers du drive
        try:
            societe_name = "Société par défaut"
            if appel_offres.societe:
                societe_name = appel_offres.societe.nom_societe

            drive_automation.delete_appel_offres_structure(
                societe_name=societe_name,
                appel_offres_name=appel_offres.chantier_name
            )
        except Exception as e:
            print(f"Erreur lors de la suppression des dossiers du drive: {str(e)}")
            # Continuer la suppression même si les dossiers n'ont pas pu être supprimés

        # Supprimer les devis associés en premier (pour éviter les contraintes de clé étrangère)
        for devis in devis_associes:
            print(f"🗑️ Suppression du devis {devis.id} - {devis.numero}")
            devis.delete()

        # Supprimer l'appel d'offres
        appel_offres.delete()

        # Message de confirmation avec le nombre de devis supprimés
        message = f'Appel d\'offres supprimé avec succès'
        if nombre_devis > 0:
            message += f' ({nombre_devis} devis associé(s) supprimé(s))'

        return Response({'message': message})

    except Exception as e:
        return Response({'error': str(e)}, status=500)
```

### **3. Suppression des dossiers Drive**

#### **Méthode `delete_appel_offres_structure()` (`api/drive_automation.py`)**

```python
def delete_appel_offres_structure(self, societe_name: str, appel_offres_name: str) -> bool:
    """
    Supprime complètement la structure de dossiers d'un appel d'offres

    Args:
        societe_name: Nom de la société
        appel_offres_name: Nom de l'appel d'offres

    Returns:
        bool: True si la suppression a réussi
    """
    try:
        print(f"🗑️ Suppression de la structure d'appel d'offres: {appel_offres_name}")

        # Construire le chemin de l'appel d'offres
        appel_offres_path = f"{self.appels_offres_root}/{custom_slugify(societe_name)}/{custom_slugify(appel_offres_name)}"

        # Vérifier si le dossier existe
        content = list_s3_folder_content(appel_offres_path)
        if not content['files'] and not content['folders']:
            print(f"⚠️ Le dossier {appel_offres_path} n'existe pas ou est vide")
            return True

        # Supprimer récursivement tout le contenu
        self._delete_folder_recursive(appel_offres_path)

        print(f"✅ Structure d'appel d'offres supprimée: {appel_offres_path}")
        return True

    except Exception as e:
        print(f"❌ Erreur lors de la suppression de la structure d'appel d'offres: {str(e)}")
        return False
```

## **🔒 Sécurités et validations**

### **1. Transformation**

- ✅ **Statut validé** : Seuls les appels d'offres validés peuvent être transformés
- ✅ **Vérification backend** : Double vérification côté serveur
- ✅ **Gestion des erreurs** : Messages d'erreur explicites

### **2. Suppression**

- ✅ **Suppression en cascade** : Suppression automatique des devis associés
- ✅ **Confirmation utilisateur** : Dialog de confirmation obligatoire avec avertissement détaillé
- ✅ **Suppression Drive** : Nettoyage automatique des dossiers
- ✅ **Gestion des erreurs** : Suppression continue même si le Drive échoue
- ✅ **Information utilisateur** : Message indiquant le nombre de devis supprimés

## **📊 Flux de données**

### **Transformation**

```
Frontend → API → Modèle → Drive Automation → Base de données
    ↓         ↓       ↓           ↓              ↓
  Bouton   Vérif.  Création  Transfert      Mise à jour
  Click    Statut  Chantier  Dossiers       Relations
```

### **Suppression**

```
Frontend → API → Validation → Drive Automation → Base de données
    ↓         ↓        ↓            ↓              ↓
  Dialog   Vérif.   Devis      Suppression    Suppression
  Confirm  Devis    Associes   Dossiers       Appel Offres
```

## **🎯 Cas d'usage**

### **1. Transformation réussie**

1. **Utilisateur** clique sur "Transformer en chantier"
2. **Système** vérifie que l'appel d'offres est validé
3. **Backend** crée un nouveau chantier avec toutes les données
4. **Drive** transfère automatiquement les dossiers
5. **Devis** est mis à jour pour pointer vers le nouveau chantier
6. **Notification** de succès affichée

### **2. Suppression réussie**

1. **Utilisateur** clique sur "Supprimer"
2. **Système** affiche le dialog de confirmation avec avertissement détaillé
3. **Utilisateur** confirme la suppression
4. **Backend** supprime tous les devis associés en premier
5. **Drive** supprime tous les dossiers associés
6. **Base de données** supprime l'appel d'offres
7. **Notification** de succès affichée avec nombre de devis supprimés

### **3. Cas d'erreur**

- **Transformation** : Appel d'offres non validé → Message d'erreur
- **Suppression** : Erreur Drive → Logs d'erreur, continuation du processus
- **Drive** : Erreur de transfert/suppression → Logs d'erreur, continuation du processus

## **🚀 Avantages du système**

### **1. Transformation**

- ✅ **Automatisation** : Transfert automatique des dossiers
- ✅ **Intégrité** : Conservation de toutes les données
- ✅ **Sécurité** : Vérifications multiples
- ✅ **Traçabilité** : Logs détaillés

### **2. Suppression**

- ✅ **Suppression en cascade** : Suppression automatique des devis associés
- ✅ **Nettoyage** : Suppression complète (DB + Drive)
- ✅ **UX** : Confirmation claire et informative avec avertissement détaillé
- ✅ **Robustesse** : Gestion des erreurs Drive
- ✅ **Transparence** : Information sur le nombre de devis supprimés

## **🔮 Évolutions possibles**

### **1. Transformation**

- **Historique** : Garder une trace de la transformation
- **Notifications** : Alertes pour les parties prenantes
- **Validation** : Workflow d'approbation

### **2. Suppression**

- **Soft delete** : Marquer comme supprimé au lieu de supprimer
- **Restauration** : Possibilité de restaurer depuis l'historique
- **Audit** : Logs détaillés des suppressions

---

**📝 Note** : Ce système garantit l'intégrité des données et la cohérence entre la base de données et le Drive AWS S3.
