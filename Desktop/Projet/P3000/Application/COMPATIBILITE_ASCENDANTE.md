# 🔄 Stratégie de Compatibilité Ascendante (Backward Compatibility)

## 🎯 **OBJECTIF**

**Garantir que les devis existants continuent de fonctionner normalement** pendant et après la migration vers le système d'index global unifié.

---

## 📊 **SITUATION ACTUELLE**

### **Modèles Existants**

```python
# Partie - Catalogue général
class Partie(models.Model):
    titre = models.CharField(max_length=600)
    type = models.CharField(max_length=50, default='PEINTURE')
    is_deleted = models.BooleanField(default=False)
    # PAS de relation directe avec Devis
    # PAS de champ ordre/index

# SousPartie - Catalogue général
class SousPartie(models.Model):
    partie = models.ForeignKey(Partie, related_name='sous_parties')
    description = models.CharField(max_length=600)
    is_deleted = models.BooleanField(default=False)
    # PAS de champ ordre/index

# LigneDetail - Catalogue général
class LigneDetail(models.Model):
    sous_partie = models.ForeignKey('SousPartie', related_name='lignes_details')
    partie = models.ForeignKey('Partie', related_name='lignes_details', null=True)
    description = models.CharField(max_length=1000)
    unite = models.CharField(max_length=10)
    prix = models.DecimalField(max_digits=10, decimal_places=2)
    # ... autres champs de coût
    # PAS de champ ordre/index

# Devis - Instance de devis
class Devis(models.Model):
    numero = models.CharField(max_length=100, unique=True)
    chantier = models.ForeignKey(Chantier, on_delete=models.CASCADE)
    lignes_speciales = models.JSONField(default=dict)  # Ancien système
    lignes_speciales_v2 = models.JSONField(default=dict)  # Nouveau système
    version_systeme_lignes = models.IntegerField(default=1)  # 1=ancien, 2=nouveau
    parties_metadata = models.JSONField(default=dict)  # Ordre des parties sélectionnées
```

### **Structure parties_metadata Actuelle**

```json
{
  "selectedParties": [
    {
      "id": 1,
      "titre": "PEINTURE",
      "ordre": 0,
      "sousParties": [
        {
          "id": 10,
          "description": "Plafonds",
          "ordre": 0,
          "lignesDetails": [100, 101, 102]
        }
      ]
    }
  ]
}
```

---

## 🔑 **PRINCIPES DE COMPATIBILITÉ**

### **1. Mode Dual (Ancien/Nouveau)**

```python
# Devis avec champ version_systeme_lignes
version_systeme_lignes = models.IntegerField(
    default=1,
    choices=[
        (1, 'Ancien système - parties_metadata'),
        (2, 'Nouveau système - index_global')
    ]
)
```

### **2. Non-Modification des Catalogues**

- **Partie**, **SousPartie**, **LigneDetail** restent des **catalogues globaux**
- **PAS d'ajout** de champs `index_global` ou `numero` dans ces modèles
- L'ordre est géré **uniquement dans le contexte d'un devis**

### **3. Nouveau Modèle pour Instances**

Créer des modèles **instances** liés à chaque devis :

```python
class DevisPartie(models.Model):
    """Instance d'une partie dans un devis spécifique"""
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='devis_parties')
    partie_catalogue = models.ForeignKey(Partie, on_delete=models.CASCADE)
    index_global = models.IntegerField(default=0)
    numero = models.CharField(max_length=50, blank=True, null=True)
    ordre = models.IntegerField(default=0)  # Ordre dans le devis
    
    class Meta:
        ordering = ['index_global']
        unique_together = ['devis', 'partie_catalogue']

class DevisSousPartie(models.Model):
    """Instance d'une sous-partie dans un devis spécifique"""
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='devis_sous_parties')
    devis_partie = models.ForeignKey(DevisPartie, on_delete=models.CASCADE, related_name='devis_sous_parties')
    sous_partie_catalogue = models.ForeignKey(SousPartie, on_delete=models.CASCADE)
    index_global = models.IntegerField(default=0)
    numero = models.CharField(max_length=50, blank=True, null=True)
    ordre = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['index_global']
        unique_together = ['devis', 'sous_partie_catalogue']

class DevisLigneDetail(models.Model):
    """Instance d'une ligne détail dans un devis spécifique"""
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='devis_lignes_details')
    devis_sous_partie = models.ForeignKey(DevisSousPartie, on_delete=models.CASCADE, related_name='devis_lignes_details')
    ligne_detail_catalogue = models.ForeignKey(LigneDetail, on_delete=models.CASCADE)
    index_global = models.IntegerField(default=0)
    numero = models.CharField(max_length=50, blank=True, null=True)
    ordre = models.IntegerField(default=0)
    
    # Quantité et prix spécifiques à ce devis
    quantite = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        ordering = ['index_global']
        unique_together = ['devis', 'ligne_detail_catalogue']

class LigneSpeciale(models.Model):
    """Ligne spéciale liée à un devis"""
    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name='lignes_speciales_v3')
    description = models.CharField(max_length=500)
    index_global = models.IntegerField(default=0)
    numero = models.CharField(max_length=50, blank=True, null=True)
    
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
    base_calculation = models.JSONField(blank=True, null=True)
    styles = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['index_global']
```

---

## 🔀 **STRATÉGIE DE COHABITATION**

### **Phase 1 : Ajout des Nouveaux Modèles**

```python
# Migration 001_add_devis_instances.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('api', 'XXXX_previous_migration'),
    ]

    operations = [
        migrations.CreateModel(
            name='DevisPartie',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True)),
                ('index_global', models.IntegerField(default=0)),
                ('numero', models.CharField(max_length=50, blank=True, null=True)),
                ('ordre', models.IntegerField(default=0)),
                ('devis', models.ForeignKey(on_delete=models.CASCADE, to='api.devis', related_name='devis_parties')),
                ('partie_catalogue', models.ForeignKey(on_delete=models.CASCADE, to='api.partie')),
            ],
            options={
                'ordering': ['index_global'],
            },
        ),
        # ... DevisSousPartie, DevisLigneDetail, LigneSpeciale
    ]
```

---

### **Phase 2 : Serializer avec Double Mode**

```python
class DevisSerializer(serializers.ModelSerializer):
    class Meta:
        model = Devis
        fields = [
            'id', 'numero', 'version_systeme_lignes',
            'parties_metadata',  # Ancien système
            'lignes_speciales',  # Ancien système
        ]
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # MODE 1 : Ancien système (parties_metadata)
        if instance.version_systeme_lignes == 1:
            # Utiliser parties_metadata existant
            data['items'] = self._convert_parties_metadata_to_items(instance.parties_metadata)
            data['mode'] = 'legacy'
        
        # MODE 2 : Nouveau système (DevisPartie, DevisSousPartie, etc.)
        else:
            # Charger depuis les nouveaux modèles
            data['items'] = self._get_items_from_new_models(instance)
            data['mode'] = 'unified'
        
        return data
    
    def _convert_parties_metadata_to_items(self, parties_metadata):
        """
        Convertit parties_metadata (ancien format) en liste unifiée
        pour compatibilité avec le nouveau frontend
        """
        items = []
        selected_parties = parties_metadata.get('selectedParties', [])
        
        for partie_data in selected_parties:
            # Partie
            items.append({
                'type': 'partie',
                'id': partie_data['id'],
                'index_global': len(items) + 1,
                'numero': str(len([i for i in items if i['type'] == 'partie']) + 1),
                'titre': partie_data['titre'],
                'mode': 'legacy'
            })
            
            # Sous-parties
            for sp_data in partie_data.get('sousParties', []):
                items.append({
                    'type': 'sous_partie',
                    'id': sp_data['id'],
                    'index_global': len(items) + 1,
                    'numero': f"{items[-1]['numero']}.{len([i for i in items if i.get('partie_id') == partie_data['id'] and i['type'] == 'sous_partie']) + 1}",
                    'description': sp_data['description'],
                    'partie_id': partie_data['id'],
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
                            'numero': f"{items[-1]['numero']}.{len([i for i in items if i.get('sous_partie_id') == sp_data['id'] and i['type'] == 'ligne_detail']) + 1}",
                            'description': ligne.description,
                            'sous_partie_id': sp_data['id'],
                            'prix': str(ligne.prix),
                            'mode': 'legacy'
                        })
                    except LigneDetail.DoesNotExist:
                        pass
        
        # Ajouter lignes spéciales v2 si présentes
        lignes_speciales = instance.lignes_speciales_v2.get('pending', [])
        for ls in lignes_speciales:
            items.append({
                'type': 'ligne_speciale',
                'id': ls.get('id'),
                'index_global': len(items) + 1,
                'description': ls.get('description'),
                'styles': ls.get('styles', {}),
                'mode': 'legacy'
            })
        
        return items
    
    def _get_items_from_new_models(self, devis):
        """
        Charge les items depuis les nouveaux modèles (DevisPartie, etc.)
        """
        items = []
        
        # DevisPartie
        for dp in devis.devis_parties.all().order_by('index_global'):
            items.append({
                'type': 'partie',
                'id': dp.id,
                'catalogue_id': dp.partie_catalogue.id,
                'index_global': dp.index_global,
                'numero': dp.numero,
                'titre': dp.partie_catalogue.titre,
                'mode': 'unified'
            })
            
            # DevisSousPartie
            for dsp in dp.devis_sous_parties.all().order_by('index_global'):
                items.append({
                    'type': 'sous_partie',
                    'id': dsp.id,
                    'catalogue_id': dsp.sous_partie_catalogue.id,
                    'index_global': dsp.index_global,
                    'numero': dsp.numero,
                    'description': dsp.sous_partie_catalogue.description,
                    'mode': 'unified'
                })
                
                # DevisLigneDetail
                for dld in dsp.devis_lignes_details.all().order_by('index_global'):
                    items.append({
                        'type': 'ligne_detail',
                        'id': dld.id,
                        'catalogue_id': dld.ligne_detail_catalogue.id,
                        'index_global': dld.index_global,
                        'numero': dld.numero,
                        'description': dld.ligne_detail_catalogue.description,
                        'prix': str(dld.prix_unitaire),
                        'quantite': str(dld.quantite),
                        'mode': 'unified'
                    })
        
        # LigneSpeciale
        for ls in devis.lignes_speciales_v3.all().order_by('index_global'):
            items.append({
                'type': 'ligne_speciale',
                'id': ls.id,
                'index_global': ls.index_global,
                'numero': ls.numero,
                'description': ls.description,
                'type_speciale': ls.type_speciale,
                'value_type': ls.value_type,
                'value': str(ls.value),
                'styles': ls.styles,
                'mode': 'unified'
            })
        
        return sorted(items, key=lambda x: x['index_global'])
```

---

### **Phase 3 : API avec Double Mode**

```python
@api_view(['POST'])
def update_devis_order(request, devis_id):
    """
    Met à jour l'ordre des éléments d'un devis
    Supporte les deux modes (ancien/nouveau)
    """
    try:
        devis = Devis.objects.get(id=devis_id)
        items = request.data.get('items', [])
        mode = request.data.get('mode', 'auto')  # auto, legacy, unified
        
        # Détection automatique du mode
        if mode == 'auto':
            mode = 'unified' if devis.version_systeme_lignes == 2 else 'legacy'
        
        if mode == 'legacy':
            # Sauvegarder dans parties_metadata (ancien système)
            return _update_legacy_order(devis, items)
        
        else:
            # Sauvegarder dans DevisPartie, DevisSousPartie, etc. (nouveau système)
            return _update_unified_order(devis, items)
    
    except Devis.DoesNotExist:
        return Response({'error': 'Devis not found'}, status=404)


def _update_legacy_order(devis, items):
    """
    Met à jour parties_metadata pour le mode legacy
    """
    selected_parties = []
    current_partie = None
    current_sous_partie = None
    
    for item in items:
        if item['type'] == 'partie':
            current_partie = {
                'id': item['id'],
                'titre': item.get('titre'),
                'ordre': item.get('ordre', 0),
                'sousParties': []
            }
            selected_parties.append(current_partie)
        
        elif item['type'] == 'sous_partie' and current_partie:
            current_sous_partie = {
                'id': item['id'],
                'description': item.get('description'),
                'ordre': item.get('ordre', 0),
                'lignesDetails': []
            }
            current_partie['sousParties'].append(current_sous_partie)
        
        elif item['type'] == 'ligne_detail' and current_sous_partie:
            current_sous_partie['lignesDetails'].append(item['id'])
    
    devis.parties_metadata = {'selectedParties': selected_parties}
    devis.save()
    
    return Response({'status': 'success', 'mode': 'legacy'}, status=200)


def _update_unified_order(devis, items):
    """
    Met à jour DevisPartie, DevisSousPartie, etc. pour le mode unifié
    """
    # Mise à jour des index_global
    for item in items:
        item_type = item.get('type')
        item_id = item.get('id')
        index_global = item.get('index_global')
        
        if item_type == 'partie':
            DevisPartie.objects.filter(id=item_id, devis=devis).update(index_global=index_global)
        elif item_type == 'sous_partie':
            DevisSousPartie.objects.filter(id=item_id, devis=devis).update(index_global=index_global)
        elif item_type == 'ligne_detail':
            DevisLigneDetail.objects.filter(id=item_id, devis=devis).update(index_global=index_global)
        elif item_type == 'ligne_speciale':
            LigneSpeciale.objects.filter(id=item_id, devis=devis).update(index_global=index_global)
    
    # Recalculer les numéros
    from api.utils import recalculate_all_numeros
    recalculate_all_numeros(devis)
    
    return Response({'status': 'success', 'mode': 'unified'}, status=200)
```

---

### **Phase 4 : Migration Progressive des Devis**

```python
# Management command: migrate_devis_to_unified.py
from django.core.management.base import BaseCommand
from api.models import Devis, DevisPartie, DevisSousPartie, DevisLigneDetail, Partie, SousPartie, LigneDetail

class Command(BaseCommand):
    help = 'Migre un devis existant vers le système unifié'

    def add_arguments(self, parser):
        parser.add_argument('--devis-id', type=int, help='ID du devis à migrer')
        parser.add_argument('--all', action='store_true', help='Migrer tous les devis')
        parser.add_argument('--dry-run', action='store_true', help='Simulation sans modification')

    def handle(self, *args, **options):
        if options['all']:
            devis_list = Devis.objects.filter(version_systeme_lignes=1)
        elif options['devis_id']:
            devis_list = Devis.objects.filter(id=options['devis_id'], version_systeme_lignes=1)
        else:
            self.stdout.write(self.style.ERROR('Spécifiez --devis-id ou --all'))
            return
        
        for devis in devis_list:
            self.stdout.write(f'Migration du devis {devis.numero}...')
            
            try:
                self._migrate_devis(devis, dry_run=options['dry_run'])
                self.stdout.write(self.style.SUCCESS(f'✓ Devis {devis.numero} migré'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Erreur: {str(e)}'))
    
    def _migrate_devis(self, devis, dry_run=False):
        """
        Convertit parties_metadata en instances DevisPartie, DevisSousPartie, etc.
        """
        parties_metadata = devis.parties_metadata
        selected_parties = parties_metadata.get('selectedParties', [])
        
        index_global = 1
        
        for partie_data in selected_parties:
            # Créer DevisPartie
            partie_catalogue = Partie.objects.get(id=partie_data['id'])
            
            if not dry_run:
                devis_partie = DevisPartie.objects.create(
                    devis=devis,
                    partie_catalogue=partie_catalogue,
                    index_global=index_global,
                    ordre=partie_data.get('ordre', 0)
                )
            index_global += 1
            
            # Créer DevisSousPartie
            for sp_data in partie_data.get('sousParties', []):
                sous_partie_catalogue = SousPartie.objects.get(id=sp_data['id'])
                
                if not dry_run:
                    devis_sous_partie = DevisSousPartie.objects.create(
                        devis=devis,
                        devis_partie=devis_partie,
                        sous_partie_catalogue=sous_partie_catalogue,
                        index_global=index_global,
                        ordre=sp_data.get('ordre', 0)
                    )
                index_global += 1
                
                # Créer DevisLigneDetail
                for ld_id in sp_data.get('lignesDetails', []):
                    ligne_catalogue = LigneDetail.objects.get(id=ld_id)
                    
                    # Chercher prix/quantité dans DevisLigne si existe
                    devis_ligne = devis.lignes.filter(ligne_detail=ligne_catalogue).first()
                    prix = devis_ligne.prix_unitaire if devis_ligne else ligne_catalogue.prix
                    quantite = devis_ligne.quantite if devis_ligne else 1
                    
                    if not dry_run:
                        DevisLigneDetail.objects.create(
                            devis=devis,
                            devis_sous_partie=devis_sous_partie,
                            ligne_detail_catalogue=ligne_catalogue,
                            index_global=index_global,
                            quantite=quantite,
                            prix_unitaire=prix
                        )
                    index_global += 1
        
        # Migrer lignes spéciales v2 vers LigneSpeciale
        lignes_speciales_v2 = devis.lignes_speciales_v2
        for ls_data in lignes_speciales_v2.get('pending', []) + lignes_speciales_v2.get('placed', []):
            if not dry_run:
                LigneSpeciale.objects.create(
                    devis=devis,
                    description=ls_data.get('description', ''),
                    index_global=index_global,
                    type_speciale=ls_data.get('type_speciale', 'display'),
                    value_type=ls_data.get('value_type', 'fixed'),
                    value=ls_data.get('value', 0),
                    base_calculation=ls_data.get('base_calculation'),
                    styles=ls_data.get('styles', {})
                )
            index_global += 1
        
        # Marquer le devis comme migré
        if not dry_run:
            devis.version_systeme_lignes = 2
            devis.save()
            
            # Recalculer les numéros
            from api.utils import recalculate_all_numeros
            recalculate_all_numeros(devis)
```

**Commandes** :
```bash
# Simulation
python manage.py migrate_devis_to_unified --devis-id 123 --dry-run

# Migration d'un devis
python manage.py migrate_devis_to_unified --devis-id 123

# Migration de tous les devis
python manage.py migrate_devis_to_unified --all
```

---

### **Phase 5 : Frontend Adaptatif**

```javascript
// DevisAvance.js
const loadDevis = async (devisId) => {
  try {
    const response = await axios.get(`/api/devis/${devisId}/`);
    const data = response.data;
    
    // Le backend renvoie déjà le bon format via le serializer
    setDevisItems(data.items || []);
    setDevisMode(data.mode);  // 'legacy' ou 'unified'
    
    // Mode legacy : conserver l'ancien état pour compatibilité
    if (data.mode === 'legacy') {
      const parties = data.items.filter(item => item.type === 'partie');
      setSelectedParties(parties);
    }
    
  } catch (error) {
    console.error('Erreur chargement devis:', error);
  }
};

// Sauvegarde avec détection du mode
const handleDevisItemsReorder = async (reorderedItems) => {
  const updated = reorderedItems.map((item, index) => ({
    ...item,
    index_global: index + 1
  }));
  
  setDevisItems(updated);
  
  try {
    await axios.post(`/api/devis/${devisData.id}/update-order/`, {
      items: updated,
      mode: devisMode  // 'legacy' ou 'unified'
    });
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
  }
};
```

---

## ✅ **VALIDATION DE LA COMPATIBILITÉ**

### **Scénarios à Tester**

| Scénario | Devis | Comportement Attendu |
|----------|-------|----------------------|
| **1. Lecture Ancien Devis** | `version_systeme_lignes=1` | Lecture depuis `parties_metadata`, conversion en items[] |
| **2. Modification Ancien Devis** | `version_systeme_lignes=1` | Sauvegarde dans `parties_metadata` (mode legacy) |
| **3. Migration Manuel** | `version_systeme_lignes=1` → `2` | Création DevisPartie/DevisSousPartie/etc., `version_systeme_lignes=2` |
| **4. Création Nouveau Devis** | `version_systeme_lignes=2` | Utilise directement DevisPartie/etc. |
| **5. Drag & Drop Ancien** | `version_systeme_lignes=1` | Mise à jour `parties_metadata` |
| **6. Drag & Drop Nouveau** | `version_systeme_lignes=2` | Mise à jour `index_global` dans DevisPartie/etc. |

---

## 📋 **CHECKLIST D'IMPLÉMENTATION**

- [ ] **Phase 1** : Créer modèles DevisPartie, DevisSousPartie, DevisLigneDetail, LigneSpeciale
- [ ] **Phase 2** : Migration Django (ne pas toucher aux modèles catalogues)
- [ ] **Phase 3** : Adapter DevisSerializer pour double mode
- [ ] **Phase 4** : API `update_devis_order` avec support des deux modes
- [ ] **Phase 5** : Commande de migration `migrate_devis_to_unified`
- [ ] **Phase 6** : Frontend adaptatif (détection du mode)
- [ ] **Phase 7** : Tests des 6 scénarios
- [ ] **Phase 8** : Migration progressive des devis existants
- [ ] **Phase 9** : Dépréciation de l'ancien système (optionnel)

---

## 🎯 **RÉSUMÉ**

✅ **Devis existants** : Continuent de fonctionner avec `parties_metadata` (mode legacy)  
✅ **Nouveaux devis** : Utilisent `DevisPartie/DevisSousPartie/etc.` (mode unified)  
✅ **Migration** : Progressive, contrôlée, réversible  
✅ **Catalogues** : Non modifiés, restent globaux  
✅ **Frontend** : Adaptatif, supporte les deux modes  

**Prêt pour l'implémentation sécurisée !** 🚀

