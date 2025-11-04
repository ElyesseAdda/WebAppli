# 🚀 Étapes d'Implémentation

## 📋 **CHECKLIST**

### **Phase 1 : Backend** ✅
- [ ] Ajouter modèle `LigneSpeciale` avec `ordre_devis`
- [ ] Migration
- [ ] Serializers
- [ ] Endpoints CRUD pour `LigneSpeciale`
- [ ] Endpoint `update_devis_order` pour sauvegarder l'ordre

### **Phase 2 : Frontend - État** ⏳
- [ ] Créer `devisItems` fusionnant parties et lignes spéciales
- [ ] Adapter `loadDevis` pour charger les deux types
- [ ] Créer `handleDragEndTopLevel` pour réordonner top-level
- [ ] Créer `saveOrderToDatabase` pour persister

### **Phase 3 : Frontend - Render** ⏳
- [ ] Modifier `DevisTable` pour afficher `devisItems`
- [ ] Rendre `LigneSpecialeRow` dans le même Droppable que parties
- [ ] Adapter les handlers sous-parties et lignes détails
- [ ] Tester le drag & drop

### **Phase 4 : Nettoyage** ⏳
- [ ] Retirer `pendingSpecialLines` et `placedSpecialLines`
- [ ] Retirer détection de position (`trackedDropPosition`, `handleDragUpdate`)
- [ ] Retirer composants obsolètes
- [ ] Tests finaux

---

## 🎯 **PRÊT À COMMENCER ?**

**Quand vous me donnerez le feu vert**, je commencerai par :
1. Backend : Modèle et migrations
2. Frontend : État unifié
3. Render et drag & drop
4. Nettoyage

**Estimation** : 2-3 heures de travail

Voulez-vous que je commence ?

