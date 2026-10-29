# Index — base de connaissances de l'assistant P3000

Ces fichiers décrivent l'utilisation réelle de l'application (menus, boutons, règles visibles à l'écran). Ils sont faits pour être fournis à un assistant conversationnel.

## Comment les brancher

1. Charger `00-consignes.md` comme consigne système, à chaque conversation.
2. Fournir les autres fichiers comme connaissance. Si l'outil ne prend qu'un extrait, chercher d'abord dans `17-questions-clients.md`, puis le fichier dont le titre correspond (voir la table).
3. Ne pas mélanger avec le code source : l'assistant doit parler à l'utilisateur, pas décrire les composants.
4. Si aucun extrait ne répond, le dire et orienter vers un administrateur (mot de passe, accès mobile, rôle). Les questions sans réponse pourront être notées plus tard dans `questions-sans-reponse.jsonl`. Le chat n'est pas encore branché dans l'application : ces fichiers sont la base à lui fournir.

## Fichiers

| Fichier | Sujets | Questions types |
|---|---|---|
| `00-consignes.md` | rôle, ton, carte des menus, vocabulaire | toujours |
| `01-connexion-et-navigation.md` | login, menu, déconnexion, cloche, notes de version | « où est le menu », « mot de passe », « alertes » |
| `02-dashboard-chantiers-agence.md` | dashboard, fiche chantier, appels d'offres, frais d'agence, admin agences | « CA », « changer le statut », « créer un chantier depuis un AO », « dépense d'agence » |
| `03-devis.md` | création, modification, tags, transformations | « créer un devis », « remise », « tag », « facture / avenant / CIE » |
| `04-factures-situations-bons-de-commande.md` | factures, situations, bons de commande | « situation », « bon de commande », « statut payée » |
| `05-rapports-intervention.md` | rapports bureau et mobile, Vigik | « rapport », « brouillon », « Vigik » |
| `06-agents-planning-pointage.md` | calendrier, carte agent, congés, planning, primes, Gantt, pointage | « congé », « affecter un agent », « PDF planning », « paie » |
| `07-tableaux-financiers.md` | facturation, fournisseur, sous-traitant, tableau de suivi | « date d'envoi », « masquer une ligne », « paiement sous-traitant » |
| `08-collaborateurs.md` | clients, fournisseurs, sous-traitants, comparateur | « nouvelle société », « magasin », « comparer un prix » |
| `09-drive.md` | Drive, recherche, upload, aperçu, conflit PDF, chemins, récupération | « envoyer un dossier », « remplacer un PDF », « dossier du chantier » |
| `10-distributeurs-admin-mobile.md` | distributeurs, utilisateurs, accès mobile, applications liées | « téléphone », « rôle admin », « réappro », « Elekable » |
| `11-depenses-chantier-agence-drive-agents.md` | dépense fournisseur et sous-traitant sur un chantier, écran agence, tableaux, chemin Drive, carte agent | « saisir un fournisseur sur le chantier », « contrat sous-traitant », « catégorie Fournisseur », « chemin Drive », « carte agent » |
| `12-collaborateurs-et-rapports.md` | menu Collaborateur, rapports d'intervention ordinateur et téléphone | « nouvelle société », « fournisseur », « comparer un prix », « rapport », « Vigik », « téléphone » |
| `13-parcours-offre-paiement.md` | de l'appel d'offres jusqu'à l'encaissement | « on en est où », « comment je facture le mois », « ils n'ont pas payé » |
| `14-je-suis-bloque.md` | boutons grisés, mot de passe, accès mobile, conflit Drive | « ça ne marche pas », « bouton grisé », « mot de passe oublié » |
| `15-creer-un-chantier.md` | Nouveau Chantier, client, société, détails | « créer un chantier », « nouveau chantier » |
| `16-situation-champ-par-champ.md` | prorata, retenue de garantie, CIE, lignes | « c'est quoi le prorata », « retenue », « avancement » |
| `17-questions-clients.md` | questions telles que les clients les posent, réponses courtes | à charger en priorité : ce sont les formulations réelles |
| `18-multi-agences.md` | plusieurs agences : menu, dépenses, tableau de bord, planning, pointage, admin | « ajouter une agence », « pourquoi le dashboard ne compte qu'une agence », « répartir le pointage » |

## Règles déjà tranchées (à ne pas contredire)

- Le menu **Admin** et les écrans utilisateurs / agences / récupération Drive sont réservés au staff et aux superusers.
- **Carte Agent** et **Bon de commande** s'ouvrent en fenêtre depuis le menu.
- Une situation se crée depuis un devis de chantier, pas depuis **Créer document**.
- **Éditer en avenant** est masqué sur un devis de chantier. Un devis ne se transforme qu'une fois (facture, avenant ou CIE).
- Sur un chantier **En attente**, **Terminé** ou **Facturé**, on ne crée pas de devis, de situation, ni de sous-traitance.
- Les lignes **Planning**, **Primes**, **Pointage** et **Sous-traitant** des dépenses d'agence ne s'éditent pas dans l'écran agence.
- Le montant fournisseur d'un chantier se saisit dans **Récap Financier → MATERIEL**, mois choisi, pas en mode Global. La catégorie **Fournisseur** de l'agence alimente le Tableau Fournisseur au nom de l'agence. Le pas à pas est dans `11-depenses-chantier-agence-drive-agents.md`.
- « Mot de passe oublié » et « Rester connecté » ne font rien à l'écran de connexion.
- Le menu **Collaborateur** n'existe que sur ordinateur. Les rapports se font sur ordinateur (**Documents → Rapports d'intervention**) et sur téléphone (carte **Rapports**). Le pas à pas est dans `12-collaborateurs-et-rapports.md`.
- Un Vigik+ n'a pas de signature ni de bloc locataire. Le PDF d'un rapport n'existe qu'après **Valider le rapport**.
- La page **Liste des chantiers** (bouton **Nouveau Chantier**) n'est pas dans le menu. Le pas à pas est dans `15-creer-un-chantier.md`.
- Plusieurs agences : la première est visible dans **Chantier**, les autres se déplient. La carte **Dépenses d'agence** ne compte par défaut que la première. Détail : `18-multi-agences.md`.
