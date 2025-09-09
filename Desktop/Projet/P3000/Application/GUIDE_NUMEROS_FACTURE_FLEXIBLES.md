# Guide - Numéros de Facture Flexibles

## Problème Résolu

Auparavant, seuls les numéros de facture commençant par "FACT-" étaient autorisés. Cette restriction a été supprimée pour permettre une plus grande flexibilité dans la numérotation des factures.

## Modifications Apportées

### 1. Suppression de la Validation Stricte (`api/serializers.py`)

**Avant :**

```python
def validate_numero(self, value):
    if not value.startswith('FACT-'):
        raise serializers.ValidationError("Le numéro de facture doit commencer par 'FACT-'")

    if Facture.objects.filter(numero=value).exists():
        raise serializers.ValidationError("Ce numéro de facture existe déjà")

    return value
```

**Après :**

```python
def validate_numero(self, value):
    # Vérification de l'unicité du numéro de facture
    if Facture.objects.filter(numero=value).exists():
        raise serializers.ValidationError("Ce numéro de facture existe déjà")

    return value
```

### 2. Génération Automatique Flexible (`api/views.py`)

La classe `NumeroService` a été améliorée pour accepter des préfixes personnalisés :

```python
@staticmethod
def get_next_facture_number(prefix="FACT"):
    """Génère le prochain numéro de facture unique pour toute l'application"""
    # ... logique améliorée pour gérer différents formats
    return f"{prefix}-{next_num:03d}-{current_year}"
```

### 3. API Endpoint Flexible

L'endpoint `get_next_numero` accepte maintenant un paramètre `prefix` :

```
GET /api/get_next_numero/?prefix=INV
```

## Formats de Numéros Supportés

Vous pouvez maintenant utiliser différents formats :

- **FACT-001-25** (format par défaut)
- **INV-001-25** (factures d'invitation)
- **TS-001-25** (travaux supplémentaires)
- **CIE-001-25** (factures CIE)
- **2025-001** (format année-numéro)
- **FAC-2025-001** (format personnalisé)

## Utilisation

### Création Manuelle de Facture

Vous pouvez maintenant créer des factures avec n'importe quel numéro, tant qu'il est unique :

```javascript
// Exemple de création de facture avec numéro personnalisé
const factureData = {
  numero: "INV-001-25",
  devis: devisId,
  // ... autres champs
};
```

### Génération Automatique

Pour générer automatiquement un numéro avec un préfixe personnalisé :

```javascript
// Récupérer le prochain numéro avec préfixe personnalisé
fetch("/api/get_next_numero/?prefix=INV")
  .then((response) => response.json())
  .then((data) => {
    console.log(data.numero); // "INV-001-25"
  });
```

## Avantages

1. **Flexibilité** : Support de différents formats de numérotation
2. **Compatibilité** : Les anciens numéros "FACT-" continuent de fonctionner
3. **Organisation** : Possibilité d'organiser les factures par type
4. **Évolutivité** : Facile d'ajouter de nouveaux formats

## Notes Importantes

- L'unicité des numéros reste obligatoire
- Les numéros existants ne sont pas affectés
- La génération automatique utilise toujours le format "FACT-" par défaut
- Pour utiliser d'autres préfixes, spécifiez le paramètre `prefix` dans l'API
