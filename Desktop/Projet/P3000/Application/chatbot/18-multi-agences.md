# Plusieurs agences

Une agence n'est pas un chantier client. C'est un compte de dépenses (loyer, salaires d'agence, planning, pointage imputé). L'application en a toujours au moins une. Les suivantes s'ajoutent au même menu.

## Où elles s'affichent

**Menu Chantier.** Les agences sont listées après **Appel d'Offre**, dans l'ordre de création (la plus ancienne en premier).

- La première est toujours visible. Son nom est le lien vers ses dépenses.
- Le **+** à côté crée une agence. L'invite demande **Nom de la nouvelle agence**. Un nom vide ne crée rien. Un nom déjà pris est refusé.
- S'il y en a plusieurs, la flèche **Déplier/replier les agences** montre ou cache les suivantes. Repliées, elles restent dans l'application : seul le menu les cache.

S'il n'y a encore aucune agence, le menu affiche le mot **Agence** sans lien.

**Écran de dépenses.** **Chantier → nom de l'agence**. Titre **Dépenses — {nom}**, sous-titre **Agence · Suivi mensuel**. Chaque agence a son propre tableau, son solde et sa synthèse. La saisie (dépense, avoir, lignes verrouillées, catégorie **Fournisseur**) est décrite dans `11-depenses-chantier-agence-drive-agents.md`.

**Tableau de bord.** Carte **Dépenses d'agence**. Voir plus bas : la carte ne totalise pas toutes les agences tant qu'on ne les coche pas.

**Planning.** En posant une journée, la fenêtre **Sélectionner un chantier ou l'agence** liste les agences en tête, avant les chantiers. Elles restent proposées même si un chantier ordinaire **Terminé** ou **En attente** disparaît de la liste. Une journée posée sur une agence alimente la ligne **Planning** de cette agence, pas d'un chantier client.

**Pointage.** **Tableau → Tableau de pointage**. La case et l'icône camembert **Répartition agences et chantier** ventilent le montant chargé. Détail plus bas.

**Admin.** **Admin → Gestion agences**, réservé au staff. On y renomme et on supprime. On n'y crée pas.

## Créer, renommer, supprimer

**Créer.** **+** du menu **Chantier**, **Nom de la nouvelle agence**. L'application crée en même temps un chantier système du même nom. Il sert de support (planning, lien technique). Ce n'est pas une affaire client : on ne lui fait pas un devis. Dans l'admin, la colonne **Chantier lié** montre ce nom.

**Renommer.** **Admin → Gestion agences**, bouton **Renommer**, invite **Nouveau nom de l'agence**. Le chantier lié prend le même nom. Le nom doit rester unique.

**Supprimer.** Bouton **Supprimer**. Confirmation : l'agence et son chantier système sont supprimés ensemble. La colonne **Statut suppression** vaut **Supprimable** ou **Protégée**.

**Agence par défaut.** Celle qui s'appelle exactement **Agence** porte le badge **Par défaut**. **Renommer** et **Supprimer** sont bloqués. L'avertissement indique **Agence par défaut protégée**. Le message à l'écran : **Le renommage de l'agence par défaut est interdit.**

L'écran admin affiche aussi **Rafraîchir**, les cartes **Total agences**, **Protégées**, **Supprimables**, et la recherche **Rechercher par ID, nom d'agence ou chantier**. **Aucune agence trouvée.** s'il n'y a aucun résultat.

## Carte Dépenses d'agence du tableau de bord

**Où :** **Chantier → Dashboard**, carte **Dépenses d'agence**.

Le montant de la carte n'est pas la somme de toutes les agences. Par défaut, seule la première (la plus ancienne) est prise. Le sous-titre affiche **Réalisé … · Prévu …** pour cette sélection.

L'icône réglage (**Choisir les agences pour le décompte**) ouvre la liste **Agences**. Chaque ligne a le nom et le montant réalisé. On coche ou décoche. **Réinitialiser** revient à la première agence seule. S'il n'y a rien sur la période : **Aucune ligne sur cette période.**

Une ligne **Non rattaché** peut apparaître : des montants d'agence sans agence identifiée. On la coche comme les autres si on veut l'inclure.

Ce choix est enregistré pour l'application, pas pour une seule personne. Le décocher change la carte pour tout le monde.

La carte **Marge brute**, elle, retire les dépenses d'agence réalisées de **toutes** les agences. Les cases de la carte **Dépenses d'agence** ne changent pas ce calcul.

## Imputer le pointage à une ou plusieurs agences

**Où :** **Tableau → Tableau de pointage**, colonne du montant chargé.

- Case cochée : ouvre **Répartition du montant chargé**.
- Case décochée : tout le montant repart en main d'œuvre chantier.
- Icône camembert : rouvre la même fenêtre.

Dans la fenêtre : **Destination** et **Montant (€)**. Destinations possibles : **Main d'œuvre chantier**, ou le nom de chaque agence. **Ajouter une ligne** pour ventiler. La somme des lignes doit égaler le montant chargé, sinon l'enregistrement est refusé. **Total saisi** le rappelle.

**Tout en main d'œuvre chantier** met l'intégralité hors agence. **Enregistrer** valide. **Annuler** ferme.

La part envoyée à une agence apparaît dans les dépenses de cette agence (ligne **Pointage**, non modifiable sur l'écran agence) et dans la carte du tableau de bord si cette agence est cochée.

## Ce qu'une agence ne fait pas

- Elle ne remplace pas un chantier de travaux. Un devis, une situation, un bon de commande client se font sur le chantier, pas sur l'agence.
- Une dépense saisie sur l'agence A n'apparaît pas dans le tableau de l'agence B.
- La catégorie **Fournisseur** d'une agence alimente le **Tableau Fournisseur** avec le **nom de cette agence** dans la colonne chantier.
