# Collaborateurs et rapports d'intervention

Le menu **Collaborateur** n'existe que sur ordinateur. Les rapports existent sur ordinateur et sur téléphone : mêmes types, mêmes statuts, même formulaire. Seuls l'accès et la présentation changent.

---

## Menu Collaborateur

Quatre entrées, dans cet ordre :

1. **Liste Clients**
2. **Liste Fournisseurs**
3. **Sous traitant**
4. **Comparateur**

Ce menu sert d'annuaire. Affecter un sous-traitant à un chantier, créer un contrat ou saisir un paiement se fait sur la fiche chantier (**Gérer les sous-traitants**), pas ici. Un bon de commande choisit un fournisseur déjà présent dans cette liste.

---

## Liste Clients

**Où :** **Collaborateur → Liste Clients**. Titre **Liste Client / Societes**.

Cette page gère les **sociétés** (le bailleur, le maître d'ouvrage en tant que société). La personne physique se choisit dans le champ **Client**. On ne crée pas la personne sur cette page : elle est saisie au moment de créer un chantier, fenêtre **Informations Client** (**Civilité**, **Nom**, **Prénom**, **Email**, **Téléphone**, **Poste**, **Sélectionner un client existant**, **ou remplir manuellement**, **Passer cette étape**, **Suivant**).

### Créer une société

1. **Nouvelle societe**.
2. Fenêtre **Nouvelle societe**.
3. **Nom de la societe** (obligatoire).
4. **Client** (obligatoire) : **Choisir un client** dans la liste (nom et prénom).
5. **Ville**, **Rue**, **Code postal** (facultatifs).
6. **Creer** ou **Annuler**.

Modifier : icône crayon, titre **Modifier la societe**, bouton **Mettre a jour**.

Supprimer : icône poubelle, confirmation **Supprimer cette societe ?**

Liste vide : **Aucune societe**.

Colonnes : **Logo**, **Nom societe**, **Contact**, **Ville**, **Adresse**, **Code postal**, **Actions**.

### Logo

Cliquer la case logo (vide, en pointillés, ou déjà remplie) pour choisir une image.

Fenêtre **Recadrer le logo** : déplacer l'image, zoom de 100 % à 400 %, **Annuler** ou **Valider et enregistrer**.

Sur un logo déjà posé, la petite poubelle en coin le retire.

Ce logo sert ensuite sur les documents (devis, Gantt) liés à la société.

---

## Liste Fournisseurs

**Où :** **Collaborateur → Liste Fournisseurs**. Titre **Gestion des Fournisseurs**.

Sans fournisseur ici, on ne peut pas faire de bon de commande ni de comparaison de prix.

### Créer

1. **Ajouter un Fournisseur**.
2. Fenêtre **Nouveau Fournisseur** (en modification : **Modifier le Fournisseur**).
3. **Nom du Fournisseur** (obligatoire).
4. **Email**, **Numéro de Téléphone**.
5. Bloc **Magasins**. **Ajouter un Magasin** : **Nom du Magasin** (obligatoire), **Email du Magasin (optionnel)**. La poubelle retire le magasin. S'il n'y en a aucun : **Aucun magasin ajouté. Cliquez sur "Ajouter un Magasin" pour en ajouter un.**
6. **Description**.
7. **Créer** ou **Modifier**. **Annuler** ferme.

Le magasin choisi ici est proposé dans **Nouveau Bon de Commande**.

Supprimer : **Êtes-vous sûr de vouloir supprimer ce fournisseur ?**

Liste vide : **Aucun fournisseur trouvé**.

Colonnes : **Nom**, **Email**, **Téléphone**, **Magasins**, **Description**, **Actions**.

### Catalogue produits

Icône caisse, infobulle **Voir les produits**. Fenêtre **Produits — {nom}**.

- **Rechercher...**
- **Nouveau produit**
- Colonnes **Code**, **Désignation**, **Prix unitaire**, **Unité**. Un double-clic sur une cellule permet de corriger le code ou la désignation.
- Vide : **Aucun produit pour ce fournisseur**.

Ce catalogue alimente les bons de commande et le comparateur. Un fournisseur sans produit ne peut pas être comparé utilement.

---

## Sous-traitants (annuaire)

**Où :** **Collaborateur → Sous traitant**. Titre **Gestion des Sous-traitants**.

C'est l'annuaire, pas le contrat d'un chantier.

### Créer

1. **Ajouter un Sous-traitant**.
2. Fenêtre **Nouveau Sous-traitant** (modification : **Modifier le Sous-traitant**).
3. Obligatoires : **Entreprise**, **Représentant**, **Numéro RCS** (aide : **Numéro unique d'enregistrement au RCS**), **Adresse**, **Code Postal**, **Ville**.
4. Facultatifs : **Capital**, **Forme Juridique** (**SARL**, **SAS**, **SA**, **EURL**, **SNC**, **SCI**, **Autre**), **Email**, **Numéro de Téléphone**.
5. **Type d'activité** : **Nettoyage**, **BTP**, **TCE**, **Autre**. Ce type préremplit le contrat sur un chantier : BTP → contrat **BTP**, Nettoyage → **Prestation de services**. TCE et Autre n'ont pas de type de contrat automatique.
6. **Créer** ou **Modifier**. **Annuler**.

Les contacts n'apparaissent qu'une fois le sous-traitant enregistré. Rouvrir avec le crayon :

- **Contacts ({nombre})**, bouton **Ajouter un Contact**.
- Vide : **Aucun contact pour ce sous-traitant**.
- Fenêtre **Nouveau Contact** ou **Modifier le Contact** : **Nom** (obligatoire), **Prénom**, **Poste**, **Email**, **Téléphone**. **Créer** / **Modifier**.
- Poubelle : **Êtes-vous sûr de vouloir supprimer ce contact ?**

Supprimer le sous-traitant : **Êtes-vous sûr de vouloir supprimer ce sous-traitant ?**

### Retrouver quelqu'un

Champ **Rechercher un sous-traitant ou un contact...** La recherche porte sur l'entreprise et sur les contacts.

Colonnes triables : **Entreprise**, **Nom / Représentant**, **Poste**, **Email**, **Téléphone**, **Numéro RCS**, **Type**, **Ville**.

En bas : **Lignes par page** (5, 10, 25, 50).

Pour l'utiliser sur un chantier : **Récap Chantier → Informations → Gérer les sous-traitants → Sélectionner un sous-traitant existant**.

---

## Comparateur

**Où :** **Collaborateur → Comparateur**. Titre **Comparateur Fournisseurs**. Sous-titre **Recherchez et comparez les produits de vos fournisseurs**.

1. Sélectionner des fournisseurs en haut de page.
2. Tant qu'il y en a moins de deux : **Commencez votre comparaison**, puis le texte **Selectionnez au moins deux fournisseurs ci-dessus, puis ajoutez des lignes de comparaison pour rechercher et comparer les produits un par un.**
3. Le chargement affiche **Chargement des catalogues produits...**
4. À partir de deux fournisseurs : colonnes **N°**, **Qté**, un bloc par fournisseur (nom et nombre de produits), puis l'écart.
5. **Ajouter une ligne de comparaison**. Sur chaque ligne, chercher le produit chez chaque fournisseur et indiquer la quantité (de 1 à 99999).
6. Retirer un fournisseur retire aussi ses produits des lignes.

Sans produits dans **Liste Fournisseurs**, la colonne reste vide. Le comparateur ne crée pas de bon de commande : il aide à choisir avant d'en faire un.

---

## Rapports : ordinateur et téléphone

| | Ordinateur | Téléphone |
|---|---|---|
| Où entrer | **Documents → Liste document → Rapports d'intervention** | Accueil mobile, carte **Rapports** |
| Droit | tout utilisateur connecté | case **Rapports d'intervention** dans **Admin → Utilisateurs → Accès mobile (PWA)**. Un compte staff ou superuser l'a toujours |
| Créer | bouton **Nouveau rapport** | onglet du bas **Nouveau** |
| Liste | tableau | cartes |
| Valider | bouton **Valider le rapport** en haut du formulaire | le même bouton, en bas de l'écran, pleine largeur |
| Quitter | menu de l'application, **Déconnexion** en haut à droite | icône maison = accueil mobile ; icône de sortie = déconnexion |

S'il n'y a aucun espace sur le téléphone : **Aucun accès configuré**.

Les deux versions partagent les types, les statuts, les brouillons et le PDF.

### Types

Dans **Informations generales**, liste **Type de rapport** :

- **Rapport d'intervention** : titre **Nouveau rapport d'intervention**. Prestations, locataire, signature.
- **Vigik+** : titre **Nouveau rapport Vigik+**. Photos de platine, pas de signature, pas de bloc locataire, pas de prestations.

On peut changer le type tant que le rapport n'est pas verrouillé. Le filtre de la liste a les mêmes deux valeurs, plus **Tous**.

### Statuts

**Brouillon**, **Brouillons** (brouillon enregistré sur le serveur), **A faire**, **En cours**, **Terminé**.

Après **Valider le rapport** : fenêtre **Rapport sauvegardé !** Le texte dit que le rapport est **en cours pour vérification** (création ou modification).

La liste masque les **Terminé** tant que la case **Afficher terminés** n'est pas cochée.

Sur ordinateur, le badge de statut ouvre **Modifier le statut du rapport**, sauf pour un brouillon serveur (le badge n'est pas cliquable).

### Ordinateur : la liste

Titre **Rapports d'intervention**.

Filtres : **Résidence**, **Type de rapport**, **Titre** (aide **Tapez pour filtrer…**, vide : **Aucun titre correspondant**), **Date de création du rapport**, **N° rapport** (chiffres seulement, exemple **42**).

Flèche de tri : **Plus récent d'abord** ou **Plus ancien d'abord**.

Case **Devis à faire** : ne garde que les rapports marqués devis à faire et pas encore faits.

Colonnes : **Résidence**, **Date**, **Type**, **Lieu d'intervention / Adresse**, **Titre**, **N° rapport**, **Client**, **Devis à faire**, **Statut**, **Actions**.

- Clic sur la ligne : aperçu du rapport. Pour un brouillon serveur, le clic rouvre le formulaire.
- Résidence vide : **Sans résidence**.
- Colonne lieu : le logement pour une intervention, l'adresse Vigik pour un Vigik+.
- **Devis à faire** : croix rouge = non. Icône pour lier, infobulle **Cliquer pour lier le devis et marquer fait**. Après liaison : **Devis lié et rapport marqué comme devis fait**. On peut repasser en **Rapport repassé en devis à faire**.
- PDF : **Télécharger le PDF**, message **Génération du PDF en cours…** puis **PDF téléchargé avec succès**. Une seconde icône renvoie le PDF dans le Drive (conflit possible : **Conflit de fichier détecté**).
- Crayon : modifier. Sur un brouillon serveur, le crayon reprend le brouillon.
- Poubelle : **Supprimer ce rapport ?** ou **Supprimer ce brouillon en ligne ?**

Vide : **Aucun rapport d'intervention ne correspond à ces critères.**

Les rapports d'un seul chantier se voient aussi sur la fiche chantier.

### Téléphone : la liste

Cartes, pas un tableau. Mêmes filtres et mêmes cases (**Afficher terminés**, **Devis à faire**).

Vide : **Aucun rapport ne correspond à ces critères.** Si seuls les terminés sont filtrés : **Aucun rapport terminé ne correspond à ces critères.**

Sur une carte : **Voir**, **PDF**, **Modifier**. Le devis lié s'ouvre au clic ; un double-clic permet de corriger le lien (**double-clic pour corriger**).

**Voir** ouvre le détail, avec un retour vers la liste et un passage en modification.

L'onglet **Nouveau** ouvre directement le formulaire.

### Remplir le formulaire (les deux versions)

**Retour** ramène à la liste (sur téléphone, le retour du formulaire revient à la liste mobile).

Le brouillon part sur le serveur au fil de la saisie. On le reprend dans la liste, badge **Brouillons**. Il n'y a pas de fenêtre « reprendre le brouillon » à l'ouverture : c'est la ligne de la liste qui le rouvre.

**Informations generales**

- **Type de rapport**
- **Titre** (intervention). Le bouton à côté, infobulle **Ajouter un titre**, crée un titre réutilisable dans le filtre.
- **Technicien**
- **Résidence** / **Nom de la résidence** / **Adresse de la résidence**
- **Client / Bailleur**, **Chantier** quand ils sont proposés
- Intervention seulement : **Temps de trajet** et **Temps de taches**, format **h:mm**
- Vigik+ : **Adresse du rapport (Vigik+)** (obligatoire, distincte de la résidence). Placeholder : **Adresse propre au rapport Vigik+ (distincte de la residence)**

**Vigik+**

- **Présence de platine Vigik+** : une photo sous cette question est obligatoire. Sinon : **Joignez une photo sous la question « Présence de platine » (obligatoire pour Vigik+).**
- **Présence d'un portail**. Si oui : **Présence de platine Vigik+ au niveau du portail**, avec ses photos.
- **Numéro du bâtiment**, **Type d'installation**.

**Rapport d'intervention** (ces blocs sont absents en Vigik+)

- **Lieu d'intervention & Locataire** : **Lieu d'intervention**, **Nom locataire**, **Prénom locataire**, **Téléphone locataire**, **Email locataire**.
- **Prestations** : lignes avec **Lieu / Localisation**, **Problème constaté**, **Solution apportée**, **Commentaire**, **Prestation possible**, **Type de prestation réalisée**, photos.
- **Signature** : signer au doigt ou à la souris, **Effacer**. Une signature déjà enregistrée s'affiche au-dessus. Vigik+ n'a pas de signature.
- **Devis à faire** / **Devis fait** se gèrent surtout depuis la liste.

**Valider le rapport**. Pendant l'envoi : **Validation...** Erreur : **Impossible d'enregistrer**, avec le champ concerné.

Sur un rapport déjà créé : **Generer PDF** (orthographe affichée). Pendant la génération : **Generation...**

Le PDF peut partir dans le Drive. Un fichier du même nom ouvre **Conflit de fichier détecté**.

### Ce qu'il ne faut pas inventer

- Il n'y a pas de menu Collaborateur sur le téléphone.
- La liste clients ne crée pas la personne : seulement la société, rattachée à un client déjà connu.
- Les contacts d'un sous-traitant se ajoutent après le premier enregistrement, dans **Modifier le Sous-traitant**.
- Le comparateur demande au moins deux fournisseurs et des produits déjà saisis.
- Vigik+ et rapport d'intervention ne montrent pas les mêmes blocs. Ne pas demander une signature sur un Vigik+.
- **Generer PDF** n'apparaît qu'une fois le rapport enregistré, pas sur un brouillon encore jamais validé.
