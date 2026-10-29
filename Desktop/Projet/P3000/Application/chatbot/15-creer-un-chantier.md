# Créer un chantier

La page s'appelle **Liste des chantiers**. Elle n'est pas dans le menu : on y arrive par son adresse, pas par **Chantier**. Bouton **Nouveau Chantier**. Trois étapes : Client, Société, Chantier. On peut sauter le client.

## Étape Client

Fenêtre **Informations Client**.

- **Sélectionner un client existant** si la personne est déjà dans l'application.
- Sinon **ou remplir manuellement** : Civilité, Nom, Prénom, Email, Téléphone, Poste.
- **Suivant** enregistre et passe à la société.
- **Passer cette étape** crée le chantier sans personne. On pourra lier un client plus tard dans **Collaborateur → Clients**.
- **Annuler** ferme tout.

## Étape Société

Fenêtre **Informations Société** : **Nom de la société**, **Ville**, **Rue**, **Code postal**. **Retour** revient au client. **Valider** passe au chantier.

La société créée ici est l'entreprise du client. Elle apparaît ensuite dans **Collaborateur → Clients**.

## Étape Chantier

Fenêtre **Nouveau Chantier** (ou **Nouveau Chantier pour Client Existant** si on a choisi quelqu'un) : **Nom du chantier**, **Ville**, **Rue**, **Code postal**. **Créer le chantier**.

## Détails

Fenêtre **Détails du Chantier** : **Date de début**, **Date de fin** (optionnel), **Coût matériel**, **Coût main d'œuvre**, **Coût sous-traitance**, **Description**, **Montant HT**, **Montant TTC**. **Finaliser la création**.

Ces montants sont une estimation de départ. Les vrais montants du mois se saisissent plus tard dans **Récap Financier** (matériel) et dans les situations.

## Juste après

Le chantier est **En Cours**. On peut enchaîner :

1. **Documents → Créer document → Devis** et choisir ce chantier.
2. Onglet **Commandes** pour un bon de commande fournisseur.
3. **Gérer les sous-traitants** pour un contrat.

**En attente**, **Terminé** et **Facturé** bloquent devis, situation et sous-traitance. Le Drive, les tableaux et les informations restent ouverts.
