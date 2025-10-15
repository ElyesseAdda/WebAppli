# 🔄 Système Universel de Régénération de PDFs dans le Drive

## 🎯 Objectif

Permettre la régénération facile de tous les documents PDF dans le Drive après modification d'un template HTML.

---

## 🚀 Utilisation Rapide

### Interface (Bouton)

1. Allez dans une liste de documents (situations, contrats, bons de commande, etc.)
2. Cliquez sur le bouton 🔄 à côté du document
3. Confirmez la régénération
4. ✅ Le PDF est mis à jour dans le Drive !

### Ligne de commande (En masse)

```bash
# Mode simulation (rien n'est modifié)
python manage.py regenerate_pdfs --type=situation --dry-run

# Régénérer toutes les situations
python manage.py regenerate_pdfs --type=situation

# Régénérer pour un chantier spécifique
python manage.py regenerate_pdfs --type=situation --chantier=123

# Régénérer TOUS les types de documents
python manage.py regenerate_pdfs --type=all
```

---

## 📦 Types de documents supportés

| Type | Interface | Script |
|------|-----------|--------|
| Situations | ✅ | ✅ |
| Contrats de sous-traitance | ✅ | ✅ |
| Avenants de sous-traitance | ✅ | ✅ |
| Bons de commande | ✅ | ✅ |
| Factures | ⏳ | ✅ |
| Devis | ⏳ | ⏳ |

---

## 📁 Fichiers créés

```
frontend/src/
├── config/documentTypeConfig.js         # Configuration des types
├── hooks/useRegeneratePDF.js            # Logique de régénération
└── components/shared/
    └── RegeneratePDFButton.js           # Composant bouton

api/management/commands/
└── regenerate_pdfs.py                   # Script en masse
```

---

## 📖 Documentation complète

Consultez **[GUIDE_REGENERATION_PDF_DRIVE.md](./GUIDE_REGENERATION_PDF_DRIVE.md)** pour :
- Instructions détaillées
- Exemples d'utilisation
- Guide développeur
- Dépannage

---

## ✨ Fonctionnalités

- ✅ **Système universel** : fonctionne pour tous les types de documents
- ✅ **Sécurité** : confirmation avant chaque action
- ✅ **Historique** : anciens fichiers conservés 30 jours
- ✅ **Réutilisable** : composant facilement intégrable
- ✅ **Script en masse** : régénération de centaines de documents en une commande

---

## 🛠️ Commandes utiles

```bash
# Tester avant de régénérer
--dry-run

# Filtrer par chantier
--chantier=ID

# Limiter le nombre
--limit=N

# Combiner les options
python manage.py regenerate_pdfs --type=situation --chantier=123 --limit=10 --dry-run
```

---

**Version** : 1.0  
**Date** : Octobre 2025

