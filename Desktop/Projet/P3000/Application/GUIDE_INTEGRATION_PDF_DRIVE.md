# 🚀 **GUIDE D'INTÉGRATION PDF DANS LE DRIVE AWS S3**

## **📋 Vue d'ensemble du processus**

Ce guide détaille **TOUTES** les étapes nécessaires pour intégrer un nouveau type de PDF dans votre système Drive automatique. Suivez chaque section dans l'ordre pour garantir un fonctionnement parfait.

---

## **🔧 ÉTAPE 1 : ANALYSE ET PLANIFICATION**

### **1.1 Identifier le type de document**

- [ ] **Nom du document** : (ex: "Facture", "Devis", "Rapport")
- [ ] **Type de données** : Quelles informations sont nécessaires ? (ID, nom, date, etc.)
- [ ] **Fréquence** : Génération unique ou répétitive ?
- [ ] **Template existant** : Y a-t-il déjà un template HTML ?

### **1.2 Définir la structure des dossiers S3**

- [ ] **Chemin racine** : `Agents/Document_Generaux/[Nom_Document]/`
- [ ] **Sous-dossiers** : Année, mois, ou autre critère ?
- [ ] **Convention de nommage** : Format du nom de fichier

### **1.3 Identifier le composant React**

- [ ] **Page/Composant** : Où se trouve le bouton de génération ?
- [ ] **Fonction existante** : Y a-t-il déjà une fonction de génération ?

---

## **📁 ÉTAPE 2 : CONFIGURATION BACKEND (Django)**

### **2.1 Modifier `api/pdf_manager.py`**

#### **A. Ajouter le nouveau type dans `document_type_folders`**

```python
self.document_type_folders = {
    'planning_hebdo': 'PlanningHebdo',
    'rapport_agents': 'Rapport_mensuel',
    'devis_travaux': 'Devis_Travaux',
    'devis_marche': 'Devis_Marche',
    'NOUVEAU_TYPE': 'Nouveau_Dossier',  # ← AJOUTER ICI
}
```

#### **B. Ajouter la logique de nommage dans `generate_pdf_filename`**

```python
elif document_type == 'NOUVEAU_TYPE':
    # Extraire les paramètres nécessaires
    param1 = kwargs.get('param1', 'default')
    param2 = kwargs.get('param2', 'default')

    # Créer le nom de fichier
    filename = f"NomDocument_{param1}_{param2}.pdf"
    return filename
```

#### **C. Ajouter la logique de chemin dans `get_s3_folder_path`**

```python
elif document_type == 'NOUVEAU_TYPE':
    societe_name = kwargs.get('societe_name', 'Société par défaut')
    year = kwargs.get('year', '2025')

    # Construire le chemin S3
    folder_path = f"Agents/Document_Generaux/Nouveau_Dossier/{year}/"
    return folder_path
```

### **2.2 Créer la vue Django dans `api/pdf_views.py`**

#### **A. Vue de génération principale**

```python
@api_view(['GET'])
@permission_classes([AllowAny])
def generate_nouveau_pdf_drive(request):
    """
    Vue pour générer le nouveau type de PDF et le stocker dans le Drive
    """
    try:
        # Récupérer les paramètres
        param1 = request.GET.get('param1')
        param2 = request.GET.get('param2')
        societe_name = request.GET.get('societe_name', 'Société par défaut')

        # Validation des paramètres
        if not param1 or not param2:
            return JsonResponse({
                'success': False,
                'error': 'Paramètres manquants'
            }, status=400)

        # Générer et stocker le PDF
        success, message, s3_file_path, conflict_detected = pdf_manager.generateAndStore_pdf(
            document_type='NOUVEAU_TYPE',
            societe_name=societe_name,
            param1=param1,
            param2=param2
        )

        if conflict_detected:
            return JsonResponse({
                'success': False,
                'error': 'Conflit de fichier détecté - confirmation requise',
                'conflict_detected': True,
                'requires_confirmation': True
            }, status=409)

        if success:
            return JsonResponse({
                'success': True,
                'message': f'PDF généré et stocké avec succès dans le Drive',
                'file_path': s3_file_path,
                'file_name': s3_file_path.split('/')[-1],
                'drive_url': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid",
                'redirect_to': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid",
                'document_type': 'NOUVEAU_TYPE',
                'societe_name': societe_name,
                'download_url': f"/api/download-pdf-from-s3?path={s3_file_path}"
            })
        else:
            return JsonResponse({
                'success': False,
                'error': message
            }, status=500)

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Erreur inattendue: {str(e)}'
        }, status=500)
```

#### **B. Vue de remplacement après confirmation**

```python
@api_view(['POST'])
@permission_classes([AllowAny])
def replace_nouveau_pdf_after_confirmation(request):
    """
    Vue pour remplacer le nouveau type de PDF après confirmation
    """
    try:
        data = request.data

        document_type = data.get('document_type')
        preview_url = data.get('preview_url')
        societe_name = data.get('societe_name')
        param1 = data.get('param1')
        param2 = data.get('param2')

        # Validation
        if not preview_url:
            return JsonResponse({'error': 'preview_url est requis'}, status=400)

        # Appeler la méthode de remplacement
        success, message, s3_file_path = pdf_manager.replace_file_with_confirmation(
            document_type=document_type,
            preview_url=preview_url,
            societe_name=societe_name,
            param1=param1,
            param2=param2
        )

        if success:
            return JsonResponse({
                'success': True,
                'message': 'Fichier remplacé avec succès',
                'file_path': s3_file_path,
                'drive_url': f"/drive?path={s3_file_path}&sidebar=closed&focus=file&view=grid"
            })
        else:
            return JsonResponse({'error': message}, status=500)

    except Exception as e:
        return JsonResponse({'error': f'Erreur: {str(e)}'}, status=500)
```

### **2.3 Ajouter les URLs dans `api/urls.py`**

```python
# URLs pour le nouveau type de PDF
path('generate-nouveau-pdf-drive/', generate_nouveau_pdf_drive, name='generate_nouveau_pdf_drive'),
path('replace-nouveau-pdf-after-confirmation/', replace_nouveau_pdf_after_confirmation, name='replace_nouveau_pdf_after_confirmation'),
```

### **2.4 Modifier la gestion des conflits dans `api/pdf_views.py`**

#### **A. Dans `get_existing_file_name`**

```python
elif document_type == 'NOUVEAU_TYPE' and param1:
    # Logique spécifique pour le nouveau type
    param2 = request.GET.get('param2', 'default')
    target_pattern = f"NomDocument_{param1}_{param2}.pdf"

    for file in files:
        if file == target_pattern:
            target_file = file
            break
```

---

## **⚛️ ÉTAPE 3 : CONFIGURATION FRONTEND (React)**

### **3.1 Modifier `frontend/src/components/pdf_drive_functions.js`**

#### **A. Ajouter la fonction de génération**

```javascript
/**
 * Génère le nouveau type de PDF et le stocke dans le Drive
 */
export const generateNouveauPDFDrive = async (
  param1,
  param2,
  societeName = "Société par défaut"
) => {
  // Afficher l'indicateur de chargement
  showLoadingNotification(
    `Génération du nouveau PDF ${param1}/${param2} vers le Drive...`
  );

  try {
    const response = await axios.get(
      `${API_BASE_URL}/generate-nouveau-pdf-drive/`,
      {
        params: { param1, param2, societe_name: societeName },
        withCredentials: true,
      }
    );

    if (response.data.success) {
      showSuccessNotification(response.data.message, response.data.drive_url);
      return response.data;
    } else {
      throw new Error(response.data.error || "Erreur inconnue");
    }
  } catch (error) {
    // Gestion des conflits
    if (
      error.response &&
      error.response.status === 500 &&
      error.response.data &&
      error.response.data.error &&
      error.response.data.error.includes("Conflit de fichier détecté")
    ) {
      // Émettre l'événement de conflit
      const conflictId = `nouveau_${param1}_${param2}_${Date.now()}`;
      const conflictEvent = new CustomEvent("openConflictDialog", {
        detail: {
          conflictId: conflictId,
          fileName: `NomDocument_${param1}_${param2}.pdf`,
          existingFilePath: `Agents/Document_Generaux/Nouveau_Dossier/`,
          conflictMessage:
            "Un fichier avec le même nom existe déjà dans le Drive.",
          documentType: "NOUVEAU_TYPE",
          societeName: societeName,
          param1: param1,
          param2: param2,
          previewUrl: `${window.location.origin}/api/preview-nouveau-pdf/?param1=${param1}&param2=${param2}`,
        },
      });

      window.dispatchEvent(conflictEvent);
      hideLoadingNotification();
      return { conflict_detected: true, error: "Conflit de fichier détecté" };
    }

    // Autres erreurs
    showErrorNotification(`Erreur: ${error.message}`);
    throw error;
  }
};
```

### **3.2 Modifier le composant React concerné**

#### **A. Importer la fonction**

```javascript
import { generateNouveauPDFDrive } from "./pdf_drive_functions";
```

#### **B. Modifier le gestionnaire d'événement**

```javascript
const handleGeneratePDF = async () => {
  try {
    // Récupérer les valeurs nécessaires
    const param1 = selectedParam1; // À adapter selon votre composant
    const param2 = selectedParam2; // À adapter selon votre composant

    // Appeler la fonction Drive
    await generateNouveauPDFDrive(param1, param2);
  } catch (error) {
    console.error("Erreur lors de la génération:", error);
  }
};
```

### **3.3 Modifier `frontend/src/components/GlobalConflictModal.js`**

#### **A. Ajouter la gestion du nouveau type**

```javascript
// Dans la fonction processConflictEvent, ajouter :
if (event.detail.documentType === "NOUVEAU_TYPE") {
  const params = new URLSearchParams({
    folder_path: event.detail.existingFilePath,
    document_type: event.detail.documentType,
    param1: event.detail.param1,
    param2: event.detail.param2,
  });

  // Appel API pour récupérer le nom du fichier
  const url = `/api/get-existing-file-name/?${params.toString()}`;
  // ... reste de la logique
}
```

---

## **🔗 ÉTAPE 4 : GESTION DES CONFLITS**

### **4.1 Vérifier la détection automatique**

- [ ] Le système détecte-t-il les conflits ?
- [ ] Le modal s'ouvre-t-il correctement ?
- [ ] Les informations du fichier existant sont-elles correctes ?

### **4.2 Tester le remplacement**

- [ ] Le bouton "Remplacer" fonctionne-t-il ?
- [ ] L'ancien fichier est-il déplacé vers `Historique/` ?
- [ ] Le nouveau fichier est-il correctement uploadé ?

---

## **📂 ÉTAPE 5 : CRÉATION AUTOMATIQUE DES DOSSIERS**

### **5.1 Vérifier `api/drive_automation.py`**

- [ ] Le nouveau type est-il inclus dans les structures ?
- [ ] Les dossiers sont-ils créés automatiquement ?

### **5.2 Tester la création des dossiers**

- [ ] Les dossiers S3 sont-ils créés ?
- [ ] La structure est-elle correcte ?

---

## **🧪 ÉTAPE 6 : TESTS ET VALIDATION**

### **6.1 Tests de base**

- [ ] Génération d'un PDF sans conflit
- [ ] Génération d'un PDF avec conflit
- [ ] Résolution du conflit
- [ ] Navigation vers le Drive

### **6.2 Tests de robustesse**

- [ ] Gestion des erreurs
- [ ] Validation des paramètres
- [ ] Performance (temps de génération)

### **6.3 Tests d'intégration**

- [ ] Fonctionne avec le système de notifications
- [ ] Fonctionne avec la gestion des fenêtres
- [ ] Fonctionne avec la navigation Drive

---

## **📝 ÉTAPE 7 : DOCUMENTATION ET MAINTENANCE**

### **7.1 Mettre à jour ce guide**

- [ ] Ajouter le nouveau type dans la liste
- [ ] Documenter les spécificités

### **7.2 Vérifier la cohérence**

- [ ] Noms de variables cohérents
- [ ] Structure des dossiers logique
- [ ] Gestion d'erreurs uniforme

---

## **🚨 POINTS D'ATTENTION CRITIQUES**

### **⚠️ Erreurs communes à éviter**

1. **Oublier d'ajouter le type dans `document_type_folders`**
2. **Ne pas gérer les conflits dans le frontend**
3. **Oublier d'ajouter les URLs Django**
4. **Ne pas valider les paramètres côté serveur**
5. **Oublier d'importer la fonction dans le composant React**

### **🔍 Vérifications obligatoires**

- [ ] Tous les fichiers sont modifiés
- [ ] Les imports sont corrects
- [ ] Les noms de variables sont cohérents
- [ ] La gestion d'erreurs est complète
- [ ] Les tests passent

---

## **📚 EXEMPLES COMPLETS**

### **Exemple : Intégration d'une "Facture"**

#### **Backend - `pdf_manager.py`**

```python
# Dans document_type_folders
'facture': 'Factures',

# Dans generate_pdf_filename
elif document_type == 'facture':
    chantier_id = kwargs.get('chantier_id', 'XX')
    date = kwargs.get('date', 'XXXX-XX-XX')
    filename = f"Facture_{chantier_id}_{date}.pdf"
    return filename

# Dans get_s3_folder_path
elif document_type == 'facture':
    societe_name = kwargs.get('societe_name', 'Société par défaut')
    year = kwargs.get('year', '2025')
    folder_path = f"Agents/Document_Generaux/Factures/{year}/"
    return folder_path
```

#### **Frontend - `pdf_drive_functions.js`**

```javascript
export const generateFacturePDFDrive = async (
  chantierId,
  date,
  societeName = "Société par défaut"
) => {
  showLoadingNotification(
    `Génération de la facture ${chantierId} vers le Drive...`
  );

  try {
    const response = await axios.get(
      `${API_BASE_URL}/generate-facture-pdf-drive/`,
      {
        params: { chantier_id: chantierId, date, societe_name: societeName },
        withCredentials: true,
      }
    );

    if (response.data.success) {
      showSuccessNotification(response.data.message, response.data.drive_url);
      return response.data;
    } else {
      throw new Error(response.data.error || "Erreur inconnue");
    }
  } catch (error) {
    // Gestion des conflits...
  }
};
```

---

## **🎯 RÉSUMÉ DES ÉTAPES**

1. **📋 Planification** : Analyser le document et définir la structure
2. **🔧 Backend** : Modifier `pdf_manager.py`, créer les vues, ajouter les URLs
3. **⚛️ Frontend** : Ajouter la fonction, modifier le composant, gérer les conflits
4. **🔗 Conflits** : Tester la détection et la résolution
5. **📂 Dossiers** : Vérifier la création automatique
6. **🧪 Tests** : Valider le fonctionnement complet
7. **📝 Documentation** : Mettre à jour ce guide

---

## **💡 CONSEILS POUR UNE INTÉGRATION RAPIDE**

1. **Copier-coller** : Utilisez les exemples existants comme base
2. **Testez progressivement** : Vérifiez chaque étape avant de passer à la suivante
3. **Console ouverte** : Gardez les outils de développement ouverts pour débugger
4. **Backup** : Sauvegardez vos fichiers avant de commencer
5. **Commits fréquents** : Faites des commits Git réguliers

---

**🎉 Avec ce guide, vous pouvez intégrer n'importe quel type de PDF en moins d'1 heure !**
