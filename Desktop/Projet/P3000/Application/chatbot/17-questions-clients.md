# Questions des clients

Chaque titre est une façon de demander. Le texte en dessous est la réponse courte à donner telle quelle.

## Comment je crée un chantier

La page **Liste des chantiers** n'est pas dans le menu. Bouton **Nouveau Chantier**. Client (ou **Passer cette étape**), société, nom et adresse du chantier, **Créer le chantier**, puis **Finaliser la création**.

## Comment je réponds à un appel d'offres

**Documents → Créer document → Devis → Créer un appel d'offres**. Aucun chantier n'est créé tant que l'offre n'est pas **Validé** puis transformée dans **Chantier → Appel d'Offre**.

## Comment je transforme une offre en chantier

**Chantier → Appel d'Offre**. L'offre doit être **Validé** et pas encore **Transformé**. Choisir le dossier Drive. Le chantier apparaît ensuite dans **Récap Chantier**.

## Comment je fais un devis

**Documents → Créer document → Devis**. Choisir le chantier, ou **Créer un appel d'offres** s'il n'y a pas encore de chantier. On enregistre, puis on le retrouve dans **Liste Devis**.

## Comment je facture

Ouvrir **Liste Devis**, menu du devis, **Éditer en facture**. Renseigner la date d'envoi et le délai 45 ou 60 jours, **Créer la facture**. Pour un mois de travaux, faire d'abord **Créer une situation** sur le devis du chantier.

## Comment je fais une situation

**Liste Devis**, devis du chantier, **Créer une situation**. Choisir le mois. **Appliquer à toutes** met le même pourcentage partout, ou saisir le **% Avancement** ligne par ligne. Vérifier **Taux compte prorata (%)** (2,5 par défaut), la retenue de garantie (5 % par défaut) et **Retenue CIE HT du mois**. **Créer la situation**.

## Où je vois si le client a payé

**Tableau → Tableau Facturation**. **Date d'envoi** quand la facture part, **Montant reçu HT** et **Date de paiement réelle** quand l'argent arrive. **Jours de retard** se calcule seul.

## Comment je saisis un fournisseur sur un chantier

**Chantier → Récap Chantier → Récap Financier**. Choisir le mois (pas **Global**). Carte **MATERIEL**, filtre des fournisseurs, **Montant à payer**, **Sauvegarder**. Le montant payé se saisit plus tard dans **Tableau → Tableau Fournisseur**.

## Comment je crée un bon de commande

Fiche du chantier, onglet **Commandes**, ou **Documents → Créer document → Bon de commande** puis choisir le chantier. Le bon de commande est un document. Il ne remplit pas à lui seul le tableau fournisseur.

## Comment j'ajoute un sous-traitant sur un chantier

Le chantier doit être **En Cours**. **Gérer les sous-traitants**. Choisir un sous-traitant ou en créer un. **Ajouter sans contrat**, ou **Créer un contrat** : type **BTP** ou **Prestation de services**, dates, **Montant de l'opération**. Le PDF part dans le Drive.

## Comment je paie un sous-traitant

**Tableau → Tableau Sous-Traitant**. Même principe que le fournisseur : montant payé, dates, facture. Pour ajouter ou retirer (gasoil, prime), saisir un ajustement : un nombre positif ajoute, un nombre négatif retire.

## Comment je saisis une dépense d'agence

**Chantier**, puis le nom de l'agence. Ajouter une dépense : description, catégorie, montant, récurrence, dates. La catégorie doit être exactement **Fournisseur** pour apparaître dans **Tableau Fournisseur**, avec le nom de l'agence dans la colonne chantier. Les lignes **Planning**, **Primes**, **Pointage** et **Sous-traitant** ne se modifient pas ici.

## Comment je pose un congé

**Agent & Planning → Gestion agent**, ouvrir l'agent, onglet congés. Renseigner les dates. La **Carte Agent** (**Agent & Planning → Carte Agent**) affiche Acquis, En cours, Pris et Solde. Le solde se remet souvent à zéro le 31 mai.

## Comment je pointe les heures

**Tableau → Tableau de pointage**. Choisir l'agent et la semaine. Les heures viennent du planning. On corrige ici les écarts, pas le planning lui-même.

## Comment je planifie quelqu'un

**Agent & Planning → Planning hebdomadaire**. Glisser l'agent sur le jour et le chantier. Le **Gantt** montre la charge. Une journée posée ici alimente les lignes **Planning** de l'agence, qui ne se rééditent pas à la main.

## Où sont les fichiers du chantier

**Drive** dans le menu, ou l'onglet Drive de la fiche. **Chemins Drive** (**Chantier →** l'entrée chemins, ou le menu Drive) relie le chantier à un dossier. **Modifier le chemin** puis **Confirmer** déplace les fichiers déjà présents.

## Je ne vois pas le Drive sur mon téléphone

Après connexion, l'accueil mobile ne montre que les cases cochées par un administrateur. S'il n'y a rien, le message est **Aucun accès configuré**. Un administrateur ouvre **Admin → Utilisateurs**, **Accès mobile (PWA)**, et coche **Drive**.

## Comment je fais un rapport d'intervention

Sur ordinateur : menu des rapports, **Nouveau rapport d'intervention**. Renseigner le lieu, le locataire, les prestations, signer, **Valider le rapport**. Rouvrir pour **Generer PDF**.

Sur téléphone : accueil **Rapports**, bouton **Nouveau** en bas. Le bouton de validation est en bas de la page.

Un rapport **Vigik+** n'a pas de signature ni de bloc locataire. La photo de la platine est obligatoire.

## Comment j'ajoute un client, un fournisseur ou un sous-traitant

Menu **Collaborateur**, sur ordinateur seulement.

- **Clients** : une société reliée à une personne qui existe déjà. La personne se crée en créant un chantier.
- **Fournisseurs** : la fiche, puis les contacts seulement après le premier enregistrement, en modification.
- **Sous-traitants** : la fiche société. Le contrat, lui, se crée depuis le chantier (**Gérer les sous-traitants**), pas depuis cette liste.

## J'ai oublié mon mot de passe

Le lien **Mot de passe oublié ?** ne fait rien. Demander à un administrateur : **Admin → Utilisateurs**, icône clé.

## Comment je gère plusieurs agences

Le **+** à côté de la première agence dans **Chantier** demande **Nom de la nouvelle agence**. La première agence reste affichée ; la flèche déplie les autres. Chaque nom ouvre ses propres dépenses. Sur le **Dashboard**, la carte **Dépenses d'agence** ne compte par défaut que la première : l'icône réglage coche les autres. L'agence nommée **Agence** ne se renomme pas et ne se supprime pas (**Admin → Gestion agences**).

## Le bouton est grisé

Le chantier est sans doute **En attente**, **Terminé** ou **Facturé**. Repasser la fiche en **En Cours**. Si **Sauvegarder** est grisé sur les fournisseurs, quitter le mode **Global** et choisir un mois.
