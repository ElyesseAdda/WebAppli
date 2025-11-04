# 🌍 Index Global Unifié

## 🎯 **CONCEPT**

Un **numéro global unique** pour chaque élément du devis, avec **numérotation automatique** basée sur la hiérarchie.

---

## 📊 **EXEMPLE VISUEL**

```
INDEX | TYPE           | HIÉRARCHIE              | NUMÉRO
------+----------------+-------------------------+------------------
  1   | Partie         | Peinture                | 1
  2   | Sous-partie    | Peinture > Intérieur    | 1.1
  3   | Ligne détail   | Peinture > Intérieur >  | 1.1.1
      |                | Mur principal           |
  4   | Ligne détail   | Peinture > Intérieur >  | 1.1.2
      |                | Plafond                 |
  5   | 🟦 Ligne spé   | (global)                | 1.1.3
      |                | REMISE 10%              |
  6   | Sous-partie    | Peinture > Extérieur    | 1.2
  7   | Ligne détail   | Peinture > Extérieur >  | 1.2.1
      |                | Façade                  |
  8   | 🟦 Ligne spé   | (global)                | 1.2.2
      |                | FRAIS TECHNIQUE         |
  9   | Partie         | Plomberie               | 2
 10   | Sous-partie    | Plomberie > Salle de bain | 2.1
 11   | Ligne détail   | Plomberie > Salle de bain > | 2.1.1
      |                | Lavabo                  |
 12   | Ligne détail   | Plomberie > Salle de bain > | 2.1.2
      |                | Douche                  |
```

---

## 🏗️ **STRUCTURE DE DONNÉES**

### **Backend (Django)**

```python
class Partie(models.Model):
    devis = models.ForeignKey(Devis)
    titre = models.CharField()
    index_global = models.IntegerField()  # Index unique dans tout le devis
    numero = models.CharField()  # Auto-généré : "1", "2", etc.
    # ... autres champs

class SousPartie(models.Model):
    partie = models.ForeignKey(Partie)
    titre = models.CharField()
    index_global = models.IntegerField()  # Index unique dans tout le devis
    numero = models.CharField()  # Auto-généré : "1.1", "1.2", etc.
    # ... autres champs

class LigneDetail(models.Model):
    sous_partie = models.ForeignKey(SousPartie)
    description = models.CharField()
    index_global = models.IntegerField()  # Index unique dans tout le devis
    numero = models.CharField()  # Auto-généré : "1.1.1", "1.1.2", etc.
    # ... autres champs

class LigneSpeciale(models.Model):
    devis = models.ForeignKey(Devis)
    titre = models.CharField()
    index_global = models.IntegerField()  # Index unique dans tout le devis
    numero = models.CharField()  # Auto-généré selon position : "1.1.3", "2.5", etc.
    data = models.JSONField()
    styles = models.JSONField()
    # ... autres champs
```

---

### **Frontend**

```javascript
// Structure unifiée plate
devisItems = [
  {
    type: 'partie',
    id: 1,
    index_global: 1,  // Position dans le devis
    numero: "1",  // Numéro hiérarchique
    titre: "Peinture"
  },
  {
    type: 'sous_partie',
    id: 10,
    index_global: 2,  // Position dans le devis
    numero: "1.1",
    partie_id: 1,
    titre: "Intérieur"
  },
  {
    type: 'ligne_detail',
    id: 100,
    index_global: 3,
    numero: "1.1.1",
    sous_partie_id: 10,
    description: "Mur principal",
    quantity: 10,
    // ...
  },
  {
    type: 'ligne_speciale',
    id: 101,
    index_global: 4,  // ✅ Peut s'insérer n'importe où !
    numero: "1.1.2",  // Auto-généré selon index_global
    description: "REMISE 10%",
    data: { ... },
    styles: { ... }
  }
].sort((a, b) => a.index_global - b.index_global)
```

---

## 🔢 **GÉNÉRATION DES NUMÉROS**

### **Algorithme**

```python
def generate_numero(element, all_items):
    """Génère le numéro hiérarchique basé sur l'index_global"""
    
    # Trouver les éléments parents en remontant l'arbre
    if element.type == 'ligne_detail':
        # Remonter jusqu'à la sous-partie
        sous_partie = next((sp for sp in all_items if sp.id == element.sous_partie_id), None)
        partie = next((p for p in all_items if p.id == sous_partie.partie_id), None)
        
        # Compter combien de lignes détails AVANT celle-ci dans la même sous-partie
        count = len([ld for ld in all_items 
                     if ld.type == 'ligne_detail' 
                     and ld.sous_partie_id == element.sous_partie_id
                     and ld.index_global < element.index_global])
        
        return f"{partie.numero}.{sous_partie.numero.split('.')[1]}.{count + 1}"
    
    elif element.type == 'sous_partie':
        # Remonter jusqu'à la partie
        partie = next((p for p in all_items if p.id == element.partie_id), None)
        
        # Compter combien de sous-parties AVANT celle-ci dans la même partie
        count = len([sp for sp in all_items 
                     if sp.type == 'sous_partie' 
                     and sp.partie_id == element.partie_id
                     and sp.index_global < element.index_global])
        
        return f"{partie.numero}.{count + 1}"
    
    elif element.type == 'partie':
        # Compter combien de parties AVANT celle-ci
        count = len([p for p in all_items 
                     if p.type == 'partie' 
                     and p.index_global < element.index_global])
        
        return str(count + 1)
    
    else:  # ligne_speciale
        # Trouver le numéro parent
        # Si index_global = 5 (après 1.1.2), devenir 1.1.3
        # Si index_global = 7 (après 1.2.1), devenir 1.2.2
        # etc.
        
        # Trouver l'élément précédent du même type ou un parent
        prev_elements = [e for e in all_items if e.index_global < element.index_global]
        if not prev_elements:
            return "0.1"  # Première ligne spéciale
        
        # Récupérer le dernier numéro et incrémenter
        last_element = max(prev_elements, key=lambda x: x.index_global)
        
        # Logique complexe selon le contexte...
        # À simplifier
        return generate_numero_for_special_line(element, all_items)
```

---

## 🎯 **SIMPLIFICATION POUR LES LIGNES SPÉCIALES**

**Option 1 : Numéro à part**

Les lignes spéciales peuvent avoir un numéro **indépendant** :

```
1   | Partie         | Peinture                | 1
2   | Sous-partie    | Peinture > Intérieur    | 1.1
3   | Ligne détail   | Peinture > Intérieur >  | 1.1.1
4   | 🟦 Ligne spé   | REMISE 10%              | SP-1  ← Numéro spécial
5   | Sous-partie    | Peinture > Extérieur    | 1.2
6   | 🟦 Ligne spé   | FRAIS TECHNIQUE         | SP-2
7   | Partie         | Plomberie               | 2
```

**Option 2 : Continuer la hiérarchie**

Les lignes spéciales **continuent la hiérarchie** du dernier élément normal :

```
1   | Partie         | Peinture                | 1
2   | Sous-partie    | Peinture > Intérieur    | 1.1
3   | Ligne détail   | Peinture > Intérieur >  | 1.1.1
4   | 🟦 Ligne spé   | REMISE 10%              | 1.1.2  ← Continue
5   | Sous-partie    | Peinture > Extérieur    | 1.2
6   | 🟦 Ligne spé   | FRAIS TECHNIQUE         | 1.2.1  ← Continue
7   | Ligne détail   | Plomberie > ... > ...   | 2.1.1
8   | 🟦 Ligne spé   | TAXE                    | 2.1.2  ← Continue
```

**Recommandation : Option 2** (continue la hiérarchie)

---

## 🔄 **DRAG & DROP**

### **Logique**

1. **Déplacer** un élément → Changement de `index_global`
2. **Recalculer** tous les `numero` affectés
3. **Sauvegarder** les nouveaux `index_global`

```javascript
const handleDragEnd = (result) => {
  const newItems = Array.from(devisItems);
  const [moved] = newItems.splice(result.source.index, 1);
  newItems.splice(result.destination.index, 0, moved);
  
  // Mettre à jour index_global
  const updated = newItems.map((item, idx) => ({
    ...item,
    index_global: idx + 1
  }));
  
  // Recalculer tous les numéros
  const withNumeros = recalculateNumeros(updated);
  
  setDevisItems(withNumeros);
  saveToDatabase(withNumeros);
};
```

---

## 💾 **AVANTAGES**

1. ✅ **Un seul champ** : `index_global` pour tout
2. ✅ **Drag & drop simple** : Juste réordonner par index
3. ✅ **Numérotation auto** : Pas de gestion manuelle
4. ✅ **Flexibilité** : Lignes spéciales partout
5. ✅ **Persistance** : Sauvegarde directe en BDD
6. ✅ **Performance** : Pas de calculs complexes

---

## 🚧 **INCONVÉNIENTS**

1. ⚠️ **Logique de numérotation** : Un peu complexe pour les lignes spéciales
2. ⚠️ **Rebuild complet** : Nécessite une refonte

---

## 🎯 **RECOMMANDATION**

**Cette approche est la plus propre !**

**Implémentation** :
1. Ajouter `index_global` à tous les models
2. Fonction `generate_numero(index_global, all_items)`
3. Drag & drop unifié par `index_global`
4. Sauvegarde des `index_global` en BDD

**Prêt à implémenter ?**

