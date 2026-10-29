# Connexion, menu et alertes

## Se connecter

Écran de connexion, hors menu.

1. Saisir **Nom d'utilisateur** et **Mot de passe**.
2. L'icône œil affiche ou masque le mot de passe.
3. **Se connecter**. Le bouton reste inactif tant que les deux champs sont vides.
4. Message **Connexion réussie !**, puis ouverture du tableau de bord sur ordinateur, ou de l'accueil mobile sur téléphone.

Questions fréquentes :

- « Le bouton Se connecter est grisé » : un des deux champs est vide, ou la connexion est en cours.
- « Mot de passe oublié » : le lien affiché ne lance aucune procédure. Demander à un administrateur de réinitialiser le mot de passe (**Admin → Utilisateurs → Réinitialiser le mot de passe**).
- « Rester connecté » : la case est affichée mais n'a pas d'effet.

Sans connexion, l'application renvoie vers l'écran de connexion.

## Menu latéral

Le menu est à gauche. S'il est masqué, l'icône hamburger le rouvre. La croix le referme. Une catégorie se déplie au clic.

Deux entrées n'ouvrent pas une page :

- **Documents → Créer document → Bon de commande** ouvre le formulaire par-dessus la page.
- **Agent & Planning → Carte Agent** ouvre la fiche agent en fenêtre.

Le menu **Admin** n'apparaît que pour un compte staff ou superuser.

Le bouton **+** à côté de la première agence (sous **Chantier**) crée une agence : une invite demande **Nom de la nouvelle agence**.

## Fil d'Ariane

Sous l'en-tête, le fil indique la section et la page (et parfois le chantier). Il sert à se repérer. Certaines pages existent sans entrée de menu ; le fil les nomme quand même.

## Se déconnecter

**Déconnexion** en haut à droite. Sur le Drive mobile et les Distributeurs mobile, le bouton est dans la barre de ces écrans.

## Alertes devis

Icône cloche, infobulle **Alertes devis**, en haut à droite de toutes les pages bureau.

- Panneau **Alertes tags devis**.
- Chaque alerte indique qui a changé les tags d'un devis, le devis, le chantier, et les tags avant / après.
- Si le devis a été transformé en facture, avenant ou CIE, l'alerte indique le type et le numéro. Un clic sur le numéro ouvre le document.
- Un clic sur l'alerte ouvre le chantier, onglet documents / devis.
- **Tout lu** marque toutes les alertes comme lues. L'icône de validation marque une seule alerte. Les alertes lues disparaissent de la liste.

Cette cloche ne concerne que les tags de devis. Elle ne signale pas les paiements en retard ni les plannings.

## Notes de version

Bouton **Note de Patch** dans l'en-tête. Titre **Quoi de neuf ?**. La fenêtre s'ouvre seule tant qu'elle n'a pas été fermée avec **J'ai compris**. **Suivant** et **Retour** font défiler les nouveautés. On peut la rouvrir à tout moment.

## Pages hors menu (ne pas les inventer dans le menu)

Ces écrans existent, mais il n'y a pas de lien dans la barre latérale. On y arrive depuis une fiche chantier, une adresse directe, ou un autre écran :

- Liste des chantiers (bouton **Nouveau Chantier**)
- Tableau de bord des chantiers (vue multi-chantiers par année)
- Tableau de suivi d'un chantier (bouton **Afficher tableau suivi** sur la fiche)
- Paiements d'un sous-traitant sur un chantier (depuis **Gérer les sous-traitants**)
- Stock chantier (page peu exposée)
- Ancienne création de devis (l'entrée du menu ouvre la création actuelle, **Création de Devis**)
