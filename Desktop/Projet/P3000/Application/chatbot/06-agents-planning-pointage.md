# Agents, planning, congés, Gantt, pointage

## Gestion agent (calendrier)

**Où :** **Agent & Planning → Gestion agent**.

Calendrier du mois, séparé en **Agents Horaires** et **Agents Journaliers**. Seuls les agents encore dans l'effectif sur la période affichée apparaissent. Message possible : **Aucun agent visible pour {mois}** — changer de mois.

**Ajouter un événement :** clic sur une case. Fenêtre **Modifier la période**.

1. **Date de début**, **Date de fin**.
2. **Type d'événement** : **Présence**, **Absence**, **Congé**, **École**, **Horaire Modifié**.
3. Sous-type obligatoire pour une absence : **Justifiée**, **Injustifiée**, **Maladie**. Pour un congé : **Payé**, **Sans solde**, **Parental**, **Maternité**, **Paternité**.
4. **Ajouter l'événement** ou **Fermer**.
5. **Horaire Modifié** demande **Combien d'heures à modifier ?**

Clic sur un événement existant : confirmation de suppression.

Le bloc congés du mois affiche **Acquis**, **En cours**, **Pris**, **Solde**. Un congé payé plus long que le solde est signalé. Badge **En congé** sur la ressource. Textes possibles : **Congé payé en cours jusqu'au …**, **Aucun congé en cours**, **Congés indisponibles**.

En bas de page : **Ajouter Agent**, **Modifier Agent**, **Gérer Agents Inactifs**.

Il n'y a pas d'export PDF sur ce calendrier.

## Carte agent

Détail des champs (identité, CDI/CDD, avenants, horaires, jours, congés) : `11-depenses-chantier-agence-drive-agents.md`, chapitre 7.

**Où :** **Agent & Planning → Carte Agent** (fenêtre, pas une page du menu).

1. **Rechercher un agent...** Les inactifs sont marqués **(inactif)**.
2. Sections : **Identité**, **Contrat** (onglets, badge **Récent**, **Avenants CDD**), **Rémunération**, **Horaires**, **Jours de travail**.
3. **Présence** / **Absence**. Un clic ouvre **Récapitulatif des absences**.
4. Bloc **Congés** sous la photo : **Acquis**, **En cours**, **Pris**, **Solde**.
   - Clic sur un chiffre : fenêtre **Congés payés** pour corriger (**Solde disponible**, **Acquisition**, **Posés**).
   - Clic sur un mois : détail du calcul (présence, absences, formule du type « 2,5 j × jours comptés / jours ouvrés du mois », **Plafond annuel de 30 j appliqué**).
5. Photo : **Ajouter une photo** (ou **Après création** si l'agent n'existe pas encore).
6. **Enregistrer**. Message **Carte agent enregistrée.**
7. **Supprimer l'agent**, avec confirmations **Supprimer ce contrat ?**, **Supprimer cet agent ?**, **Supprimer définitivement**.

## Planning hebdomadaire

**Où :** **Agent & Planning → Planning hebdo**. Titre de la grille **Planning Hebdomadaire des Agents**.

**Barre du haut :**

- **Agent** (liste **--Sélectionner un agent--**). Sans agent : **Sélectionnez un agent pour voir son planning**.
- **Semaine** au format S{nn} et la plage de dates. **Semaine précédente**, **Semaine suivante**, **Cette semaine**. Le sélecteur va de 2023 à deux ans dans le futur.
- Si l'agent n'est plus dans l'effectif : **Agent non disponible pour cette période**, **Retiré de l'effectif le …**, bouton pour revenir à une semaine où il était présent.
- **Résumé des heures**
- **Copier le Planning** : fenêtre **Copier le Planning vers un Autre Agent** (agent cible, **Semaine cible**, **Copier** / **Annuler**). Succès : **Planning copié avec succès!**
- **Mois** et **Année** pour le rapport mensuel : **Générer Rapport Mensuel PDF**, **Gérer les Primes**, et une prévisualisation (**Prévisualiser le rapport mensuel**).

**Grille :**

- **Télécharger le planning hebdomadaire** (choix des agents).
- Sélection de plusieurs cases : **Cellules sélectionnées: {n}**, puis assignation d'un chantier, ou suppression des assignations.
- Fenêtre de recherche de chantier pour valider l'affectation.
- Les absences et congés apparaissent en codes dans les cases (exemples : AJ, AI, MA, CSS, CPR, CM, CPAT).

**Règles d'affectation :**

- Agent **journalier** : créneaux matin et après-midi (chaque demi-journée compte 4 h dans les coûts).
- Agent **horaire** : créneaux à l'heure. La pause n'est pas sélectionnable.

Le PDF part vers le Drive. Un fichier déjà présent ouvre le conflit de fichier.

### Résumé des heures

Ouvert par **Résumé des heures** sur le planning. Ce n'est pas un menu à part.

Onglets **Par chantier** et **Par agent**. Titres **Résumé des Heures et Coûts par chantier** ou **par agent**.

Navigation **Mois**, **Mois précédent**, **Mois suivant**, **Ce mois** (environ un an avant et après le mois courant).

Détail : heures normales, samedi, dimanche, férié, heures supplémentaires, majorations. Pour un journalier, l'affichage est en jours (heures ÷ 8). Texte possible : **Aucun jour majoré ce mois.**

## Diagrammes de Gantt

**Où :** **Agent & Planning → Diagrammes de Gantt**. Titre **Diagrammes de Gantt**.

**Liste :**

- **Rechercher...**
- **Nouveau diagramme** : nom obligatoire (**Le nom du diagramme est obligatoire.**), chantier facultatif, logo client.
- Onglets **Diagrammes de chantier** et **Diagrammes indépendants**.
- Badges **Brouillon** et **Validé**.

**Dans un diagramme :**

- **Enregistrer**, **Historique**, **Aperçu**, **PDF** (fichier « Gantt - {nom}.pdf »), **Drive**, **Valider**.
- **Échelle** : **Jour**, **Semaine**, **Mois**.
- Lignes, titres, couleurs, réordonnancement.
- Un brouillon s'enregistre seul au bout d'environ une seconde et demie.
- Un diagramme **Validé** est en lecture. Il faut le rouvrir en brouillon pour le modifier.

L'onglet **Planning Gantt** d'une fiche chantier montre la frise de ce chantier. L'édition complète reste dans ce menu.

## Tableau de pointage

**Où :** **Tableau → Tableau de pointage**. Titre **Tableau de pointage des agents**.

Synthèse mensuelle de paie : salaires, paiements, charges, répartition agence / chantier, primes, temps travaillé.

1. Choisir le **Mois**.
2. Cartes de récap, dont **Total net versé aux salariés**.
3. Groupes **Agents horaires** et **Agents journaliers**. Un clic sur le groupe filtre le récap. Un agent absent de l'effectif ce mois-là n'apparaît pas.
4. Colonnes : **Nom Prénom**, **Salaire net init.**, **Paiement**, **Date paiement**, **Montant prév.**, **Montant charge**, **Agence**, **Accompte**, **Prime**, **Email**, **Commentaire**, **Total**.
5. Saisie dans la cellule ou dans la fenêtre d'édition.
6. Case **Agence** et icône **Répartition agences et chantier** : répartir la main d'œuvre entre agences et chantier.

Le temps s'affiche en heures ou en jours selon le type de paiement. Un zéro peut s'afficher comme un tiret. Il n'y a pas d'export PDF sur cette page. Ces montants alimentent les lignes **Pointage** des dépenses d'agence, qui ne se modifient pas à la main dans l'écran agence.
