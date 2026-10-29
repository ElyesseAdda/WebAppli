# Distributeurs, administration, téléphone

## Distributeurs

Module de suivi des distributeurs automatiques (machines, stock, mouvements, documents). Sur ce déploiement, il n'est pas dans le menu latéral de l'ordinateur. On y arrive par l'adresse du module, ou par la carte **Distributeur** de l'accueil mobile (**Gestion des distributeurs**), si l'accès est autorisé.

Le menu **Applications** peut proposer **MJR Services** et **Elekable** : ce sont d'autres sites, ouverts à part.

**Sur ordinateur**, une barre interne propose : **Statistiques** (vue d'ensemble), **Distributeurs**, **Stock**, **Documents** (factures et rapports). En bas, **Retour à MJR Services** ramène vers le site MJR.

**Sur téléphone :** barre **Distributeurs**, **Accueil mobile**, **Déconnexion**. Onglets **Stats**, **Distributeur**, **Stock**, **Documents**.

### Machines

- **Nouveau** / **Nouveau distributeur**, ou **Créer le premier distributeur**.
- Fiche : **Nom**, **Localisation**, **Type**.
- **Modifier**. Suppression : **Supprimer ce distributeur ?**
- **Nouveau mouvement**, **Reprendre le mouvement**, **Sessions Récentes**.
- **Analyse détaillée par produit**, **Liste des frais**.
- Bénéfice par **Mois** ou **Année**, affichage **bénéfice** ou **unités**.

### Réapprovisionnement

1. Ouvrir le distributeur.
2. **Nouveau mouvement** ou la grille **Réapprovisionnement**.
3. **Plan du distributeur — sélectionnez une case**.
4. **Date du mouvement**.
5. **Unités ajoutées** : **Nombre d'unités**, **Valider**. Champs possibles : **Quantité**, **Prix unitaire (€)**, **Date et heure**, **Commentaire (optionnel)**.
6. **Terminer et enregistrer le mouvement**.

**Annuler ce mouvement** restaure le stock (message **Mouvement annulé et stock restauré**). Un mouvement commencé peut être repris : il est gardé sur l'appareil (**Mouvement en cours**).

### Stock entrepôt

Onglet **Stock**. Filtres : **Tous**, **Stock faible (1-10)**, **Rupture (0)**, **Tri: faible -> fort** ou **Tri: fort -> faible**. Résumé des achats repliable. Création d'achats et de produits depuis cet onglet.

Ce stock n'est pas le stock chantier (page ancienne, hors menu).

## Utilisateurs (admin)

**Où :** **Admin → Utilisateurs**. Réservé staff ou superuser. Un autre compte est renvoyé au tableau de bord. Titre **Gestion des utilisateurs**.

Onglets **Utilisateurs** et **Émetteurs**.

**Créer :** **Créer un utilisateur**, **Créer l'utilisateur**, **Générer** (mot de passe). **Rôle administrateur à la création** : seulement un superuser peut cocher ça.

Badges : **Superuser**, **Admin**, **Utilisateur**, **Actif** / **Inactif**. Accès mobile affiché **R/D/Drive** (rapports, distributeur, drive).

Menu d'un compte :

- **Donner le rôle admin** / **Retirer le rôle admin**
- **Désactiver le compte** / **Activer le compte**
- **Réinitialiser le mot de passe**
- **Accès mobile (PWA)** : cases **Rapports d'intervention**, **Distributeur**, **Drive**, puis **Enregistrer**

Un superuser n'est pas modifiable depuis ce menu. Un admin gère les comptes qui ne sont pas admin, selon les actions proposées.

**Émetteurs** (pour les bons de commande) : **Ajouter un émetteur**, **Désactiver** / **Activer**.

## Téléphone : accueil

Après connexion, titre du type **Bonjour, {prénom}** et **Choisissez votre espace de travail**.

Cartes possibles :

- **Rapports** — rapports d'intervention
- **Distributeur** — si le module est activé pour ce déploiement et si l'accès est coché
- **Drive** — documents

S'il n'y a qu'un seul espace, l'application y entre directement. S'il n'y en a aucun : **Aucun accès configuré**, avec la consigne de contacter l'administrateur.

Un compte staff ou superuser voit tous les espaces proposés par ce déploiement. Pour un utilisateur standard, l'administrateur coche les cases dans **Accès mobile (PWA)**.

## Applications liées

Menu **Applications** : liens qui quittent P3000 (selon le déploiement, **Elekable**, **MJR Services**). Ce ne sont pas des pages de cette application.
