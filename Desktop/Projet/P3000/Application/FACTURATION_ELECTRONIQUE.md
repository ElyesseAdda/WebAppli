# Facturation Électronique — Analyse des Scénarios pour P3000

> Document de référence — Réforme obligatoire au 1er septembre 2026 (France)
> Application : P3000 — Gestion de chantiers BTP (Django 5.1 + React 18)
> Rédigé le : 23 juin 2026

---

## Contexte réglementaire

| Date | Obligation |
|---|---|
| **1er sept. 2026** | Réception obligatoire de factures électroniques pour **toutes** les entreprises assujetties à la TVA |
| **1er sept. 2026** | Émission obligatoire pour les **grandes entreprises et ETI** |
| **1er sept. 2027** | Émission obligatoire pour les **PME, TPE et micro-entreprises** |

> P3000 cible principalement des TPE/PME du BTP → deadline émission : **1er sept. 2027**.
> Mais la réception est obligatoire dès le **1er sept. 2026 — dans 10 semaines**.

### Architecture officielle du système

```
Entreprise → Solution Compatible (SC) → Plateforme Agréée (PA) → PPF (annuaire/concentrateur) → Administration (DGFiP)
```

- **SC (Solution Compatible)** : logiciel de gestion non immatriculé qui prépare les factures (ex : P3000)
- **PA (Plateforme Agréée)** : intermédiaire immatriculé DGFiP, seul habilité à transmettre les factures et l'e-reporting
- **PPF (Portail Public de Facturation)** : annuaire central + concentrateur de données fiscales (ne route plus les factures depuis oct. 2024)

### Formats de factures obligatoires

| Format | Description | Usage |
|---|---|---|
| **Factur-X** | PDF/A-3 + XML CII embarqué | Très répandu en France, hybride humain + machine |
| **UBL 2.1** | XML pur (norme européenne) | Courant en B2B structuré |
| **CII D22B** | Cross Industry Invoice | Norme franco-allemande |

Tous doivent respecter la norme **EN16931** et les règles **AFNOR XP Z12-012**.

### Nouvelles mentions légales obligatoires sur les factures

- SIRET/SIREN de l'acheteur
- Adresse de livraison (si différente)
- Catégorie de TVA par ligne
- Type de transaction (B2B, B2C, opération hors-champ...)
- Numéro de bon de commande (si applicable)
- Identifiant PA destinataire (via annuaire PPF)

---

## Vue d'ensemble des scénarios

| # | Scénario | Complexité | Délai dev | Coût dev | Deadline |
|---|---|---|---|---|---|
| **1** | Expert-comptable + Factur-X | ⭐ Faible | 4–6 semaines | ~120–180h | Août 2026 |
| **2** | Intégration directe à une PA | ⭐⭐ Moyenne | 3–4 mois | ~300–500h | Août 2026 |
| **3** | Devenir une Plateforme Agréée (PA) | ⭐⭐⭐⭐⭐ Très élevée | 12–24 mois | ~3 000–8 000h | Hors délai |

---

## Scénario 1 — Expert-comptable mandaté + génération Factur-X

### Description

P3000 devient une **Solution Compatible (SC)**. Il génère des factures au format **Factur-X** valides (PDF/A-3 + XML EN16931). L'expert-comptable du client signe un **mandat opt-in** avec la DGFiP, choisit une PA pour son client, et gère toute la transmission électronique. P3000 n'est connecté à aucune PA directement.

```
P3000 (génère Factur-X) → Export fichier → Expert-comptable → PA du cabinet → DGFiP
```

### Ce qui change dans P3000

#### Backend Django

| Tâche | Détail | Durée estimée |
|---|---|---|
| Migration `Societe` | Ajouter `siret`, `numero_tva_intracommunautaire` | 0,5 jour |
| Migration `Client` | Ajouter `siret_acheteur` | 0,5 jour |
| Migration `Facture` / `FactureTS` / `Situation` | Ajouter `adresse_livraison`, `type_transaction`, champs mention légales | 2 jours |
| Sérializers | Mettre à jour `FactureSerializer`, `SituationSerializer`, etc. | 1 jour |
| Génération XML EN16931 | Construire le XML CII conforme depuis les données Django | 5–8 jours |
| Intégration `factur-x` (PyPI) | Wrapper PDF existant + XML → Factur-X | 2–3 jours |
| Validation XSD + Schematron | Pipeline de validation 4 étapes avant export | 2–3 jours |
| Endpoint `/api/generate-facture-facturx/<id>/` | Nouveau endpoint de génération | 1 jour |
| Archivage S3 | Stocker le `.pdf` Factur-X + hash SHA256 (intégrité) | 1–2 jours |

#### Frontend React

| Tâche | Détail | Durée estimée |
|---|---|---|
| Formulaires `Societe` / `Client` | Champs SIRET, N° TVA avec validation Luhn | 1–2 jours |
| Formulaire `Facture` | Nouveaux champs obligatoires (adresse livraison, type transaction) | 1–2 jours |
| Bouton "Télécharger Factur-X" | Dans `CreationFacture.js` et `ListeFactures.js` | 0,5 jour |
| Indicateur de conformité | Alertes si champs obligatoires manquants avant génération | 1 jour |

#### Dépendances Python à ajouter

```
factur-x          # Génération Factur-X (PDF/A-3 + XML CII)
lxml              # Parsing et génération XML
```

### Coût de développement

| Poste | Heures |
|---|---|
| Migrations + modèles Django | 15–20h |
| Sérializers + API | 10–15h |
| Génération XML EN16931 | 40–60h |
| Intégration factur-x + validation | 20–30h |
| Frontend (formulaires + bouton) | 15–20h |
| Tests + recette | 15–20h |
| **Total** | **115–165 heures (~4–6 semaines)** |

### Avantages

- ✅ **Le plus rapide** à mettre en œuvre (faisable avant le 1er sept. 2026)
- ✅ **Aucune intégration API externe** — pas de dépendance à une PA tierce
- ✅ **Aucun coût récurrent** côté P3000 — pas d'abonnement PA à payer
- ✅ **Adapté aux clients BTP** qui ont quasi tous un expert-comptable
- ✅ Le format Factur-X est **importable par tous les logiciels comptables** (ACD, Pennylane, Cegid, Sage...)
- ✅ Logique simple : P3000 ne change que le format de sortie de ses factures existantes
- ✅ **Autonomie totale** — pas de dépendance à une plateforme tierce qui peut changer ses tarifs ou API
- ✅ Le comptable peut centraliser plusieurs clients P3000 sous une même PA

### Inconvénients

- ❌ **Pas de réception automatique** — les factures fournisseurs/sous-traitants électroniques ne rentrent pas dans P3000 automatiquement (import manuel par l'utilisateur ou le comptable)
- ❌ **Suivi du cycle de vie impossible** — P3000 ne sait pas si la facture a été transmise, reçue, acceptée ou rejetée par le destinataire
- ❌ **Dépendance au comptable** — si le client n'a pas de comptable mandaté, la chaîne est bloquée
- ❌ Pas d'automatisation du **e-reporting** depuis P3000
- ❌ Expérience utilisateur moins fluide : l'utilisateur doit télécharger le fichier et l'envoyer à son comptable

### Pour qui c'est idéal

Clients P3000 qui ont un expert-comptable, volumes modérés (< 100 factures/mois), TPE/PME BTP artisanales. **C'est le scénario recommandé pour la mise en conformité initiale.**

---

## Scénario 2 — Intégration directe à une Plateforme Agréée (PA)

### Description

P3000 s'intègre directement à l'API d'une PA tierce immatriculée DGFiP. P3000 devient une **Solution Compatible connectée**. Il envoie et reçoit les factures en temps réel via l'API de la PA, sans passer par le comptable pour la transmission. La PA gère l'e-reporting et l'annuaire.

```
P3000 → API PA (OAuth 2.0) → PPF (annuaire/concentrateur) → DGFiP
```

### Ce qui change dans P3000

#### Backend Django (en plus du Scénario 1)

| Tâche | Détail | Durée estimée |
|---|---|---|
| Tout ce qui est dans le Scénario 1 | Factur-X, champs, migrations | 115–165h |
| Module d'authentification PA | OAuth 2.0 + gestion tokens + refresh | 3–5 jours |
| Endpoint d'émission | Appel API PA pour soumettre une facture | 3–4 jours |
| Webhook de réception | Endpoint Django pour recevoir les factures fournisseurs/ST entrants | 4–6 jours |
| Parsing Factur-X/UBL entrant | Extraire les données XML et pré-remplir `FactureSousTraitant` | 5–8 jours |
| Suivi du cycle de vie | Modèle `StatutFacture`, mise à jour via webhooks PA | 3–4 jours |
| Gestion des erreurs PA | Rejets, timeouts, relances automatiques | 2–3 jours |
| Consultation annuaire PPF | Vérifier qu'un destinataire est inscrit avant envoi | 1–2 jours |
| e-Reporting | Transmission données B2C et hors-champ TVA | 5–8 jours |
| Archivage légal S3 WORM | Object Lock + versioning + hash d'intégrité | 3–5 jours |

#### Frontend React (en plus du Scénario 1)

| Tâche | Détail | Durée estimée |
|---|---|---|
| Statuts de cycle de vie | Badges `TRANSMISE`, `REÇUE`, `ACCEPTÉE`, `REJETÉE`, `EN_LITIGE` | 2–3 jours |
| Notifications temps réel | WebSocket ou polling pour mise à jour statuts | 2–3 jours |
| Liste factures reçues | Vue dédiée pour les factures fournisseurs/ST reçues électroniquement | 3–4 jours |
| Configuration PA utilisateur | Page paramètres pour configurer la PA du client | 2–3 jours |

### Coût de développement

| Poste | Heures |
|---|---|
| Tout le Scénario 1 | 115–165h |
| Module OAuth + API PA | 25–40h |
| Réception webhooks + parsing | 40–60h |
| Cycle de vie + notifications | 20–30h |
| e-Reporting | 40–60h |
| Archivage légal S3 | 20–30h |
| Frontend étendu | 30–40h |
| Tests d'interopérabilité inter-PA | 20–30h |
| **Total** | **310–455 heures (~3–4 mois)** |

### Coûts récurrents (PA)

| Profil client | Coût PA estimé | Modèle |
|---|---|---|
| Programme partenaire éditeur | 0 à 200 €/mois | Accord revendeur |
| Par facture traitée | 0,02 à 0,50 € / facture | À l'usage |
| Abonnement API sandbox | Souvent gratuit | Phase dev |

### Avantages

- ✅ **Expérience utilisateur fluide** — tout se passe dans P3000 sans action externe
- ✅ **Réception automatique** des factures fournisseurs et sous-traitants → import automatique dans P3000
- ✅ **Suivi du cycle de vie complet** visible depuis P3000
- ✅ **Indépendant du comptable** — le client n'a pas besoin de mandater son comptable
- ✅ **e-Reporting automatisé** depuis P3000
- ✅ **Valeur ajoutée forte** pour P3000 → justifie une hausse de l'abonnement client (+5 à +15 €/mois)
- ✅ Conformité assurée même si le client n'a pas de comptable

### Inconvénients

- ❌ **3 à 4 mois de développement** — impossible à tenir pour le 1er sept. 2026 en partant de zéro
- ❌ **Dépendance à une PA tierce** — si la PA change ses tarifs, son API ou ferme, P3000 est impacté
- ❌ **Coût récurrent** par client connecté (0,02 à 0,50 €/facture selon la PA choisie)
- ❌ Chaque PA a sa propre API malgré la norme AFNOR XP Z12-013 → risque de dev spécifique
- ❌ Nécessite de gérer des cas d'erreur complexes (rejets, time-outs, re-transmissions)
- ❌ Si P3000 cible plusieurs PA, il faut multiplier les intégrations (ou utiliser une PA agnostique)

### Pour qui c'est idéal

Clients P3000 sans comptable mandaté, volumes élevés (> 50 factures/mois), PME structurées. **Scénario à viser pour la v2 de la mise en conformité (2027).**

---

## Scénario 3 — P3000 devient lui-même une Plateforme Agréée (PA)

### Description

P3000 demande et obtient l'immatriculation DGFiP pour devenir une PA. Il est alors **l'intermédiaire officiel** entre les entreprises et l'administration. Il transmet directement les factures et l'e-reporting à la DGFiP. C'est le niveau le plus élevé d'intégration.

```
P3000 (PA immatriculée) ↔ PPF (concentrateur) → DGFiP
P3000 ↔ Autres PA (interopérabilité obligatoire)
```

### Prérequis obligatoires (avant même de déposer le dossier)

| Prérequis | Détail | Durée estimée |
|---|---|---|
| Certification **ISO 27001** | Sécurité de l'information — audit par organisme indépendant | 6–18 mois |
| Hébergeur **SecNumCloud** | Qualification ANSSI ou ISO 27001 de l'hébergeur | Variable |
| Authentification 2FA dynamique | Type bancaire (TOTP ou push mobile) | 2–4 semaines |
| Données hébergées dans l'UE | Garantie contractuelle — aucun transfert hors UE | Validation juridique |
| Peppol AP + SMP | Certification réseau Peppol (Access Point + Service Metadata Publisher) | 2–4 mois |
| Interopérabilité avec toutes les PA | Tests croisés obligatoires | 3–6 mois |
| Capacité de transmission PPF | Connexion mTLS + certificats AIFE | 2–3 mois |

### Ce qui change dans P3000 (en plus des Scénarios 1 et 2)

| Tâche | Détail | Durée estimée |
|---|---|---|
| Architecture multi-tenant PA | Gérer les flux de plusieurs entreprises clientes | 2–4 mois |
| Connexion mTLS au PPF | Certificats AIFE, mutual TLS — accès réservé aux PA | 1–2 mois |
| e-Reporting obligatoire pour TOUS les clients | Transmission données transactions + paiements + TVA à la DGFiP | 2–3 mois |
| Annuaire : mise à jour des destinataires | Synchronisation avec l'annuaire PPF pour tous les clients | 1 mois |
| Gestion des rejets réglementaires | Réponses DGFiP, sanctions, correction et retransmission | 2–3 mois |
| Audit de conformité annuel | Par organisme certificateur indépendant (obligation DGFiP) | Récurrent |
| Dossier d'immatriculation DGFiP | Descriptifs techniques, preuves, dépôt sur demarche.numerique.gouv.fr | 1–2 mois |

### Procédure d'immatriculation DGFiP

1. Dépôt du dossier sur [demarche.numerique.gouv.fr](https://demarche.numerique.gouv.fr/commencer/immatpdp)
2. Instruction par le **Service d'Immatriculation (SIM)** de la DGFiP
   - Cas simple : **~1 mois**
   - Ajustements demandés : **~3 mois**
   - Dossier incomplet : **délai indéterminé**
3. Tests d'interopérabilité avec le PPF et d'autres PA
4. **Immatriculation définitive** — valable **3 ans renouvelable**
5. Contrôle continu + audit annuel

### Coût de développement

| Poste | Heures |
|---|---|
| Tout le Scénario 2 | 310–455h |
| ISO 27001 (accompagnement + implémentation) | 200–500h + coût externe (10k–50k€) |
| Architecture mTLS + connexion PPF | 100–200h |
| e-Reporting complet multi-clients | 150–300h |
| Annuaire + interopérabilité PA | 150–300h |
| Dossier DGFiP + suivi administratif | 50–100h |
| Audit annuel (récurrent) | 20–40h/an + coût externe (5k–20k€/an) |
| **Total dev** | **1 000–1 800 heures** |
| **Total en temps** | **12 à 24 mois** |
| **Coût externe (ISO, audit, juridique)** | **30 000 à 80 000 €** |

### Coûts récurrents

| Poste | Coût annuel |
|---|---|
| Audit de conformité DGFiP | 5 000 à 20 000 €/an |
| Renouvellement ISO 27001 | 3 000 à 10 000 €/an |
| Hébergeur SecNumCloud | Surcoût vs hébergeur standard |
| Renouvellement immatriculation DGFiP (tous les 3 ans) | 50–100h dev + dossier |

### Avantages

- ✅ **Contrôle total** de l'infrastructure de facturation — aucune dépendance à une PA tierce
- ✅ **Valeur commerciale maximale** — P3000 devient lui-même un acteur référencé DGFiP
- ✅ **Marque PA DGFiP** — logo officiel utilisable, crédibilité maximale auprès des clients
- ✅ Revenus directs issus de la transmission de factures pour des tiers
- ✅ Accès direct à l'API PPF (réservée aux PA)
- ✅ Indépendance totale vis-à-vis des autres PA (pas de frais par facture vers une PA tierce)

### Inconvénients

- ❌ **Hors délai absolu** — impossible à atteindre pour sept. 2026 (ni sept. 2027 réalistement)
- ❌ **Investissement massif** : 1 000–1 800h de dev + 30 000 à 80 000 € de coûts externes
- ❌ **Charge administrative permanente** : audits annuels, renouvellement, surveillance DGFiP
- ❌ **Sanctions en cas de manquement** : amendes + retrait d'immatriculation
- ❌ **Responsabilité juridique** : la PA est légalement responsable de la transmission des données fiscales
- ❌ Nécessite ISO 27001 et SecNumCloud — effort de sécurité considérable
- ❌ Maintenance continue de l'interopérabilité avec toutes les autres PA (>100 acteurs)

### Pour qui c'est pertinent

Uniquement si P3000 souhaite devenir un **éditeur de solutions de facturation à grande échelle** ou se positionner comme acteur de marché de la facturation électronique. Non pertinent pour une application BTP verticale.

---

## Comparatif synthétique

| Critère | Scénario 1 (Comptable + Factur-X) | Scénario 2 (Intégration PA) | Scénario 3 (Devenir PA) |
|---|---|---|---|
| **Délai de mise en œuvre** | 4–6 semaines | 3–4 mois | 12–24 mois |
| **Heures de développement** | 115–165h | 310–455h | 1 000–1 800h |
| **Coût externe** | ~0 € | 0–2 400 €/an (PA) | 30 000–80 000 € |
| **Faisable avant sept. 2026** | ✅ Oui | ⚠️ Partiellement | ❌ Non |
| **Faisable avant sept. 2027** | ✅ Oui | ✅ Oui | ⚠️ Très difficile |
| **Réception automatique** | ❌ Non | ✅ Oui | ✅ Oui |
| **Suivi cycle de vie** | ❌ Non | ✅ Oui | ✅ Oui |
| **e-Reporting automatisé** | ❌ (comptable) | ✅ Oui | ✅ Oui |
| **Dépendance externe** | Comptable | PA tierce | Aucune |
| **Complexité technique** | Faible | Moyenne | Très élevée |
| **Risque juridique** | Faible | Faible | Élevé |
| **Valeur ajoutée client** | Moyenne | Haute | Très haute |
| **Adapté aux clients BTP/TPE** | ✅ Très bien | ✅ Bien | ✅ Bien |

---

## Recommandation — Approche en deux phases

La stratégie optimale pour P3000 est de **combiner les scénarios 1 et 2** de façon séquentielle :

### Phase 1 — Avant le 1er septembre 2026 (Scénario 1)

**Objectif : être légalement conforme à la date limite.**

- Générer des factures Factur-X valides (PDF/A-3 + XML EN16931)
- Ajouter tous les champs obligatoires (SIRET, TVA, mentions légales)
- Exporter les fichiers Factur-X pour l'expert-comptable du client
- **Durée : 4 à 6 semaines | Effort : ~150h**

### Phase 2 — Optionnelle (Scénario 2)

> ⚠️ **La Phase 2 n'est PAS légalement obligatoire.** La loi impose que les factures transitent via une PA, pas que ce soit P3000 qui s'y connecte directement. Si vos clients ont un expert-comptable mandaté, la Phase 1 seule est suffisante pour rester conforme indéfiniment, y compris après le 1er septembre 2027.

**La Phase 2 est une recommandation commerciale**, pas réglementaire. Elle devient pertinente si :
- Certains de vos clients **n'ont pas de comptable** mandaté
- Vous souhaitez **améliorer l'expérience utilisateur** (tout dans P3000, sans action externe)
- Vous voulez **rester compétitif** face aux ERP (Sellsy, Axonaut...) qui intègreront la PA nativement
- Vous souhaitez **augmenter votre abonnement** en apportant cette valeur ajoutée

**Contenu :**
- Intégrer l'API d'une PA (Pennylane partenaire, Sellsy, ou PA EDI BTP)
- Automatiser la réception des factures fournisseurs/sous-traitants
- Ajouter le suivi du cycle de vie dans P3000
- Automatiser le e-reporting
- **Durée : 3 à 4 mois | Effort : ~300h supplémentaires**

> Le Scénario 3 n'est **pas recommandé** pour P3000 dans sa forme actuelle.

---

## Ressources officielles

| Ressource | URL |
|---|---|
| Page officielle DGFiP — Plateformes agréées | https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees |
| Dépôt dossier immatriculation PA | https://demarche.numerique.gouv.fr/commencer/immatpdp |
| Liste officielle des PA immatriculées | https://www.impots.gouv.fr (rubrique Partenaire) |
| Urssaf — Guide facturation électronique | https://www.urssaf.fr/accueil/actualites/facturation-electronique.html |
| Normes AFNOR XP Z12 | https://www.boutique.afnor.org |
| Librairie Python `factur-x` | https://pypi.org/project/factur-x/ |
| Guide technique développeurs EN16931 | https://facturxapi.com/blog/facturation-electronique-2026-guide-technique-developpeurs |

---

*Document généré dans le cadre de la mise en conformité de P3000 à la réforme de facturation électronique française.*
*À mettre à jour au fur et à mesure des évolutions réglementaires (prochaine révision : décret d'application sept. 2026).*
