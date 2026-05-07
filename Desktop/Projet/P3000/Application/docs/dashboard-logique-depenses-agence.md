# Dépenses agence — logique dashboard (à valider)

Ce document pose les **questions métier une par une**, puis propose une **ossature de règles** pour le décompte des dépenses d’agence sur le dashboard, sans double comptage avec la main d’œuvre, le matériel, la sous-traitance, etc.

Les réponses doivent être cochées ou complétées avant toute implémentation API / front.

---

## Principe actuel (correction — pas de « transfert » vers la carte Agence)

Tu précises que la formulation « les montants exclus alimentent la carte Agence » était **incorrecte**.

**Règle retenue :**

1. **Cartes main d’œuvre, coût matériel, coût sous-traitance (API / dashboard)**  
   On **exclut** tout ce qui est **lié à une agence** → ces montants **disparaissent** de ces trois totaux (ils ne doivent **pas** y apparaître).

2. **Carte Agence(s)**  
   Le montant vient **uniquement** du **module Agences** (données déjà présentes dans les tableaux / flux « Agences » : ex. `AgencyExpenseMonth` et co.).  
   **On ne rajoute pas** les montants sortis des trois autres cartes : ce serait redondant, car **ils figurent déjà** côté Agences si la saisie est cohérente.

3. **Affichage dans la même case** (rappel)  
   - **Agence principale** : total sur la **période complète** filtrée.  
   - **Autres agences** : montants **séparés**, uniquement **visuels**, dans la même carte.

Les sections ci-dessous (catégories, questions) restent utiles pour le détail **interne** au module Agences ou pour des cas limites ; elles ne doivent **pas** impliquer un double flux « exclusion MO → addition carte Agence ».

### Implémentation de test (API + dashboard)

- **Exclusion MO / matériel / ST :** tout enregistrement dont le `chantier_id` est celui d’un `Agence.chantier` (OneToOne) est ignoré dans ces trois agrégats (`get_global_stats`).
- **Carte Agence :** somme des lignes `AgencyExpenseMonth` sur la période (`amount`, hors `is_recurring_template`), filtrées par chantier comme le reste du dashboard ; **agence principale** = première `Agence` par `id` (à remplacer par un champ métier « principale » si besoin) ; **autres agences** listées séparément dans la même carte.
- Champs JSON : `depenses_agence_principale_ht`, `depenses_agence_main_agence_nom`, `depenses_agence_autres`, `total_depenses_agence_ht`.
- **Persistance** : modèle `DashboardSettings` (singleton `singleton_key="default"`) + API `GET/PUT /api/dashboard/settings/` pour `depenses_agence_use_default`, `depenses_agence_included_agence_ids`, `extra` (extensions futures).

### Écart avec le total « année » de l’écran Agences

- L’écran **Agences** (totaux annuels) additionne les lignes **`AgencyExpenseMonth`** **et** le **planning agence** (`/api/schedule/yearly_summary/`), voir `AgencyExpenses.js` (`yearTotal`).
- Le **dashboard** ne somme que les lignes **`AgencyExpenseMonth`** (hors `is_recurring_template`), avec **montant_paye** si non nul sinon **amount** (aligné `monthly_summary` / `yearly_summary`).

---

## Décision « premier temps » (à figer en implémentation)

**Objectif :** dans la zone **Agence** du dashboard, refléter **l’ensemble des dépenses agence** telles qu’elles apparaissent dans les **tableaux des agences** (données issues des modules dépenses agence / mensuel, cohérents avec l’UI métier).

**Exception — catégories avec traitement particulier (recoupement avec d’autres blocs du dashboard) :**

| Catégorie (libellé UI / `category`) | Pourquoi un traitement particulier | Alignement attendu avec le reste du dashboard |
|-------------------------------------|-------------------------------------|-----------------------------------------------|
| **Planning agence** | Montants issus du **planning agence** ; recoupe la **main d’œuvre** (coût / heures agents) ailleurs. | Ne **pas** additionner « bêtement » au même total que les autres lignes agence si la carte MO reprend déjà ce coût ; **dédoublonner** ou **exclure du total agence** selon la règle de vérité unique (à trancher en phase 2 si besoin). |
| **Fournisseur** | Recoupe le **tableau fournisseur** / coûts matière déjà agrégés côté dashboard. | Même logique : **pas de double comptage** avec la carte (ou le flux) **fournisseur / matériel**. |
| **Sous-traitant** | Recoupe **sous-traitance** (factures / tableau sous-traitant). | Même logique avec la carte **sous-traitance**. |

**Libellés exacts côté application** (référence `frontend/src/components/AgencyExpenses.js`) : `Planning agence`, `Fournisseur`, `Sous-traitant`.  
**Note :** existe aussi **`Ajustement Sous-traitant`**, déjà relié au tableau sous-traitant dans l’UI — **à confirmer** si elle suit la même règle que `Sous-traitant` pour le dashboard.

**Synthèse métier :**

1. **Inclure** dans le périmètre « dépenses agence » toutes les lignes des tableaux agence **sauf** que pour **`Planning agence`**, **`Fournisseur`** et **`Sous-traitant`**, on n’applique pas la même règle de simple somme : il faut une **règle explicite** (exclusion du total agence, ou comptage uniquement côté MO / fournisseur / ST, ou montant « net » après déduction — **à préciser avant code**).
2. Les autres catégories (ex. `Salaire`, `Prime`, etc., hors exceptions) peuvent être agrégées pour un **total agence « direct »** sur la période, une fois montant + date de période fixés (voir Question 5).

---

## Partie A — Questions (une par une)

### Question 1 — Définition de la carte « Dépense agence »

**Que doit afficher la carte sur le dashboard ?**

- [ ] **A1** — Uniquement les **frais de structure / overhead** (loyer, logiciels, administratif…) : coûts **non** rattachés à un chantier dans la logique métier.
- [ ] **A2** — **Toutes** les lignes enregistrées comme dépenses d’agence dans l’application (y compris celles liées à un chantier, un agent, un sous-traitant).
- [ ] **A3** — Une **vue ajustée** : total des dépenses agence **moins** ce qui est déjà pris en compte ailleurs sur le dashboard (voir Partie C).

**Réponse retenue (premier temps, selon ta consigne) :** proche de **A2** pour le périmètre des tableaux agence, avec **sous-ensemble A3** pour les catégories **Planning agence**, **Fournisseur**, **Sous-traitant** (traitement particulier anti-double comptage avec MO / fournisseur / ST). _À cocher formellement une case si tu veux figer A2 seul ou A3 seul._

---

### Question 2 — Lien avec un chantier

**Si une dépense d’agence a un `chantier` renseigné, doit-elle compter dans la carte « Dépense agence » du dashboard ?**

- [ ] **B1** — **Non** : c’est un coût chantier ; il ne doit **pas** apparaître dans « dépense agence » (il est ou sera couvert par les agrégats chantier / coûts chantier).
- [ ] **B2** — **Oui** : elle reste une « dépense agence » même avec chantier (à risque de double comptage si le même montant existe ailleurs).
- [ ] **B3** — **Conditionnel** : oui/non selon la `category` ou un flag métier (préciser en note).

**Réponse retenue :** _à compléter_

---

### Question 3 — Lien avec un agent (main d’œuvre)

**Si une dépense d’agence a un `agent` renseigné, considères-tu que ce montant est en général déjà reflété (ou doit l’être) dans la **main d’œuvre** (`LaborCost` / pointage) ?**

- [ ] **C1** — **Oui** : exclure de « dépense agence » (ou soustraire) pour éviter le double comptage avec la carte MO.
- [ ] **C2** — **Non** : ce sont des dépenses distinctes (ex. remboursements, primes) ; elles **restent** dans « dépense agence ».
- [ ] **C3** — **Au cas par cas** : selon `category` ou un champ dédié (à définir en base ou en convention de saisie).

**Réponse retenue :** _à compléter_

---

### Question 4 — Lien avec un sous-traitant

**Les lignes `AgencyExpenseMonth` (ou équivalent) suivies dans le tableau fournisseur / sous-traitant : elles alimentent quelle(s) indicateur(s) sur le dashboard ?**

- [ ] **D1** — Uniquement la **sous-traitance** (pas la carte « dépense agence »).
- [ ] **D2** — Uniquement **dépense agence** (pas la carte sous-traitance).
- [ ] **D3** — **Une seule** source de vérité : à trancher (ex. ST si facture ST, sinon agence).

**Réponse retenue :** _à compléter_

---

### Question 5 — Montant et date pour le filtre période

**Pour une ligne de dépense agence (idéalement `AgencyExpenseMonth`), quel montant et quelle date utilisent-on pour le filtre année / période personnalisée du dashboard ?**

**Montant :**

- [ ] **E1** — `amount` (montant prévu / budgété de la ligne).
- [ ] **E2** — `montant_paye` (montant réellement payé / suivi).
- [ ] **E3** — Autre règle : _à préciser_

**Date de rattachement à la période :**

- [ ] **F1** — Couple **`year` / `month`** de la ligne (mois comptable).
- [ ] **F2** — `date_reception_facture` (ou `date_paiement` historique si c’est bien la réception).
- [ ] **F3** — `date_paiement_reel`.
- [ ] **F4** — Règle composite (ex. paiement réel si présent, sinon mois de la ligne) : _à préciser_

**Réponse retenue :** _à compléter_

---

### Question 6 — Multi-agences

**Le dashboard doit-il :**

- [ ] **G1** — Agréger **toutes** les agences sur la période sélectionnée (une seule valeur carte).
- [ ] **G2** — Filtrer par **une agence** choisie dans les filtres du dashboard (nouveau filtre à prévoir).
- [ ] **G3** — **G1** par défaut, avec possibilité ultérieure de **G2**.

**Réponse retenue :** _à compléter_

---

### Question 7 — Part du CA affichée sur la carte

**Le pourcentage « par rapport au CA total » sur cette carte a-t-il un sens métier pour toi ?**

- [ ] **H1** — **Oui** : même dénominateur que les autres cartes (CA de la période).
- [ ] **H2** — **Non** : afficher seulement le montant (ou un autre ratio, ex. % des dépenses agence vs total frais généraux).
- [ ] **H3** — Oui mais avec **libellé** explicite (ex. « % du CA » vs « % des coûts »).

**Réponse retenue :** _à compléter_

---

## Partie B — Rappel des objets concernés (technique, pour cadrage)

| Concept | Modèles / champs utiles (référence) |
|--------|-------------------------------------|
| Dépense ponctuelle / template | `AgencyExpense` — `amount`, `date`, `agence`, `chantier`, `agent`, `sous_traitant`, `category` |
| Dépense mensuelle (tableau) | `AgencyExpenseMonth` — `year`, `month`, `amount`, `montant_paye`, dates, mêmes FK, `source_expense` |
| Agrégats optionnels | `AgencyExpenseAggregate` — si utilisé pour perf / pré-calcul |
| Risque double comptage | Lignes avec `chantier`, `agent`, `sous_traitant` + recoupement avec MO / matériel / ST déjà agrégés sur le dashboard |

---

## Partie C — Logique de décompte proposée (à valider après les réponses)

Cette section devient la **spécification** une fois les cases de la Partie A cochées.

### C.1 — Principe directeur

1. **Une ligne ne doit compter qu’une fois** dans l’ensemble des indicateurs « coûts » du dashboard (ou la double imputation doit être **explicite** et documentée).
2. La carte **« Dépense agence »** doit correspondre à une **phrase unique** du type :  
   *« Somme des lignes X où [conditions], sur la période P, au sens du montant M et de la date D. »*

### C.2 — Périmètre « premier temps » (aligné avec ta dernière consigne)

**Source des lignes :** tableaux agence — en pratique **`AgencyExpenseMonth`** (et, si le dashboard doit coller au tableau annuel incluant le planning, les **lignes virtuelles** équivalentes à la catégorie **Planning agence** telles que construites côté `AgencyExpenses.js` — **à confirmer** côté API : une seule source SQL vs recomposition).

**Total affiché « Dépense agence » (proposition de décomposition en deux niveaux) :**

| Niveau | Contenu | Rôle |
|--------|---------|------|
| **Total agence — cœur** | Somme des lignes dont `category` **n’est pas** dans `{ Planning agence, Fournisseur, Sous-traitant }` (+ confirmer `Ajustement Sous-traitant`). | Total **direct** pour la carte, filtré période. |
| **Postes sensibles** | Lignes `Planning agence`, `Fournisseur`, `Sous-traitant`. | **Ne pas** les ajouter au « cœur » tant que la règle de dédoublonnage avec MO / matériel / ST n’est pas écrite ; possibilité ultérieure : ligne dédiée, tooltip, ou montant 0 côté agence si la vérité est uniquement dans l’autre module. |

**Exclusions / cas limites encore ouverts :**

- Dépenses **école** (`is_ecole_expense`) : incluses ou exclues du même total ?
- Primes agence synchronisées vers `AgencyExpenseMonth` : incluses dans ce total ou comptées ailleurs ?
- Lignes avec `chantier` / `agent` / `sous_traitant` renseignés hors des trois catégories ci-dessus : **incluses** dans le « cœur » sauf nouvelle règle métier.

### C.3 — Filtre temporel (aligné dashboard)

- Aligner la définition de **période** avec les autres cartes (année, comparaison, `period_start` / `period_end`).
- Une fois **E*** et **F*** choisis (Question 5), documenter ici la formule exacte (ex. : « mois (Y,M) inclus dans [start, end] » ou « `date_paiement_reel` dans l’intervalle »).

### C.4 — Multi-agences

- Si **G1** : somme sur toutes les agences avec les mêmes filtres.
- Si **G2** : paramètre `agence_id` dans les filtres dashboard + même requête restreinte.

### C.5 — Exposition API (plus tard)

- Champ proposé dans `global_stats` (exemple) : `total_depenses_agence_ht` (ou TTC si ta base est en TTC — **à harmoniser** avec le CA).
- Facultatif : `depenses_agence_par_agence` (JSON) si tu veux drill-down sans surcharger la carte.

---

## Partie D — Prochaine étape

1. **Trancher la règle exacte** pour `Planning agence`, `Fournisseur`, `Sous-traitant` : exclusion stricte du total agence sur le dashboard, ou **montant net** après alignement sur `LaborCost` / `PaiementFournisseurMateriel` / `FactureSousTraitant` (plus complexe mais « tout lister » côté métier).
2. Confirmer si **`Ajustement Sous-traitant`** suit la même règle que **`Sous-traitant`**.
3. Compléter les **réponses retenues** sous chaque question restante (Partie A), notamment **montant + date** (Question 5) et **multi-agences** (Question 6).
4. Valider avec un **exemple chiffré** sur un mois connu (relevé manuel vs résultat requête).

Une fois ce document validé, l’implémentation (API dashboard + carte React) pourra suivre strictement cette spec.

---

*Document généré pour cadrage produit / métier — à faire évoluer au fil des décisions.*
