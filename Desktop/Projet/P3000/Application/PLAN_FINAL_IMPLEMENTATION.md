# 🎯 Plan Final d'Implémentation

## ✅ **APPROBATION**

Architecture validée : **Index Global Unifié** ✅

---

## 📋 **CHECKLIST**

### **Phase 1 : Backend**
- [ ] Ajouter `index_global` à tous les models (Partie, SousPartie, LigneDetail, LigneSpeciale)
- [ ] Migration
- [ ] Fonction `generate_numero(index_global, all_items)` dans utils
- [ ] Serializers mis à jour
- [ ] Endpoints CRUD
- [ ] Endpoint `update_order(index_global_array)`

### **Phase 2 : Frontend - État Unifié**
- [ ] Créer `devisItems` fusionnant TOUT (parties, sous-parties, lignes détails, lignes spéciales)
- [ ] Charger depuis l'API et trier par `index_global`
- [ ] Fonction `recalculateNumeros(items)` dans DevisAvance
- [ ] Handler `handleDragEndUnified` pour gérer TOUS les éléments

### **Phase 3 : Frontend - Render**
- [ ] Modifier `DevisTable` pour afficher une liste unifiée
- [ ] Un seul Droppable contenant TOUT
- [ ] Rendre conditionnel selon le type (partie, sous-partie, ligne détail, ligne spéciale)
- [ ] Indentation visuelle selon la hiérarchie

### **Phase 4 : Tests & Nettoyage**
- [ ] Tester drag & drop pour chaque type
- [ ] Vérifier numérotation automatique
- [ ] Vérifier sauvegarde
- [ ] Retirer l'ancien système (pending, placed, detection position)
- [ ] Tests finaux

---

## 🎨 **RENDU VISUEL**

```javascript
// Dans DevisTable.js
<DragDropContext onDragEnd={handleDragEndUnified}>
  <Droppable droppableId="all-devis-items">
    {devisItems
      .sort((a, b) => a.index_global - b.index_global)
      .map((item, index) => (
        <Draggable
          key={`${item.type}_${item.id}`}
          draggableId={`${item.type}_${item.id}`}
          index={index}
        >
          {(provided, snapshot) => {
            // Indentation selon la profondeur
            const depth = getDepth(item);
            
            switch (item.type) {
              case 'partie':
                return <PartieRow partie={item} provided={provided} depth={0} />;
              case 'sous_partie':
                return <SousPartieRow sousPartie={item} provided={provided} depth={1} />;
              case 'ligne_detail':
                return <LigneDetailRow ligne={item} provided={provided} depth={2} />;
              case 'ligne_speciale':
                return <LigneSpecialeRow line={item} provided={provided} depth={depth} />;
            }
          }}
        </Draggable>
      ))}
  </Droppable>
</DragDropContext>
```

---

## 📊 **STRUCTURE FINALE**

```javascript
// DevisAvance.js
const [devisItems, setDevisItems] = useState([]);

// Structure après chargement
devisItems = [
  { type: 'partie', id: 1, index_global: 1, numero: '1', titre: 'Peinture', ... },
  { type: 'sous_partie', id: 10, index_global: 2, numero: '1.1', partie_id: 1, titre: 'Intérieur', ... },
  { type: 'ligne_detail', id: 100, index_global: 3, numero: '1.1.1', sous_partie_id: 10, description: 'Mur principal', ... },
  { type: 'ligne_speciale', id: 101, index_global: 4, numero: '1.1.2', description: 'REMISE 10%', data: {...}, styles: {...} },
  { type: 'partie', id: 2, index_global: 5, numero: '2', titre: 'Plomberie', ... }
]
```

---

## 🚀 **PRÊT À COMMENCER**

Je commence dès que vous me donnez le feu vert !

**Estimation** : 3-4 heures

**Ordre de travail** :
1. Backend (models, migrations, API)
2. Frontend (état unifié, render)
3. Tests & nettoyage

**GO ?** 🚀

