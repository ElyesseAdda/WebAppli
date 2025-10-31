# 🔄 Compatibilité avec les Anciens Devis

## 🎯 **Problématique**

Les devis déjà créés utilisent l'ancienne structure de lignes spéciales. Il faut :
1. ✅ Garder l'ancien modèle fonctionnel
2. ✅ Ajouter le nouveau système
3. ✅ Gérer les deux cas automatiquement

---

## 📋 **Stratégie de Migration**

### **Approche : Dual Mode**

Le système fonctionne en **deux modes** selon la structure des données :
- **Mode Ancien** : Pour les devis existants
- **Mode Nouveau** : Pour les nouveaux devis

---

## 🗄️ **Structure des Données**

### **Ancien Modèle (Existants)**

```python
# api/models.py - Champ existant
lignes_speciales = models.JSONField(default=dict, blank=True)

# Structure actuelle
{
    'global': [
        {
            'description': 'Remise',
            'value': 10,
            'valueType': 'percentage',
            'type': 'reduction',
            'isHighlighted': false
        }
    ],
    'parties': {
        'partie_id_1': [...],
        'partie_id_2': [...]
    },
    'sousParties': {
        'sous_partie_id_1': [...],
        'sous_partie_id_2': [...]
    }
}
```

### **Nouveau Modèle (Pour Nouveaux)**

```python
# Nouveau champ en plus de l'ancien
lignes_speciales_v2 = models.JSONField(default=dict, blank=True, null=True)

# Nouvelle structure
{
    'items': [
        {
            'id': 'sl_1',
            'type': 'special_line',
            'position': {
                'parentType': 'global',
                'parentId': null,
                'positionType': 'after',
                'order': 0
            },
            'data': {
                'description': 'Remise',
                'value': 10,
                'valueType': 'percentage',
                'type': 'reduction',
                'isHighlighted': false
            },
            'styles': {
                'fontWeight': 'bold',
                'backgroundColor': '#ffff00',
                'color': '#ff0000',
                'fontStyle': 'italic',
                'borderLeft': '3px solid red',
                'textAlign': 'center',
                'padding': '10px'
            }
        }
    ]
}

# Indicateur de version
version_systeme_lignes = models.IntegerField(default=1)  # 1 = ancien, 2 = nouveau
```

---

## 🔄 **Fonction de Détection**

### **Backend Django**

```python
# api/models.py
class Devis(models.Model):
    # Ancien champ (conservé)
    lignes_speciales = models.JSONField(default=dict, blank=True)
    
    # Nouveau champ (optionnel)
    lignes_speciales_v2 = models.JSONField(default=dict, blank=True, null=True)
    
    # Version du système (pour migration automatique)
    version_systeme_lignes = models.IntegerField(default=1, choices=[(1, 'Ancien'), (2, 'Nouveau')])
    
    def has_legacy_special_lines(self):
        """Vérifie si le devis utilise l'ancien système"""
        return self.version_systeme_lignes == 1
    
    def has_new_special_lines(self):
        """Vérifie si le devis utilise le nouveau système"""
        return self.version_systeme_lignes == 2
    
    def get_special_lines_for_display(self):
        """
        Retourne les lignes spéciales dans le format approprié
        Convertit automatiquement l'ancien format si nécessaire
        """
        if self.has_legacy_special_lines():
            return self._convert_legacy_to_new_format()
        else:
            return self.lignes_speciales_v2 or {'items': []}
    
    def _convert_legacy_to_new_format(self):
        """
        Convertit l'ancien format vers le nouveau
        Pour migration progressive
        """
        legacy = self.lignes_speciales
        items = []
        
        # Convertir lignes globales
        for idx, line in enumerate(legacy.get('global', [])):
            items.append({
                'id': f'legacy_global_{idx}',
                'type': 'special_line',
                'position': {
                    'parentType': 'global',
                    'parentId': None,
                    'positionType': 'after',
                    'order': idx
                },
                'data': line,
                'styles': self._get_default_styles(line)
            })
        
        # Convertir lignes de parties
        for partie_id, lines in legacy.get('parties', {}).items():
            for idx, line in enumerate(lines):
                items.append({
                    'id': f'legacy_partie_{partie_id}_{idx}',
                    'type': 'special_line',
                    'position': {
                        'parentType': 'partie',
                        'parentId': partie_id,
                        'positionType': 'after',
                        'order': idx
                    },
                    'data': line,
                    'styles': self._get_default_styles(line)
                })
        
        # Convertir lignes de sous-parties
        for sous_partie_id, lines in legacy.get('sousParties', {}).items():
            for idx, line in enumerate(lines):
                items.append({
                    'id': f'legacy_sous_partie_{sous_partie_id}_{idx}',
                    'type': 'special_line',
                    'position': {
                        'parentType': 'sous_partie',
                        'parentId': sous_partie_id,
                        'positionType': 'after',
                        'order': idx
                    },
                    'data': line,
                    'styles': self._get_default_styles(line)
                })
        
        return {'items': items}
    
    def _get_default_styles(self, line):
        """Styles par défaut pour conversion"""
        styles = {}
        
        # Si highlighted dans l'ancien, appliquer styles de base
        if line.get('isHighlighted'):
            styles['backgroundColor'] = '#ffff00'
            styles['fontWeight'] = 'bold'
        
        # Type display
        if line.get('type') == 'display':
            styles['fontStyle'] = 'italic'
            styles['color'] = '#6c757d'
            styles['borderLeft'] = '3px solid #6c757d'
        
        return styles if styles else None
```

---

## 🎨 **Frontend React**

### **Fonction de Détection**

```javascript
// Dans DevisAvance.js
const detectSpecialLinesVersion = (devisData) => {
  // Vérifier si le devis utilise le nouveau système
  if (devisData.version_systeme_lignes === 2) {
    return {
      version: 'new',
      data: devisData.lignes_speciales_v2 || { items: [] }
    };
  }
  
  // Sinon, ancien système
  return {
    version: 'legacy',
    data: devisData.lignes_speciales || {}
  };
};

// Utilisation
const { version, data } = detectSpecialLinesVersion(devisData);

if (version === 'new') {
  // Utiliser le nouveau système
  setSpecialLinesNew(data.items);
} else {
  // Utiliser l'ancien système
  setSpecialLinesLegacy(data);
}
```

### **Conversion au Chargement**

```javascript
// Fonction pour convertir l'ancien format au chargement
const convertLegacyToNew = (legacyData) => {
  const items = [];
  
  // Convertir global
  (legacyData.global || []).forEach((line, idx) => {
    items.push({
      id: `legacy_global_${idx}`,
      type: 'special_line',
      position: {
        parentType: 'global',
        parentId: null,
        positionType: 'after',
        order: idx
      },
      data: line,
      styles: {
        ...(line.isHighlighted && { 
          backgroundColor: '#ffff00',
          fontWeight: 'bold'
        }),
        ...(line.type === 'display' && {
          fontStyle: 'italic',
          color: '#6c757d',
          borderLeft: '3px solid #6c757d'
        })
      }
    });
  });
  
  // Convertir parties
  Object.entries(legacyData.parties || {}).forEach(([partieId, lines]) => {
    lines.forEach((line, idx) => {
      items.push({
        id: `legacy_partie_${partieId}_${idx}`,
        type: 'special_line',
        position: {
          parentType: 'partie',
          parentId: partieId,
          positionType: 'after',
          order: idx
        },
        data: line,
        styles: { /* ... */ }
      });
    });
  });
  
  // Convertir sous-parties
  Object.entries(legacyData.sousParties || {}).forEach(([spId, lines]) => {
    lines.forEach((line, idx) => {
      items.push({
        id: `legacy_sous_partie_${spId}_${idx}`,
        type: 'special_line',
        position: {
          parentType: 'sous_partie',
          parentId: spId,
          positionType: 'after',
          order: idx
        },
        data: line,
        styles: { /* ... */ }
      });
    });
  });
  
  return { items };
};
```

### **Gestion Dual dans DevisTable**

```javascript
// Dans DevisTable.js
const DevisTable = ({ specialLinesData, isLegacy, ... }) => {
  // Render selon le mode
  const renderSpecialLines = () => {
    if (isLegacy) {
      // Ancien rendu
      return renderLegacySpecialLines(specialLinesData);
    } else {
      // Nouveau rendu
      return renderNewSpecialLines(specialLinesData);
    }
  };
  
  const renderLegacySpecialLines = (data) => {
    return (
      <>
        {/* Lignes globales */}
        {data.global?.map((line, idx) => (
          <SpecialLineRow key={idx} line={line} isLegacy />
        ))}
        
        {/* Dans les parties */}
        {parties.map(partie => (
          <>
            {data.parties?.[partie.id]?.map((line, idx) => (
              <SpecialLineRow key={idx} line={line} isLegacy />
            ))}
          </>
        ))}
      </>
    );
  };
  
  const renderNewSpecialLines = (data) => {
    // Trier par position
    const sorted = data.items.sort((a, b) => {
      // Logique de tri selon position
    });
    
    return sorted.map(item => (
      <SpecialLineRow key={item.id} line={item} />
    ));
  };
  
  return (
    <table>
      {/* ... */}
      {renderSpecialLines()}
    </table>
  );
};
```

---

## 🔄 **Migration Progressive**

### **Script de Migration**

```python
# api/management/commands/migrate_special_lines.py
from django.core.management.base import BaseCommand
from api.models import Devis

class Command(BaseCommand):
    help = 'Migre les lignes spéciales vers le nouveau format'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simuler la migration sans modification',
        )
    
    def handle(self, *args, **options):
        # Récupérer tous les devis avec ancien format
        devis_to_migrate = Devis.objects.filter(
            version_systeme_lignes=1
        ).exclude(
            lignes_speciales={}
        )
        
        self.stdout.write(f'Devis à migrer : {devis_to_migrate.count()}')
        
        for devis in devis_to_migrate:
            if options['dry_run']:
                self.stdout.write(f'[DRY-RUN] Migration devis {devis.numero}')
            else:
                # Convertir
                new_format = devis._convert_legacy_to_new_format()
                devis.lignes_speciales_v2 = new_format
                devis.version_systeme_lignes = 2
                devis.save()
                self.stdout.write(f'✅ Migration devis {devis.numero}')
```

### **Commandes**

```bash
# Simulation
python manage.py migrate_special_lines --dry-run

# Migration
python manage.py migrate_special_lines
```

---

## 📊 **API Endpoint**

```python
# api/views.py
@api_view(['GET'])
def get_devis(request, devis_id):
    try:
        devis = Devis.objects.get(id=devis_id)
        
        response_data = {
            'id': devis.id,
            'numero': devis.numero,
            'price_ht': devis.price_ht,
            # ... autres champs
        }
        
        # Retourner les lignes spéciales dans le format approprié
        if devis.has_legacy_special_lines():
            response_data['lignes_speciales'] = devis.lignes_speciales
            response_data['version_lignes_speciales'] = 'legacy'
        else:
            response_data['lignes_speciales'] = devis.get_special_lines_for_display()
            response_data['version_lignes_speciales'] = 'new'
        
        return Response(response_data)
    except Devis.DoesNotExist:
        return Response({'error': 'Devis not found'}, status=404)
```

---

## 🔧 **Sauvegarde**

```javascript
// Dans DevisAvance.js
const handleSaveDevis = async () => {
  const devisPayload = {
    // ... autres données
    
    // Détecter le mode
    version_systeme_lignes: isNewSystem ? 2 : 1,
    
    // Envoyer les données selon le mode
    ...(isNewSystem 
      ? { lignes_speciales_v2: { items: specialLines } }
      : { lignes_speciales: specialLinesLegacy }
    )
  };
  
  await axios.post('/api/devis/', devisPayload);
};
```

---

## ⚠️ **Migration Automatique**

### **Option 1 : À la Volée**

```python
# api/models.py
def save(self, *args, **kwargs):
    # Auto-migration lors de l'édition d'un ancien devis
    if self.version_systeme_lignes == 1 and self.lignes_speciales:
        if not self.lignes_speciales_v2:
            self.lignes_speciales_v2 = self._convert_legacy_to_new_format()
            self.version_systeme_lignes = 2
    super().save(*args, **kwargs)
```

### **Option 2 : Premier Accès**

```javascript
// Dans DevisAvance.js
useEffect(() => {
  const loadDevis = async () => {
    const response = await axios.get(`/api/devis/${devisId}/`);
    const devis = response.data;
    
    if (devis.version_lignes_speciales === 'legacy') {
      // Convertir automatiquement
      const converted = convertLegacyToNew(devis.lignes_speciales);
      
      // Optionnel : migrer en base
      await axios.post(`/api/devis/${devisId}/migrate-lines/`);
      
      // Utiliser le nouveau format
      setSpecialLinesNew(converted.items);
      setIsNewSystem(true);
    } else {
      setSpecialLinesNew(devis.lignes_speciales.items);
    }
  };
  
  loadDevis();
}, [devisId]);
```

---

## ✅ **Checklist**

### **Backend**
- [ ] Ajouter champ `lignes_speciales_v2` (nullable)
- [ ] Ajouter champ `version_systeme_lignes`
- [ ] Créer méthode `_convert_legacy_to_new_format()`
- [ ] Créer méthode `get_special_lines_for_display()`
- [ ] Modifier API pour retourner les deux formats
- [ ] Créer script de migration

### **Frontend**
- [ ] Créer fonction `detectSpecialLinesVersion()`
- [ ] Créer fonction `convertLegacyToNew()`
- [ ] Modifier `DevisTable` pour gérer les deux modes
- [ ] Modifier `DevisAvance` pour sauvegarder selon le mode
- [ ] Tester avec anciens devis

### **Migration**
- [ ] Tester migration sur devis de test
- [ ] Créer backup avant migration
- [ ] Exécuter script de migration
- [ ] Vérifier que tout fonctionne

---

## 🎯 **Résumé**

| Aspect | Ancien Système | Nouveau Système |
|--------|---------------|-----------------|
| **Format** | `{global: [], parties: {}, sousParties: {}}` | `{items: [{position, data, styles}]}` |
| **Styles** | Basiques (highlighted, display) | Complets (gras, couleur, bordure, etc.) |
| **Position** | Fixée par type | Flexible avec drag & drop |
| **Compatibilité** | ✅ Conservé | ✅ Nouveau |
| **Conversion** | Auto lors du chargement | - |

