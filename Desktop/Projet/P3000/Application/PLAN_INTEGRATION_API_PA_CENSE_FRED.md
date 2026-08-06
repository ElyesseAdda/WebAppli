# Plan d'intégration API PA comptable — P3000

> Source analysée : Swagger UI `https://fredprodapi.azurewebsites.net/index.html`
> Définition OpenAPI récupérée : `docs/fredprodapi-swagger.json`
> API affichée : `Fred Api Gateway`
> Authentification déclarée : OAuth2 `implicit`, scope `apidata`, autorisation `https://auth.inqom.com/identity/connect/authorize`

---

## 1. Ce qui a été récupéré

La page HTML Swagger ne contient pas directement toute la documentation métier. Elle charge une définition Swagger complète ici :

```text
https://fredprodapi.azurewebsites.net/swagger/v1/swagger.json
```

Cette définition a été téléchargée localement dans :

```text
docs/fredprodapi-swagger.json
```

Le fichier contient :

- 778 chemins API ;
- 901 opérations ;
- une sécurité OAuth2 ;
- des endpoints de GED ;
- des endpoints de dossiers comptables ;
- des endpoints de comptes, journaux, écritures, lettrage ;
- un endpoint lié au statut PDP d'une entreprise.

---

## 2. Point important avant développement

Même si le comptable indique que l'API suit la norme AFNOR, la documentation Swagger exposée publiquement ne contient pas de routes explicites nommées :

- dépôt facture électronique ;
- facture électronique AFNOR ;
- e-invoicing ;
- e-reporting ;
- cycle de vie facture ;
- annuaire PA ;
- Factur-X ;
- UBL ;
- CII.

Les mots-clés `factur`, `afnor` et `flux` ne ressortent pas directement dans la définition Swagger téléchargée.

Cela ne veut pas dire que l'API ne permet pas l'intégration, mais cela veut dire qu'il faut clarifier avec le comptable ou l'éditeur si :

- la facture doit être envoyée comme document dans la GED ;
- la facture doit être transformée en écriture comptable ;
- l'API de dépôt AFNOR est dans une autre documentation ;
- l'accès aux endpoints PA nécessite un compte, une sandbox ou une documentation non publique ;
- cette API est seulement l'API comptable autour de CENSE/FRED, et non l'API PA complète.

---

## 3. Endpoints repérés comme candidats

### Authentification OAuth2

| Élément | Valeur |
|---|---|
| Type | OAuth2 |
| Flow Swagger | implicit |
| Authorization URL | `https://auth.inqom.com/identity/connect/authorize` |
| Scope | `apidata` |

À confirmer absolument :

- le flow réel à utiliser côté serveur Django ;
- client ID ;
- client secret ou non ;
- token URL ;
- refresh token ;
- durée de vie des tokens ;
- sandbox ;
- URL de base de production.

Le flow `implicit` est historiquement orienté navigateur. Pour une intégration backend P3000, il faudra idéalement un flow `client_credentials` ou `authorization_code` avec refresh token.

### GED / dépôt de fichier

Endpoint :

```text
POST /api/accounting-folders/{accountingFolderId}/electronic-documents/files
```

Usage probable :

- envoyer un ou plusieurs fichiers dans un dossier documentaire ;
- potentiellement déposer une facture Factur-X dans CENSE/FRED ;
- nécessite `accountingFolderId` et `folderId`.

À confirmer :

- est-ce que déposer une Factur-X ici déclenche réellement la transmission PA ?
- ou est-ce seulement un stockage documentaire ?
- quel dossier cible utiliser pour les factures de vente ?
- quels formats sont acceptés : PDF, Factur-X, XML, ZIP ?

### Statut PDP / PA de l'entreprise

Endpoint :

```text
PUT /api/app/enterprises/{enterpriseId}/pdp
```

Schéma :

```json
{
  "Status": "string",
  "UpdatedAt": "date-time"
}
```

Usage probable :

- mettre à jour une information de statut PDP/PA sur une entreprise ;
- ne semble pas être un endpoint d'envoi de facture.

À confirmer :

- quelles valeurs de `Status` sont autorisées ;
- qui doit appeler cet endpoint ;
- s'il sert à l'enrôlement PA du client ou seulement à une donnée interne.

### Comptabilité publique V1

Endpoints repérés :

```text
GET  /v1/dossiers/{dossierId}/accounts
GET  /v1/dossiers/{dossierId}/journals
POST /v1/dossiers/{dossierId}/entries
PUT  /v1/dossiers/{dossierId}/entries
GET  /v1/dossiers/{dossierId}/entry-lines
POST /v1/dossiers/{dossierId}/letterings
```

Usage probable :

- récupérer le plan comptable ;
- récupérer les journaux ;
- créer des écritures comptables ;
- synchroniser les écritures de P3000 vers le logiciel comptable.

Ce n'est pas suffisant à lui seul pour dire que la facture électronique est transmise légalement à la PA.

---

## 4. Questions techniques à poser avant de coder

1. Quelle est l'URL exacte de l'API PA AFNOR ?
   Pourquoi : l'URL Swagger récupérée semble surtout exposer une API comptable/GED.

2. L'envoi d'un fichier Factur-X dans `electronic-documents/files` déclenche-t-il la transmission officielle à la PA ?
   Pourquoi : un dépôt documentaire n'est pas forcément une transmission légale.

3. Existe-t-il un endpoint dédié pour soumettre une facture de vente ?
   Pourquoi : une API PA complète devrait normalement gérer le dépôt, les contrôles, le routage et les statuts.

4. Existe-t-il un endpoint pour récupérer le cycle de vie d'une facture ?
   Pourquoi : P3000 doit savoir si une facture est transmise, acceptée, rejetée ou en litige.

5. Existe-t-il des webhooks ?
   Pourquoi : sans webhook, P3000 devra interroger régulièrement l'API pour connaître les statuts.

6. Comment récupérer les factures fournisseurs reçues ?
   Pourquoi : c'est nécessaire pour intégrer les factures sous-traitants/fournisseurs dans P3000.

7. L'API accepte-t-elle Factur-X directement ?
   Pourquoi : c'est le format recommandé pour P3000.

8. Quel profil Factur-X est attendu ?
   Pourquoi : il faut générer le bon niveau de données XML.

9. Quels identifiants sont nécessaires ?
   Pourquoi : il faut mapper P3000 avec `enterpriseId`, `accountingFolderId`, `dossierId`, `folderId`.

10. Quel mode OAuth2 doit être utilisé par une application serveur ?
    Pourquoi : le Swagger indique `implicit`, mais Django doit plutôt utiliser un flow backend sécurisé.

---

## 5. Découpage recommandé de l'intégration

### Phase 0 — Validation technique avec le comptable ou l'éditeur

Objectif : éviter de développer sur le mauvais endpoint.

À obtenir :

- documentation API PA complète si différente du Swagger actuel ;
- identifiants sandbox ;
- client ID OAuth ;
- méthode d'authentification serveur ;
- entreprise de test ;
- `enterpriseId`, `dossierId`, `accountingFolderId`, `folderId` de test ;
- exemple de facture Factur-X acceptée ;
- exemple de réponse en cas de rejet.

Livrable P3000 :

- aucune modification métier lourde ;
- seulement une note technique validée.

### Phase 1 — Préparation conformité dans P3000

Objectif : rendre les données P3000 capables de produire une facture électronique correcte.

Backend Django :

- ajouter SIRET/SIREN sur `Societe` ;
- ajouter numéro TVA intracommunautaire sur `Societe` ;
- ajouter les informations de conformité sur `Facture` ;
- ajouter type de transaction ;
- ajouter adresse de livraison si différente ;
- ajouter catégorie TVA par ligne ;
- prévoir le stockage du fichier Factur-X généré ;
- prévoir un hash d'intégrité du fichier.

Frontend React :

- ajouter les champs obligatoires dans les formulaires société/client/facture ;
- afficher les alertes si une facture n'est pas prête ;
- ajouter un bouton de génération Factur-X.

### Phase 2 — Génération Factur-X

Objectif : produire un fichier conforme et exploitable par la PA/comptable.

Backend :

- créer un service `facturx_service.py` ;
- générer le XML EN16931/CII ;
- intégrer le XML dans le PDF ;
- valider le fichier avant envoi ;
- conserver le fichier généré.

Livrable :

- endpoint P3000 `POST /api/factures/{id}/generate-facturx/` ;
- fichier Factur-X prêt à être transmis ;
- statut interne `facturx_generee`.

### Phase 3 — Connecteur API FRED/CENSE

Objectif : isoler toute la communication externe dans un module dédié.

Backend :

- créer un modèle `PlateformeAgrementConfig` ou équivalent ;
- stocker les identifiants non secrets : base URL, enterpriseId, dossierId, folderId ;
- stocker les secrets dans l'environnement, pas en base en clair ;
- créer un service `fred_api_client.py` ;
- gérer OAuth2 ;
- gérer refresh ou renouvellement token ;
- gérer les erreurs API ;
- journaliser chaque appel externe.

Modèles à prévoir :

- `FactureTransmissionPA` ;
- `FactureTransmissionLog` ;
- éventuellement `FactureStatutPA`.

Champs utiles :

- facture liée ;
- plateforme ;
- identifiant externe ;
- statut ;
- date d'envoi ;
- date de dernière synchronisation ;
- message d'erreur ;
- payload envoyé ;
- réponse reçue.

### Phase 4 — Envoi facture de vente

Objectif : permettre à P3000 d'envoyer une facture vers la plateforme du comptable.

Deux cas possibles selon la réponse de l'éditeur :

#### Cas A — L'endpoint GED déclenche la transmission PA

Utiliser :

```text
POST /api/accounting-folders/{accountingFolderId}/electronic-documents/files
```

Étapes :

- générer la Factur-X ;
- trouver le `folderId` cible ;
- uploader le fichier ;
- stocker l'identifiant retourné ;
- marquer la facture comme déposée.

#### Cas B — L'endpoint GED ne fait que stocker le fichier

Ne pas considérer cette route comme une intégration PA complète.

Il faudra obtenir :

- endpoint de dépôt facture ;
- endpoint de validation ;
- endpoint de transmission ;
- endpoint de statut.

### Phase 5 — Suivi du cycle de vie

Objectif : afficher dans P3000 le statut réel de la facture.

Statuts à prévoir côté P3000 :

- `brouillon` ;
- `facturx_generee` ;
- `deposee_pa` ;
- `transmise` ;
- `reçue_destinataire` ;
- `acceptée` ;
- `rejetée` ;
- `en_litige` ;
- `payée`.

Si webhooks disponibles :

- créer un endpoint Django sécurisé pour recevoir les événements ;
- vérifier signature ou secret ;
- mettre à jour les statuts.

Si pas de webhooks :

- créer une tâche périodique de synchronisation ;
- interroger les statuts régulièrement ;
- limiter la fréquence pour éviter les quotas.

### Phase 6 — Réception des factures fournisseurs/sous-traitants

Objectif : récupérer dans P3000 les factures reçues via la PA.

À implémenter seulement si l'API fournit les endpoints nécessaires.

Backend :

- récupérer les documents entrants ;
- parser Factur-X/XML ;
- créer ou préremplir `FactureSousTraitant` ou `FactureFournisseurMateriel` ;
- rattacher au chantier si possible ;
- stocker le fichier source.

Frontend :

- écran de factures reçues ;
- validation manuelle avant création définitive ;
- rapprochement chantier/sous-traitant.

### Phase 7 — Écritures comptables optionnelles

Objectif : envoyer aussi les écritures comptables vers le dossier comptable.

Endpoints candidats :

```text
POST /v1/dossiers/{dossierId}/entries
GET  /v1/dossiers/{dossierId}/accounts
GET  /v1/dossiers/{dossierId}/journals
```

Ce module est utile si le comptable veut automatiser la saisie comptable, mais il ne remplace pas la transmission légale de facture électronique.

---

## 6. Ordre de développement conseillé

1. Valider l'API exacte de dépôt PA avec COGEP/CENSE/FRED.
2. Ajouter les champs réglementaires dans P3000.
3. Générer une Factur-X conforme.
4. Construire le client OAuth2/API dans Django.
5. Tester l'upload dans un environnement sandbox.
6. Ajouter le modèle de suivi de transmission.
7. Ajouter le bouton d'envoi depuis P3000.
8. Ajouter le suivi des statuts.
9. Ajouter la réception fournisseur uniquement si l'API le permet.
10. Ajouter la synchronisation comptable en dernier.

---

## 7. Décision actuelle

À ce stade, la bonne stratégie est :

- ne pas commencer directement par l'écriture du connecteur complet ;
- commencer par la conformité P3000 + Factur-X ;
- demander à l'éditeur si l'API Swagger fournie est bien l'API PA AFNOR ou seulement l'API comptable/GED ;
- obtenir une sandbox avant de développer l'envoi automatique.

Le risque principal est de confondre :

- dépôt d'un document dans une GED ;
- création d'une écriture comptable ;
- transmission légale d'une facture électronique via une PA.

Ces trois actions sont différentes et doivent être confirmées séparément.
