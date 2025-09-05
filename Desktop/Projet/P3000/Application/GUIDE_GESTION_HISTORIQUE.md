# 📁 **GUIDE DE GESTION DE L'HISTORIQUE DES FICHIERS**

## **📋 Vue d'ensemble**

Le système de gestion de l'historique permet de conserver les anciens fichiers remplacés dans un dossier dédié pendant 30 jours avant de les supprimer automatiquement.

## **🔄 Fonctionnement**

### **1. Détection de conflit**

- Le système détecte automatiquement les fichiers existants
- Un modal de conflit s'affiche avec les options de remplacement

### **2. Remplacement avec historique**

- L'ancien fichier est **déplacé** (pas supprimé) vers le dossier `Historique`
- Le nouveau fichier remplace l'ancien à l'emplacement original
- L'ancien fichier est renommé avec un timestamp : `Ancien_{nom_original}_{YYYYMMDD_HHMMSS}.pdf`

### **3. Nettoyage automatique**

- Une commande Django nettoie automatiquement les fichiers de plus de 30 jours
- Les fichiers sont supprimés définitivement après ce délai

## **📁 Structure des dossiers**

```
Drive/
├── Appels_Offres/
│   └── [Société]/
│       └── [Appel d'offres]/
│           └── Devis/
│               └── Devis_Marche/
│                   └── DEV-015-25 - Test Url.pdf  ← Nouveau fichier
└── Historique/
    └── Ancien_DEV-015-25-Test-Url_20250105_143022.pdf  ← Ancien fichier
```

## **🔧 Implémentation technique**

### **Backend (PDF Manager)**

```python
# Dans pdf_manager.py - generate_andStore_pdf()
if force_replace:
    # Créer le dossier Historique
    historique_path = "Historique"
    create_s3_folder_recursive(historique_path)

    # Déplacer l'ancien fichier avec timestamp
    old_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    old_filename = f"Ancien_{filename.replace('.pdf', '')}_{old_timestamp}.pdf"
    old_s3_path = f"{historique_path}/{old_filename}"

    # Déplacer le fichier
    self.move_file_in_s3(s3_file_path, old_s3_path)
```

### **Commande de nettoyage**

```bash
# Nettoyage manuel
python manage.py cleanup_historique --days 30

# Nettoyage automatique (cron job recommandé)
0 2 * * * cd /path/to/app && python manage.py cleanup_historique
```

### **Frontend (Modal de conflit)**

```javascript
// Message informatif dans le modal
"💡 Que se passe-t-il ?
• L'ancien fichier sera déplacé dans le dossier 'Historique' avec un timestamp
• Il sera automatiquement supprimé après 30 jours par le système de nettoyage
• Le nouveau fichier remplacera l'ancien à l'emplacement original
• Vous pourrez toujours accéder à l'historique via le Drive"
```

## **📱 Interface utilisateur**

### **Modal de conflit**

- **Affichage** : Informations sur le fichier existant
- **Options** : Remplacer ou Annuler
- **Explication** : Détails sur le processus d'historique

### **Notification de succès**

- **Message** : Confirmation du remplacement
- **Information** : Mention de l'historique et du délai de 30 jours
- **Redirection** : Bouton pour voir le fichier dans le Drive

## **⚙️ Configuration**

### **Délai de conservation**

```python
# Dans cleanup_historique.py
def add_arguments(self, parser):
    parser.add_argument(
        '--days',
        type=int,
        default=30,  # Délai par défaut
        help='Nombre de jours après lequel supprimer les fichiers'
    )
```

### **Format des noms de fichiers**

```python
# Format : Ancien_{nom_original}_{YYYYMMDD_HHMMSS}.pdf
old_filename = f"Ancien_{filename.replace('.pdf', '')}_{old_timestamp}.pdf"
```

## **🔍 Surveillance et maintenance**

### **Logs de déplacement**

```
📦 Déplacement de l'ancien fichier vers l'historique: Historique/Ancien_DEV-015-25-Test-Url_20250105_143022.pdf
🗑️ Ancien fichier déplacé vers l'historique: Historique/Ancien_DEV-015-25-Test-Url_20250105_143022.pdf
```

### **Logs de nettoyage**

```
🧹 Nettoyage terminé: 5 fichiers supprimés
🗑️ Fichier historique supprimé: Historique/Ancien_DEV-014-25-Drive-cd-2_20241205_143022.pdf
```

### **Vérification manuelle**

```bash
# Lister les fichiers dans l'historique
aws s3 ls s3://your-bucket/Historique/ --recursive

# Compter les fichiers
aws s3 ls s3://your-bucket/Historique/ --recursive | wc -l
```

## **🚨 Points d'attention**

### **Sécurité**

- ✅ **Permissions** : Respect des permissions S3 existantes
- ✅ **Validation** : Vérification de l'existence des fichiers avant déplacement
- ✅ **Rollback** : Possibilité de restaurer depuis l'historique

### **Performance**

- ✅ **Déplacement** : Utilisation de `move_file_in_s3` (copie + suppression)
- ✅ **Nettoyage** : Traitement par lots pour les gros volumes
- ✅ **Monitoring** : Logs détaillés pour le suivi

### **Maintenance**

- ✅ **Automatisation** : Commande Django pour le nettoyage
- ✅ **Flexibilité** : Délai configurable
- ✅ **Monitoring** : Logs et métriques

## **📊 Avantages**

### **Pour les utilisateurs**

- 🔄 **Traçabilité** : Historique des versions précédentes
- ⏰ **Délai de grâce** : 30 jours pour récupérer un fichier
- 📁 **Organisation** : Dossier dédié pour l'historique
- 🔍 **Visibilité** : Accès via le Drive

### **Pour l'administration**

- 🧹 **Nettoyage automatique** : Pas de gestion manuelle
- 💾 **Économie d'espace** : Suppression automatique après 30 jours
- 📈 **Monitoring** : Logs détaillés des opérations
- ⚙️ **Configuration** : Délai ajustable selon les besoins

## **🔮 Extensions possibles**

### **Fonctionnalités avancées**

- **Restoration** : Interface pour restaurer un fichier depuis l'historique
- **Notifications** : Alertes avant suppression automatique
- **Métadonnées** : Informations sur qui a remplacé le fichier
- **Compression** : Compression des anciens fichiers pour économiser l'espace

### **Intégrations**

- **Backup** : Sauvegarde des fichiers critiques avant suppression
- **Audit** : Logs d'audit pour la conformité
- **API** : Endpoints pour gérer l'historique programmatiquement

## **🎉 Conclusion**

Le système de gestion de l'historique est maintenant intégré au système universel de génération PDF Drive. Il offre :

- ✅ **Conservation temporaire** des anciens fichiers
- ✅ **Nettoyage automatique** après 30 jours
- ✅ **Interface utilisateur** claire et informative
- ✅ **Logs détaillés** pour le monitoring
- ✅ **Configuration flexible** du délai de conservation

Le système est prêt à être utilisé et peut être étendu selon les besoins futurs.

---

**📝 Note** : Ce guide sera mis à jour au fur et à mesure de l'évolution du système.
