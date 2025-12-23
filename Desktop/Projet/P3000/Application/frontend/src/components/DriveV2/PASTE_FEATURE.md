# Fonctionnalité Copier-Coller (Paste) dans le Drive V2

## Vue d'ensemble

Le Drive V2 prend maintenant en charge le **copier-coller de fichiers** directement depuis le presse-papier (clipboard). Cette fonctionnalité permet d'uploader des fichiers de manière ultra-rapide sans avoir à ouvrir le dialogue de sélection de fichiers.

## Comment ça marche

### Pour l'utilisateur

1. **Copier des fichiers** dans l'explorateur de fichiers Windows/Mac/Linux (Ctrl+C ou Cmd+C)
2. **Se rendre dans le Drive V2** dans le navigateur
3. **Coller les fichiers** avec le raccourci clavier :
   - **Windows/Linux** : `Ctrl + V`
   - **Mac** : `Cmd + V`
4. Le dialogue d'upload s'ouvre automatiquement avec les fichiers collés
5. Cliquer sur "Upload" pour confirmer

### Indicateurs visuels

- **Icône de collage** dans le header : indique que la fonctionnalité est disponible
- **Animation de succès** : overlay vert au centre de l'écran confirmant que les fichiers ont été collés
- **Notification** : snackbar en bas à droite avec le nombre de fichiers collés

## Architecture technique

### Hook personnalisé : `usePaste`

**Fichier** : `frontend/src/components/DriveV2/hooks/usePaste.js`

Le hook `usePaste` encapsule toute la logique de gestion du copier-coller :

```javascript
const { isPasteSupported } = usePaste(
  (files) => {
    // Callback appelé quand des fichiers sont collés
    setDroppedFiles(files);
    setUploadDialogOpen(true);
  },
  enabled // Active/désactive l'écoute
);
```

#### Fonctionnalités du hook

1. **Détection du paste** : Écoute l'événement `paste` sur le document
2. **Filtrage intelligent** : Ignore le paste dans les champs de texte (input, textarea)
3. **Extraction des fichiers** : Récupère les fichiers depuis `event.clipboardData.items`
4. **Compatibilité** : Détecte si le navigateur supporte l'API Clipboard
5. **Nettoyage automatique** : Retire les listeners au démontage

### Intégration dans DriveV2

**Fichier** : `frontend/src/components/DriveV2/DriveV2.js`

```javascript
// Hook pour gérer le copier-coller de fichiers
const { isPasteSupported } = usePaste(
  (files) => {
    setDroppedFiles(files);
    setUploadDialogOpen(true);
    setPasteIndicatorVisible(true);
    
    setSnackbar({
      open: true,
      message: `${files.length} fichier(s) collé(s) depuis le presse-papier`,
      severity: 'info',
    });
  },
  !uploadDialogOpen // Désactiver quand le dialog est ouvert
);
```

## Cas d'usage

### 1. Upload rapide de fichiers

```
Utilisateur : Sélectionne 5 fichiers dans Windows Explorer
Utilisateur : Ctrl+C pour copier
Utilisateur : Va dans le Drive V2
Utilisateur : Ctrl+V pour coller
→ Les 5 fichiers sont prêts à être uploadés
```

### 2. Upload depuis un autre site web

```
Utilisateur : Télécharge un fichier depuis un site web
Utilisateur : Ctrl+C sur le fichier téléchargé
Utilisateur : Va dans le Drive V2
Utilisateur : Ctrl+V pour coller
→ Le fichier est prêt à être uploadé
```

### 3. Upload de captures d'écran

```
Utilisateur : Fait une capture d'écran (Ctrl+Shift+S ou outil de capture)
Utilisateur : Copie l'image dans le presse-papier
Utilisateur : Va dans le Drive V2
Utilisateur : Ctrl+V pour coller
→ L'image est prête à être uploadée
```

## Avantages

### Pour l'utilisateur

✅ **Rapidité** : Pas besoin d'ouvrir le dialogue de sélection de fichiers  
✅ **Intuitivité** : Raccourci clavier universel (Ctrl+V)  
✅ **Productivité** : Upload de fichiers en quelques secondes  
✅ **Polyvalence** : Fonctionne avec tout type de fichiers  

### Pour le développeur

✅ **Réutilisation** : Utilise le système d'upload existant (DriveUploader)  
✅ **Maintenabilité** : Code isolé dans un hook dédié  
✅ **Extensibilité** : Facile d'ajouter d'autres sources (drag & drop amélioré, etc.)  
✅ **Compatibilité** : Détection automatique du support navigateur  

## Compatibilité navigateurs

| Navigateur | Version minimale | Support |
|-----------|------------------|---------|
| Chrome | 76+ | ✅ Complet |
| Firefox | 87+ | ✅ Complet |
| Edge | 79+ | ✅ Complet |
| Safari | 13.1+ | ✅ Complet |
| Opera | 63+ | ✅ Complet |

**Note** : Si le navigateur ne supporte pas l'API Clipboard, l'icône de collage n'est pas affichée et la fonctionnalité est désactivée automatiquement.

## Sécurité

### Filtrage des champs de texte

Le hook ignore automatiquement le paste dans :
- Les champs `<input>`
- Les zones `<textarea>`
- Les éléments avec `contentEditable="true"`

Cela évite d'intercepter le paste lorsque l'utilisateur veut coller du texte dans un champ de formulaire.

### Validation des fichiers

Les fichiers collés passent par le même système de validation que les fichiers uploadés normalement :
- Vérification du type de fichier
- Vérification de la taille
- Détection de conflits
- Normalisation des noms (espaces → underscores)

## Tests recommandés

### Test 1 : Fichier simple
1. Copier un fichier PDF dans l'explorateur
2. Aller dans le Drive
3. Ctrl+V
4. ✓ Le dialogue d'upload s'ouvre avec le PDF

### Test 2 : Plusieurs fichiers
1. Copier 5 images dans l'explorateur
2. Aller dans le Drive
3. Ctrl+V
4. ✓ Le dialogue d'upload s'ouvre avec les 5 images

### Test 3 : Capture d'écran
1. Faire une capture d'écran (Ctrl+Shift+S)
2. Copier l'image
3. Aller dans le Drive
4. Ctrl+V
5. ✓ Le dialogue d'upload s'ouvre avec l'image

### Test 4 : Paste dans un champ de texte
1. Ouvrir le dialogue de création de dossier
2. Copier du texte
3. Ctrl+V dans le champ "Nom du dossier"
4. ✓ Le texte est collé normalement (pas d'interception)

### Test 5 : Désactivation pendant l'upload
1. Copier un fichier
2. Ctrl+V pour ouvrir le dialogue d'upload
3. Copier un autre fichier
4. Ctrl+V pendant que le dialogue est ouvert
5. ✓ Rien ne se passe (la fonctionnalité est désactivée)

## Évolutions futures possibles

### 1. Support du Drag & Drop amélioré
Combiner le paste avec le drag & drop pour une UX encore meilleure.

### 2. Paste d'URLs
Détecter quand l'utilisateur colle une URL et proposer de télécharger le fichier depuis cette URL.

### 3. Paste d'images depuis le presse-papier
Supporter le paste d'images copiées depuis un site web (pas seulement des fichiers).

### 4. Paste de texte en fichier
Proposer de créer un fichier .txt quand l'utilisateur colle du texte brut.

### 5. Historique du presse-papier
Afficher un historique des derniers éléments collés pour un re-upload rapide.

## Dépannage

### Le paste ne fonctionne pas

**Vérifier** :
1. Le navigateur supporte l'API Clipboard (Chrome 76+, Firefox 87+, etc.)
2. L'icône de collage est visible dans le header
3. Vous n'êtes pas dans un champ de texte
4. Le dialogue d'upload n'est pas déjà ouvert

### Les fichiers ne sont pas détectés

**Cause possible** : Le système d'exploitation ne permet pas de copier certains types de fichiers.

**Solution** : Utiliser le dialogue d'upload classique ou le drag & drop.

### Performance lente

**Cause possible** : Trop de fichiers collés en même temps.

**Solution** : Coller les fichiers par lots de 10-20 maximum.

## Contributions

Cette fonctionnalité a été développée pour améliorer l'expérience utilisateur du Drive V2. Si vous avez des suggestions d'amélioration, n'hésitez pas à les proposer !

---

**Date de création** : Décembre 2025  
**Version** : 1.0  
**Auteur** : Assistant IA avec l'utilisateur

