# Tableau de bord, chantiers, appels d'offres, frais d'agence

## Tableau de bord

**Où :** **Chantier → Dashboard**.

**À quoi ça sert :** vue financière globale (chiffre d'affaires, marge, coûts, trésorerie, paiements).

**Filtres :** **Année**, **Comparaison** (plusieurs années, ou **Aucune**), **Du mois** / **Au mois**, **Réinitialiser période**. Si un seul mois est rempli, la période se limite à ce mois. Sans année de comparaison cochée, l'année précédente est utilisée.

**Cartes :**

- **CA total HT** — sous-titre « Situations et factures ».
- **Marge brute** — CA moins coûts chantier moins dépenses d'agence réalisées, toutes agences. Ce calcul ne dépend pas des cases cochées sur la carte agence.
- Graphique mensuel et répartition des coûts (main d'œuvre, matériel, sous-traitance). Un clic sur un mois recharge les indicateurs sur ce mois.
- **Indicateurs financiers** : **Dépenses d'agence**, **Encaissements reçus**, **Paiements à venir** (sous 15 jours, HT), **Paiements en retard** (échéance dépassée). L'icône liste ouvre le détail. L'icône réglage de **Dépenses d'agence** choisit quelles agences entrent dans cette carte. Par défaut, seule la première agence est cochée. Détail : `18-multi-agences.md`.

**Trésorerie**, onglets : **Trésorerie**, **Chantiers**, **Maître d'ouvrage**, **Fournisseurs**, **Sous-traitants**.

Questions : « chiffre d'affaires de l'année », « comparer deux années », « paiements en retard », « détail des encaissements ».

## Récap chantier (fiche)

**Où :** **Chantier → Récap Chantier**. Le menu ouvre un chantier, puis l'application reprend le dernier chantier visité s'il existe.

**Changer de chantier :**

- Champ **Rechercher un chantier...** Sans texte, les 5 derniers chantiers consultés s'affichent. L'icône rafraîchit cet historique.
- Bouton liste : fenêtre **Catalogue chantiers**. Filtres **Tous**, **En cours**, **En attente**, **Terminé**. Le badge de statut ouvre **Modifier le statut** (**Annuler** / **Enregistrer**). Statuts proposés : **En Cours**, **En attente**, **Terminé**. Le badge **Facturé** peut s'afficher ; à l'enregistrement il est ramené à **Terminé**.

**Onglets de la fiche :** **Informations**, **Documents**, **Commandes**, **Récap Financier**, **Planning Gantt**.

### Onglet Informations

Actions rapides :

- **Gérer les sous-traitants**
- **Gérer les situations**
- **Créer un nouveau devis** (ouvre la création de devis ; le chantier n'est pas forcément prérempli)
- **Afficher tableau suivi**
- **Tableau facturation**
- **Accéder au Drive** (souvent un nouvel onglet)

**Selon le statut du chantier :**

- **En Cours** : ces actions sont disponibles.
- **En attente**, **Terminé** ou **Facturé** : on ne peut pas créer de situation, de devis, ni gérer la sous-traitance (boutons désactivés, infobulle). La consultation du Drive, des tableaux et l'édition des informations restent possibles.

La fiche permet aussi de modifier les coordonnées du chantier et de suivre le taux de facturation.

### Onglet Documents

Sous-onglets : **Situations**, **Devis**, **Factures**, **Avenants**. Chaque liste a ses filtres (numéro, mois, avancement, montant, statut, etc.).

### Onglet Commandes

Bons de commande du chantier. Filtres : numéro, fournisseur, dates, montants, statut de paiement.

### Onglet Récap Financier

Titre **Récapitulatif Financier du Chantier**. Sélecteurs **Mois** et **Année**, bouton **Global** / **Désactiver**, **Actualiser**. En mode **Global**, le mois et l'année sont ignorés : les chiffres portent sur tout le chantier. Détail matériel, main d'œuvre, sous-traitance, situations, factures.

### Onglet Planning Gantt

Planning du chantier. L'éditeur complet des diagrammes est ailleurs : **Agent & Planning → Diagrammes de Gantt**.

## Appels d'offres

**Où :** **Chantier → Appel d'Offre**. Titre **Gestion des Appels d'Offres**.

**À quoi ça sert :** suivre les offres avant qu'elles deviennent un chantier.

**Écran :**

- **Rafraîchir les montants** : reprend les montants depuis les devis.
- Cartes **Tous**, **Validé**, **En attente**, **Refusé** (nombre et cumul HT).
- Recherche **Rechercher par projet ou société…**
- **Transformé en chantier :** **Tous** / **Oui** / **Non**
- **Filtres avancés** : période Du/Au, montant HT min/max.
- Colonnes : **Nom du projet**, **Société**, **Montant estimé**, **Statut**, **Date**, **Actions**.

**Actions sur une ligne :**

- Clic sur le nom : aperçu PDF du devis s'il existe.
- **Modifier le statut** : **En attente validation**, **Validé**, **Refusé**. Si refusé, **Raison du refus**. **Annuler** / **Confirmer**.
- Transformer en chantier : seulement si le statut est **Validé** et que l'offre n'est pas déjà **Transformé**. L'application demande un chemin Drive.
- Ouvrir le dossier Drive, supprimer (**Confirmer la suppression**).

**Créer un appel d'offres** se fait aussi pendant la création d'un devis : bouton **Créer un appel d'offres**. Dans ce cas, aucun chantier n'est créé.

## Frais d'agence

Le pas à pas (saisie, récurrence, lignes verrouillées, catégorie **Fournisseur** qui part dans le Tableau Fournisseur) est dans `11-depenses-chantier-agence-drive-agents.md`. Résumé :

**Où :** **Chantier → nom de l'agence** (la première est visible, les autres se déplient). Titre **Dépenses — {nom}**, sous-titre **Agence · Suivi mensuel**.

**Actions :** **Ajouter une dépense**, **Ajouter un avoir**.

**Indicateurs :** **Dépenses**, **Avoirs**, **Solde du mois** ou **Solde de la période**, **Solde annuel**. Le solde = avoirs − dépenses. Le montant affiché d'une ligne est le montant payé s'il est renseigné, sinon le montant prévu.

**Période :** **Un mois**, **De mois à mois** (24 mois maximum), **De jour à jour**, avec **Du** / **au**.

**Tableau :** filtres **Description**, **Catégorie**, **Montant**, **Commentaire**. On modifie ou supprime une saisie manuelle. Les lignes automatiques portent un badge **Planning**, **Primes**, **Pointage** ou **Sous-traitant** : elles ne se modifient pas ici.

**Saisie :** catégorie (certaines sont personnalisées sur cet ordinateur), **Dépense récurrente** / **Montant récurrent**, **Arrêter la récurrence à ce mois**.

En dessous : **Synthèse du mois** ou **Synthèse de la période**, puis **Synthèse annuelle**. Les catégories sont triées par ordre alphabétique dans le formulaire et le filtre.

## Admin des agences

Le fonctionnement de plusieurs agences (menu, carte du tableau de bord, pointage réparti, agence par défaut) est dans `18-multi-agences.md`.

**Où :** **Admin → Gestion agences** (staff ou superuser). Titre **Admin - Gestion des agences**.

Distinct du suivi des dépenses : ici on renomme, on supprime, on diagnostique.

- **Rafraîchir**. Cartes **Total agences**, **Protégées**, **Supprimables**.
- Recherche par identifiant, nom d'agence ou chantier.
- **Renommer** / **Supprimer**.
- L'agence par défaut nommée **Agence** ne se renomme pas et ne se supprime pas.
- Si la suppression est bloquée, la colonne des avertissements explique pourquoi. La confirmation rappelle le chantier système lié.

Créer une agence se fait avec le **+** du menu **Chantier**, pas seulement sur cet écran admin.
