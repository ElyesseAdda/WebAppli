# De l'offre au paiement

Parcours complet, dans l'ordre où une affaire se déroule. Chaque étape a son écran. On peut s'arrêter et reprendre plus tard.

## 1. Créer l'offre

Deux portes.

**Appel d'offres, sans chantier tout de suite.** **Documents → Créer document → Devis**, bouton **Créer un appel d'offres**. Le bandeau indique qu'aucun chantier n'est créé. On construit le devis, on sauvegarde. Le suivi est dans **Chantier → Appel d'Offre** : cartes **En attente**, **Validé**, **Refusé**.

**Chantier déjà gagné.** La page **Liste des chantiers** n'est pas dans le menu. Bouton **Nouveau Chantier** (voir le fichier créer un chantier), puis **Documents → Créer document → Devis** et on choisit ce chantier.

## 2. Faire accepter le devis

**Documents → Liste document → Liste Devis**. Cliquer les tags.

- Envoyé, pas de réponse : **En attente** ou **En attente BDC**.
- Bon de commande client reçu : **BDC reçus**.
- Accord : **Validé**. Refus : **Refusé**.

Un changement de tags prévient les collègues par la cloche **Alertes devis**.

## 3. Transformer l'offre en chantier

Seulement si l'appel d'offres est **Validé** et pas encore **Transformé**.

**Chantier → Appel d'Offre**, action transformer. L'application demande le dossier Drive. Ensuite le chantier s'ouvre comme les autres dans **Récap Chantier**.

Si le chantier a été créé à la main, cette étape n'existe pas.

## 4. Chiffrer et lancer les achats

- Devis de travaux : **Modifier le devis** depuis la liste, ou un nouveau devis rattaché au chantier.
- Fournisseur : **Récap Financier**, mois choisi (pas **Global**), carte **MATERIEL**, **Montant à payer**, **Sauvegarder**. Le bon de commande se crée dans l'onglet **Commandes**.
- Sous-traitant : le chantier doit être **En Cours**. **Gérer les sous-traitants**, **Créer un contrat**, montant de l'opération.

## 5. Suivre l'avancement du mois

**Liste Devis**, sur un devis de chantier seulement, **Créer une situation**. Choisir le mois, saisir les % d'avancement, vérifier prorata, retenue de garantie et CIE, **Créer la situation**. Le détail des champs est dans le fichier situation.

Le chantier **En attente**, **Terminé** ou **Facturé** bloque cette création.

## 6. Facturer le client

Depuis le même devis, menu **Éditer en facture**. Numéro (vide = attribué tout seul), adresse, **Date d'envoi**, délai **45** ou **60 jours**, **Créer la facture**. Le tag passe à **Facturé**. On ne transforme un devis qu'une fois : sinon **Document déjà existant**.

Un avenant (travaux supplémentaires qui ne sont pas le devis de chantier) : **Éditer en avenant**. Une CIE : **Éditer en CIE**.

## 7. Encaisser

**Tableau → Tableau Facturation**. Colonne **Date d'envoi** puis **Montant reçu HT** et **Date de paiement réelle**. **Jours de retard** et **Écart Mois** se calculent seuls.

Le récap du bas groupe les chantiers par maître d'ouvrage.

## 8. Payer les fournisseurs et les sous-traitants

- **Tableau → Tableau Fournisseur** : **Montant payé**, facture, dates.
- **Tableau → Tableau Sous-Traitant** : même chose, plus un ajustement s'il faut ajouter ou retirer (gasoil, prime).

## 9. Vérifier que l'affaire tient

**Chantier → Récap Chantier → Récap Financier** : mois ou **Global**, puis **Actualiser**. **Chantier → Dashboard** donne le chiffre d'affaires, la marge et les **Paiements en retard** de toute l'entreprise.

## Raccourci selon la question

| Le client dit | Étape |
|---|---|
| « On a répondu à un appel d'offres » | 1 puis 3 |
| « Le client a signé » | 2, tag **Validé** |
| « Je dois facturer le mois » | 5 puis 6 |
| « Ils n'ont pas payé » | 7 |
| « Je dois payer le fournisseur » | 4 puis 8 |
