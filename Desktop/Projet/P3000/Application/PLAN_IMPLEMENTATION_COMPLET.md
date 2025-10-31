# 📋 Plan d'Implémentation Complet - Lignes Spéciales

## 🎯 **Objectifs**

1. ✅ Système de lignes spéciales flexible et personnalisable
2. ✅ Preview en temps réel
3. ✅ Drag & Drop pour positionnement précis
4. ✅ Couleurs persistantes
5. ✅ Compatibilité totale avec les anciens devis

---

## 📚 **Documentation Créée**

| Document | Contenu |
|----------|---------|
| `SYSTEME_LIGNES_SPECIALES_DOCUMENTATION.md` | Documentation du système actuel |
| `SOLUTIONS_LIGNES_SPECIALES_AMELIOREES.md` | Solutions détaillées aux problèmes |
| `RESUME_SOLUTIONS_LIGNES_SPECIALES.md` | Résumé visuel des solutions |
| `WORKFLOW_LIGNES_SPECIALES_AMELIORATION.md` | Workflow avec preview et couleurs |
| `COMPATIBILITE_ANCIENS_DEVIS.md` | Gestion dual mode pour anciens devis |
| `PLAN_IMPLEMENTATION_COMPLET.md` | Ce document (vue d'ensemble) |

---

## 🗺️ **Architecture Globale**

```
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Django)                         │
├─────────────────────────────────────────────────────────────┤
│  Models:                                                     │
│  ├── Devis                                                    │
│  │   ├── lignes_speciales (ancien) ✅                        │
│  │   ├── lignes_speciales_v2 (nouveau) ⏳                    │
│  │   └── version_systeme_lignes ⏳                           │
│  ├── Color (nouveau) ⏳                                       │
│  │   ├── user                                                 │
│  │   ├── name                                                 │
│  │   ├── hex_value                                            │
│  │   └── usage_count                                          │
│                                                              │
│  Views:                                                      │
│  ├── get_devis (détecte version) ⏳                          │
│  ├── save_devis (sauvegarde selon version) ⏳                 │
│  ├── colors_list ⏳                                           │
│  └── migrate_special_lines (commande) ⏳                      │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
├─────────────────────────────────────────────────────────────┤
│  Components:                                                 │
│  ├── DevisAvance.js (État global) ⏳                         │
│  ├── DevisTable.js (Rendu) ⏳                                │
│  ├── SpecialLinesCreator.js ⏳                               │
│  │   ├── Zone de création directe                           │
│  │   ├── Inputs (description, value, type)                  │
│  │   └── Bouton "Ajouter"                                   │
│  ├── SpecialLinePreview.js ⏳                                │
│  │   └── Aperçu en temps réel                               │
│  ├── PendingSpecialLines.js ⏳                               │
│  │   └── Zone de stockage des lignes                        │
│  ├── DraggableSpecialLine.js ⏳                              │
│  │   ├── Ligne draggable                                    │
│  │   └── Actions (Éditer, Supprimer)                        │
│  ├── ColorPicker.js ⏳                                       │
│  │   ├── Couleurs enregistrées                              │
│  │   ├── Couleurs de base                                   │
│  │   └── Color picker HTML5                                 │
│  ├── ColorModal.js ⏳                                        │
│  │   └── Sauvegarder couleur                                │
│  └── SpecialLineEditModal.js ⏳                              │
│      ├── Édition description/valeur                         │
│      ├── Personnalisation styles                            │
│      └── Preview temps réel                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 **TODOs Détaillés**

### **Phase 1 : Backend** 🔴

#### **1.1 Modèles Django**

```python
# api/models.py
class Devis(models.Model):
    # ... champs existants ...
    
    # Ancien système (conservé)
    lignes_speciales = models.JSONField(default=dict, blank=True)
    
    # Nouveau système (à ajouter)
    lignes_speciales_v2 = models.JSONField(default=dict, blank=True, null=True)
    version_systeme_lignes = models.IntegerField(default=1, choices=[(1, 'Ancien'), (2, 'Nouveau')])
    
    # Méthodes
    def has_legacy_special_lines(self):
        return self.version_systeme_lignes == 1
    
    def get_special_lines_for_display(self):
        if self.has_legacy_special_lines():
            return self._convert_legacy_to_new_format()
        return self.lignes_speciales_v2 or {'items': []}

class Color(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    hex_value = models.CharField(max_length=7)
    created_at = models.DateTimeField(auto_now_add=True)
    usage_count = models.IntegerField(default=0)
```

- [ ] Créer migration pour `lignes_speciales_v2`
- [ ] Créer migration pour `version_systeme_lignes`
- [ ] Créer modèle `Color`
- [ ] Créer migration pour `Color`
- [ ] Ajouter méthodes de conversion
- [ ] Créer serializer `ColorSerializer`

#### **1.2 API Endpoints**

```python
# api/views.py
@api_view(['GET'])
def get_devis(request, devis_id):
    # Retourner devis avec format approprié
    ...

@api_view(['POST'])
def save_devis(request, devis_id):
    # Sauvegarder selon version
    ...

@api_view(['GET', 'POST'])
def colors_list(request):
    # Liste/création des couleurs
    ...

@api_view(['POST'])
def increment_color_usage(request, color_id):
    # Incrémenter usage
    ...
```

- [ ] Modifier `get_devis` pour détecter version
- [ ] Modifier `save_devis` pour sauvegarder selon version
- [ ] Créer `colors_list` endpoint
- [ ] Créer `increment_color_usage` endpoint
- [ ] Tester tous les endpoints

#### **1.3 Script de Migration**

```bash
# api/management/commands/migrate_special_lines.py
python manage.py migrate_special_lines --dry-run
python manage.py migrate_special_lines
```

- [ ] Créer commande de migration
- [ ] Tester sur devis de test
- [ ] Créer backup automatique
- [ ] Documenter la procédure

---

### **Phase 2 : Frontend - Composants de Base** 🟡

#### **2.1 DevisAvance.js**

- [ ] Ajouter état `specialLinesNew` pour nouveau système
- [ ] Ajouter état `specialLinesLegacy` pour ancien
- [ ] Créer fonction `detectVersion()`
- [ ] Créer fonction `convertLegacyToNew()`
- [ ] Modifier `handleSaveDevis()` pour dual mode
- [ ] Gérer chargement selon version

#### **2.2 DevisTable.js**

- [ ] Ajouter prop `isLegacy`
- [ ] Créer `renderLegacySpecialLines()`
- [ ] Créer `renderNewSpecialLines()`
- [ ] Intégrer `SpecialLinesCreator` en bas
- [ ] Gérer drop zones pour drag & drop

---

### **Phase 3 : Composants Nouveaux** 🟢

#### **3.1 SpecialLinesCreator.js**

```javascript
const SpecialLinesCreator = () => {
  const [newLine, setNewLine] = useState({...});
  
  return (
    <div className="special-lines-creator">
      {/* Zone de saisie */}
      <div className="creation-form">
        <input placeholder="Description..." />
        <input type="number" />
        <RadioGroup type="valueType" />
        <RadioGroup type="operation" />
        <button onClick={handleAddToPending}>
          + Ajouter ligne spéciale
        </button>
      </div>
      
      {/* Preview temps réel */}
      <SpecialLinePreview line={newLine} />
    </div>
  );
};
```

- [ ] Créer composant
- [ ] Intégrer inputs
- [ ] Intégrer SpecialLinePreview
- [ ] Gérer ajout à pending
- [ ] Styliser

#### **3.2 SpecialLinePreview.js**

```javascript
const SpecialLinePreview = ({ line }) => {
  return (
    <table className="preview-table">
      <tr style={{
        fontWeight: line.styles?.fontWeight,
        backgroundColor: line.styles?.backgroundColor,
        ...
      }}>
        {/* Rendu de la ligne */}
      </tr>
    </table>
  );
};
```

- [ ] Créer composant
- [ ] Appliquer styles
- [ ] Calculer montant
- [ ] Styliser

#### **3.3 PendingSpecialLines.js**

```javascript
const PendingSpecialLines = ({ lines, onRemove, onEdit }) => {
  return (
    <div className="pending-lines">
      {lines.map(line => (
        <DraggableSpecialLine 
          key={line.id}
          line={line}
          onEdit={() => onEdit(line)}
          onRemove={() => onRemove(line.id)}
        />
      ))}
    </div>
  );
};
```

- [ ] Créer composant
- [ ] Intégrer DraggableSpecialLine
- [ ] Gérer actions
- [ ] Styliser

#### **3.4 DraggableSpecialLine.js**

```javascript
const DraggableSpecialLine = ({ line, onEdit, onRemove }) => {
  return (
    <Draggable draggableId={line.id} index={index}>
      <div className="draggable-line">
        <IconButton>⋮⋮</IconButton>
        <span>{line.data.description}</span>
        <IconButton onClick={onEdit}>✏️</IconButton>
        <IconButton onClick={onRemove}>X</IconButton>
      </div>
    </Draggable>
  );
};
```

- [ ] Créer composant
- [ ] Intégrer react-beautiful-dnd
- [ ] Ajouter actions
- [ ] Styliser

---

### **Phase 4 : Personnalisation Visuelle** 🟣

#### **4.1 ColorPicker.js**

```javascript
const ColorPicker = ({ value, onChange, userId }) => {
  const [customColors, setCustomColors] = useState([]);
  
  useEffect(() => {
    // Charger couleurs de l'utilisateur
    axios.get('/api/colors/').then(...);
  }, [userId]);
  
  return (
    <div className="color-picker">
      {/* Couleurs enregistrées */}
      <div className="custom-colors">
        {customColors.map(color => ...)}
      </div>
      
      {/* Couleurs de base */}
      <div className="default-colors">
        {defaultColors.map(color => ...)}
      </div>
      
      {/* Color picker HTML5 */}
      <input type="color" />
    </div>
  );
};
```

- [ ] Créer composant
- [ ] Intégrer API colors
- [ ] Ajouter couleurs de base
- [ ] Color picker HTML5
- [ ] Styliser

#### **4.2 ColorModal.js**

```javascript
const ColorModal = ({ open, onClose, color, onSave }) => {
  const [name, setName] = useState('');
  
  return (
    <Dialog open={open}>
      <DialogTitle>Sauvegarder couleur</DialogTitle>
      <DialogContent>
        <TextField 
          label="Nom"
          value={name}
          onChange={...}
        />
        <Box 
          style={{
            backgroundColor: color,
            width: '100%',
            height: '50px'
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={() => onSave(name)}>Sauvegarder</Button>
      </DialogActions>
    </Dialog>
  );
};
```

- [ ] Créer composant
- [ ] Input nom
- [ ] Preview couleur
- [ ] Intégrer avec API
- [ ] Styliser

#### **4.3 SpecialLineEditModal.js**

```javascript
const SpecialLineEditModal = ({ open, line, onClose, onSave }) => {
  const [editedLine, setEditedLine] = useState(line);
  
  return (
    <Dialog open={open}>
      <DialogTitle>Éditer ligne spéciale</DialogTitle>
      <DialogContent>
        {/* Inputs de base */}
        <TextField label="Description" />
        <RadioGroup type="valueType" />
        <RadioGroup type="operation" />
        
        {/* Styles */}
        <Accordion>
          <AccordionSummary>Styles personnalisés</AccordionSummary>
          <AccordionDetails>
            <Checkbox label="Gras" />
            <Checkbox label="Italique" />
            <ColorPicker label="Couleur texte" />
            <ColorPicker label="Couleur fond" />
            <RadioGroup label="Alignement" />
          </AccordionDetails>
        </Accordion>
        
        {/* Preview temps réel */}
        <SpecialLinePreview line={editedLine} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={onSave}>Sauvegarder</Button>
      </DialogActions>
    </Dialog>
  );
};
```

- [ ] Créer composant
- [ ] Intégrer inputs de base
- [ ] Intégrer ColorPicker
- [ ] Intégrer SpecialLinePreview
- [ ] Gérer sauvegarde
- [ ] Styliser

---

### **Phase 5 : Drag & Drop Global** 🔵

#### **5.1 Intégration react-beautiful-dnd**

```javascript
const DevisTable = ({ allItems, onReorder }) => {
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="devis-items">
        {provided => (
          <tbody ref={provided.innerRef} {...provided.droppableProps}>
            {allItems.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <tr ref={provided.innerRef} {...provided.draggableProps}>
                    {/* Render selon type */}
                  </tr>
                )}
              </Draggable>
            ))}
          </tbody>
        )}
      </Droppable>
    </DragDropContext>
  );
};
```

- [ ] Intégrer DragDropContext global
- [ ] Créer Droppable principal
- [ ] Gérer drop zones multi-niveaux
- [ ] Mettre à jour positions
- [ ] Recalculer totaux
- [ ] Tester drag & drop

---

### **Phase 6 : Template PDF** 🟠

#### **6.1 Modification preview_devis.html**

```django
{# Nouveau format #}
{% for item in devis.items %}
  {% if item.type == 'special_line' %}
    <tr style="
      font-weight: {{ item.styles.fontWeight|default:'normal' }};
      background-color: {{ item.styles.backgroundColor|default:'transparent' }};
      color: {{ item.styles.color|default:'#000000' }};
      border-left: {{ item.styles.borderLeft|default:'none' }};
      text-align: {{ item.styles.textAlign|default:'left' }};
    ">
      <td colspan="4">{{ item.data.description }}</td>
      <td>{{ item.montant }}</td>
    </tr>
  {% endif %}
{% endfor %}

{# Ancien format (backup) #}
{% if devis.version_systeme_lignes == 1 %}
  <!-- ... ancien rendu ... -->
{% endif %}
```

- [ ] Modifier template pour nouveau format
- [ ] Conserver ancien rendu
- [ ] Appliquer styles inline
- [ ] Tester génération PDF
- [ ] Vérifier qualité visuelle

---

## ✅ **Checklist Globale**

### **Backend**
- [ ] Modèles Django
- [ ] Migrations
- [ ] API Endpoints
- [ ] Serializers
- [ ] Script de migration
- [ ] Tests unitaires

### **Frontend**
- [ ] DevisAvance (dual mode)
- [ ] DevisTable (rendu dual)
- [ ] SpecialLinesCreator
- [ ] SpecialLinePreview
- [ ] PendingSpecialLines
- [ ] DraggableSpecialLine
- [ ] ColorPicker
- [ ] ColorModal
- [ ] SpecialLineEditModal
- [ ] Drag & Drop global

### **Template**
- [ ] Modification preview_devis.html
- [ ] Styles inline
- [ ] Support dual format
- [ ] Tests PDF

### **Tests**
- [ ] Anciens devis fonctionnent
- [ ] Nouveaux devis fonctionnent
- [ ] Conversion automatique
- [ ] Drag & Drop
- [ ] Personnalisation styles
- [ ] Couleurs persistantes
- [ ] Génération PDF

---

## 📅 **Planning Suggéré**

### **Semaine 1** : Backend + Base
- Jour 1-2 : Modèles et migrations
- Jour 3-4 : API endpoints
- Jour 5 : Tests backend

### **Semaine 2** : Frontend Composants
- Jour 1-2 : Composants de base (Creator, Preview, Pending)
- Jour 3-4 : Personnalisation (ColorPicker, EditModal)
- Jour 5 : Integration dans DevisTable

### **Semaine 3** : Drag & Drop + Tests
- Jour 1-2 : Drag & Drop global
- Jour 3 : Template PDF
- Jour 4-5 : Tests complets + corrections

---

## 🎯 **Critères de Succès**

✅ Les anciens devis s'affichent correctement
✅ Les nouveaux devis utilisent le nouveau système
✅ Conversion automatique transparente
✅ Drag & Drop fonctionne partout
✅ Preview temps réel opérationnel
✅ Styles appliqués dans PDF
✅ Couleurs persistantes fonctionnelles
✅ Pas de régression sur fonctionnalités existantes

---

## 🚀 **Prêt à Commencer !**

Tous les documents de référence sont prêts. On peut maintenant commencer l'implémentation étape par étape.

