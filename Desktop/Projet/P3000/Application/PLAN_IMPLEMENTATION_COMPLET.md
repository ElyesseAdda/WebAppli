# 📋 Plan d'Implémentation Complet - Index Global Unifié

## 🎯 **OBJECTIF FINAL**

Système unifié où **TOUS** les éléments (parties, sous-parties, lignes détails, lignes spéciales) ont un `index_global` unique et une numérotation hiérarchique automatique.

---

## 📊 **ARCHITECTURE FINALE**

### **Structure de Données**

```
devisItems = [
  { type: 'partie', id: 1, index_global: 1, numero: '1', ... },
  { type: 'sous_partie', id: 10, index_global: 2, numero: '1.1', partie_id: 1, ... },
  { type: 'ligne_detail', id: 100, index_global: 3, numero: '1.1.1', sous_partie_id: 10, ... },
  { type: 'ligne_speciale', id: 101, index_global: 4, numero: '1.1.2', ... },
  { type: 'partie', id: 2, index_global: 5, numero: '2', ... }
]
```

---

## 🔧 **PHASE 1 : BACKEND (Django)**

### **⚠️ COMPATIBILITÉ ASCENDANTE**

**IMPORTANT** : Les modèles `Partie`, `SousPartie`, `LigneDetail` sont des **catalogues globaux** (non liés à un devis spécifique). L'ajout de `index_global` et `numero` avec `default=0` et `blank=True` permet de garder la compatibilité avec les données existantes.

### **1.1 Modifier les Models**

**Fichier** : `api/models.py`

#### **Partie Model** (Catalogue Global - COMPATIBLE)
```python
class Partie(models.Model):
    titre = models.CharField(max_length=600, null=False, blank=False)
    type = models.CharField(max_length=50, default='PEINTURE')
    is_deleted = models.BooleanField(default=False, null=True, blank=True)
    
    # NOUVEAUX CHAMPS - COMPATIBLES avec données existantes
    index_global = models.IntegerField(
        default=0, 
        blank=True,
        help_text="Position dans le devis (0 = non utilisé dans système unifié)"
    )
    numero = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Numéro auto-généré: '1', '2', etc."
    )
    devis = models.ForeignKey(
        'Devis', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='parties_unifiees',
        help_text="Lien vers devis pour système unifié (null = catalogue)"
    )
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['titre', 'type'],
                condition=models.Q(is_deleted=False),
                name='unique_partie_active'
            )
        ]
```

#### **SousPartie Model** (Catalogue Global - COMPATIBLE)
```python
class SousPartie(models.Model):
    partie = models.ForeignKey(Partie, related_name='sous_parties', on_delete=models.CASCADE)
    description = models.CharField(max_length=600, null=True, blank=True)
    is_deleted = models.BooleanField(default=False, null=True, blank=True)
    
    # NOUVEAUX CHAMPS - COMPATIBLES avec données existantes
    index_global = models.IntegerField(
        default=0, 
        blank=True,
        help_text="Position dans le devis (0 = non utilisé dans système unifié)"
    )
    numero = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Numéro auto-généré: '1.1', '1.2', etc."
    )
    devis = models.ForeignKey(
        'Devis', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='sous_parties_unifiees',
        help_text="Lien vers devis pour système unifié (null = catalogue)"
    )
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['partie', 'description'],
                condition=models.Q(is_deleted=False),
                name='unique_sous_partie_active'
            )
        ]
```

#### **LigneDetail Model** (Catalogue Global - COMPATIBLE)
```python
class LigneDetail(models.Model):
    sous_partie = models.ForeignKey('SousPartie', related_name='lignes_details', on_delete=models.CASCADE)
    partie = models.ForeignKey('Partie', related_name='lignes_details', on_delete=models.CASCADE, null=True, blank=True)
    description = models.CharField(max_length=1000)
    unite = models.CharField(max_length=10)
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    is_deleted = models.BooleanField(default=False, null=True, blank=True)
    
    # Champs de coût existants
    cout_main_oeuvre = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cout_materiel = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    taux_fixe = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    marge = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # NOUVEAUX CHAMPS - COMPATIBLES avec données existantes
    index_global = models.IntegerField(
        default=0, 
        blank=True,
        help_text="Position dans le devis (0 = non utilisé dans système unifié)"
    )
    numero = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="Numéro auto-généré: '1.1.1', '1.1.2', etc."
    )
    devis = models.ForeignKey(
        'Devis', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='lignes_details_unifiees',
        help_text="Lien vers devis pour système unifié (null = catalogue)"
    )
    quantite = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=1,
        blank=True,
        help_text="Quantité pour système unifié"
    )
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['sous_partie', 'description', 'unite'],
                condition=models.Q(is_deleted=False),
                name='unique_ligne_detail_active'
            )
        ]
```

#### **Créer LigneSpeciale Model**
```python
class LigneSpeciale(models.Model):
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE)
    description = models.CharField(max_length=500)
    index_global = models.IntegerField(default=0, help_text="Position dans le devis (tous types confondus)")
    numero = models.CharField(max_length=50, blank=True, null=True)
    
    # Données de la ligne
    type_speciale = models.CharField(
        max_length=50,
        choices=[('reduction', 'Réduction'), ('addition', 'Addition'), ('display', 'Affichage')],
        default='display'
    )
    value_type = models.CharField(
        max_length=50,
        choices=[('fixed', 'Montant fixe'), ('percentage', 'Pourcentage')],
        default='fixed'
    )
    value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Pour les calculs en pourcentage
    base_calculation = models.JSONField(blank=True, null=True)
    
    # Styles
    styles = models.JSONField(default=dict, blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['index_global']
        verbose_name = 'Ligne spéciale'
        verbose_name_plural = 'Lignes spéciales'
```

---

### **1.2 Créer les Migrations**

**Commande** :
```bash
python manage.py makemigrations api
python manage.py migrate
```

**Migration à créer** : `XXXX_add_index_global_fields.py`

**✅ COMPATIBILITÉ GARANTIE** :
- Tous les champs ajoutés ont `default=0` et `blank=True`
- Les données existantes dans les catalogues ne seront **pas impactées**
- Les devis existants utilisant `parties_metadata` continuent de fonctionner
- Migration sans risque de perte de données

---

### **1.3 Utilitaires de Numérotation**

**Fichier** : `api/utils.py` (ajouter)

```python
def generate_numero_for_item(item, all_items):
    """
    Génère le numéro hiérarchique basé sur l'index_global
    Exemples: "1", "1.1", "1.1.1", "1.1.2", "2"
    """
    
    def find_parent_by_id(parent_id, all_items):
        return next((e for e in all_items if e.get('id') == parent_id), None)
    
    if item['type'] == 'partie':
        # Numéro de la partie : compter combien de parties avant
        parties_before = [e for e in all_items 
                         if e.get('type') == 'partie' 
                         and e.get('index_global', 0) < item.get('index_global', 0)]
        return str(len(parties_before) + 1)
    
    elif item['type'] == 'sous_partie':
        # Numéro de la sous-partie : trouver la partie parent
        partie = find_parent_by_id(item.get('partie_id'), all_items)
        if not partie:
            return "?.1"
        
        # Compter combien de sous-parties avant dans la même partie
        sous_parties_before = [e for e in all_items 
                              if e.get('type') == 'sous_partie' 
                              and e.get('partie_id') == item.get('partie_id')
                              and e.get('index_global', 0) < item.get('index_global', 0)]
        
        return f"{partie.get('numero', '?')}.{len(sous_parties_before) + 1}"
    
    elif item['type'] == 'ligne_detail':
        # Numéro de la ligne détail : trouver la sous-partie parent
        sous_partie = find_parent_by_id(item.get('sous_partie_id'), all_items)
        if not sous_partie:
            return "?.?.1"
        
        # Remonter jusqu'à la partie
        partie = find_parent_by_id(sous_partie.get('partie_id'), all_items)
        
        # Compter combien de lignes détails avant dans la même sous-partie
        lignes_before = [e for e in all_items 
                        if e.get('type') == 'ligne_detail' 
                        and e.get('sous_partie_id') == item.get('sous_partie_id')
                        and e.get('index_global', 0) < item.get('index_global', 0)]
        
        return f"{sous_partie.get('numero', '?.?')}.{len(lignes_before) + 1}"
    
    else:  # ligne_speciale
        # Numéro de la ligne spéciale : continuer la hiérarchie du précédent
        previous_items = [e for e in all_items 
                         if e.get('index_global', 0) < item.get('index_global', 0)]
        
        if not previous_items:
            return "0.1"  # Première ligne
        
        last_item = previous_items[-1]
        last_numero = last_item.get('numero', '0')
        
        # Incrémenter le dernier niveau de la numérotation
        parts = last_numero.split('.')
        if len(parts) == 1:
            # Après une partie : X.1
            return f"{parts[0]}.1"
        elif len(parts) == 2:
            # Après une sous-partie : X.Y.1
            return f"{parts[0]}.{parts[1]}.1"
        else:
            # Après une ligne détail : incrémenter le dernier
            last_part = parts[-1]
            try:
                incremented = str(int(last_part) + 1)
                new_parts = parts[:-1] + [incremented]
                return '.'.join(new_parts)
            except ValueError:
                return f"{'.'.join(parts[:-1])}.{int(parts[-1]) + 1}"


def recalculate_all_numeros(all_items):
    """
    Recalcule tous les numéros hiérarchiques pour une liste d'éléments
    """
    # Trier par index_global
    sorted_items = sorted(all_items, key=lambda x: x.get('index_global', 0))
    
    # Générer le numéro pour chaque élément
    result = []
    for item in sorted_items:
        numero = generate_numero_for_item(item, sorted_items)
        result.append({**item, 'numero': numero})
    
    return result
```

---

### **1.4 Serializers**

**Fichier** : `api/serializers.py` (modifier)

#### **DevisSerializer** (Mode Dual - Ancien/Nouveau)
```python
class DevisSerializer(serializers.ModelSerializer):
    # ... champs existants
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # DÉTECTION DU MODE
        # Si le devis a des parties/sous-parties/lignes avec index_global > 0, utiliser le nouveau système
        has_unified_items = (
            Partie.objects.filter(devis=instance, index_global__gt=0).exists() or
            SousPartie.objects.filter(devis=instance, index_global__gt=0).exists() or
            LigneDetail.objects.filter(devis=instance, index_global__gt=0).exists()
        )
        
        if has_unified_items:
            # NOUVEAU SYSTÈME : Utiliser index_global
            data['items'] = self._get_unified_items(instance)
            data['mode'] = 'unified'
        else:
            # ANCIEN SYSTÈME : Utiliser parties_metadata
            data['items'] = self._get_legacy_items(instance)
            data['mode'] = 'legacy'
        
        return data
    
    def _get_unified_items(self, instance):
        """Nouveau système avec index_global"""
        # Charger tous les éléments avec leurs index_global
        parties = Partie.objects.filter(devis=instance, index_global__gt=0).order_by('index_global')
        sous_parties = SousPartie.objects.filter(devis=instance, index_global__gt=0).order_by('index_global')
        lignes_details = LigneDetail.objects.filter(devis=instance, index_global__gt=0).order_by('index_global')
        lignes_speciales = LigneSpeciale.objects.filter(devis=instance).order_by('index_global')
        
        # Fusionner et retourner dans l'ordre
        all_items = []
        
        # Convertir en structure unifiée
        for partie in parties:
            all_items.append({
                'type': 'partie',
                'id': partie.id,
                'index_global': partie.index_global,
                'numero': partie.numero,
                'titre': partie.titre,
                # ... autres champs
            })
        
        for sp in sous_parties:
            all_items.append({
                'type': 'sous_partie',
                'id': sp.id,
                'index_global': sp.index_global,
                'numero': sp.numero,
                'partie_id': sp.partie_id,
                'titre': sp.titre,
                # ... autres champs
            })
        
        for ld in lignes_details:
            all_items.append({
                'type': 'ligne_detail',
                'id': ld.id,
                'index_global': ld.index_global,
                'numero': ld.numero,
                'sous_partie_id': ld.sous_partie_id,
                'description': ld.description,
                # ... autres champs
            })
        
        for ls in lignes_speciales:
            all_items.append({
                'type': 'ligne_speciale',
                'id': ls.id,
                'index_global': ls.index_global,
                'numero': ls.numero,
                'description': ls.description,
                'type_speciale': ls.type_speciale,
                'value_type': ls.value_type,
                'value': str(ls.value),
                'base_calculation': ls.base_calculation,
                'styles': ls.styles,
            })
        
        # Tri par index_global et recalcul des numéros
        all_items = recalculate_all_numeros(all_items)
        
        return all_items
    
    def _get_legacy_items(self, instance):
        """Ancien système avec parties_metadata"""
        from api.models import LigneDetail
        
        items = []
        parties_metadata = instance.parties_metadata or {}
        selected_parties = parties_metadata.get('selectedParties', [])
        
        for partie_data in selected_parties:
            # Partie
            items.append({
                'type': 'partie',
                'id': partie_data['id'],
                'index_global': len(items) + 1,
                'titre': partie_data.get('titre'),
                'mode': 'legacy'
            })
            
            # Sous-parties
            for sp_data in partie_data.get('sousParties', []):
                items.append({
                    'type': 'sous_partie',
                    'id': sp_data['id'],
                    'index_global': len(items) + 1,
                    'partie_id': partie_data['id'],
                    'description': sp_data.get('description'),
                    'mode': 'legacy'
                })
                
                # Lignes détails
                for ld_id in sp_data.get('lignesDetails', []):
                    try:
                        ligne = LigneDetail.objects.get(id=ld_id)
                        items.append({
                            'type': 'ligne_detail',
                            'id': ligne.id,
                            'index_global': len(items) + 1,
                            'sous_partie_id': sp_data['id'],
                            'description': ligne.description,
                            'prix': str(ligne.prix),
                            'mode': 'legacy'
                        })
                    except LigneDetail.DoesNotExist:
                        pass
        
        # Ajouter lignes spéciales v2
        lignes_speciales_v2 = instance.lignes_speciales_v2 or {}
        for ls in lignes_speciales_v2.get('pending', []) + lignes_speciales_v2.get('placed', []):
            items.append({
                'type': 'ligne_speciale',
                'id': ls.get('id'),
                'index_global': len(items) + 1,
                'description': ls.get('description'),
                'styles': ls.get('styles', {}),
                'mode': 'legacy'
            })
        
        return recalculate_all_numeros(items)
```

---

### **1.5 Endpoints API**

**Fichier** : `api/views.py` (ajouter)

```python
@api_view(['POST'])
def update_devis_order(request, devis_id):
    """
    Met à jour l'ordre (index_global) de tous les éléments d'un devis
    """
    try:
        devis = Devis.objects.get(id=devis_id)
        items = request.data.get('items', [])
        
        # Mettre à jour index_global pour chaque type
        for item in items:
            item_type = item.get('type')
            item_id = item.get('id')
            index_global = item.get('index_global')
            
            if item_type == 'partie':
                Partie.objects.filter(id=item_id, devis=devis).update(index_global=index_global)
            elif item_type == 'sous_partie':
                SousPartie.objects.filter(id=item_id, partie__devis=devis).update(index_global=index_global)
            elif item_type == 'ligne_detail':
                LigneDetail.objects.filter(id=item_id, sous_partie__partie__devis=devis).update(index_global=index_global)
            elif item_type == 'ligne_speciale':
                LigneSpeciale.objects.filter(id=item_id, devis=devis).update(index_global=index_global)
        
        # Recalculer les numéros
        # ... logique de recalcul
        
        return Response({'status': 'success'}, status=200)
    
    except Devis.DoesNotExist:
        return Response({'error': 'Devis not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
def create_ligne_speciale(request, devis_id):
    """
    Créer une nouvelle ligne spéciale
    """
    try:
        devis = Devis.objects.get(id=devis_id)
        
        # Trouver le prochain index_global
        max_index = LigneSpeciale.objects.filter(devis=devis).aggregate(
            Max('index_global')
        )['index_global__max'] or 0
        
        ligne_speciale = LigneSpeciale.objects.create(
            devis=devis,
            index_global=max_index + 1,
            description=request.data.get('description'),
            type_speciale=request.data.get('type_speciale', 'display'),
            value_type=request.data.get('value_type', 'fixed'),
            value=request.data.get('value', 0),
            base_calculation=request.data.get('base_calculation'),
            styles=request.data.get('styles', {})
        )
        
        # Recalculer les numéros
        # ...
        
        return Response({'id': ligne_speciale.id, 'status': 'created'}, status=201)
    
    except Exception as e:
        return Response({'error': str(e)}, status=400)
```

---

### **1.6 URLs**

**Fichier** : `api/urls.py` (ajouter)

```python
path('devis/<int:devis_id>/update-order/', update_devis_order, name='update_devis_order'),
path('devis/<int:devis_id>/ligne-speciale/create/', create_ligne_speciale, name='create_ligne_speciale'),
```

---

## 🎨 **PHASE 2 : FRONTEND**

### **2.1 État Unifié dans DevisAvance.js**

**Fichier** : `frontend/src/components/DevisAvance.js`

#### **Ajouter état**
```javascript
const [devisItems, setDevisItems] = useState([]);
const [devisMode, setDevisMode] = useState('legacy'); // 'legacy' ou 'unified'
const [isLoadingDevis, setIsLoadingDevis] = useState(false);
```

#### **Fonction de chargement (Compatible Ancien/Nouveau)**
```javascript
const loadDevis = async (devisId) => {
  setIsLoadingDevis(true);
  try {
    const response = await axios.get(`/api/devis/${devisId}/`);
    const data = response.data;
    
    // Le backend détecte automatiquement le mode et renvoie 'items' et 'mode'
    setDevisItems(data.items || []);
    setDevisMode(data.mode || 'legacy');
    
    // Si mode legacy, conserver les anciennes structures pour compatibilité
    if (data.mode === 'legacy') {
      const parties = data.items.filter(item => item.type === 'partie');
      setSelectedParties(parties);
    }
    
    console.log(`Devis chargé en mode: ${data.mode}`);
    
  } catch (error) {
    console.error('Erreur chargement devis:', error);
  } finally {
    setIsLoadingDevis(false);
  }
};
```

#### **Fonction de recalcul des numéros**
```javascript
const recalculateNumeros = (items) => {
  // Implémenter la logique de recalcul côté frontend
  // (similaire à recalculate_all_numeros du backend)
  
  const sorted = [...items].sort((a, b) => a.index_global - b.index_global);
  const result = [];
  
  for (const item of sorted) {
    const numero = generateNumero(item, sorted);
    result.push({ ...item, numero });
  }
  
  return result;
};

const generateNumero = (item, allItems) => {
  // Logique identique au backend
  // ...
};
```

#### **Handler de drag & drop unifié**
```javascript
const handleDevisItemsReorder = (reorderedItems) => {
  // Mettre à jour index_global
  const updated = reorderedItems.map((item, index) => ({
    ...item,
    index_global: index + 1
  }));
  
  // Recalculer les numéros
  const withNumeros = recalculateNumeros(updated);
  
  setDevisItems(withNumeros);
  
  // Sauvegarder en BDD
  saveOrderToDatabase(withNumeros);
};

const saveOrderToDatabase = async (items) => {
  try {
    await axios.post(`/api/devis/${devisData.id}/update-order/`, {
      items: items.map(item => ({
        type: item.type,
        id: item.id,
        index_global: item.index_global
      }))
    });
  } catch (error) {
    console.error('Erreur sauvegarde ordre:', error);
  }
};
```

---

### **2.2 Render Unifié dans DevisTable.js**

**Fichier** : `frontend/src/components/Devis/DevisTable.js`

#### **Props à recevoir**
```javascript
const DevisTable = ({
  devisItems,  // Nouvelle prop unifiée
  onDevisItemsReorder,  // Handler de réordonnancement
  formatMontantEspace,
  // ... autres props existantes
}) => {
```

#### **Render principal**
```javascript
return (
  <DragDropContext onDragEnd={handleDragEndUnified}>
    <Droppable droppableId="all-devis-items">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
        >
          {devisItems
            .sort((a, b) => a.index_global - b.index_global)
            .map((item, index) => (
              <Draggable
                key={`${item.type}_${item.id}`}
                draggableId={`${item.type}_${item.id}`}
                index={index}
              >
                {(provided, snapshot) => {
                  // Calculer la profondeur pour l'indentation
                  const depth = getItemDepth(item);
                  
                  switch (item.type) {
                    case 'partie':
                      return (
                        <PartieRow
                          partie={item}
                          provided={provided}
                          snapshot={snapshot}
                          depth={0}
                          // ... autres props
                        />
                      );
                    
                    case 'sous_partie':
                      return (
                        <SousPartieRow
                          sousPartie={item}
                          provided={provided}
                          snapshot={snapshot}
                          depth={1}
                          // ... autres props
                        />
                      );
                    
                    case 'ligne_detail':
                      return (
                        <LigneDetailRow
                          ligne={item}
                          provided={provided}
                          snapshot={snapshot}
                          depth={2}
                          // ... autres props
                        />
                      );
                    
                    case 'ligne_speciale':
                      return (
                        <LigneSpecialeRow
                          line={item}
                          provided={provided}
                          snapshot={snapshot}
                          depth={depth}
                          formatMontantEspace={formatMontantEspace}
                        />
                      );
                    
                    default:
                      return null;
                  }
                }}
              </Draggable>
            ))}
          
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  </DragDropContext>
);
```

#### **Handler drag end**
```javascript
const handleDragEndUnified = (result) => {
  if (!result.destination) return;
  
  const newItems = Array.from(devisItems);
  const [moved] = newItems.splice(result.source.index, 1);
  newItems.splice(result.destination.index, 0, moved);
  
  if (onDevisItemsReorder) {
    onDevisItemsReorder(newItems);
  }
};
```

#### **Helper pour la profondeur**
```javascript
const getItemDepth = (item) => {
  if (item.type === 'partie') return 0;
  if (item.type === 'sous_partie') return 1;
  if (item.type === 'ligne_detail') return 2;
  if (item.type === 'ligne_speciale') {
    // La profondeur dépend du contexte (retrouver le dernier élément normal avant)
    const index = devisItems.findIndex(i => i.id === item.id);
    const previousItems = devisItems.slice(0, index);
    
    for (let i = previousItems.length - 1; i >= 0; i--) {
      if (previousItems[i].type === 'ligne_detail') return 2;
      if (previousItems[i].type === 'sous_partie') return 1;
      if (previousItems[i].type === 'partie') return 0;
    }
    
    return 0;  // Par défaut au niveau des parties
  }
  
  return 0;
};
```

---

### **2.3 Composant LigneSpecialeRow**

**Fichier** : `frontend/src/components/Devis/LignesSpeciales/LigneSpecialeRow.js` (créer)

```javascript
import React from 'react';
import { Draggable } from 'react-beautiful-dnd';

const LigneSpecialeRow = ({ line, provided, snapshot, depth, formatMontantEspace }) => {
  const calculateAmount = () => {
    if (line.value_type === 'percentage' && line.base_calculation) {
      const baseAmount = line.base_calculation.amount || 0;
      const percentage = parseFloat(line.value || 0);
      return (baseAmount * percentage) / 100;
    }
    return parseFloat(line.value || 0);
  };

  const amount = calculateAmount();
  const indent = depth * 20;

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      style={{
        ...provided.draggableProps.style,
        marginLeft: `${indent}px`,
        marginBottom: '8px'
      }}
    >
      <div
        style={{
          backgroundColor: line.styles?.backgroundColor || 'rgba(27, 120, 188, 1)',
          color: line.styles?.color || 'white',
          fontWeight: line.styles?.fontWeight || 'bold',
          padding: '15px 20px',
          fontSize: '16px',
          borderRadius: '4px',
          borderLeft: line.styles?.borderLeft || 'none',
          fontStyle: line.styles?.fontStyle || 'normal',
          textDecoration: line.styles?.textDecoration || 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: snapshot.isDragging ? 'grabbing' : 'grab',
          opacity: snapshot.isDragging ? 0.8 : 1,
          boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            {...provided.dragHandleProps}
            style={{
              cursor: 'grab',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontSize: '20px'
            }}
          >
            ⋮⋮
          </div>
          <span>{line.description || 'Ligne spéciale'}</span>
        </div>
        <span
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: line.type_speciale === 'reduction' ? '#d32f2f' :
                   line.type_speciale === 'addition' ? '#1976d2' : '#9e9e9e'
          }}
        >
          {line.type_speciale === 'reduction' && '-'}
          {formatMontantEspace(amount)} €
        </span>
      </div>
    </div>
  );
};

export default LigneSpecialeRow;
```

---

## 🧪 **PHASE 3 : MIGRATION DES DONNÉES**

### **3.1 Script de Migration**

**Fichier** : `api/management/commands/migrate_to_index_global.py`

```python
from django.core.management.base import BaseCommand
from api.models import Devis, Partie, SousPartie, LigneDetail

class Command(BaseCommand):
    help = 'Migre les données existantes vers le système index_global'

    def handle(self, *args, **options):
        devis_list = Devis.objects.all()
        
        for devis in devis_list:
            # Récupérer tous les éléments
            parties = Partie.objects.filter(devis=devis).order_by('ordre')
            sous_parties = SousPartie.objects.filter(partie__devis=devis)
            lignes_details = LigneDetail.objects.filter(sous_partie__partie__devis=devis)
            
            # Construire la liste unifiée
            items = []
            
            for partie in parties:
                items.append({
                    'type': 'partie',
                    'obj': partie,
                    'index': 0  # à calculer
                })
                
                sp_in_party = sous_parties.filter(partie=partie).order_by('ordre')
                for sp in sp_in_party:
                    items.append({
                        'type': 'sous_partie',
                        'obj': sp,
                        'index': 0
                    })
                    
                    ld_in_sp = lignes_details.filter(sous_partie=sp).order_by('id')
                    for ld in ld_in_sp:
                        items.append({
                            'type': 'ligne_detail',
                            'obj': ld,
                            'index': 0
                        })
            
            # Assigner index_global
            for i, item in enumerate(items):
                item['obj'].index_global = i + 1
                item['obj'].save()
            
            self.stdout.write(self.style.SUCCESS(
                f'✓ Devis {devis.id}: {len(items)} éléments migrés'
            ))
```

**Commande** :
```bash
python manage.py migrate_to_index_global
```

---

## ✅ **PHASE 4 : Nettoyage**

### **Fichiers à supprimer/déprécier**
- `pendingSpecialLines` / `placedSpecialLines` (états)
- Composants `PendingSpecialLines`, `DraggableSpecialLine` (anciens)
- Logique `trackedDropPosition`, `handleDragUpdate`
- `data-element-*` attributes
- Modal de création inline

---

## 📊 **RÉSUMÉ DU PLAN**

| Phase | Tâches | Fichiers | Estimation |
|-------|--------|----------|------------|
| **1. Backend** | Models, Utils, Serializers, API | `models.py`, `utils.py`, `serializers.py`, `views.py`, `urls.py` | 2h |
| **2. Frontend** | État, Render, Composants | `DevisAvance.js`, `DevisTable.js`, `LigneSpecialeRow.js` | 2h |
| **3. Migration** | Script migration données (optionnel) | `management/commands/` | 30min |
| **4. Nettoyage** | Suppression ancien code (après migration) | Divers | 30min |

**Total** : ~5h

---

## ✅ **GARANTIES DE COMPATIBILITÉ**

### **✓ Données Existantes**
- **Catalogues** : Aucune modification des parties/sous-parties/lignes existantes
- **Devis en cours** : Continuent de fonctionner via `parties_metadata`
- **Index_global = 0** : Indique que l'élément n'utilise pas le nouveau système

### **✓ Fonctionnement Dual**
- **Mode Legacy** : Détection automatique (`index_global = 0`)
  - Lecture depuis `parties_metadata`
  - Sauvegarde dans `parties_metadata`
  - Frontend reçoit `mode: 'legacy'`
  
- **Mode Unified** : Détection automatique (`index_global > 0`)
  - Lecture depuis `index_global` des modèles
  - Sauvegarde dans `index_global` des modèles
  - Frontend reçoit `mode: 'unified'`

### **✓ Migration Progressive**
- **Non obligatoire** : Les devis peuvent rester en mode legacy indéfiniment
- **Optionnelle** : Script de migration disponible si besoin
- **Réversible** : Possible de revenir en arrière (copie `parties_metadata`)
- **Devis par devis** : Migration individuelle ou en masse

### **✓ Tests de Non-Régression**
1. Ouvrir un ancien devis → Doit afficher correctement (mode legacy)
2. Modifier un ancien devis → Doit sauvegarder dans `parties_metadata`
3. Créer un nouveau devis → Peut utiliser mode unified
4. Drag & drop ancien devis → Mode legacy
5. Drag & drop nouveau devis → Mode unified
6. Lignes spéciales v2 → Compatible avec les deux modes

---

## 🎯 **VALIDATION**

**Souhaitez-vous que je commence l'implémentation ?**

**Commandes pour exécution** :
```bash
# Phase 1 : Backend
python manage.py makemigrations api
python manage.py migrate
python manage.py migrate_to_index_global

# Phase 2 : Frontend (build automatique)
npm run build

# Test
python manage.py runserver
```

**Je commence quand vous me donnez le feu vert !** 🚀
