# Rendez-vous comptable — Facturation électronique P3000

> Document de préparation pour un échange téléphonique avec l'expert-comptable d'un client utilisant P3000.
> Objectif : clarifier les obligations légales, choisir le niveau d'intégration utile dans P3000, identifier les responsabilités du comptable et définir les coûts possibles pour le client.

---

## 1. Contexte à rappeler au comptable

La réforme de la facturation électronique impose aux entreprises assujetties à la TVA de recevoir et d'émettre leurs factures via le nouveau dispositif national.

| Date | Obligation principale |
|---|---|
| 1er septembre 2026 | Réception obligatoire des factures électroniques pour toutes les entreprises assujetties à la TVA |
| 1er septembre 2026 | Émission obligatoire pour les grandes entreprises et ETI |
| 1er septembre 2027 | Émission obligatoire pour les PME, TPE et micro-entreprises |

P3000 concerne principalement des TPE/PME du BTP. Le point important est donc :

- dès 2026, le client doit pouvoir recevoir ses factures électroniques ;
- dès 2027, le client devra aussi émettre ses factures électroniques ;
- les factures devront transiter par une Plateforme Agréée (PA), directement ou via l'expert-comptable ;
- P3000 peut rester une Solution Compatible (SC) et générer des factures conformes sans devenir lui-même une PA.

---

## 2. Obligations à couvrir dans P3000

Pour rendre les factures P3000 compatibles avec la réforme, l'application devra au minimum permettre de produire des factures exploitables par une PA ou par le logiciel du comptable.

### Données obligatoires à prévoir

| Donnée | Utilité |
|---|---|
| SIRET/SIREN du client acheteur | Identification obligatoire du destinataire |
| Numéro de TVA intracommunautaire | Identification fiscale si applicable |
| Adresse de livraison | Obligatoire si différente de l'adresse de facturation |
| Catégorie de TVA par ligne | Nécessaire pour le traitement fiscal automatisé |
| Type de transaction | B2B, B2C, hors champ TVA, etc. |
| Numéro de bon de commande | À renseigner si le client final l'exige |
| Identifiant ou PA destinataire | Nécessaire si l'envoi est automatisé via une PA |

### Formats à envisager

| Format | Usage |
|---|---|
| Factur-X | Format le plus pratique pour P3000 : PDF lisible avec XML embarqué |
| UBL 2.1 | XML pur, plus fréquent dans les échanges très structurés |
| CII | Format XML conforme à la norme européenne EN16931 |

Recommandation : commencer par Factur-X, car c'est le format le plus adapté à une application métier comme P3000 et le plus facile à transmettre au comptable.

---

## 3. Offres possibles à proposer au client

Les montants ci-dessous sont des estimations commerciales à valider selon le volume de factures, les tarifs du comptable, les tarifs de la PA et le niveau d'accompagnement souhaité.

### Offre 1 — Mise en conformité simple avec export Factur-X

P3000 génère une facture Factur-X conforme. Le client télécharge le fichier et le transmet à son expert-comptable, ou le comptable le récupère selon son organisation. Le comptable ou sa PA se charge ensuite de l'envoi légal.

| Élément | Estimation |
|---|---|
| Développement P3000 | 115 à 165 heures |
| Délai estimé | 4 à 6 semaines |
| Coût récurrent PA côté P3000 | Aucun |
| Coût récurrent client | À définir avec le comptable |
| Prix client possible | +0 à +10 €/mois ou forfait de mise en conformité |

Avantages :

- solution la plus rapide à mettre en place ;
- pas de dépendance directe entre P3000 et une PA ;
- adaptée aux artisans, TPE et PME BTP avec un expert-comptable ;
- suffisante si le comptable prend en charge la transmission.

Limites :

- pas de réception automatique des factures fournisseurs dans P3000 ;
- pas de suivi automatique des statuts transmis, acceptés ou rejetés ;
- le client dépend de l'organisation du comptable.

Cette offre est la meilleure base pour être prêt rapidement.

### Offre 2 — Conformité assistée avec export, contrôles et accompagnement

P3000 génère les Factur-X, contrôle les champs obligatoires avant émission, archive les fichiers, affiche des alertes de conformité et aide l'utilisateur à éviter les factures incomplètes.

| Élément | Estimation |
|---|---|
| Développement P3000 | 150 à 220 heures |
| Délai estimé | 6 à 8 semaines |
| Coût récurrent PA côté P3000 | Aucun |
| Coût récurrent client | Tarif comptable ou PA du cabinet |
| Prix client possible | +10 à +20 €/mois |

Fonctions incluses possibles :

- vérification du SIRET ;
- vérification du numéro de TVA ;
- contrôle des mentions obligatoires ;
- génération Factur-X ;
- archivage de la facture générée ;
- indicateur "facture prête pour transmission comptable".

Avantages :

- meilleure sécurité pour le client ;
- réduit les rejets côté comptable ou PA ;
- reste simple techniquement.

Limites :

- la transmission reste externe à P3000 ;
- les statuts officiels restent dans l'outil du comptable ou de la PA.

### Offre 3 — Connexion directe P3000 à une Plateforme Agréée

P3000 se connecte à une PA via API. L'utilisateur peut envoyer ses factures depuis P3000, recevoir des factures fournisseurs, suivre les statuts de cycle de vie et automatiser une partie de l'e-reporting.

| Élément | Estimation |
|---|---|
| Développement P3000 | 310 à 455 heures |
| Délai estimé | 3 à 4 mois |
| Coût PA | 0,02 à 0,50 € par facture ou abonnement selon PA |
| Coût API/partenaire | 0 à 200 €/mois selon contrat |
| Prix client possible | +20 à +50 €/mois selon volume |

Fonctions incluses possibles :

- envoi direct des factures depuis P3000 ;
- réception automatique des factures fournisseurs ou sous-traitants ;
- suivi des statuts : déposée, transmise, reçue, acceptée, rejetée, en litige ;
- gestion des erreurs de transmission ;
- e-reporting automatisé si nécessaire ;
- synchronisation avec l'annuaire de la réforme.

Avantages :

- expérience utilisateur beaucoup plus fluide ;
- forte valeur commerciale ;
- moins de manipulations manuelles ;
- utile pour les clients avec volume important.

Limites :

- coût de développement plus élevé ;
- dépendance à une PA ;
- coût récurrent variable selon le volume de factures ;
- nécessite de choisir une PA compatible et stable.

### Offre 4 — Option non recommandée : P3000 devient Plateforme Agréée

P3000 obtiendrait sa propre immatriculation de PA. Cette option n'est pas réaliste pour une application verticale BTP à court terme.

| Élément | Estimation |
|---|---|
| Développement P3000 | 1 000 à 1 800 heures |
| Délai estimé | 12 à 24 mois |
| Coûts externes | 30 000 à 80 000 € |
| Coûts récurrents | Audits, ISO 27001, juridique, hébergement renforcé |

Conclusion : à écarter pour le client actuel.

---

## 4. Coûts possibles pour le client

Les coûts finaux doivent être validés avec le comptable, car ils dépendent fortement de son organisation et de la PA qu'il utilise.

### Côté P3000

| Niveau | Coût client possible |
|---|---|
| Export Factur-X simple | Inclus, forfait ponctuel ou +0 à +10 €/mois |
| Export Factur-X avec contrôles et archivage | +10 à +20 €/mois |
| Connexion directe PA | +20 à +50 €/mois |
| Gros volume ou besoin spécifique | Tarif personnalisé |

### Côté comptable ou PA

| Poste | Question à valider |
|---|---|
| Abonnement PA | Inclus dans les honoraires du comptable ou refacturé au client ? |
| Coût par facture | Facturation à l'unité ou forfait mensuel ? |
| Réception des factures fournisseurs | Incluse ou en supplément ? |
| Dépôt des factures de vente | Inclus ou en supplément ? |
| Archivage légal | Pris en charge par le cabinet, par la PA ou par le client ? |
| Accompagnement administratif | Mandat, inscription, paramétrage, formation |

Fourchettes à évoquer avec prudence :

- coût par facture PA : souvent entre 0,02 € et 0,50 € selon acteur et volume ;
- abonnement PA ou outil comptable : variable, parfois inclus dans la mission comptable ;
- surcoût d'honoraires comptables : à demander explicitement.

---

## 5. Questions à poser au comptable

### Organisation générale

1. Quelle Plateforme Agréée utilisez-vous ou prévoyez-vous d'utiliser pour vos clients ?
   Pourquoi : la PA est l'intermédiaire officiel qui transmet les factures électroniques à l'écosystème fiscal. Connaître son nom permet de savoir avec quel outil le comptable travaillera.

2. Cette PA est-elle déjà immatriculée ou en cours d'immatriculation ?
   Pourquoi : une PA doit être reconnue par l'administration. Si elle n'est pas encore validée, il peut y avoir un risque de délai ou de changement de solution.

3. Le cabinet prendra-t-il le mandat de transmission pour le client ?
   Pourquoi : le mandat de transmission autorise le comptable ou sa plateforme à agir pour le compte du client, c'est-à-dire déposer, recevoir ou suivre les factures électroniques à sa place.

4. Le client devra-t-il signer un mandat spécifique ?
   Pourquoi : il faut savoir si une formalité administrative est nécessaire avant de démarrer. Sans mandat signé, le comptable peut ne pas avoir le droit de transmettre les factures du client.

5. Qui sera responsable de l'inscription du client dans l'annuaire ?
   Pourquoi : l'annuaire permet d'identifier par quelle PA une entreprise reçoit ses factures. Il faut savoir si cette inscription est faite par le comptable, par la PA ou par le client.

6. Le cabinet souhaite-t-il recevoir les factures depuis P3000 en Factur-X ?
   Pourquoi : Factur-X est un PDF lisible qui contient aussi les données électroniques obligatoires. Si le comptable l'accepte, P3000 peut rester simple sans connexion directe à une PA.

7. Le cabinet accepte-t-il un export manuel ou souhaite-t-il une connexion automatisée ?
   Pourquoi : un export manuel signifie que le client télécharge la facture et l'envoie au comptable. Une connexion automatisée implique plus de développement dans P3000 et potentiellement des coûts supplémentaires.

### Factures de vente émises depuis P3000

1. Le format Factur-X est-il accepté par votre logiciel comptable ?
   Pourquoi : si le logiciel du comptable accepte Factur-X, P3000 peut générer directement un fichier exploitable sans développement spécifique pour chaque logiciel comptable.

2. Avez-vous des contraintes spécifiques sur le profil Factur-X attendu ?
   Pourquoi : Factur-X existe avec plusieurs niveaux de détail. Le comptable peut exiger un profil particulier selon son outil ou sa PA.

3. Souhaitez-vous un PDF lisible avec XML embarqué ou un XML séparé ?
   Pourquoi : certains outils préfèrent recevoir un fichier Factur-X unique, d'autres peuvent demander le PDF et le XML séparément. Cela influence le format d'export à prévoir.

4. Quels champs sont obligatoires pour votre traitement comptable ?
   Pourquoi : au-delà des obligations légales, le comptable peut avoir besoin de champs précis pour automatiser son traitement, par exemple code chantier, référence client ou compte comptable.

5. Comment gérez-vous les rejets de facture ?
   Pourquoi : une facture peut être refusée si une donnée est incorrecte ou manquante. Il faut savoir comment le rejet est détecté, corrigé et renvoyé.

6. Qui informe le client si une facture est rejetée ?
   Pourquoi : cela évite les zones floues. Si la facture est rejetée, le client doit savoir qui le prévient : P3000, le comptable ou la PA.

7. Avez-vous besoin d'un export groupé mensuel ou d'un export facture par facture ?
   Pourquoi : un export groupé simplifie le travail administratif, tandis qu'un export facture par facture peut être nécessaire pour un suivi plus précis ou une transmission immédiate.

### Factures fournisseurs et sous-traitants

1. Où les factures fournisseurs électroniques seront-elles reçues ?
   Pourquoi : à partir de la réforme, les factures fournisseurs arriveront via une PA. Il faut savoir si elles seront visibles chez le comptable, dans un portail PA ou ailleurs.

2. Le client les consultera-t-il dans l'outil du comptable, dans la PA ou dans P3000 ?
   Pourquoi : cela permet de savoir si P3000 doit seulement gérer les factures de vente ou aussi aider le client à suivre ses factures fournisseurs.

3. Le cabinet peut-il transmettre une copie ou un export des factures fournisseurs à P3000 ?
   Pourquoi : si le comptable peut fournir un export, P3000 pourrait importer les factures fournisseurs sans connexion directe à la PA.

4. Le client a-t-il besoin de retrouver les factures fournisseurs dans P3000 pour le suivi chantier ?
   Pourquoi : dans le BTP, les factures fournisseurs et sous-traitants peuvent être utiles pour suivre la rentabilité d'un chantier.

5. Faut-il prévoir un import manuel dans P3000 ?
   Pourquoi : un import manuel est une solution intermédiaire moins coûteuse qu'une API. L'utilisateur importe lui-même les fichiers reçus par le comptable ou la PA.

6. À terme, une réception automatique via API serait-elle utile ?
   Pourquoi : une API permettrait à P3000 de récupérer automatiquement les factures reçues, mais cela demande plus de développement et peut générer des coûts PA.

### Tarifs et refacturation

1. Quel sera le coût mensuel pour le client lié à la facturation électronique ?
   Pourquoi : il faut connaître le coût réel pour le client afin de positionner correctement l'offre P3000.

2. Ce coût est-il inclus dans les honoraires comptables actuels ?
   Pourquoi : certains comptables peuvent intégrer ce service dans leur mission, d'autres peuvent le facturer en supplément.

3. Y aura-t-il un coût par facture émise ?
   Pourquoi : certaines PA facturent à l'usage. Un client avec beaucoup de factures peut donc payer plus cher.

4. Y aura-t-il un coût par facture reçue ?
   Pourquoi : la réception des factures fournisseurs peut aussi être facturée. C'est important pour estimer le coût total.

5. Y aura-t-il des frais de mise en service ?
   Pourquoi : il peut y avoir des frais au démarrage pour créer le compte, configurer la PA ou paramétrer le dossier du client.

6. Y aura-t-il des frais pour le mandat, le paramétrage ou la formation ?
   Pourquoi : ces coûts ne sont pas toujours inclus dans l'abonnement. Il faut les identifier avant d'annoncer un budget au client.

7. Le tarif dépend-il du volume de factures ?
   Pourquoi : cela permet de savoir si le coût restera stable ou augmentera avec l'activité du client.

8. Y a-t-il un tarif différent pour les factures clients, fournisseurs et sous-traitants ?
   Pourquoi : certaines plateformes distinguent les factures émises, reçues ou traitées. Le coût peut donc varier selon le type de facture.

9. L'archivage légal est-il inclus ?
   Pourquoi : l'archivage légal consiste à conserver les factures de manière fiable, traçable et durable. S'il est inclus par la PA ou le comptable, P3000 n'a pas besoin de porter cette responsabilité seul.

10. Le cabinet facture-t-il la gestion des rejets ou corrections ?
    Pourquoi : si une facture est rejetée, il peut y avoir du temps de traitement comptable. Il faut savoir si ce travail est inclus ou facturé.

### Responsabilités

1. Qui est responsable de la conformité de la facture avant transmission ?
   Pourquoi : P3000 peut aider à générer une facture conforme, mais le comptable peut aussi avoir un rôle de contrôle. Il faut clarifier qui vérifie quoi.

2. Qui est responsable de la transmission à la PA ?
   Pourquoi : si P3000 ne se connecte pas directement à une PA, la transmission sera faite par le client ou le comptable.

3. Qui est responsable du suivi des statuts ?
   Pourquoi : les statuts indiquent si une facture est déposée, transmise, acceptée, rejetée ou en litige. Il faut savoir où ces informations seront consultées.

4. Qui prévient le client en cas de rejet ?
   Pourquoi : un rejet non traité peut bloquer le paiement. Il faut définir qui alerte le client et dans quel délai.

5. Qui conserve la preuve de dépôt et de transmission ?
   Pourquoi : en cas de contrôle ou de litige, le client peut devoir prouver que la facture a bien été transmise.

6. Quelle durée d'archivage est assurée par la PA ou le cabinet ?
   Pourquoi : les factures doivent être conservées plusieurs années. Il faut savoir si cette conservation est assurée par le comptable, la PA ou le client.

7. Le client doit-il conserver une copie dans P3000 ?
   Pourquoi : même si le comptable archive légalement, il peut être utile de garder une copie dans P3000 pour le suivi chantier, la recherche et l'historique client.

### Besoins fonctionnels pour P3000

1. Est-ce suffisant que P3000 génère une Factur-X conforme ?
   Pourquoi : c'est la question centrale. Si la réponse est oui, la solution P3000 peut rester simple, rapide et peu coûteuse.

2. Le cabinet souhaite-t-il une nomenclature de fichier particulière ?
   Pourquoi : le comptable peut demander un nom de fichier précis, par exemple avec la date, le numéro de facture ou le nom du client.

3. Le cabinet souhaite-t-il un export CSV ou Excel complémentaire ?
   Pourquoi : certains cabinets utilisent un fichier récapitulatif pour contrôler ou importer les factures plus facilement.

4. Le cabinet souhaite-t-il un envoi par email automatique ?
   Pourquoi : cela peut éviter au client de télécharger puis envoyer manuellement les factures au comptable.

5. Le cabinet dispose-t-il d'une API utilisable par P3000 ?
   Pourquoi : une API permettrait une connexion automatique entre P3000 et l'outil du comptable ou sa PA.

6. Une connexion directe entre P3000 et la PA est-elle souhaitable ou inutile ?
   Pourquoi : si le comptable gère déjà tout, une connexion directe peut être inutile. Si le client veut tout faire dans P3000, elle peut devenir intéressante.

7. Le client a-t-il assez de volume pour justifier une automatisation ?
   Pourquoi : plus le volume de factures est élevé, plus l'automatisation devient rentable. Pour un faible volume, un export manuel peut suffire.

---

## 6. Questions à poser au client

1. Combien de factures clients émettez-vous par mois ? PEINTURE3000 (10-15), MJRSERVICE(3), ELEKABLE(10) 
2. Combien de factures fournisseurs ou sous-traitants recevez-vous par mois ? FOURNISSEUR(20-30), SOus traintace (10)
3. Votre expert-comptable gère-t-il déjà votre facturation ou seulement votre comptabilité ?
4. Souhaitez-vous continuer à passer par le comptable pour l'envoi des factures ?
5. Avez-vous besoin de voir les statuts de facture dans P3000 ? a voir
6. Avez-vous besoin d'importer automatiquement les factures fournisseurs dans P3000 ? a voir
7. Préférez-vous une solution simple et économique ou une solution plus automatisée ?
8. Quel budget mensuel seriez-vous prêt à ajouter pour cette conformité ?
9. Avez-vous des clients publics ou grands comptes qui imposent déjà des contraintes particulières ?
10. Utilisez-vous déjà Chorus Pro, Pennylane, Sage, Cegid, ACD, Sellsy ou un autre outil lié à la facturation ?

---

## 7. Recommandation pour le rendez-vous

Pour ce client, la position recommandée est :

1. Valider avec le comptable qu'un export Factur-X depuis P3000 est accepté.
2. Confirmer que le comptable ou sa PA prend en charge la transmission légale.
3. Demander le coût exact pour le client : abonnement, coût par facture, frais de mise en service.
4. Prévoir dans P3000 une première offre de conformité simple : champs obligatoires, contrôles et génération Factur-X.
5. Reporter l'intégration directe à une PA uniquement si le client a un volume important ou si le comptable ne peut pas gérer le flux.

Phrase de cadrage possible :

> "Notre objectif est que P3000 produise des factures conformes et exploitables par votre cabinet. Nous voulons savoir si un fichier Factur-X généré depuis P3000 suffit pour que vous assuriez la transmission via votre Plateforme Agréée, ou s'il faut prévoir une intégration plus poussée."

---

## 8. Décision attendue après l'appel

À la fin de l'échange, il faut idéalement obtenir :

- le nom de la PA utilisée ou envisagée par le comptable ;
- les formats acceptés par le cabinet ;
- le rôle exact du comptable dans la transmission ;
- les coûts facturés au client ;
- les contraintes techniques éventuelles ;
- le volume de factures du client ;
- le niveau d'automatisation réellement nécessaire dans P3000.

---

## 9. Synthèse rapide

| Option | Recommandation | Coût client probable |
|---|---|---|
| Export Factur-X simple | Recommandé pour démarrer | Faible |
| Export Factur-X avec contrôles | Très recommandé | Faible à modéré |
| Connexion directe PA | À réserver aux clients avec volume ou besoin d'automatisation | Modéré à élevé |
| P3000 devient PA | Non recommandé | Très élevé |

Conclusion : pour le rendez-vous, l'enjeu principal n'est pas de demander au comptable "comment développer la réforme", mais de savoir s'il accepte de jouer le rôle d'intermédiaire via sa PA et à quel tarif pour le client.
