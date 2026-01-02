# Style Card Dashboard

Ce document décrit le style et la structure des cartes du Dashboard pour permettre leur reproduction avec d'autres modules (Factures, etc.).

## 📐 Structure Générale

### Dimensions
- **Largeur fermée** : `400px`
- **Largeur ouverte** : `1200px` (s'étend pour afficher le tableau complet)
- **Hauteur fermée** : `200px` (max)
- **Hauteur ouverte** : `auto` (prend la place nécessaire)

### Transitions
- **Largeur** : `0.5s ease-in-out`
- **Hauteur** : `1s ease-in-out`
- **Ombre** : `0.6s ease-in-out`

---

## 🎨 Styles de la Carte (Paper)

### Conteneur Principal
```javascript
<Paper
  sx={{
    p: 3,
    pb: 4.5, // Padding en bas pour laisser de la place à la barre de progression
    mb: 3,
    width: expanded ? "1200px" : "400px",
    minWidth: "400px",
    maxHeight: expanded ? "none" : "200px",
    height: expanded ? "auto" : "200px",
    backgroundColor: "white",
    borderRadius: "16px", // rounded-2xl
    border: "1px solid #f1f5f9", // border-slate-100
    boxShadow: expanded 
      ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" 
      : "0 1px 2px 0 rgb(0 0 0 / 0.05)", // shadow-sm
    transition: "width 0.5s ease-in-out, height 1s ease-in-out, max-height 1s ease-in-out, box-shadow 0.6s ease-in-out",
    position: "relative", // Pour positionner le bouton et la barre de progression
    overflow: "visible", // Toujours visible pour la barre de progression
    overflowY: expanded ? "visible" : "hidden", // Masquer le contenu vertical quand fermé
    zIndex: expanded ? 10 : 1,
    "&:hover": {
      boxShadow: expanded 
        ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
        : "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    },
  }}
>
```

---

## 📝 Structure du Contenu

### 1. Titre de la Section
```javascript
<Typography
  variant="h6"
  component="h3"
  sx={{
    mb: 3,
    color: "#64748b", // text-slate-500
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  }}
>
  [TITRE DE LA SECTION]
</Typography>
```

### 2. Section Principale (Statistiques + Icône)

#### Layout
```javascript
<Box
  sx={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 0.5, // Très proche
    mb: 3,
  }}
>
```

#### Statistiques à Gauche
```javascript
<Box>
  {/* Nombre principal avec label */}
  <Box
    sx={{
      display: "flex",
      alignItems: "baseline",
      gap: 1,
      mb: 1,
    }}
  >
    <Typography
      variant="h3"
      component="span"
      sx={{
        color: "#1e293b", // text-slate-800 - gris très foncé
        fontWeight: "bold",
        lineHeight: 1,
      }}
    >
      {nombre}
    </Typography>
    <Typography
      variant="body1"
      sx={{
        color: "#94a3b8", // text-slate-400 - gris clair
        fontWeight: 500,
      }}
    >
      [LABEL]
    </Typography>
  </Box>

  {/* Montant */}
  <Typography
    variant="h6"
    sx={{
      color: "#64748b", // text-slate-500 - gris moyen
      fontWeight: 600,
    }}
  >
    Montant:{" "}
    <Box component="span" sx={{ color: "#6366f1" }}>
      {formatNumber(montant)} €
    </Box>
  </Typography>
</Box>
```

#### Icône Circulaire à Droite
```javascript
<Box
  sx={{
    backgroundColor: "#eef2ff", // bg-indigo-50 - fond icône (peut changer selon la couleur du module)
    borderRadius: "50%",
    width: 100, // 100px
    height: 100, // 100px
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "flex-start",
    position: "relative",
    bottom: "30px",
    right: "-20px",
  }}
>
  <[IconComponent]
    sx={{
      fontSize: 50, // Proportionnel à la taille du cercle
      color: "#1976d2", // Couleur de l'icône (peut changer selon le module)
    }}
  />
</Box>
```

### 3. Barre de Progression Mini

**⚠️ Important** : La barre de progression est **toujours visible**, même quand l'accordion est fermé. Elle s'adapte automatiquement à la largeur du conteneur.

```javascript
{/* Barre de progression mini - toujours visible en bas de la carte */}
<Box
  sx={{
    position: "absolute", // Position absolue pour être toujours visible
    bottom: 0, // Collée en bas
    left: 0,
    right: 0,
    width: "100%", // S'adapte à la largeur du conteneur
    height: "6px", // h-1.5 (1.5 * 4px = 6px)
    backgroundColor: "#f8fafc", // bg-slate-50
    borderRadius: "0 0 16px 16px", // Arrondi en bas pour correspondre au Paper
    overflow: "hidden",
    zIndex: 2, // Au-dessus du contenu pour être toujours visible
  }}
>
  <Box
    sx={{
      height: "100%",
      width: `${pourcentage}%`, // Pourcentage calculé
      backgroundColor: "#6366f1", // Couleur de la barre (peut changer selon le module)
      borderRadius: "0 0 0 16px", // Arrondi en bas à gauche
      transition: "width 0.3s ease",
    }}
  />
</Box>
```

**Caractéristiques** :
- **Toujours visible** : Même quand l'accordion est fermé
- **Adaptation automatique** : S'adapte à la largeur du Paper (400px → 1200px)
- **Position fixe** : Collée en bas de la carte avec `position: absolute`
- **z-index** : 2 pour être au-dessus du contenu

### 4. Bouton Discret en Bas à Droite

**⚠️ Important** : Le bouton est positionné au-dessus de la barre de progression.

```javascript
{/* Bouton discret en bas à droite - au-dessus de la barre de progression */}
<IconButton
  onClick={() => toggleAccordion(accordionId)}
  sx={{
    position: "absolute",
    bottom: 18, // Au-dessus de la barre de progression (6px + 12px de marge)
    right: 12,
    width: 32,
    height: 32,
    backgroundColor: "transparent",
    color: "#9ca3af", // gris discret
    zIndex: 2, // Au-dessus de la barre de progression
    "&:hover": {
      backgroundColor: "#f3f4f6",
      color: "#374151",
    },
    transition: "all 0.2s ease",
  }}
  size="small"
>
  <ExpandMoreIcon
    sx={{
      fontSize: 20,
      transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
      transition: "transform 0.6s ease-in-out",
    }}
  />
</IconButton>
```

### 5. Accordéon (Tableau)
```javascript
{expanded && (
  <Box
    sx={{
      mt: 2,
      width: "100%",
      // Pas de maxHeight ni overflow pour afficher tout le tableau
      transition: "all 0.6s ease-in-out",
      animation: "fadeIn 0.6s ease-in-out",
      "@keyframes fadeIn": {
        from: {
          opacity: 0,
          transform: "translateY(-10px)",
        },
        to: {
          opacity: 1,
          transform: "translateY(0)",
        },
      },
    }}
  >
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: "#eef2ff" }}>
            {/* Colonnes du tableau */}
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Lignes du tableau */}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}
```

### 6. Changement de Statut Directement depuis le Tableau

**⚠️ Fonctionnalité optionnelle** : Permet de modifier le statut d'un élément directement depuis le tableau en cliquant sur le label du statut.

#### Imports Nécessaires
```javascript
import StatusChangeModal from "../../StatusChangeModal";
import axios from "axios";
```

#### États à Ajouter
```javascript
const [showStatusModal, setShowStatusModal] = useState(false);
const [itemToUpdate, setItemToUpdate] = useState(null);

// Options de statut selon le module (exemple pour les situations)
const statusOptions = [
  { value: "brouillon", label: "Brouillon" },
  { value: "validee", label: "Validée" },
  { value: "facturee", label: "Facturée" },
];
```

#### Fonctions de Gestion
```javascript
// Ouvrir le modal au clic sur le statut
const handleStatusClick = (item) => {
  setItemToUpdate(item);
  setShowStatusModal(true);
};

// Mettre à jour le statut via l'API
const handleStatusUpdate = async (newStatus) => {
  try {
    if (!itemToUpdate) return;
    
    // Appel API pour mettre à jour le statut
    await axios.patch(`/api/[endpoint]/${itemToUpdate.id}/`, {
      statut: newStatus,
    });
    
    // Mettre à jour l'état local
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemToUpdate.id
          ? { ...item, statut: newStatus }
          : item
      )
    );
    
    setShowStatusModal(false);
    setItemToUpdate(null);
  } catch (error) {
    console.error("Erreur lors de la modification du statut:", error);
    setError("Erreur lors de la modification du statut");
    setShowStatusModal(false);
    setItemToUpdate(null);
  }
};
```

#### Style du Label de Statut Cliquable
```javascript
<TableCell align="center">
  <Typography
    variant="body2"
    onClick={() => handleStatusClick(item)}
    sx={{
      display: "inline-block",
      px: 1.5,
      py: 0.5,
      borderRadius: 1,
      backgroundColor:
        item.statut === "facturee"
          ? "success.light"
          : item.statut === "validee"
          ? "info.light"
          : "warning.light",
      color:
        item.statut === "facturee"
          ? "success.dark"
          : item.statut === "validee"
          ? "info.dark"
          : "warning.dark",
      fontWeight: 500,
      textTransform: "capitalize",
      cursor: "pointer", // Indique que c'est cliquable
      "&:hover": {
        opacity: 0.8,
        transform: "scale(1.05)", // Effet de zoom au survol
      },
      transition: "all 0.2s ease",
    }}
  >
    {/* Afficher le label en français */}
    {item.statut === "facturee"
      ? "Facturée"
      : item.statut === "validee"
      ? "Validée"
      : "Brouillon"}
  </Typography>
</TableCell>
```

#### Ajout du Modal en Fin de Composant
```javascript
{/* Modal de changement de statut */}
<StatusChangeModal
  open={showStatusModal}
  onClose={() => {
    setShowStatusModal(false);
    setItemToUpdate(null);
  }}
  currentStatus={itemToUpdate?.statut || "brouillon"}
  onStatusChange={handleStatusUpdate}
  statusOptions={statusOptions}
  title="Modifier le statut de la [entité]"
  type="[type]" // "situation", "facture", etc.
/>
```

#### Configuration Backend (si nécessaire)

Si le champ `statut` n'est pas déjà dans la liste des champs modifiables de l'endpoint API, l'ajouter :

```python
# Dans api/views.py, fonction update_[entity]
for field in [..., 'statut']:  # Ajouter 'statut' à la liste
    if field in data:
        setattr(entity, field, data[field])
```

#### Exemple Complet : Cellule de Statut dans le Tableau
```javascript
<TableBody>
  {items.map((item, index) => (
    <TableRow key={item.id} hover>
      {/* Autres cellules */}
      
      <TableCell align="center">
        <Typography
          variant="body2"
          onClick={() => handleStatusClick(item)}
          sx={{
            display: "inline-block",
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            backgroundColor:
              item.statut === "facturee"
                ? "success.light"
                : item.statut === "validee"
                ? "info.light"
                : "warning.light",
            color:
              item.statut === "facturee"
                ? "success.dark"
                : item.statut === "validee"
                ? "info.dark"
                : "warning.dark",
            fontWeight: 500,
            textTransform: "capitalize",
            cursor: "pointer",
            "&:hover": {
              opacity: 0.8,
              transform: "scale(1.05)",
            },
            transition: "all 0.2s ease",
          }}
        >
          {item.statut === "facturee"
            ? "Facturée"
            : item.statut === "validee"
            ? "Validée"
            : "Brouillon"}
        </Typography>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
```

**Caractéristiques** :
- **Clic sur le statut** : Ouvre un modal avec les options de statut disponibles
- **Mise à jour immédiate** : L'état local est mis à jour après la modification
- **Feedback visuel** : Effet hover avec opacité et zoom pour indiquer que c'est cliquable
- **Gestion d'erreurs** : Affichage d'un message d'erreur en cas d'échec
- **Réutilisable** : Le composant `StatusChangeModal` peut être utilisé pour différents types d'entités

**Note** : Cette fonctionnalité n'est applicable que si l'entité a un champ `statut` modifiable via l'API.

---

## 🎨 Palette de Couleurs

### Couleurs Fixes (à conserver)
- **Titre** : `#64748b` (text-slate-500)
- **Chiffre principal** : `#1e293b` (text-slate-800)
- **Label** : `#94a3b8` (text-slate-400)
- **"Montant :"** : `#64748b` (text-slate-500)
- **Fond barre progression** : `#f8fafc` (bg-slate-50)
- **Bordure carte** : `#f1f5f9` (border-slate-100)

### Couleurs Variables (peuvent changer selon le module)
- **Icône** : `#1976d2` (bleu de l'application) ou couleur du module
- **Fond icône** : `#eef2ff` (bg-indigo-50) ou couleur correspondante
- **Barre de progression** : `#6366f1` (indigo-500) ou couleur du module
- **Chiffre montant** : `#6366f1` (même couleur que la barre de progression)

---

## 🔧 Système d'Accordéons

### Contexte (DashboardFiltersContext.js)

Le contexte gère l'ouverture d'un seul accordéon à la fois :

```javascript
// État pour gérer l'accordéon ouvert (un seul à la fois)
const [openAccordion, setOpenAccordion] = useState(null);

// Fonction pour ouvrir/fermer un accordéon
const toggleAccordion = (accordionId) => {
  setOpenAccordion((prev) => (prev === accordionId ? null : accordionId));
};
```

### Utilisation dans le Composant

```javascript
const { selectedYear, openAccordion, toggleAccordion } = useDashboardFilters();

// ID unique pour cet accordéon
const accordionId = "situations-summary"; // Changer pour chaque module
const expanded = openAccordion === accordionId;

// Dans le bouton
<IconButton onClick={() => toggleAccordion(accordionId)}>
```

### IDs Recommandés par Module
- Situations : `"situations-summary"`
- Factures : `"factures-summary"`
- Autres modules : `"[module-name]-summary"`

---

## 📋 Checklist pour Créer une Nouvelle Carte

### Structure
- [ ] Créer le composant dans `frontend/src/components/Dashboard/Paiement/[ModuleName]Summary.js`
- [ ] Utiliser la même structure Paper avec les mêmes styles
- [ ] Ajouter un ID unique pour l'accordéon
- [ ] Utiliser `toggleAccordion` du contexte

### Styles
- [ ] Titre avec `#64748b` (text-slate-500)
- [ ] Chiffre principal avec `#1e293b` (text-slate-800)
- [ ] Label avec `#94a3b8` (text-slate-400)
- [ ] "Montant :" avec `#64748b` (text-slate-500)
- [ ] Chiffre montant avec la couleur du module (ex: `#6366f1` pour indigo)
- [ ] Icône avec la couleur du module
- [ ] Fond icône avec la couleur claire correspondante
- [ ] Barre de progression avec la couleur du module

### Fonctionnalités
- [ ] Largeur : 400px fermé, 1200px ouvert
- [ ] Hauteur : 200px max fermé, auto ouvert
- [ ] Transitions : width 0.5s, height 1s
- [ ] zIndex : 10 quand ouvert, 1 quand fermé
- [ ] Bouton discret en bas à droite (bottom: 18, zIndex: 2)
- [ ] Tableau sans scroll vertical quand ouvert
- [ ] Barre de progression toujours visible (position: absolute, bottom: 0, zIndex: 2)
- [ ] Padding en bas du Paper : pb: 4.5
- [ ] Overflow : visible pour X, hidden pour Y quand fermé

### Changement de Statut (Optionnel)
- [ ] Importer `StatusChangeModal` et `axios`
- [ ] Ajouter les états `showStatusModal` et `itemToUpdate`
- [ ] Définir les `statusOptions` selon le module
- [ ] Créer `handleStatusClick` pour ouvrir le modal
- [ ] Créer `handleStatusUpdate` pour mettre à jour via l'API
- [ ] Rendre le label de statut cliquable avec `cursor: "pointer"` et effet hover
- [ ] Ajouter le composant `StatusChangeModal` en fin de composant
- [ ] Vérifier que l'endpoint API accepte la mise à jour du champ `statut`

---

## 📝 Exemple Complet : Structure d'une Carte

```javascript
import { Box, Paper, Typography, IconButton, ... } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import [ModuleIcon] from "@mui/icons-material/[ModuleIcon]";
import { useDashboardFilters } from "../DashboardFiltersContext";
import StatusChangeModal from "../../StatusChangeModal"; // Si changement de statut nécessaire
import axios from "axios"; // Si changement de statut nécessaire

const [ModuleName]Summary = () => {
  const { selectedYear, openAccordion, toggleAccordion } = useDashboardFilters();
  
  // ID unique pour cet accordéon
  const accordionId = "[module-name]-summary";
  const expanded = openAccordion === accordionId;
  
  // États pour le changement de statut (optionnel)
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [itemToUpdate, setItemToUpdate] = useState(null);
  
  // Options de statut selon le module (optionnel)
  const statusOptions = [
    { value: "statut1", label: "Label 1" },
    { value: "statut2", label: "Label 2" },
  ];
  
  // ... logique de chargement des données ...
  
  // Fonctions pour le changement de statut (optionnel)
  const handleStatusClick = (item) => {
    setItemToUpdate(item);
    setShowStatusModal(true);
  };
  
  const handleStatusUpdate = async (newStatus) => {
    try {
      if (!itemToUpdate) return;
      await axios.patch(`/api/[endpoint]/${itemToUpdate.id}/`, {
        statut: newStatus,
      });
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemToUpdate.id
            ? { ...item, statut: newStatus }
            : item
        )
      );
      setShowStatusModal(false);
      setItemToUpdate(null);
    } catch (error) {
      console.error("Erreur lors de la modification du statut:", error);
      setError("Erreur lors de la modification du statut");
      setShowStatusModal(false);
      setItemToUpdate(null);
    }
  };
  
  return (
    <Box>
      <Paper
        sx={{
          p: 3,
          pb: 4.5, // Padding en bas pour laisser de la place à la barre de progression
          mb: 3,
          width: expanded ? "1200px" : "400px",
          minWidth: "400px",
          maxHeight: expanded ? "none" : "200px",
          height: expanded ? "auto" : "200px",
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #f1f5f9",
          boxShadow: expanded 
            ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" 
            : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          transition: "width 0.5s ease-in-out, height 1s ease-in-out, max-height 1s ease-in-out, box-shadow 0.6s ease-in-out",
          position: "relative", // Pour positionner le bouton et la barre de progression
          overflow: "visible", // Toujours visible pour la barre de progression
          overflowY: expanded ? "visible" : "hidden", // Masquer le contenu vertical quand fermé
          zIndex: expanded ? 10 : 1,
          "&:hover": {
            boxShadow: expanded 
              ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
              : "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          },
        }}
      >
        {/* Titre */}
        <Typography variant="h6" component="h3" sx={{ mb: 3, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          [TITRE]
        </Typography>

        {/* Section principale */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 0.5, mb: 3 }}>
          {/* Statistiques */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 1 }}>
              <Typography variant="h3" component="span" sx={{ color: "#1e293b", fontWeight: "bold", lineHeight: 1 }}>
                {nombre}
              </Typography>
              <Typography variant="body1" sx={{ color: "#94a3b8", fontWeight: 500 }}>
                [LABEL]
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ color: "#64748b", fontWeight: 600 }}>
              Montant:{" "}
              <Box component="span" sx={{ color: "[COULEUR_MODULE]" }}>
                {formatNumber(montant)} €
              </Box>
            </Typography>
          </Box>

          {/* Icône */}
          <Box sx={{ backgroundColor: "[COULEUR_FOND_ICONE]", borderRadius: "50%", width: 100, height: 100, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, alignSelf: "flex-start", position: "relative", bottom: "30px", right: "-20px" }}>
            <[ModuleIcon] sx={{ fontSize: 50, color: "[COULEUR_ICONE]" }} />
          </Box>
        </Box>

        {/* Barre de progression - toujours visible en bas de la carte */}
        <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "100%", height: "6px", backgroundColor: "#f8fafc", borderRadius: "0 0 16px 16px", overflow: "hidden", zIndex: 2 }}>
          <Box sx={{ height: "100%", width: `${pourcentage}%`, backgroundColor: "[COULEUR_BARRE]", borderRadius: "0 0 0 16px", transition: "width 0.3s ease" }} />
        </Box>

        {/* Bouton - au-dessus de la barre de progression */}
        <IconButton onClick={() => toggleAccordion(accordionId)} sx={{ position: "absolute", bottom: 18, right: 12, width: 32, height: 32, backgroundColor: "transparent", color: "#9ca3af", zIndex: 2, "&:hover": { backgroundColor: "#f3f4f6", color: "#374151" }, transition: "all 0.2s ease" }} size="small">
          <ExpandMoreIcon sx={{ fontSize: 20, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.6s ease-in-out" }} />
        </IconButton>

        {/* Accordéon */}
        {expanded && (
          <Box sx={{ mt: 2, width: "100%", transition: "all 0.6s ease-in-out", animation: "fadeIn 0.6s ease-in-out", "@keyframes fadeIn": { from: { opacity: 0, transform: "translateY(-10px)" }, to: { opacity: 1, transform: "translateY(0)" } } }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#eef2ff" }}>
                    {/* Colonnes du tableau */}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id} hover>
                      {/* Cellules du tableau */}
                      {/* Exemple de cellule de statut cliquable (optionnel) */}
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          onClick={() => handleStatusClick(item)}
                          sx={{
                            display: "inline-block",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor:
                              item.statut === "facturee"
                                ? "success.light"
                                : item.statut === "validee"
                                ? "info.light"
                                : "warning.light",
                            color:
                              item.statut === "facturee"
                                ? "success.dark"
                                : item.statut === "validee"
                                ? "info.dark"
                                : "warning.dark",
                            fontWeight: 500,
                            textTransform: "capitalize",
                            cursor: "pointer",
                            "&:hover": {
                              opacity: 0.8,
                              transform: "scale(1.05)",
                            },
                            transition: "all 0.2s ease",
                          }}
                        >
                          {item.statut || "brouillon"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* Modal de changement de statut (optionnel) */}
      <StatusChangeModal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setItemToUpdate(null);
        }}
        currentStatus={itemToUpdate?.statut || "brouillon"}
        onStatusChange={handleStatusUpdate}
        statusOptions={statusOptions}
        title="Modifier le statut de la [entité]"
        type="[type]"
      />
    </Box>
  );
};
```

---

## 🎯 Points Importants

1. **Un seul accordéon ouvert à la fois** : Géré par le contexte `DashboardFiltersContext`
2. **Largeur animable** : Utiliser `width` avec des valeurs spécifiques (pas `auto`)
3. **Pas de scroll vertical** : Retirer `maxHeight` et `overflow: auto` du tableau
4. **z-index** : 10 quand ouvert pour passer devant les autres cartes
5. **Transitions** : Largeur 0.5s, hauteur 1s pour un effet fluide
6. **Couleurs variables** : Icône, fond icône, barre de progression et montant peuvent changer selon le module
7. **Barre de progression toujours visible** : Positionnée en `absolute` avec `bottom: 0` pour être visible même quand l'accordion est fermé
8. **Adaptation automatique** : La barre de progression s'adapte automatiquement à la largeur du conteneur (400px → 1200px)
9. **Padding en bas** : Le Paper doit avoir `pb: 4.5` pour laisser de la place à la barre de progression
10. **Overflow** : Utiliser `overflow: "visible"` et `overflowY: expanded ? "visible" : "hidden"` pour permettre à la barre d'être visible
11. **Changement de statut** : Fonctionnalité optionnelle permettant de modifier le statut directement depuis le tableau. Le label du statut doit être cliquable avec un effet hover pour indiquer l'interactivité

---

## 📚 Référence des Couleurs par Module

### Situations Entrées (Validé/Traité)
- **Couleur principale** : Indigo
- **Icône** : `#1976d2` (bleu de l'application)
- **Fond icône** : `#eef2ff` (bg-indigo-50)
- **Barre de progression** : `#6366f1` (indigo-500)
- **Montant** : `#6366f1` (indigo-500)
- **Statuts disponibles** : `brouillon`, `validee`, `facturee`

### À Définir pour les Autres Modules
- Factures : [À définir]
  - Statuts disponibles : [À définir]
- Autres modules : [À définir]
  - Statuts disponibles : [À définir]

---

**Dernière mise à jour** : Décembre 2024

### 📝 Notes de mise à jour

**Décembre 2024** :
- Barre de progression toujours visible : Positionnée en `absolute` avec `bottom: 0` pour être visible même quand l'accordion est fermé
- Adaptation automatique : La barre s'adapte à la largeur du conteneur (400px → 1200px)
- Ajustements du Paper : `pb: 4.5` pour laisser de la place à la barre, `overflow: "visible"` et `overflowY` conditionnel
- Position du bouton : `bottom: 18` au lieu de `12` pour être au-dessus de la barre de progression
- **Changement de statut depuis le tableau** : Ajout de la fonctionnalité permettant de modifier le statut d'un élément directement depuis le tableau en cliquant sur le label du statut. Utilise le composant `StatusChangeModal` réutilisable.

