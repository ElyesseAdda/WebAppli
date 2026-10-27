# Situation, champ par champ

Une situation se crée seulement depuis un **devis de chantier**. **Documents → Liste document → Liste Devis**, menu du devis, **Créer une situation**. Ce bouton n'existe pas sur un devis d'appel d'offres.

Le chantier doit être **En Cours**.

## En-tête

- **Montant HT** : total du devis, indicatif.
- **Montant total des travaux HT** : base de l'avancement.
- **% Avancement** : avancement global affiché.
- **Mois** et **Année** : le mois facturé. Une situation par mois.
- **Taux compte prorata (%)** : 2,5 par défaut. Il sert au calcul du **Compte prorata**.
- **Appliquer à toutes**, un pourcentage, puis **Appliquer** : met le même **% Avancement** sur toutes les lignes.

S'il existe déjà une situation, ses taux sont repris et le message **Avancement global appliqué : N%** indique le pourcentage recopié.

## Lignes du devis

Colonnes **Description**, **Quantité**, **Prix unitaire**, **Total HT**, **% Avancement**, **Montant**.

Le **% Avancement** est cumulé (où en sont les travaux), pas seulement le mois. Le montant de la ligne pour ce mois est la part nouvelle depuis la situation précédente.

## Bas du tableau

- **Retenue de garantie (X % HT du mois)** : 5 % par défaut. On peut changer le pourcentage. Elle se calcule sur le HT du mois.
- **Compte prorata (X% HT du mois)** : le taux saisi en haut, sur le HT du mois.
- **Retenue CIE HT du mois** : un montant, pas un pourcentage. Tant qu'on n'y touche pas, il se remplit avec le total HT des factures CIE du mois. La liste **Factures incluses** montre les numéros. On peut le corriger à la main.
- **Ajouter une ligne** : une ligne en plus, avec **Description**, **Déduction** ou **Addition**, et un montant. Une déduction se retire du total, une addition s'ajoute.

**Montant total du mois HT après retenues** = HT du mois − retenue de garantie − compte prorata − retenue CIE, puis plus ou moins les lignes ajoutées.

Le TTC en dessous applique la TVA.

## Enregistrer

**Créer la situation** pour une nouvelle, le bouton de mise à jour si on rouvre une situation du même mois.

Ensuite, pour envoyer la facture au client : revenir au devis, **Éditer en facture**. La situation seule ne crée pas la facture.
