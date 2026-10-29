# Tableaux de facturation, fournisseurs et sous-traitants

Ces tableaux sont annuels et portent sur tous les chantiers. Le tableau de suivi d'un seul chantier n'est pas dans ce menu.

## Tableau Facturation

**Où :** **Tableau → Tableau Facturation**. Titre **TABLEAU FACTURATION Année {année}**. L'année se choisit dans une plage d'environ deux ans autour de l'année en cours.

Colonnes : **Mois**, **Client**, **Chantier**, **Banque**, **N° Situation**, **N° CP**, **N° Facture**, **Montant HT Situation**, **Situation Cumul HT**, **Date d'envoi**, **Date de paiement prévue**, **Montant reçu HT**, **Date de paiement réelle**, **Jours de retard**, **Écart Mois**.

- Clic sur une date d'envoi : **Date d'envoi et délai de paiement** (45 ou 60 jours).
- Clic sur un paiement : **Montant reçu et date de paiement**.
- PDF de la situation ou de la facture depuis la ligne.

**Récapitulatif en bas :** les chantiers sont regroupés par le **maître d'ouvrage** indiqué sur la fiche chantier (pas par la société liée). Chaque groupe est un accordéon. Recherche par maître d'ouvrage ou par chantier. Tri par **montant**, **avancement** ou **alphabétique**.

Il n'y a pas de filtre « un seul chantier » dans l'en-tête : c'est la vue de l'année.

## Tableau de suivi (un chantier)

**Pas dans le menu Tableau.** Depuis la fiche : **Récap Chantier → Informations → Afficher tableau suivi**.

Titre **Tableau de suivi**, liste déroulante du chantier.

- Rappel du marché : lignes **MARCHÉ**, **AVENANT 01**, etc.
- Situations du chantier : **Mois**, **N° Situation**, **Montant HT Situation**, **RG**, **Prorata**, **Montant CIE** si le chantier est concerné, **HT à payer**, cumuls, dates, **Montant reçu HT**, **Jours de retard**, **Écart Mois**.
- Mêmes fenêtres de date d'envoi (45/60 jours) et de paiement que le tableau facturation.
- Le pourcentage d'avancement reprend la dernière situation.

## Tableau Fournisseur

Créer d'abord le montant à payer : fiche chantier, **Récap Financier**, carte **MATERIEL** (voir `11-depenses-chantier-agence-drive-agents.md`). Ce tableau sert ensuite à payer, facturer et masquer.

**Où :** **Tableau → Tableau Fournisseur**. Titre **TABLEAU FOURNISSEUR Année {année}**.

Suivi des achats : montants à payer, factures, dates, paiements.

- **Actualiser**
- **Lignes masquées** : une ligne masquée sort de l'affichage et des totaux. **Réafficher** la remet.
- Saisie des factures et des montants payés dans le tableau (enregistrement automatique après une courte pause).
- Fenêtres de facture, de date de paiement et d'envoi.

**Remplissage automatique :** si un fournisseur a plusieurs lignes, une facture déjà connue est reconnue sur toutes ses lignes. Une nouvelle facture saisie dans la fenêtre peut être rattachée au chantier choisi. Un numéro de facture saisi sans montant, s'il n'existe pas encore, crée la même facture sur chaque ligne avec le montant à payer de la ligne.

Pas d'export PDF global dans l'en-tête.

## Tableau Sous-Traitant

Le contrat se crée sur la fiche chantier (**Gérer les sous-traitants**), pas dans ce tableau. Détail : `11-depenses-chantier-agence-drive-agents.md`, chapitre 2.

**Où :** **Tableau → Tableau Sous-Traitant**. Titre **TABLEAU SOUS-TRAITANT Année {année}**.

Paiements des sous-traitants : factures, retenues, ajustements, validation.

- **Actualiser**, **Lignes masquées**.
- Message **Paiements sauvegardés avec succès !**
- Masquer une ligne : confirmation « Masquer cette ligne ? Elle ne sera plus affichée ni comptabilisée… »
- Ajustement : montant du type « 60 pour ajouter, -50 pour déduire », motif du type « Gasoil, Prime, Déduction... », **Sauvegarder**.
- Récap : **Rechercher par nom ou client…**, tri par montant, avancement ou ordre alphabétique.

Le détail mois par mois d'un contrat n'est pas cet écran. Il s'ouvre depuis **Gérer les sous-traitants** sur la fiche chantier (voir collaborateurs).

## Sous-traitants sur un chantier

**Où :** **Récap Chantier → Informations → Gérer les sous-traitants**. Fenêtre **Gestion des sous-traitants**. Désactivé si le chantier n'est pas **En Cours**.

- **Sélectionner un sous-traitant existant** ou **Nouveau sous-traitant**.
- Texte : affichage des sous-traitants de ce chantier. Sans contrat, la génération de documents est désactivée.
- **Filtrer par type** : **Tous les types**, **Nettoyage**, **BTP**, **TCE**, **Autre**.
- Lien vers la page de paiements du couple chantier / sous-traitant (contrat facultatif).

## Page paiements d'un sous-traitant

Pas d'entrée de menu. On y arrive par le lien ci-dessus ou depuis le tableau.

Fenêtres : **Date d'envoi et délai de paiement**, **Montant payé et date de paiement**, **Montant facturé du mois**, **Montant de retenue**, **Modifier la facture**, **Nouvelle facture sous-traitant**. Boutons **Annuler** / **Valider**.
