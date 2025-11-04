# 📐 Plan Architecture Clean Drag & Drop

## 🎯 **VISION GLOBALE**

Un système unifié où **tous les éléments** (parties, sous-parties, lignes détails, lignes spéciales) peuvent être agencés avec drag & drop.

---

## 🏗️ **ARCHITECTURE PROPOSÉE**

### **Niveau 1 : Éléments Top-Level (Parties + Lignes Spéciales)**

```
┌─────────────────────────────────────────┐
│ DragDropContext (Top Level)             │
│ └─ Droppable "devis-items"              │
│    ├─ Partie 1 (ordre: 0)               │
│    ├─ 🟦 Ligne spéciale (ordre: 1)      │
│    ├─ Partie 2 (ordre: 2)               │
│    └─ 🟦 Ligne spéciale (ordre: 3)      │
└─────────────────────────────────────────┘
```

**Champ unifié** : `ordre_devis` (numéro global dans tout le devis)

---

### **Niveau 2 : Sous-parties dans les Parties**

```
Partie 1
└─ DragDropContext (Sous-niveau)
   └─ Droppable "sous-parties-p1"
      ├─ Sous-partie A (ordre: 0)
      └─ Sous-partie B (ordre: 1)
```

**Champ** : `ordre_partie` (numéro dans la partie parent)

---

### **Niveau 3 : Lignes détails dans les Sous-parties**

```
Sous-partie A
└─ DragDropContext (Sous-niveau)
   └─ Droppable "lignes-sous-partie-a"
      ├─ Ligne détail 1 (ordre: 0)
      └─ Ligne détail 2 (ordre: 1)
```

**Champ** : `ordre_sous_partie` (numéro dans la sous-partie parent)

---

## 📊 **STRUCTURE DE DONNÉES**

### **Base de données (Django Models)**

```python
class Partie(models.Model):
    devis = models.ForeignKey(Devis)
    titre = models.CharField()
    ordre_devis = models.IntegerField()  # Position dans le devis global
    numero = models.CharField(null=True, blank=True)

class SousPartie(models.Model):
    partie = models.ForeignKey(Partie)
    titre = models.CharField()
    ordre_partie = models.IntegerField()  # Position dans la partie
    numero = models.CharField(null=True, blank=True)

class LigneDetail(models.Model):
    sous_partie = models.ForeignKey(SousPartie)
    description = models.CharField()
    ordre_sous_partie = models.IntegerField()  # Position dans la sous-partie
    quantity = models.IntegerField()
    # ... autres champs

class LigneSpeciale(models.Model):
    devis = models.ForeignKey(Devis)
    ordre_devis = models.IntegerField()  # Position dans le devis global (comme les parties)
    data = models.JSONField()  # Description, type, valeur, etc.
    styles = models.JSONField()  # Couleurs, gras, etc.
```

**Point clé** : `LigneSpeciale` a le **même niveau** que `Partie` (même champ `ordre_devis`)

---

### **Structure Frontend**

```javascript
// État unifié dans DevisAvance.js
const [devisItems, setDevisItems] = useState([]);

// Structure plate
devisItems = [
  { 
    type: 'partie', 
    id: 1, 
    ordre_devis: 0, 
    titre: "Peinture",
    numero: "1",
    sousParties: [
      { id: 10, ordre_partie: 0, titre: "Intérieur", ... },
      { id: 11, ordre_partie: 1, titre: "Extérieur", ... }
    ]
  },
  { 
    type: 'ligne_speciale', 
    id: 101, 
    ordre_devis: 1, 
    data: {...},
    styles: {...}
  },
  { 
    type: 'partie', 
    id: 2, 
    ordre_devis: 2, 
    titre: "Plomberie",
    numero: "2",
    sousParties: [...]
  }
]
```

---

## 🔄 **LOGIC FLOW**

### **1. Chargement des données**

```javascript
useEffect(() => {
  const loadDevis = async () => {
    const devis = await fetchDevis(devisId);
    
    // Fusionner parties et lignes spéciales
    const items = [
      ...devis.parties.map(p => ({ type: 'partie', ...p })),
      ...devis.lignes_speciales.map(ls => ({ type: 'ligne_speciale', ...ls }))
    ].sort((a, b) => a.ordre_devis - b.ordre_devis);
    
    setDevisItems(items);
  };
  
  loadDevis();
}, [devisId]);
```

---

### **2. Affichage**

```javascript
<DragDropContext onDragEnd={handleDragEndTopLevel}>
  <Droppable droppableId="devis-items">
    {devisItems.map((item, index) => (
      <Draggable 
        key={item.type === 'partie' ? `p_${item.id}` : `ls_${item.id}`}
        draggableId={item.type === 'partie' ? `p_${item.id}` : `ls_${item.id}`}
        index={index}
      >
        {item.type === 'partie' ? (
          <PartieRow 
            partie={item} 
            onSousPartiesReorder={handleSousPartiesReorder}
            onLigneDetailsReorder={handleLigneDetailsReorder}
          />
        ) : (
          <LigneSpecialeRow line={item} />
        )}
      </Draggable>
    ))}
  </Droppable>
</DragDropContext>
```

---

### **3. Drag & Drop Top-Level (Parties + Lignes Spéciales)**

```javascript
const handleDragEndTopLevel = (result) => {
  if (!result.destination) return;
  
  const newItems = Array.from(devisItems);
  const [reorderedItem] = newItems.splice(result.source.index, 1);
  newItems.splice(result.destination.index, 0, reorderedItem);
  
  // Mettre à jour ordre_devis
  const updatedItems = newItems.map((item, index) => ({
    ...item,
    ordre_devis: index
  }));
  
  setDevisItems(updatedItems);
  
  // Sauvegarder en BDD
  saveOrderToDatabase(updatedItems);
};
```

---

### **4. Drag & Drop Sous-parties**

```javascript
const handleSousPartiesReorder = (partieId, result) => {
  const updatedItems = devisItems.map(item => {
    if (item.type === 'partie' && item.id === partieId) {
      const newSousParties = Array.from(item.sousParties);
      const [reordered] = newSousParties.splice(result.source.index, 1);
      newSousParties.splice(result.destination.index, 0, reordered);
      
      return {
        ...item,
        sousParties: newSousParties.map((sp, idx) => ({
          ...sp,
          ordre_partie: idx
        }))
      };
    }
    return item;
  });
  
  setDevisItems(updatedItems);
};
```

---

### **5. Drag & Drop Lignes Détails**

```javascript
const handleLigneDetailsReorder = (partieId, sousPartieId, result) => {
  const updatedItems = devisItems.map(item => {
    if (item.type === 'partie' && item.id === partieId) {
      return {
        ...item,
        sousParties: item.sousParties.map(sp => {
          if (sp.id === sousPartieId) {
            const newLignes = Array.from(sp.lignesDetails);
            const [reordered] = newLignes.splice(result.source.index, 1);
            newLignes.splice(result.destination.index, 0, reordered);
            
            return {
              ...sp,
              lignesDetails: newLignes.map((ld, idx) => ({
                ...ld,
                ordre_sous_partie: idx
              }))
            };
          }
          return sp;
        })
      };
    }
    return item;
  });
  
  setDevisItems(updatedItems);
};
```

---

## 💾 **SAUVEGARDE EN BASE DE DONNÉES**

### **Endpoint Backend**

```python
@api_view(['PATCH'])
def update_devis_order(request, devis_id):
    """Met à jour l'ordre de tous les éléments d'un devis"""
    items = request.data.get('items', [])
    
    for item in items:
        if item['type'] == 'partie':
            Partie.objects.filter(id=item['id']).update(ordre_devis=item['ordre_devis'])
        elif item['type'] == 'ligne_speciale':
            LigneSpeciale.objects.filter(id=item['id']).update(ordre_devis=item['ordre_devis'])
    
    return Response({'status': 'success'})
```

---

## ✅ **AVANTAGES DE CETTE ARCHITECTURE**

1. **Unifié** : Un seul système de drag & drop à 3 niveaux
2. **Simple** : Chaque niveau gère son propre ordre
3. **Scalable** : Facile d'ajouter de nouveaux types d'éléments
4. **Performant** : Pas de détection complexe de position
5. **Persistant** : Sauvegarde directe en BDD
6. **Visuel** : L'utilisateur voit exactement où ça va

---

## 🚧 **MIGRATION**

### **Phase 1 : Backend**
1. Ajouter `ordre_devis` aux `Partie` et créer `LigneSpeciale`
2. Migration de données
3. Endpoints API

### **Phase 2 : Frontend - Top Level**
1. Fusionner parties et lignes spéciales
2. Drag & drop unifié
3. Sauvegarde

### **Phase 3 : Nettoyage**
1. Retirer l'ancien système de pending/placed
2. Retirer la détection de position
3. Tests

---

## 🎯 **RÉSUMÉ**

**Architecture finale** :
- **Niveau 1** : Parties + Lignes spéciales (ordre global)
- **Niveau 2** : Sous-parties (ordre dans la partie)
- **Niveau 3** : Lignes détails (ordre dans la sous-partie)

**Simple, propre, maintenable.** ✨

Souhaitez-vous que j’implémente cette architecture ?

