# Factures, situations et bons de commande

## Liste des factures

**Où :** **Documents → Liste document → Liste facture**. Titre **Liste des Factures**.

Filtres : **Numéro**, **Chantier**, date, **Prix TTC**, statut **Tous / En cours / Attente paiement / Payée**.

- Clic sur le numéro : aperçu.
- Menu : **Voir la facture**, **Modifier le statut**, **Supprimer**.
- Icône devis : ouvre la liste des devis filtrée sur le devis lié (**Voir le devis associé**).

On ne crée pas une facture depuis cette liste. On la crée depuis un devis : **Liste Devis → Éditer en facture**.

## Situations

**Où les voir :** **Documents → Liste document → Liste Situation**. Titre **Liste des Situations**.

Colonnes : **N° Situation**, **Chantier**, **Société**, **Période** (mois/année), **% Avancement**, **Montant Total**, statut.

Statuts affichés : **En attente** (brouillon), **Validée**, **Facturée**.

- Clic sur le numéro : aperçu.
- Régénérer le PDF, ou supprimer (**Confirmer la suppression**).
- **Afficher plus**. Message **Aucune situation trouvée** si la liste est vide.

**Où les créer :** il n'y a pas d'entrée « créer une situation » dans **Créer document**.

1. Ouvrir **Liste Devis**.
2. Sur un **devis de chantier** seulement, menu **Créer une situation**.
3. Fenêtre **Création d'une situation** (ou **Modification d'une situation**).
4. Saisir l'avancement par parties, sous-parties et lignes (prorata, retenue de garantie, retenue CIE, lignes d'avenant selon le devis).
5. **Annuler**, ou **Créer la situation** / **Mettre à jour la situation**.

On peut aussi passer par la fiche chantier : **Gérer les situations**, ou l'onglet **Documents → Situations**. Ces boutons sont désactivés si le chantier est **En attente**, **Terminé** ou **Facturé**.

## Bons de commande

### Créer

**Où :** **Documents → Créer document → Bon de commande** (fenêtre par-dessus la page), ou bouton **Nouveau Bon de Commande** dans la liste.

1. **Nouveau Bon de Commande** : choisir le fournisseur.
2. Choisir les produits.
3. Valider.

### Liste

**Où :** **Documents → Liste document → Liste Bon de Commande**.

Colonnes : numéro, chantier, fournisseur, date, montant, livraison, paiement, **Payé**, **À Payer**.

Livraison : **En attente Livraison**, **Livré Chantier**, **Retrait Magasin**.

Paiement : **Non Payé**, **Payé**, **Payé Partiellement**.

Menu de ligne :

- **Modifier BC**
- **Modifier le statut**
- **Gérer le paiement** : **Montant du paiement**, **Valider**
- **Régénérer dans le Drive**
- **Supprimer BC**

Les bons d'un seul chantier sont aussi dans **Récap Chantier → Commandes**.

### Modifier

Depuis **Modifier BC**. On peut filtrer par plage de codes, voir le numéro, ajuster produits et quantités.

- **Générer PDF Drive**
- **Enregistrer les modifications** (inactif s'il n'y a aucun produit)
- **Annuler**

## Différence utile à expliquer

| Document | Créé depuis | Idée |
|---|---|---|
| Devis | **Créer document → Devis** | offre de prix |
| Situation | devis de chantier | avancement des travaux et montant du mois |
| Facture | devis, **Éditer en facture** | facture client |
| Avenant (TS) | devis qui n'est pas un devis de chantier | travaux supplémentaires, numéroté Avenant n°01… |
| CIE | devis, **Éditer en CIE** | facture CIE d'un mois |
| Bon de commande | menu créer, ou conversion d'un devis validé | commande fournisseur |
