# 🎯 Simplification Drag & Drop Lignes Spéciales

## 🚨 **PROBLÈME ACTUEL**

Le système est trop complexe :
1. Lignes en attente → Droppable séparé
2. Lignes placées → Droppable caché
3. Détection position via data-attributes et mouse
4. Gestion manuelle des IDs avec préfixes `pending_` / `placed_`

**Trop spécial et compliqué !**

---

## 💡 **SOLUTION : UNIFIER**

Passer au même système que les **parties** et **sous-parties** :
- **Un seul DragDropContext**
- **Un seul Droppable** qui contient TOUT : parties, sous-parties, lignes détails, lignes spéciales
- **Réordonnement simple** comme pour les parties

---

## 🎨 **NOUVELLE APPROCHE**

### **Structure Unifiée**

```
DevisTable
└── DragDropContext
    └── Droppable "main-devis"
        ├── Partie 1 (Draggable)
        │   ├── Sous-partie A
        │   │   ├── Ligne détail 1
        │   │   └── Ligne détail 2
        │   └── Sous-partie B
        ├── 🟦 Ligne spéciale placée 1
        ├── Partie 2
        ├── 🟦 Ligne spéciale placée 2
        └── ...
```

**Chaque élément** (partie, sous-partie, ligne détail, ligne spéciale) est dans **une seule liste plate**.

---

### **Structure de Données Simplifiée**

```javascript
devisItems = [
  { type: 'partie', id: 'p1', data: { ... }, children: [...] },
  { type: 'ligne_speciale', id: 'ls1', data: { ... } },
  { type: 'partie', id: 'p2', data: { ... }, children: [...] },
  { type: 'ligne_speciale', id: 'ls2', data: { ... } }
]
```

Ou **garder la structure actuelle** mais simplement **afficher tout dans l'ordre**.

---

## 🔧 **IMPLÉMENTATION**

### **Option 1 : Liste Plate Unifiée** (Plus simple)

```javascript
const displayedItems = [
  ...selectedParties.map(partie => ({
    type: 'partie',
    id: partie.id,
    data: partie,
    render: (provided, snapshot) => <PartieRow partie={partie} provided={provided} snapshot={snapshot} />
  })),
  ...placedSpecialLines.map(line => ({
    type: 'ligne_speciale',
    id: line.id,
    data: line,
    render: (provided, snapshot) => <SpecialLineRow line={line} provided={provided} snapshot={snapshot} />
  }))
].sort((a, b) => a.order - b.order); // Trier par ordre

// Dans le Droppable
{displayedItems.map((item, index) => (
  <Draggable key={item.id} draggableId={item.id} index={index}>
    {(provided, snapshot) => item.render(provided, snapshot)}
  </Draggable>
))}
```

### **Option 2 : Ordre Explicite** (Garder structure actuelle)

Au lieu de `before/after`, simplement un **champ `order`** :

```javascript
placedSpecialLine = {
  id: "line_123",
  data: { ... },
  styles: { ... },
  order: 3  // Simple numéro d'ordre
}
```

À l'affichage, trier tout ensemble :
```javascript
const allItems = [...selectedParties, ...placedSpecialLines].sort((a, b) => a.order - b.order);
```

---

## ✅ **AVANTAGES**

1. **Simple** : Un seul système de drag & drop
2. **Cohérent** : Comme les parties
3. **Pas de détection position** : Juste réordonner
4. **Pas de préfixes** : IDs naturels
5. **Visuel** : L'utilisateur voit immédiatement où ça va

---

## 🚧 **INCONVÉNIENTS**

1. **Réfonte nécessaire** : Changer la structure
2. **Perte de granularité** : "before Partie A" → devient "order 3"

---

## 🎯 **MA RECOMMANDATION**

**Option 2** : Ajouter un champ `order` simple.

**Pourquoi** :
- Moins de changement dans le code
- Simple à comprendre
- Suffisant pour l'utilisateur
- Facile à sauvegarder

**Comment** :
1. Ligne spéciale créée → `order: placedSpecialLines.length`
2. Dragg & drop → Réordonner la liste
3. Affichage → Trier tout par `order`

---

## 🤔 **QUESTION**

Que préférez-vous ?

1. **Liste plate unifiée** (Option 1) - Plus propre mais plus de travail
2. **Ordre simple** (Option 2) - Plus pragmatique
3. **Garder le système actuel** - Plus de contrôle mais complexe

**Je recommande l'Option 2.** Qu'en pensez-vous ?

