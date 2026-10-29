# Devis

## Créer un devis

**Où :** **Documents → Créer document → Devis**. Titre **Création de Devis**.

1. **Sélection du chantier** : **Rechercher un chantier...** Les chantiers **Terminé** et **En attente** ne sont pas proposés, sauf le chantier de formation. Ou **Créer un appel d'offres** : bandeau « Appel d'offres : Aucun chantier ne sera créé ».
2. Renseigner **Client et contact** et l'en-tête du devis.
3. Construire le tableau : parties, sous-parties, lignes de détail. On peut rechercher une partie ou une sous-partie déjà connue et réordonner les blocs.
4. **Créer ligne spéciale** (bouton flottant) : fenêtre **Créer une ligne spéciale**.
   - Types : **Montant fixe**, **Pourcentage**, **Affichage**.
   - Sens : **Réduction** ou **Addition**.
   - Placement : déposer la ligne sur une **zone bleue** du tableau.
5. Vérifier **Récapitulatif financier** (TVA, totaux).
6. **Sauvegarder le devis**, **Aperçu PDF**, ou **Réinitialiser** (demande confirmation).

Après enregistrement, retour vers la liste des devis. Un PDF peut être déposé dans le Drive. Si un fichier du même nom existe déjà, la fenêtre **Conflit de fichier détecté** s'ouvre (voir le fichier Drive).

Un brouillon peut être conservé dans le navigateur le temps de la saisie.

## Modifier un devis

**Où :** **Documents → Liste document → Liste Devis**, menu ⋮ de la ligne, **Modifier le devis**. Titre **Modification de Devis**, avec le numéro.

Même tableau que la création : client, lignes, lignes spéciales, récapitulatif.

- **Sauvegarder les modifications** — message **Devis modifié avec succès !**
- **Aperçu PDF**
- **Retour à la liste**

## Liste des devis

**Où :** **Documents → Liste document → Liste Devis**. Titre **Liste des Devis**.

Filtres : **Numéro**, **Chantier**, **Société**, date, **Prix HT**, tags. **Afficher plus** charge la suite.

- Clic sur le numéro : prévisualisation.
- Icône PDF : génération du PDF.
- Menu ⋮ :
  - **Modifier le devis**
  - **Éditer en facture**
  - **Éditer en avenant** (masqué si c'est un devis de chantier)
  - **Éditer en CIE**
  - **Convertir en bon de commande**
  - **Modifier l'état** (les tags)
  - **Supprimer**
  - **Créer une situation** : uniquement pour un devis de chantier. Sinon : « Seuls les devis de chantier peuvent avoir des situations ».

Sous les tags, l'historique montre Avant → Après, y compris une transformation en facture ou en avenant.

## Tags

Un devis porte des tags. **Une seule option par ligne** : choisir un tag d'une ligne retire l'autre de la même ligne. Plusieurs lignes peuvent être cochées en même temps. Affichage séparé par « + », ou **Aucun tag**.

Groupes :

- **Suivi** : En attente, En attente BDC, BDC reçus
- **Décision** : Validé, Refusé
- **Travaux** : Travaux non réalisés, Travaux en cours, Travaux réalisés
- **Actions** : Faire Avenant, A facturer, Facturé

Tag par défaut à la création : **En attente**.

Anciens libellés sont ramenés aux libellés actuels (par exemple « Valide » devient **Validé**).

**Modifier :** clic sur les tags de la ligne, ou **Modifier l'état**. Fenêtre **Modifier les tags du devis**. **Annuler** / **Enregistrer** (inactif si rien n'a changé).

**Filtrer :** clic sur le filtre de la colonne tags. Le filtre est un ET : le devis doit avoir tous les tags choisis.

**Après une transformation :**

- facture ou CIE → tag **Facturé**
- avenant (TS) → tag **Faire Avenant**

**Retirer Validé** alors que des factures existent : fenêtre **Attention !** qui liste les factures qui seront supprimées si on confirme.

Un changement de tags envoie une alerte à la cloche **Alertes devis**.

## Transformer un devis

Une seule transformation documentaire par devis. Si un document existe déjà, la fenêtre **Document déjà existant** l'indique et propose d'ouvrir la **Facture**, le **CIE** ou l'**Avenant**.

### En facture

Menu **Éditer en facture**.

Champs : **Numéro de facture** (vide = numéro attribué à l'enregistrement), **Adresse de facturation** (vide = adresse de la société), **Date d'envoi**, **Délai de paiement** (45 ou 60 jours), **Date de paiement prévue**, **Mode de paiement** (défaut : virement), **Créer la facture**.

Succès : tag **Facturé**, et message si la facture a été déposée dans le Drive.

### En avenant (facture TS)

Menu **Éditer en avenant**. Fenêtre **Transformer en Facture TS**. Indisponible sur un devis de chantier.

- **Créer un nouvel avenant**, ou **Sélectionner un avenant existant** (affiché **Avenant n°XX**).
- **Désignation**, puis **Transformer** ou **Annuler**.

Les nouveaux avenants sont numérotés Avenant n°01, n°02, etc.

### En CIE

Menu **Éditer en CIE**. Fenêtre **Transformer en Facture CIE**.

- **Mois de situation**, **Année**, **Désignation**, **Transformer**.

### En bon de commande

Menu **Convertir en bon de commande**. Le devis doit être au statut validé et avoir des lignes. Le numéro proposé reprend le numéro du devis avec le préfixe BC. Le fournisseur reste **À définir**.

### En situation

Voir le fichier factures et situations. Réservé aux devis de chantier, depuis cette liste ou depuis la fiche chantier.

## Lignes du devis, en bref

| Élément | Rôle |
|---|---|
| Partie | grand chapitre du devis |
| Sous-partie | découpage d'une partie |
| Ligne de détail | prestation chiffrée |
| Ligne spéciale | remise, majoration ou ligne d'affichage, en montant fixe ou en pourcentage |

Questions types : « comment créer un devis », « ajouter une remise », « différence facture / avenant / CIE / situation », « pourquoi je ne peux pas transformer à nouveau », « comment filtrer par tag ».
