# 🎯 Option C - Système Hybride avec Droppables Multiples

## 📋 **PRINCIPE**

Combiner **plusieurs zones de drop** pour respecter la hiérarchie, tout en permettant aux lignes spéciales d'aller partout.

---

## 🏗️ **ARCHITECTURE**

### **Structure des Droppables**

```javascript
<DragDropContext onDragEnd={handleDragEnd}>
  
  {/* 1. Droppable GLOBAL pour les PARTIES */}
  <Droppable droppableId="parties-global">
    {devisItems.filter(item => item.type === 'partie').map(partie => (
      <Draggable draggableId={`partie_${partie.id}`}>
        
        {/* Affichage de la partie */}
        <PartieHeader />
        
        {/* 2. Droppable pour les SOUS-PARTIES de cette partie */}
        <Droppable droppableId={`sous-parties-${partie.id}`}>
          {devisItems.filter(item => item.type === 'sous_partie' && item.partie_id === partie.id).map(sp => (
            <Draggable draggableId={`sp_${sp.id}`}>
              
              {/* Affichage de la sous-partie */}
              <SousPartieHeader />
              
              {/* 3. Droppable pour les LIGNES DÉTAILS de cette sous-partie */}
              <Droppable droppableId={`lignes-${sp.id}`}>
                {devisItems.filter(item => item.type === 'ligne_detail' && item.sous_partie_id === sp.id).map(ligne => (
                  <Draggable draggableId={`ligne_${ligne.id}`}>
                    <LigneDetailRow />
                  </Draggable>
                ))}
                
                {/* LIGNES SPÉCIALES dans cette sous-partie */}
                {devisItems.filter(item => 
                  item.type === 'ligne_speciale' && 
                  item.context_type === 'sous_partie' && 
                  item.context_id === sp.id
                ).map(ls => (
                  <Draggable draggableId={`special_${ls.id}`}>
                    <LigneSpecialeRow />
                  </Draggable>
                ))}
              </Droppable>
              
            </Draggable>
          ))}
          
          {/* LIGNES SPÉCIALES dans cette partie (mais pas dans une sous-partie) */}
          {devisItems.filter(item => 
            item.type === 'ligne_speciale' && 
            item.context_type === 'partie' && 
            item.context_id === partie.id
          ).map(ls => (
            <Draggable draggableId={`special_${ls.id}`}>
              <LigneSpecialeRow />
            </Draggable>
          ))}
        </Droppable>
        
      </Draggable>
    ))}
    
    {/* LIGNES SPÉCIALES globales (pas dans une partie) */}
    {devisItems.filter(item => 
      item.type === 'ligne_speciale' && 
      item.context_type === 'global'
    ).map(ls => (
      <Draggable draggableId={`special_${ls.id}`}>
        <LigneSpecialeRow />
      </Draggable>
    ))}
  </Droppable>
  
  {/* Zone EN ATTENTE */}
  <Droppable droppableId="pending-special-lines">
    <PendingSpecialLines />
  </Droppable>
  
</DragDropContext>
```

---

## 🔄 **GESTION DU DRAG & DROP**

### **Contraintes de Mouvement**

```javascript
const handleDragEnd = (result) => {
  const { source, destination, draggableId } = result;
  
  if (!destination) return;
  
  // ===== PARTIES =====
  if (draggableId.startsWith('partie_')) {
    // Les parties ne peuvent bouger que dans 'parties-global'
    if (destination.droppableId === 'parties-global') {
      // Réordonner les parties
      reorderParties(source.index, destination.index);
    } else {
      console.log('❌ Une partie ne peut pas aller ailleurs que dans parties-global');
      return;
    }
  }
  
  // ===== SOUS-PARTIES =====
  if (draggableId.startsWith('sp_')) {
    // Les sous-parties ne peuvent bouger que dans leur partie
    // source.droppableId = 'sous-parties-123'
    // destination.droppableId = 'sous-parties-123' (même partie) ✅
    // destination.droppableId = 'sous-parties-456' (autre partie) ❌
    
    if (source.droppableId === destination.droppableId) {
      // Réordonner dans la même partie
      const partieId = source.droppableId.replace('sous-parties-', '');
      reorderSousParties(partieId, source.index, destination.index);
    } else {
      console.log('❌ Une sous-partie ne peut pas changer de partie');
      return;
    }
  }
  
  // ===== LIGNES DÉTAILS =====
  if (draggableId.startsWith('ligne_')) {
    // Les lignes ne peuvent bouger que dans leur sous-partie
    if (source.droppableId === destination.droppableId) {
      const spId = source.droppableId.replace('lignes-', '');
      reorderLignes(spId, source.index, destination.index);
    } else {
      console.log('❌ Une ligne ne peut pas changer de sous-partie');
      return;
    }
  }
  
  // ===== LIGNES SPÉCIALES =====
  if (draggableId.startsWith('special_')) {
    // Les lignes spéciales peuvent aller PARTOUT
    // On accepte tous les droppableId
    placerLigneSpeciale(result);
  }
  
  // ===== DEPUIS PENDING =====
  if (source.droppableId === 'pending-special-lines') {
    // Placer la ligne spéciale dans le contexte de destination
    placerDepuisPending(result);
  }
};
```

---

## 📍 **POSITIONNEMENT DES LIGNES SPÉCIALES**

Les lignes spéciales ont un **contexte** qui détermine où elles s'affichent :

```javascript
{
  type: 'ligne_speciale',
  id: 'special_123',
  index_global: 5,
  context_type: 'sous_partie',  // 'global', 'partie', 'sous_partie'
  context_id: 10,                // ID de la sous-partie
  position_in_context: 2         // Position dans ce contexte
}
```

### **Exemples de Contextes**

```
1. GLOBAL (entre les parties)
   Partie 1
   Partie 2
   [Ligne Spéciale - Remise globale]  ← context_type: 'global'
   Partie 3

2. PARTIE (dans une partie, avant/après les sous-parties)
   Partie 1
     [Ligne Spéciale - Note partie]  ← context_type: 'partie', context_id: 1
     Sous-partie 1.1
     Sous-partie 1.2

3. SOUS-PARTIE (dans une sous-partie, parmi les lignes détails)
   Sous-partie 1.1
     Ligne 1.1.1
     [Ligne Spéciale - Remise]  ← context_type: 'sous_partie', context_id: 11
     Ligne 1.1.2
```

---

## ✅ **AVANTAGES Option C**

✅ **Respecte la hiérarchie** : Impossible de déplacer une sous-partie dans une autre partie par erreur  
✅ **Flexibilité pour les lignes spéciales** : Peuvent aller partout  
✅ **UX naturelle** : Les zones de drop correspondent à la structure visuelle  
✅ **Pas de validation complexe** : Les contraintes sont gérées par les Droppables  

---

## ⚠️ **INCONVÉNIENTS Option C**

⚠️ **Plus complexe à implémenter** : Plusieurs Droppables imbriqués  
⚠️ **Structure plus lourde** : Beaucoup de composants imbriqués  
⚠️ **Gestion du contexte** : Il faut tracker où se trouve chaque ligne spéciale  

---

## 🚀 **IMPLÉMENTATION**

### **Étape 1** : Ajouter `context_type` et `context_id` aux lignes spéciales
### **Étape 2** : Créer des Droppables hiérarchiques
### **Étape 3** : Gérer les drops selon le contexte
### **Étape 4** : Afficher les lignes spéciales dans leur contexte

**Temps estimé** : 1-2h

---

## 💡 **ALTERNATIVE PLUS SIMPLE**

**Option A Améliorée** : Garder le rendu actuel (hiérarchique) et **injecter visuellement** les lignes spéciales selon leur `index_global`, **SANS** les rendre draggables dans la hiérarchie.

Les lignes spéciales :
- Restent dans leur zone dédiée (ou pending)
- Mais s'**affichent visuellement** intercalées via CSS/positionnement
- Ne participent pas au drag & drop hiérarchique

**Plus simple et plus rapide** (~15 min).

---

## 🤔 **QUELLE OPTION PRÉFÉREZ-VOUS ?**

**Option C** : Système hybride complet (1-2h mais très propre)  
**Option A améliorée** : Injection visuelle simple (15 min mais moins flexible)  

**Ou voulez-vous une autre approche ?** 🎯

