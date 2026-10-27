# Dépenses d'un chantier, agence, tableaux, chemin Drive, carte agent

Ce fichier est le guide pas à pas. Pour une question sur ces sujets, suivre ces étapes et ces libellés, pas un résumé.

Trois endroits différents, à ne pas mélanger :

| Besoin | Où |
|---|---|
| Montant à payer à un fournisseur **pour un chantier et un mois** | Fiche chantier → **Récap Financier** → carte **MATERIEL** |
| Commande fournisseur (document, livraison, paiement du bon) | Fiche chantier → onglet **Commandes**, ou **Documents → Créer document → Bon de commande** |
| Dépense fournisseur **de l'agence** (pas d'un chantier de travaux) | **Chantier → nom de l'agence**, catégorie exactement **Fournisseur** |
| Contrat et paiements d'un sous-traitant **sur un chantier** | Fiche chantier → **Gérer les sous-traitants**, puis **Tableau → Tableau Sous-Traitant** |
| Loyer, assurance, salaire d'agence, avoir | **Chantier → nom de l'agence** |

Le chantier doit être **En Cours** pour **Gérer les sous-traitants**. Le récap financier et les commandes restent consultables sur les autres statuts.

---

## 1. Dépense fournisseur sur un chantier précis

Cela enregistre le **montant à payer** du mois, pour ce chantier et ce fournisseur. Le **montant payé**, le numéro de facture et les dates se saisissent ensuite dans le **Tableau Fournisseur**.

1. **Chantier → Récap Chantier**.
2. Choisir le chantier : **Rechercher un chantier...** ou le catalogue.
3. Onglet **Récap Financier**.
4. Choisir le **Mois** et l'**Année**. Le bouton **Global** doit être désactivé. En mode **Global**, les montants ne se modifient pas et **Sauvegarder** est inactif.
5. Bloc **Dépenses**, onglet **Payées** ou **Restantes**.
6. Cliquer la carte **MATERIEL** (orange). Le panneau de droite s'intitule **Détails dépenses**.
7. Rester sur l'onglet **Tableau** (l'onglet **Documents** montre les bons de commande, il ne sert pas à saisir le montant).
8. Titre du tableau : **Paiements matériel par fournisseur (mois/année)**.
9. Une ligne par fournisseur de l'annuaire, colonne **Montant à payer**. Saisir le montant du mois (virgule ou point). Un montant à 0 n'est pas considéré comme saisi.
10. Si la liste est trop longue, cliquer le filtre (infobulle du type « cliquer pour en afficher une sélection »). Fenêtre **Fournisseurs à afficher pour ce chantier**.
    - Recherche.
    - Filtres : **Tous**, **Avec BC**, **Montant saisi**, **BC ou montant saisi**, **Les deux**.
    - Légende : icône document = bon de commande déjà dans le récap ; icône paiement = montant déjà saisi.
    - **Tout cocher** / tout décocher, puis **Enregistrer**. Seuls les fournisseurs affichés sont envoyés à la sauvegarde.
11. **Sauvegarder**. Le montant payé n'est pas saisi ici : il reste à 0. Message d'erreur possible : **Erreur lors de la sauvegarde des paiements matériel.**

La ligne apparaît ensuite dans **Tableau → Tableau Fournisseur**, colonne **Chantier** = le nom du chantier, pour le mois choisi.

Le bon de commande n'est pas obligatoire pour cette saisie. Il sert de pièce : onglet **Documents** du même panneau (un onglet par fournisseur), ou onglet **Commandes** de la fiche. Créer le bon : **Nouveau Bon de Commande** (le chantier est déjà choisi). Fenêtre **Nouveau Bon de Commande** : **Fournisseur**, **Magasin**, **Chantier**, **Émetteur**, **Statut de Livraison**, **Date de Commande**, **Date de Création du Document**, **Heure de livraison**, **Type de Contact Réceptionnaire** (**Agent** ou **Sous-traitant**), **Numéro de Bon de Commande**, puis les produits.

Payer le bon lui-même (statut **Payé** / **Payé Partiellement**) se fait dans la liste des bons, menu **Gérer le paiement**. Ce n'est pas la même case que **Montant payé** du Tableau Fournisseur.

---

## 2. Dépense sous-traitant sur un chantier précis

Il n'y a pas de tableau « montant à payer par sous-traitant » dans le récap, contrairement au matériel. On crée d'abord le lien et le contrat sur le chantier, puis on suit les paiements du mois dans le tableau sous-traitant.

Le chantier doit être **En Cours**. Sinon **Gérer les sous-traitants** est grisé.

1. **Chantier → Récap Chantier**, choisir le chantier, onglet **Informations**.
2. **Gérer les sous-traitants**. Titre **Gestion des sous-traitants**.
3. **Sélectionner un sous-traitant existant** ou **Nouveau sous-traitant**.
4. Dans la liste de sélection, deux boutons :
   - **Ajouter sans contrat** : le sous-traitant est lié au chantier, badge **Sans contrat**. Pas de PDF. La génération de documents est désactivée.
   - **Créer un contrat** : fenêtre **Nouveau contrat de sous-traitance**.
5. Champs du contrat, puis **Créer** (ou **Annuler**) :
   - **Type de contrat** : **BTP** ou **Prestation de services**. Obligatoire. Si le sous-traitant n'est ni BTP ni nettoyage, le type n'est pas prérempli : message **Veuillez sélectionner un type de contrat**.
   - **Description de la prestation**
   - **Nom du maître d'ouvrage** (obligatoire, repris de la fiche chantier)
   - **Nom du maître d'œuvre** (obligatoire)
   - **Date de début**, **Date de création du contrat**
   - **Durée** (défaut : Jusqu'à livraison du chantier)
   - **Adresse de la prestation** (rue, code postal, ville du chantier)
   - **Nom de l'opération** (nom du chantier)
   - **Montant de l'opération** en € (obligatoire)
6. À la création, un PDF part dans le Drive du chantier. S'il existe déjà, la fenêtre **Conflit de fichier détecté** s'ouvre.
7. De retour dans la liste, déplier le sous-traitant. Badge **Contrat #…**. Le tableau montre **Type**, **Description**, **Catégorie**, **Date**, **Montant**.
8. Icônes sur la ligne (infobulles) :
   - crayon vert : **Modifier le sous-traitant**
   - tableau violet : **Afficher le tableau de paiements** (nouvel onglet, ce chantier et ce sous-traitant)
   - plus : **Créer un avenant** si un contrat existe, ou **Créer un contrat** / **Créer un contrat documenté** s'il n'y a pas encore de document
   - poubelle : **Supprimer l'association (sans document)** seulement pour un lien sans contrat

**Filtrer par type** : **Tous les types**, **Nettoyage**, **BTP**, **TCE**, **Autre**.

Dans le récap financier, la carte **SOUS TRAITANT** affiche le total. L'onglet **Tableau** liste les pièces (sous-traitant, facture, montant). L'onglet **Documents** regroupe les contrats. On n'y tape pas un nouveau montant : le montant du marché est celui du contrat, les mois se saisissent dans le tableau sous-traitant.

---

## 3. Écran Agence

**Où :** **Chantier → nom de l'agence**. La première agence est visible, les autres se déplient avec la flèche. Ce n'est pas un onglet de la fiche chantier.

Titre **Dépenses — {nom}**, sous-titre **Agence · Suivi mensuel**.

### Ce que l'écran calcule

Quatre cartes :

- **Dépenses** : somme des dépenses de la période, affichée en moins.
- **Avoirs** : somme des montants positifs, affichée en plus.
- **Solde du mois** ou **Solde de la période** : avoirs moins dépenses. Indication **Avoirs moins dépenses**.
- **Solde annuel {année}** : dépenses + planning − avoirs sur l'année. Info-bulle : **Le planning et les ajustements sous-traitant d'un agent disparaissent dès qu'un montant chargé est imputé à l'agence.**

Le montant d'une ligne affichée est le montant payé s'il est renseigné, sinon le montant prévu.

### Choisir la période

- **Un mois** : mois + année. C'est le mode pour ajouter une ligne sur un mois précis.
- **De mois à mois** : 24 mois maximum. Au-delà, la période est coupée.
- **De jour à jour** : dates **Du** / **au**.

### Ajouter une dépense ou un avoir

**Ajouter une dépense** ouvre **Ajouter une nouvelle dépense**. **Ajouter un avoir** ouvre **Ajouter un avoir** (montant qui diminue les dépenses).

Champs :

- **Description**
- **Catégorie** : liste triée de A à Z, ou taper un nom nouveau. Aide : **Choisissez une catégorie existante ou tapez-en une nouvelle**. Si le nom n'existe pas, la liste propose **Créer « … »**. 50 caractères maximum. Alerte **Veuillez renseigner une catégorie** si elle est vide.
- **Montant** (nombre, pas négatif)
- Case **Dépense récurrente** ou **Montant récurrent** (indisponible en modification)
- **Date de début** (en création, le mois affiché à l'écran)
- **Date de fin (optionnelle)**

**Annuler** ou **Ajouter**. En modification : **Modifier**. Si la ligne fait partie d'une série : **Arrêter la récurrence à ce mois**.

### Lignes qu'on ne modifie pas ici

Badge et infobulle :

| Badge | Infobulle | Où corriger |
|---|---|---|
| **Planning** | Géré via le planning hebdo | **Agent & Planning → Planning hebdo** |
| **Primes** | Géré via « Gérer les Primes » | Planning hebdo → **Gérer les Primes** |
| **Pointage** | Géré via le tableau de pointage | **Tableau → Tableau de pointage** |
| **Sous-traitant** | Géré via le tableau sous-traitant | Ajustement saisi dans **Tableau Sous-Traitant** |

Ces lignes n'ont pas les boutons modifier / supprimer.

Dès qu'un montant de pointage est imputé à l'agence pour un agent (et un chantier, selon le découpage), la ligne de planning et l'ajustement sous-traitant de cet agent sortent du solde : on ne compte pas deux fois la même personne.

### Catégorie Fournisseur : elle alimente le Tableau Fournisseur

Si la catégorie est exactement **Fournisseur** (et que ce n'est pas un avoir) :

- la **Description** devient le nom du fournisseur dans le tableau ;
- la colonne **Chantier** affiche le **nom de l'agence**, pas un chantier de travaux ;
- le montant saisi est le **montant à payer** ;
- le mois et l'année de la dépense placent la ligne dans le bon mois du **Tableau Fournisseur**.

On s'en sert pour une facture fournisseur de l'agence (fournitures du siège, par exemple). Pour un chantier de travaux, utiliser le récap **MATERIEL** du chapitre 1, pas cette catégorie.

Une autre catégorie (**Loyer**, **Assurance**, un nom créé à la main, etc.) reste uniquement dans l'écran agence. Elle n'apparaît pas dans le Tableau Fournisseur.

### Lire le tableau et les synthèses

Filtres de colonnes : **Description**, **Catégorie**, **Montant**, **Commentaire**.

Sous le tableau : **Synthèse du mois** ou **Synthèse de la période**, titre **Dépenses par catégorie** et **Avoirs par catégorie**. Un clic sur une catégorie ouvre le détail **Désignations regroupées** pour la période.

Créer une agence : bouton **+** à côté de la première agence dans le menu. Invite **Nom de la nouvelle agence**. Renommer ou supprimer : **Admin → Gestion agences** (l'agence nommée **Agence** est protégée).

---

## 4. Tableau Fournisseur

**Où :** **Tableau → Tableau Fournisseur**. Titre **TABLEAU FOURNISSEUR Année {année}**.

Vue annuelle de tous les chantiers et des lignes agence. On n'y crée pas le montant à payer d'un chantier : il arrive du récap (chapitre 1) ou d'une dépense agence catégorie **Fournisseur** (chapitre 3). Ici on suit le règlement.

**Actualiser** recharge. **Lignes masquées** ouvre la liste des lignes retirées, avec **Réafficher**.

Colonnes : **Mois**, **Fournisseur**, **Chantier**, **Montant à payer**, **Montant payé**, **Facture**, **Écart**, **Date d'envoi**, **Date de paiement**, **Date paiement prévue**, **Écart paiement réel**, **Total Fournisseur/Mois**.

Une ligne dont le montant à payer est 0 n'est pas affichée.

Actions :

- **Montant payé** et **Date de paiement** : clic, fenêtre de saisie. L'enregistrement part tout seul après environ une seconde. Les deux montants sont gardés, y compris 0.
- **Date d'envoi** : clic. La date de paiement prévue est alors la date d'envoi + 45 jours.
- **Facture** : **Ajouter une facture** (numéro, montant, payée ou non, date de paiement de la facture). On peut modifier ou supprimer une facture déjà posée.
- Masquer : icône sur la ligne. Confirmation : **Masquer cette ligne ? Elle ne sera plus affichée ni comptabilisée dans les totaux et le dashboard. Vous pourrez la réafficher plus tard.**
- Remplissage d'un fournisseur pour tout un mois : **Remplir automatiquement les paiements**. Cela met le montant payé égal au montant à payer sur chaque ligne du fournisseur pour ce mois, pose la **Date de paiement**, et valide les factures déjà présentes sans compter deux fois leur montant. S'il y a plusieurs chantiers, une nouvelle facture se rattache au chantier choisi. Un numéro sans montant crée la même facture sur chaque ligne, avec le montant à payer de la ligne.

Un clic sur un total ouvre le découpage **Agence** / chantiers : **À payer**, **Payé**, **Écart**, et le détail des lignes. C'est une lecture, pas une saisie.

En bas, récap par fournisseur : recherche, tri par montant, avancement ou ordre alphabétique.

---

## 5. Tableau Sous-Traitant

**Où :** **Tableau → Tableau Sous-Traitant**. Titre **TABLEAU SOUS-TRAITANT Année {année}**.

Même logique annuelle : **Actualiser**, **Lignes masquées**, saisie des paiements et des factures, message **Paiements sauvegardés avec succès !**

Masquer : **Masquer cette ligne ? Elle ne sera plus affichée ni comptabilisée…** La fenêtre **Lignes masquées** précise qu'elles sortent des totaux et du coût sous-traitance du tableau de bord. Colonnes de cette fenêtre : **Mois**, **Sous-traitant**, **Chantier**, **À payer**, **Réafficher**.

**Remplir automatiquement** : même principe que le fournisseur (montant payé = montant à payer, date, factures). Les factures sont facultatives : **Laissez vide si vous ne souhaitez pas créer de facture. Le montant payé sera quand même rempli.** Bouton **Ajouter une facture**.

### Ajustement (revient dans l'agence)

Sur une ligne liée à un agent, ouvrir l'ajustement.

- Montant : exemple affiché **60 pour ajouter, -50 pour déduire**.
- Motif : exemple **Gasoil, Prime, Déduction...**
- Le formulaire montre le total : main d'œuvre + primes + ajustement.
- **Sauvegarder**, **Annuler**, ou **Supprimer l'ajustement** si un ajustement existe déjà.

Cet ajustement crée ou met à jour la ligne **Sous-traitant** de l'écran agence. On ne la modifie pas dans l'agence.

### Suivi d'un seul contrat

Depuis la fiche chantier, icône **Afficher le tableau de paiements** : page du couple chantier / sous-traitant. Fenêtres **Date d'envoi et délai de paiement**, **Montant payé et date de paiement**, **Montant facturé du mois**, **Montant de retenue**, **Nouvelle facture sous-traitant**, **Modifier la facture**. **Annuler** / **Valider**.

Le récap en bas du tableau annuel se cherche par **Rechercher par nom ou client…**, tri montant, avancement ou alphabétique. Le détail d'un nom montre **Montant à payer HT**, **Montant à payer TTC**, **Montant payé**, **Écart**.

---

## 6. Chemin Drive d'un chantier

**Où :** menu **Chemins Drive**. Titre **Chemins de Drive par Chantier**.

Chaque chantier a un dossier. Tant qu'on n'a rien changé, le chemin est calculé automatiquement. Un chemin enregistré à la main remplace celui-là.

1. Recherche : **Rechercher par nom de chantier, société ou chemin de drive...**
2. Repérer la ligne : **Nom du Chantier**, **Société**, **État**, **Date de Début**, **Chemin de Drive**.
3. Trois actions :
   - **Copier le chemin**
   - **Ouvrir dans le Drive** (ouvre le Drive à cet endroit)
   - **Modifier le chemin**
4. Fenêtre **Modifier le chemin du drive**, avec le nom du chantier.
   - **Chemin actuel** (ou **Calculé automatiquement**).
   - S'il y a déjà un chemin personnalisé : **Chemin personnalisé stocké**.
   - **Sélectionner un nouveau chemin** (ou **Modifier le chemin sélectionné** si un choix est déjà fait).
   - **Réinitialiser au chemin par défaut** seulement si un chemin personnalisé existe. Message ensuite : **Chemin réinitialisé au chemin par défaut**.
5. Fenêtre **Sélectionner le chemin du drive** : parcourir les dossiers, **Créer un nouveau dossier ici** (puis **Créer un nouveau dossier**), **Réinitialiser**, **Annuler**, **Confirmer**. **Confirmer** reste inactif tant qu'aucun dossier n'est choisi.
6. De retour sur la première fenêtre, le nouveau chemin s'affiche. Bandeau : **Tous les fichiers et dossiers seront automatiquement transférés de l'ancien chemin vers le nouveau lors de l'enregistrement.**
7. **Enregistrer** (ou **Enregistrement...**). Si rien n'a changé : **Le chemin n'a pas changé**. **Annuler** ferme sans enregistrer.

La liste ne contient que les chantiers, pas les appels d'offres. Le chemin d'un appel d'offres se choisit au moment de **Transformer en chantier**.

Depuis la fiche, **Accéder au Drive** ouvre le dossier du chantier sans passer par cet écran.

---

## 7. Carte agent

**Où :** **Agent & Planning → Carte Agent**. Fenêtre **Carte Agent**, par-dessus la page.

1. **Rechercher un agent...** Un agent sorti des effectifs est marqué **(inactif)**. On peut quand même ouvrir sa fiche.
2. Pour un agent nouveau : le remplir puis **Enregistrer**. La photo n'est disponible qu'une fois l'agent créé (**Photo** est inactif sans identifiant).

### Photo et indicateurs

- **Photo** pour ajouter, **Suppr.** pour retirer.
- Bloc présence : **Du** / **au** (dates). Texte du type **12 prés. · 2 abs. · 1 école / 20 j. sous contrat**, ou **Aucun jour sous contrat**, ou **Aucun jour ouvré**. **Cliquer pour le détail** ouvre **Jours d'absence** / le récapitulatif.
- Bloc **Congés** de la période (reset indiqué, souvent **Reset 31 mai**) : **Acquis**, **En cours**, **Pris**, **Solde**. Infobulle **Gérer les congés**.
  - Clic sur le bloc : fenêtre **Congés payés**.
  - Clic sur **Acquis**, **En cours**, **Prévision** ou **Pris** : saisir le nombre réel à ce jour.
  - Clic sur un mois : détail du calcul (présence, absences, **2,5 j × jours comptés / jours ouvrés du mois**, **Plafond annuel de 30 j appliqué**).
  - Si un congé payé est en cours, une ligne l'indique jusqu'à sa date de fin.

### Identité

**Nom**, **Prénom**, **Adresse mail**, **Adresse**, **Téléphone**.

### Contrat

Plusieurs contrats possibles, le plus récent en premier, badge **Récent**. Bouton **Ajouter** crée un onglet de contrat vide.

Champs : **Libellé**, **Type de contrat** (**CDI** ou **CDD**), **Fin période d'essai**, **Début contrat**.

- CDD : **Fin contrat (CDD)**. Bloc **Avenants CDD**. Texte s'il n'y en a pas : **Aucun avenant. Ajoutez-en un pour prolonger la date de fin du CDD.** Chaque avenant se lit **Avenant n°XX — Nouvelle fin CDD**.
- CDI : **Date de sortie** (fin réelle, si l'agent part).

Supprimer un contrat demande confirmation (**Supprimer ce contrat ?**).

### Rémunération

**Type de paiement** : **Horaire** ou **Journalier**.

- Horaire : **Taux horaire (€)**, puis section **Horaires** : **Heure début**, **Heure fin**, **Pause début**, **Pause fin**.
- Journalier : **Taux journalier (€)**. Pas de grille horaire. Dans le planning, la demi-journée compte 4 h.

### Jours de travail

Liste à choix multiples : **lundi**, **mardi**, **mercredi**, **jeudi**, **vendredi**, **samedi**, **dimanche**. Ce sont les jours où l'agent peut être planifié et où les congés payés comptent.

### Enregistrer ou supprimer

**Enregistrer**. Succès : **Carte agent enregistrée.**

**Supprimer l'agent** puis **Supprimer cet agent ?** et, si besoin, **Supprimer définitivement**.

Les événements du mois (présence, absence, congé posé sur des dates) se saisissent dans **Agent & Planning → Gestion agent**, pas sur cette carte. La carte porte la fiche, le solde de congés et les règles du contrat.
