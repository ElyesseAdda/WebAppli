# 🏗️ Architecture Drag & Drop Propre

## 🎯 **OBJECTIF**

Créer un système unifié pour agencer **parties, sous-parties, lignes détails et lignes spéciales** via drag & drop.

---

## 🔍 **ANALYSE DE L'EXISTANT**

### **Ce qui existe déjà :**

1. **Parties** : Drag & drop fonctionnel avec champ `ordre`
2. **Sous-parties** : Drag & drop dans leur partie parent
3. **Lignes détails** : Pas de drag & drop (juste ajout/retrait)

### **Structure de données actuelle :**

```javascript
selectedParties = [
  {
    id: 1,
    titre: "Peinture",
    ordre: 0,  // ✅ Déjà présent
    numero: "1",
    selectedSousParties: [
      {
        id: 10,
        titre: "Intérieur",
        numero: "1.1",
        selectedLignesDetails: [
          { id: 100, description: "Mur principal", quantity: 10, ... }
        ]
      }
    ]
  }
]
```

---

## 💡 **PROBLÈME FONDAMENTAL**

**2 approches possibles** :

1. **Structure hiérarchique** (actuelle) : Parties → Sous-parties → Lignes détails
2. **Structure plate** : Tout au même niveau avec des liens de parenté

**Le problème** : Les lignes spéciales doivent pouvoir s'insérer **n'importe où** dans la hiérarchie !

---

## 🎨 **SOLUTIONS**

### **Option 1 : Liste Plate avec Type** ⭐ (RECOMMANDÉ)

**Concept** : Une seule liste plate de tous les éléments, triée par `ordre`.

```javascript
devisItems = [
  // Les parties gardent leurs sous-parties et lignes détails
  { type: 'partie', id: 1, ordre: 0, titre: "Peinture", children: [...] },
  { type: 'ligne_speciale', id: 101, ordre: 1, data: {...} },
  { type: 'partie', id: 2, ordre: 2, titre: "Plomberie", children: [...] },
  { type: 'ligne_speciale', id: 102, ordre: 3, data: {...} }
]
```

**Avantages** :
- ✅ Simple à implémenter
- ✅ Un seul Droppable
- ✅ Compatible avec l'existant
- ✅ Les sous-parties restent hiérarchiques

**Inconvénients** :
- ⚠️ Lignes spéciales ne peuvent pas s'insérer **dans** une partie (seulement entre les parties)
- ⚠️ Structure hybride (plate + hiérarchique)

---

### **Option 2 : Structure Plate Complète** (Plus flexible)

**Concept** : Tout devient plat avec des liens de parenté.

```javascript
devisItems = [
  { type: 'partie', id: 1, ordre: 0, titre: "Peinture" },
  { type: 'sous_partie', id: 10, ordre: 0, parentId: 1, titre: "Intérieur" },
  { type: 'ligne_detail', id: 100, ordre: 0, parentId: 10, description: "Mur principal" },
  { type: 'ligne_speciale', id: 101, ordre: 1, data: {...} },  // Peut s'insérer ici !
  { type: 'ligne_detail', id: 101, ordre: 1, parentId: 10, description: "Plafond" }
]
```

**Avantages** :
- ✅ Lignes spéciales peuvent s'insérer **partout**
- ✅ Structure uniforme
- ✅ Plus de flexibilité

**Inconvénients** :
- ❌ Gros refactoring nécessaire
- ❌ Perte de la hiérarchie visuelle
- ❌ Plus complexe à récupérer un devis complet

---

### **Option 3 : Ordre Relatif** (Balance)

**Concept** : Garder la hiérarchie mais ajouter un système de position relatif.

```javascript
// Dans chaque partie, sous-partie, ligne détail
{ 
  id: 1, 
  titre: "Peinture",
  specialLinesBefore: [],  // Lignes spéciales avant
  specialLinesAfter: [],   // Lignes spéciales après
  selectedSousParties: [...]
}
```

**Avantages** :
- ✅ Pas de changement majeur
- ✅ Lignes spéciales peuvent être "attachées" à un élément

**Inconvénients** :
- ⚠️ Plus de logique à gérer
- ⚠️ Structure de données plus complexe

---

### **Option 4 : Zones de Drop Intermédiaires** (Approche actuelle simplifiée)

**Concept** : Zones invisibles entre chaque élément pour placer les lignes spéciales.

```
┌─────────────────────┐
│ ━━━ DROP ZONE ━━━  │  ← Zone invisibles entre éléments
│ PARTIE: Peinture    │
│ ━━━ DROP ZONE ━━━  │
│ Sous-partie A       │
│ ━━━ DROP ZONE ━━━  │
│ Ligne détail 1      │
│ ━━━ DROP ZONE ━━━  │
└─────────────────────┘
```

**Avantages** :
- ✅ Cohérent avec l'existant
- ✅ Lignes spéciales visibles exactement où elles sont

**Inconvénients** :
- ⚠️ Beaucoup de zones DOM à créer
- ⚠️ Performance si beaucoup d'éléments

---

## 🎯 **MA RECOMMANDATION FINALE**

**Option 1 : Liste Plate avec Type** (balance entre simplicité et flexibilité)

### **Pourquoi ?**

1. **Minimum de changement** : Compatible avec l'existant
2. **Simple** : Un seul Droppable pour les lignes spéciales et parties
3. **Suffisant** : Pour 90% des cas d'usage
4. **Évolutif** : Peut être étendu plus tard si besoin

### **Comment ça marche ?**

```javascript
// Fusionner parties et lignes spéciales dans une seule liste
const allTopLevelItems = [
  ...selectedParties.map(p => ({ type: 'partie', ...p, displayOrder: p.ordre })),
  ...placedSpecialLines.map(l => ({ type: 'ligne_speciale', ...l, displayOrder: l.ordre }))
].sort((a, b) => a.displayOrder - b.displayOrder);

// Render dans un seul Droppable
<Droppable droppableId="main-devis-items">
  {allTopLevelItems.map((item, index) => (
    <Draggable draggableId={item.type === 'partie' ? `p_${item.id}` : `ls_${item.id}`}>
      {item.type === 'partie' ? (
        <PartieRow partie={item} />
      ) : (
        <SpecialLineRow line={item} />
      )}
    </Draggable>
  ))}
</Droppable>
```

### **Rendu visuel :**

```
┌─────────────────────────┐
│ PARTIE: Peinture         │
│ ├─ Sous-partie A         │
│ │  ├─ Ligne détail 1     │
│ │  └─ Ligne détail 2     │
├─────────────────────────┤
│ 🟦 REMISE 10%            │  ← Ligne spéciale entre parties
├─────────────────────────┤
│ PARTIE: Plomberie        │
│ └─ Sous-partie B         │
└─────────────────────────┘
```

---

## 📊 **RÉSUMÉ COMPARATIF**

| Option | Simplicité | Flexibilité | Effort | Compatibilité |
|--------|-----------|-------------|--------|---------------|
| 1. Liste plate | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 2. Structure plate | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐ |
| 3. Ordre relatif | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 4. Zones de drop | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

---

## 🤔 **QUESTION À VOUS**

**Quelle approche vous convient le mieux ?**

1. **Option 1** : Lignes spéciales entre parties uniquement (simple, 80% des cas)
2. **Option 2** : Lignes spéciales partout (maximum de flexibilité, plus de travail)
3. **Autre idée** : Peut-être avez-vous une vision différente ?

**Mon conseil** : Commencer par l'Option 1, tester en conditions réelles, puis évoluer si besoin vers plus de flexibilité.

Qu'en pensez-vous ?

