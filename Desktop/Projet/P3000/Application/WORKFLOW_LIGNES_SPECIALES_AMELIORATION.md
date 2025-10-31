# 🎯 Workflow Amélioré - Lignes Spéciales

## 📋 **Changements Demandés**

### **1️⃣ Création Directe sans Modal**
- ❌ Supprimer le modal de sélection de position
- ✅ Zone de création en bas du devis avec input
- ✅ Ligne créée dans une "div de stockage"
- ✅ Drag & Drop pour positionner où l'utilisateur veut

### **2️⃣ Preview en Temps Réel**
- ✅ Voir le résultat visuel pendant la création
- ✅ Aperçu de la ligne avec styles appliqués

### **3️⃣ Système de Couleurs Persistant**
- ✅ Nouveau modèle `Color` en base de données
- ✅ Sauvegarder les couleurs utilisées
- ✅ Color picker avec historique des couleurs

---

## 🎨 **Solution 1 : Zone de Création Directe**

### **Interface Utilisateur**

```
┌─────────────────────────────────────────────────────────────────────┐
│  DEVIS                                                              │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ PARTIE : PEINTURE                                  2500 €    │ │
│  │ ─────────────────────────────────────────────────────────────│ │
│  │ - Ligne détail 1                          100 €              │ │
│  │ - Ligne détail 2                          150 €              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ PARTIE : ELECTRICITE                              1000 €    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                     │
│  📋 ZONE DE CRÉATION DE LIGNES SPÉCIALES                           │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ [Description _________________________] [Val:___] [%][€]     │ │
│  │ [● Réduction] [○ Addition] [○ Display]                       │ │
│  │                                                               │ │
│  │ ✅ PREVIEW :                                                   │ │
│  │ ┌───────────────────────────────────────────────────────────┐ │ │
│  │ │ Remise commerciale                            - 250.00 € │ │ │
│  │ └───────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │ [+ Ajouter ligne spéciale]                                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  📦 LIGNES SPÉCIALES EN ATTENTE (à placer)                         │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ [⋮⋮] Remise 10%         [✏️] [X]                             │ │
│  │ [⋮⋮] Frais transport    [✏️] [X]                             │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### **Structure de Composant**

```javascript
// Dans DevisTable.js ou composant dédié
const SpecialLinesCreator = () => {
  const [newLine, setNewLine] = useState({
    description: "",
    value: "",
    valueType: "percentage",
    type: "reduction",
    styles: {}
  });
  
  return (
    <div className="special-lines-creator">
      {/* Zone de saisie */}
      <div className="creation-form">
        <input 
          placeholder="Description..."
          value={newLine.description}
          onChange={...}
        />
        <input 
          type="number"
          value={newLine.value}
          onChange={...}
        />
        <button onClick={handleAddToPending}>+ Ajouter</button>
      </div>
      
      {/* Preview en temps réel */}
      <SpecialLinePreview line={newLine} />
      
      {/* Zone de stockage */}
      <div className="pending-lines">
        {pendingLines.map(line => (
          <DraggableSpecialLine key={line.id} line={line} />
        ))}
      </div>
    </div>
  );
};
```

---

## 🎨 **Solution 2 : Preview en Temps Réel**

### **Composant de Preview**

```javascript
const SpecialLinePreview = ({ line }) => {
  return (
    <div className="preview-container">
      <label>📋 Aperçu :</label>
      <table className="preview-table">
        <tbody>
          <tr style={{
            fontWeight: line.styles?.fontWeight || 'normal',
            fontStyle: line.styles?.fontStyle || 'normal',
            backgroundColor: line.styles?.backgroundColor || 'transparent',
            color: line.styles?.color || '#000000',
            borderLeft: line.styles?.borderLeft || 'none',
            textAlign: line.styles?.textAlign || 'left',
            padding: line.styles?.padding || '8px'
          }}>
            <td colSpan="4">
              {line.description || "Votre ligne spéciale"}
            </td>
            <td className="totalHttableau">
              {line.type === 'reduction' && '-'}
              {line.type !== 'display' 
                ? calculateAmount(line) 
                : line.value || '0.00'
              } €
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
```

### **Mise à Jour en Temps Réel**

```javascript
// Dans le formulaire
<input 
  value={newLine.description}
  onChange={(e) => setNewLine(prev => ({...prev, description: e.target.value}))}
  // ⚡ Preview se met à jour automatiquement
/>
```

---

## 🎨 **Solution 3 : Système de Couleurs Persistant**

### **Nouveau Modèle Django**

```python
# api/models.py
class Color(models.Model):
    """Couleurs sauvegardées pour réutilisation"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='colors')
    name = models.CharField(max_length=100)  # Ex: "Bleu clair", "Rouge alerte"
    hex_value = models.CharField(max_length=7)  # Ex: "#3d5afe"
    created_at = models.DateTimeField(auto_now_add=True)
    usage_count = models.IntegerField(default=0)  # Combien de fois utilisée
    
    class Meta:
        ordering = ['-usage_count', 'name']  # Plus utilisées en premier
    
    def __str__(self):
        return f"{self.name} ({self.hex_value})"
```

### **API Endpoints**

```python
# api/views.py
@api_view(['GET', 'POST'])
def colors_list(request):
    """Liste des couleurs de l'utilisateur"""
    if request.method == 'GET':
        colors = Color.objects.filter(user=request.user)
        return Response(serializers.ColorSerializer(colors, many=True).data)
    
    elif request.method == 'POST':
        # Créer une nouvelle couleur
        color = Color.objects.create(
            user=request.user,
            name=request.data.get('name'),
            hex_value=request.data.get('hex_value')
        )
        return Response(serializers.ColorSerializer(color).data, status=201)

@api_view(['POST'])
def increment_color_usage(request, color_id):
    """Incrémenter le compteur d'utilisation"""
    color = Color.objects.get(id=color_id, user=request.user)
    color.usage_count += 1
    color.save()
    return Response({'status': 'ok'})
```

### **Color Picker Amélioré**

```javascript
const ColorPicker = ({ value, onChange, userId }) => {
  const [customColors, setCustomColors] = useState([]);
  const [showCustomPalette, setShowCustomPalette] = useState(true);
  
  // Charger les couleurs de l'utilisateur
  useEffect(() => {
    axios.get(`/api/colors/`)
      .then(res => setCustomColors(res.data));
  }, [userId]);
  
  // Couleurs de base
  const defaultColors = [
    { name: 'Rouge', value: '#ff0000' },
    { name: 'Bleu', value: '#0000ff' },
    { name: 'Vert', value: '#00ff00' },
    { name: 'Jaune', value: '#ffff00' },
    { name: 'Orange', value: '#ffa500' },
    { name: 'Violet', value: '#800080' },
    { name: 'Rose', value: '#ffc0cb' },
    { name: 'Cyan', value: '#00ffff' },
    { name: 'Blanc', value: '#ffffff' },
    { name: 'Noir', value: '#000000' },
  ];
  
  const handleColorSelect = (color) => {
    onChange(color.value);
    // Incrémenter le compteur
    if (color.id) {
      axios.post(`/api/colors/${color.id}/increment/`);
    }
  };
  
  return (
    <div className="color-picker">
      {/* Couleurs personnalisées (plus utilisées en premier) */}
      {showCustomPalette && customColors.length > 0 && (
        <>
          <label>🎨 Mes couleurs ({customColors.length})</label>
          <div className="color-grid">
            {customColors.map(color => (
              <button
                key={color.id}
                onClick={() => handleColorSelect(color)}
                style={{
                  backgroundColor: color.hex_value,
                  border: value === color.hex_value ? '3px solid black' : '1px solid #ccc',
                }}
                title={`${color.name} (${color.usage_count} utilisations)`}
              >
                {value === color.hex_value && '✓'}
              </button>
            ))}
          </div>
        </>
      )}
      
      {/* Couleurs de base */}
      <label>🎨 Couleurs de base</label>
      <div className="color-grid">
        {defaultColors.map(color => (
          <button
            key={color.value}
            onClick={() => handleColorSelect(color)}
            style={{
              backgroundColor: color.value,
              border: value === color.value ? '3px solid black' : '1px solid #ccc',
            }}
            title={color.name}
          />
        ))}
      </div>
      
      {/* Color picker HTML5 */}
      <label>🎨 Personnalisée</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', height: '40px' }}
      />
      
      {/* Bouton pour sauvegarder la couleur actuelle */}
      <button 
        onClick={handleSaveCurrentColor}
        className="save-color-btn"
      >
        💾 Sauvegarder cette couleur
      </button>
    </div>
  );
};
```

---

## 🔄 **Workflow Complet**

### **Étape 1 : Création**
```
1. Utilisateur tape dans l'input "Remise 10%"
2. Select le type : Réduction
3. Enter la valeur : 10%
4. ✅ PREVIEW se met à jour en temps réel
5. Clique sur "Ajouter ligne spéciale"
6. Ligne ajoutée dans la zone "En attente"
```

### **Étape 2 : Positionnement**
```
1. Utilisateur glisse la ligne depuis "En attente"
2. Drop dans le devis (entre 2 lignes de détails)
3. Ligne insérée à la position
4. Calculs mis à jour automatiquement
```

### **Étape 3 : Styles**
```
1. Utilisateur clique sur ✏️ pour éditer
2. Modal d'édition s'ouvre
3. Applique des styles :
   - Gras ✓
   - Fond : Bleu clair (depuis couleurs enregistrées)
   - Bordure : Rouge alerte
4. ✅ PREVIEW se met à jour en temps réel
5. Sauvegarde
```

### **Étape 4 : Couleur Personnalisée**
```
1. Utilisateur choisi une couleur via color picker
2. Clique sur "💾 Sauvegarder cette couleur"
3. Modal demande un nom : "Bleu clair"
4. Couleur sauvegardée en DB
5. Apparaît dans "Mes couleurs" pour les prochains devis
```

---

## 📐 **Structure de Code**

### **Nouveaux Composants**

```
frontend/src/components/Devis/
├── SpecialLinesCreator.js         # Zone de création
├── SpecialLinePreview.js          # Aperçu temps réel
├── PendingSpecialLines.js         # Zone de stockage
├── DraggableSpecialLine.js        # Ligne draggable
├── ColorPicker.js                 # Sélecteur de couleurs
└── ColorModal.js                  # Sauvegarder couleur
```

### **Modifications**

```
DevisTable.js
├── Intégrer <SpecialLinesCreator /> en bas
├── Gérer Drop zones pour lignes spéciales
└── Rendre lignes spéciales avec Drag & Drop

DevisAvance.js
├── État pour pendingLines
├── Handlers pour création/édition
└── API calls pour couleurs
```

---

## 🎨 **Design de l'Interface**

### **Zone de Création**

```css
.special-lines-creator {
  margin-top: 40px;
  padding: 20px;
  border-top: 3px solid #e0e0e0;
  background-color: #f9f9f9;
}

.creation-form {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.preview-container {
  margin: 20px 0;
  padding: 15px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.pending-lines {
  margin-top: 20px;
  padding: 15px;
  background-color: #fff3cd;
  border: 1px dashed #ffc107;
  border-radius: 4px;
}

.color-picker {
  margin: 20px 0;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
  margin: 10px 0;
}
```

---

## 📝 **Modifications Backend**

### **Migration**

```python
# api/migrations/XXXX_create_color.py
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('api', 'previous_migration'),
    ]
    
    operations = [
        migrations.CreateModel(
            name='Color',
            fields=[
                ('id', models.BigAutoField(...)),
                ('name', models.CharField(max_length=100)),
                ('hex_value', models.CharField(max_length=7)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('usage_count', models.IntegerField(default=0)),
                ('user', models.ForeignKey(...)),
            ],
        ),
    ]
```

### **Serializer**

```python
# api/serializers.py
class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = ['id', 'name', 'hex_value', 'usage_count']
        read_only_fields = ['usage_count']
```

---

## 🧪 **Tests**

### **Test 1 : Création**
```
1. Taper "Remise test"
2. Valeur : 5%
3. Type : Réduction
4. ✅ Preview affiche "- 5%"
5. Cliquer "Ajouter"
6. ✅ Ligne apparaît dans "En attente"
```

### **Test 2 : Drag & Drop**
```
1. Glisser ligne depuis "En attente"
2. Drop entre 2 lignes de détails
3. ✅ Ligne s'insère à la position
4. ✅ Totaux se mettent à jour
```

### **Test 3 : Couleur Personnalisée**
```
1. Choisir couleur #3d5afe
2. Cliquer "Sauvegarder"
3. Nommer "Bleu clair"
4. ✅ Apparaît dans "Mes couleurs"
5. Réutiliser dans autre ligne
6. ✅ Compteur s'incrémente
```

---

## ✅ **Récapitulatif**

| Fonctionnalité | Status | Priorité |
|----------------|--------|----------|
| Zone de création directe | ❌ | 🔴 Haute |
| Preview temps réel | ❌ | 🔴 Haute |
| Drag & Drop positionnement | ❌ | 🔴 Haute |
| Système de couleurs persistant | ❌ | 🟡 Moyenne |
| Sauvegarde/chargement | ❌ | 🟡 Moyenne |

---

## 🚀 **Prochaines Étapes**

1. ✅ Valider cette approche
2. ⏳ Créer les nouveaux composants
3. ⏳ Implémenter le drag & drop
4. ⏳ Créer le modèle Color en Django
5. ⏳ Tests et ajustements

