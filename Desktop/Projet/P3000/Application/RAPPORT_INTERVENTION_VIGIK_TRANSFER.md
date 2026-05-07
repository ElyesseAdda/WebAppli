# RAPPORT D'INTERVENTION / VIGIK+ — FICHIER DE TRANSFERT

> Ce fichier est **auto-suffisant** : il contient l'intégralité du code source et la documentation nécessaire pour qu'une IA reproduise cette fonctionnalité **à l'identique** dans une autre version de l'application P3000.
>
> **Stack cible :** Django + Django REST Framework (backend), React + MUI (frontend), AWS S3 (stockage fichiers), Puppeteer via Node.js (génération PDF).
>
> **Périmètre fonctionnel :**
> - Rapport d'intervention classique (prestations, photos avant / en cours / après, signature).
> - Rapport Vigik+ (adresse, bâtiment, type installation, questions platine / portail, photos multiples).
> - Format mobile/PWA (layout dédié, PhotoManager tactile, compression auto, IndexedDB).
> - Brouillons local (IndexedDB + localStorage) et serveur (modèle dédié + endpoint `promouvoir`).
> - Compression JPEG côté client avant upload.
> - Stockage PDF dans le Drive S3 avec chemins automatiques par type.
> - Numérotation annuelle atomique (`select_for_update`).

---

## Table des matières

1. [Vue d'ensemble & architecture](#1-vue-densemble--architecture)
2. [Arborescence des fichiers à répliquer](#2-arborescence-des-fichiers-à-répliquer)
3. [Dépendances requises](#3-dépendances-requises)
4. [Backend Django — code complet](#4-backend-django--code-complet)
5. [Schéma final des modèles (pas de migrations)](#5-schéma-final-des-modèles-pas-de-migrations)
6. [Templates PDF](#6-templates-pdf)
7. [Frontend React — code complet](#7-frontend-react--code-complet)
8. [Contrats API](#8-contrats-api)
9. [Flux clé expliqués](#9-flux-clé-expliqués)
10. [Points à ajuster côté nouvelle application](#10-points-à-ajuster-côté-nouvelle-application)

---

## 1. Vue d'ensemble & architecture

### 1.1 Deux types de rapports partageant un même modèle

| Type (`type_rapport`) | Libellé                    | Cas d'usage                                                                                   |
|-----------------------|----------------------------|-----------------------------------------------------------------------------------------------|
| `intervention`        | Rapport d'intervention     | Intervention classique : résidence + locataire + prestations (photos avant/en_cours/après) + signature. |
| `vigik_plus`          | Vigik+                     | Audit Vigik+ : adresse/bâtiment + installation + questions présence platine / portail + photos dédiées. Pas de signature, pas de prestations, pas de locataire. |

Un **seul** modèle `RapportIntervention` porte les deux types : les champs propres à Vigik+ (`adresse_vigik`, `numero_batiment`, `presence_platine`, `presence_portail`, `presence_platine_portail`, `photos_platine_s3_keys`, `photos_platine_portail_s3_keys`, `type_installation`) sont **optionnels**. La logique d'affichage / validation / génération PDF bascule sur `type_rapport`.

### 1.2 Flux de données (haut niveau)

```
 ┌────────────┐                       ┌──────────────────┐
 │  Frontend  │  /api/rapports-*     │  DRF ViewSets    │
 │  React     │ ───────────────────► │  (api/views_     │
 │  + hooks   │ ◄─────────────────── │   rapport.py)    │
 │ (useRapp.) │                       └──────┬───────────┘
 │            │                              │
 │ compress + │                              │ models
 │ IndexedDB  │                              ▼
 │ (brouillon)│                       ┌──────────────┐
 └─────┬──────┘                       │  PostgreSQL  │
       │ upload JPEG / signature      │  (RapportInt │
       ▼                              │   vention +  │
 ┌────────────┐  /api/upload-*        │   Prestation │
 │   Drive    │ ◄───────────────────  │   Photo +    │
 │   AWS S3   │                       │   Brouillon) │
 │  (bucket)  │                       └──────┬───────┘
 │            │  copy/presign                │
 │            │ ◄─── rapport_brouillon_media │
 └────────────┘                              │
                                              ▼
                                       ┌──────────────┐
                                       │  Puppeteer   │
                                       │  Node.js     │
                                       │  (renderer)  │
                                       └──────┬───────┘
                                              │
                                              ▼ upload final
                                           Drive S3 (PDF)
```

### 1.3 Étapes clés

1. **Création (ou chargement) côté frontend**
   - `RapportForm.js` initialise le state (nouveau ou depuis un rapport existant / brouillon serveur).
   - En mode brouillon, photos non sauvegardées conservées en IndexedDB (`rapportDraftIDB.js`), autres champs en localStorage.
2. **Compression**
   - Toutes les photos passent par `compressImage.js` (Canvas / `createImageBitmap`) avant toute persistance.
3. **Enregistrement serveur**
   - `POST /api/rapports-intervention/` crée le rapport ; upload photos + signature via endpoints dédiés.
   - Numérotation annuelle assignée automatiquement à la création (`assign_numero_rapport_si_absent`).
4. **Brouillon serveur (mobile ou multi-device)**
   - `POST /api/rapports-intervention-brouillons/` : payload JSON normalisé (tous champs + snapshot photos + s3_keys Vigik+).
   - À la finalisation : action `promouvoir` → crée le `RapportIntervention` et transfère les fichiers S3 du dossier draft vers le dossier final.
5. **Génération PDF**
   - `preview-rapport-intervention/<id>/` renvoie l'HTML (template Django `rapport_intervention.html` ou `rapport_vigik_plus.html`).
   - `POST /api/generate-rapport-intervention-pdf/` → renvoie le PDF (Puppeteer).
   - `GET /api/generate-rapport-intervention-pdf-drive/` → génère + dépose dans S3 (chemin calculé depuis `chantier.get_drive_path()` + type rapport).

### 1.4 Points de flexibilité (zéro hardcoding)

- **Drive / S3** : `api/utils.py` lit `AWS_*` depuis `settings` (jamais de valeurs en dur). La seule constante à adapter est `region_name='eu-north-1'` dans `get_s3_client()` (voir Section 10).
- **Préfixe Drive** : calculé par `chantier.get_drive_path()` → facile à remplacer par une autre convention (Google Drive, WebDAV…).
- **Template PDF** : deux templates Django simples (`rapport_intervention.html`, `rapport_vigik_plus.html`) — pas de dépendance Puppeteer côté template.
- **Authentification** : aucun décorateur custom sur les views (DRF `IsAuthenticated` hérité du projet).
- **Compression** : `compressImage.js` accepte `options` → réutilisable avec d'autres profils.
- **Numérotation** : `RapportInterventionNumeroCompteur` est isolé → simple à remplacer par une autre stratégie (UUID, numérotation par société…).

### 1.5 Règles métier importantes

- Un rapport n'a pas de numéro tant qu'il est brouillon serveur (le numéro est assigné **à la promotion / création effective**).
- La numérotation est **annuelle** : le compteur redémarre chaque année civile (`RapportInterventionNumeroCompteur.annee`).
- Un devis ne peut être lié qu'à **un seul** rapport (validation côté sérialiseur + vérif double-check en ViewSet).
- Une prestation doit renseigner `localisation`, `probleme` et `solution` pour qu'un rapport non Vigik+ puisse passer en statut `termine`.
- Un rapport `vigik_plus` n'expose **pas** de signature, ni de prestations, ni de champs locataires dans le PDF.



## 2. Arborescence des fichiers à répliquer

### 2.1 Nouveaux fichiers backend (app `api/` ou équivalent)

```
api/
├── models_rapport.py                     (NOUVEAU — Section 4.1)
├── rapport_brouillon.py                  (NOUVEAU — Section 4.2)
├── rapport_brouillon_media.py            (NOUVEAU — Section 4.3)
├── serializers_rapport.py                (NOUVEAU — Section 4.4)
├── views_rapport.py                      (NOUVEAU — Section 4.5)
├── urls_rapport.py                       (NOUVEAU — Section 4.6)
└── management/
    └── commands/
        └── assign_rapport_intervention_numeros.py  (NOUVEAU — Section 4.7)
```

### 2.2 Fichiers backend à modifier

```
api/
├── models.py        → réexporter les modèles de models_rapport.py
│                      + ajouter logo_s3_key + adresse sur Societe
│                      + ajouter la méthode get_drive_path() sur Chantier
├── utils.py         → ajouter les helpers S3 (Section 4.8) s'ils n'existent pas
├── urls.py          → include('api.urls_rapport')
└── settings.py      → AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
                       AWS_STORAGE_BUCKET_NAME, AWS_S3_REGION_NAME
```

### 2.3 Templates PDF

```
frontend/templates/
├── rapport_intervention.html   (NOUVEAU — Section 6.1)
└── rapport_vigik_plus.html     (NOUVEAU — Section 6.2)
```

> Chemin exact à adapter au `TEMPLATES['DIRS']` du projet cible.

### 2.4 Nouveaux fichiers frontend

```
frontend/src/
├── hooks/
│   └── useRapports.js                              (Section 7.1)
├── utils/
│   ├── compressImage.js                            (Section 7.2)
│   └── rapportDraftIDB.js                          (Section 7.3)
└── components/
    └── RapportIntervention/
        ├── index.js                                (Section 7.4)
        ├── PhotoManager.js                         (Section 7.5)
        ├── SignaturePad.js                         (Section 7.6)
        ├── PrestationSection.js                    (Section 7.7)
        ├── RapportForm.js                          (Section 7.8  — le plus gros)
        ├── RapportPreview.js                       (Section 7.9)
        ├── RapportPreviewPage.js                   (Section 7.10)
        ├── RapportsPage.js                         (Section 7.11 — desktop)
        ├── RapportsPageMobile.js                   (Section 7.12 — mobile)
        ├── RapportMobileLayout.js                  (Section 7.13)
        ├── RapportDetailMobile.js                  (Section 7.14)
        ├── ChantierRapportsList.js                 (Section 7.15)
        └── rapports-mobile.css                     (Section 7.16)
```

### 2.5 Fichiers frontend à modifier

```
frontend/src/
├── components/App.js         → imports + 5 routes (Section 7.18)
├── components/SlideBar.js    → entrée "Rapports d'intervention" → /RapportsIntervention
├── components/LoginMobile.js → redirection post-login vers /rapports-mobile
└── config/documentTypeConfig.js → 2 nouvelles entrées RAPPORT_INTERVENTION / RAPPORT_VIGIK_PLUS
```

### 2.6 Dépendances externes du projet (déjà présentes ou à installer)

- **Frontend** : `@mui/material`, `axios`, `react-icons`, `react-router-dom`, `idb` (optionnel selon version — le code actuel utilise l'API IndexedDB native).
- **Backend** : `boto3`, `Django`, `djangorestframework`.
- **Génération PDF** : service Node.js + Puppeteer — ce module est **supposé exister côté projet cible** (même binaire utilisé pour les autres PDFs). Les views appellent `generer_pdf_via_node` / endpoint équivalent déjà utilisé par les autres documents (devis, facture, etc.). Aucun nouveau binaire Puppeteer à installer.



## 3. Dépendances requises

### 3.1 Backend — Python (à vérifier dans `requirements.txt`)

| Paquet                | Usage                                                |
|-----------------------|------------------------------------------------------|
| `Django>=3.2`         | Framework principal                                  |
| `djangorestframework` | Viewsets, routers, serializers                       |
| `boto3`               | Client S3                                            |
| `Pillow`              | (Optionnel) validation d'image côté serveur         |

### 3.2 Backend — Settings Django à renseigner

```python
# settings.py (extrait)
AWS_ACCESS_KEY_ID      = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY  = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
AWS_S3_REGION_NAME     = os.environ.get("AWS_S3_REGION_NAME", "eu-north-1")
```

> L'application cible **ne doit rien coder en dur** : les clés, bucket et région viennent de `settings`.  
> La seule valeur "par défaut" restant dans le code est `region_name='eu-north-1'` dans `api/utils.py::get_s3_client` — à remplacer par `getattr(settings, "AWS_S3_REGION_NAME", "...")` si la cible utilise une autre région.

### 3.3 Frontend — `package.json`

| Paquet                   | Version mini indicative | Usage                            |
|--------------------------|-------------------------|----------------------------------|
| `react`                  | ≥ 17                    | UI                               |
| `react-router-dom`       | ≥ 6                     | Routing                          |
| `@mui/material`          | ≥ 5                     | Composants UI                    |
| `@mui/icons-material`    | ≥ 5                     | (optionnel)                     |
| `react-icons`            | ≥ 4                     | Icônes Material / Ant            |
| `axios`                  | ≥ 0.27                  | Appels API                       |

> Aucun paquet tiers pour la signature (canvas natif) ou pour la compression (`createImageBitmap` / `HTMLCanvasElement.toBlob`).  
> Aucun paquet tiers pour IndexedDB : accès direct via l'API native du navigateur.

### 3.4 PDF / Puppeteer

Le backend délègue la génération PDF au service Node.js existant du projet (`node server.js` + Puppeteer). Les views utilisent le même endpoint / fonction que les autres documents PDF du projet (devis, factures, etc.). **Aucun binaire à ajouter** si le projet cible possède déjà ce service ; sinon, il faut le recréer en suivant la convention du projet cible.



## 4. Backend Django — code complet

Tous les fichiers Python à créer dans l'app Django cible (chemins à adapter à la convention de l'application cible : ici l'app Django s'appelle `api`).

### 4.1 `api/models_rapport.py`

Les modèles dédiés à la fonctionnalité. À placer dans un fichier séparé puis réexporter depuis `api/models.py`.

```python
import datetime
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class TitreRapport(models.Model):
    nom = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']
        verbose_name = "Titre de rapport"
        verbose_name_plural = "Titres de rapport"

    def __str__(self):
        return self.nom


def default_dates_intervention_list():
    return []


class Residence(models.Model):
    nom = models.CharField(max_length=255, verbose_name="Nom de la résidence")
    adresse = models.CharField(max_length=500, blank=True, default='', verbose_name="Adresse")
    client_societe = models.ForeignKey(
        'Societe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='residences', verbose_name="Client / Bailleur"
    )
    chantier = models.ForeignKey(
        'Chantier', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='residences'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']
        verbose_name = "Résidence"
        verbose_name_plural = "Résidences"

    def __str__(self):
        return self.nom


class RapportIntervention(models.Model):
    TYPE_CHOICES = [
        ('intervention', "Rapport d'intervention"),
        ('vigik_plus', 'Vigik+'),
    ]
    STATUT_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('a_faire', 'A faire'),
        ('en_cours', 'En cours'),
        ('termine', 'Terminé'),
    ]

    titre = models.ForeignKey(
        TitreRapport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rapports',
    )
    date = models.DateField(default=timezone.now)
    dates_intervention = models.JSONField(
        default=default_dates_intervention_list,
        blank=True,
        verbose_name="Dates d'intervention (passages)",
        help_text="Liste ordonnée de dates ISO (YYYY-MM-DD) : 1er passage, 2e, etc.",
    )
    technicien = models.CharField(max_length=255, verbose_name="Technicien")
    objet_recherche = models.TextField(verbose_name="Objet de la recherche")
    resultat = models.TextField(blank=True, default='', verbose_name="Résultat")
    temps_trajet = models.FloatField(default=0, verbose_name="Temps de trajet (heures)")
    temps_taches = models.FloatField(default=0, verbose_name="Temps de taches (heures)")

    client_societe = models.ForeignKey(
        'Societe', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rapports_intervention', verbose_name="Client / Bailleur"
    )
    chantier = models.ForeignKey(
        'Chantier', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rapports_intervention'
    )

    residence = models.ForeignKey(
        Residence, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rapports', verbose_name="Résidence"
    )
    logement = models.CharField(max_length=255, blank=True, default='', verbose_name="Logement")

    locataire_nom = models.CharField(max_length=100, blank=True, default='')
    locataire_prenom = models.CharField(max_length=100, blank=True, default='')
    locataire_telephone = models.CharField(max_length=20, blank=True, default='')
    locataire_email = models.EmailField(blank=True, default='')

    signature_s3_key = models.CharField(max_length=500, blank=True, default='')

    type_rapport = models.CharField(max_length=20, choices=TYPE_CHOICES, default='intervention')
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='a_faire')
    devis_a_faire = models.BooleanField(default=False, verbose_name="Devis à faire")
    devis_fait = models.BooleanField(default=False, verbose_name="Devis fait")
    devis_lie = models.ForeignKey(
        'Devis', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rapports_intervention_lies', verbose_name="Devis lié"
    )
    pdf_s3_key = models.CharField(max_length=500, blank=True, default='')

    # Numéro d'affichage annuel (PDF / prévisualisation uniquement ; non exposé à l'API liste/détail)
    numero_rapport = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Numéro de rapport (séquentiel annuel)",
    )
    annee_numero_rapport = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Année du numéro de rapport",
    )

    # Champs spécifiques Vigik+
    adresse_vigik = models.CharField(max_length=500, blank=True, default='', verbose_name="Adresse (rapport Vigik+)")
    numero_batiment = models.CharField(max_length=100, blank=True, default='', verbose_name="Numéro du bâtiment")
    type_installation = models.CharField(max_length=255, blank=True, default='', verbose_name="Type d'installation")
    presence_platine = models.BooleanField(null=True, blank=True, verbose_name="Présence de platine")
    photos_platine_s3_keys = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Photos platine (Vigik+)",
        help_text="Liste ordonnée de clés S3.",
    )
    presence_portail = models.BooleanField(
        null=True, blank=True, verbose_name="Présence d'un portail (Vigik+)"
    )
    presence_platine_portail = models.BooleanField(null=True, blank=True, verbose_name="Présence de platine au niveau du portail")
    photos_platine_portail_s3_keys = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Photos platine portail (Vigik+)",
        help_text="Liste ordonnée de clés S3.",
    )

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='rapports_crees')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = "Rapport d'intervention"
        verbose_name_plural = "Rapports d'intervention"

    def __str__(self):
        return f"Rapport {self.titre or 'Sans titre'} - {self.date}"


class RapportInterventionNumeroCompteur(models.Model):
    """Compteur par année calendaire pour numéros de rapport (concurrence sûre avec select_for_update)."""

    annee = models.PositiveIntegerField(unique=True)
    dernier_numero = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Compteur numéro rapport (par année)"
        verbose_name_plural = "Compteurs numéros rapport (par année)"

    def __str__(self):
        return f"{self.annee} → {self.dernier_numero}"


class RapportInterventionBrouillon(models.Model):
    """
    Brouillon serveur : payload JSON libre (pas de contraintes DB du rapport réel).
    Supprimé uniquement après création réussie d'un RapportIntervention (promouvoir).
    """

    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rapports_intervention_brouillons")
    payload = models.JSONField(default=dict, blank=True)
    champs_manquants = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Brouillon de rapport d'intervention"
        verbose_name_plural = "Brouillons de rapports d'intervention"

    def __str__(self):
        return f"Brouillon #{self.pk} — {self.created_by}"


def assign_numero_rapport_si_absent(rapport):
    """
    Attribue un numéro séquentiel pour l'année de rapport.date.
    Sans effet si déjà renseigné. À appeler après création en base (pk défini).
    """
    if rapport.numero_rapport is not None:
        return
    if not rapport.pk:
        return
    from django.db import transaction

    year = rapport.date.year
    with transaction.atomic():
        compteur, _ = RapportInterventionNumeroCompteur.objects.select_for_update().get_or_create(
            annee=year,
            defaults={'dernier_numero': 0},
        )
        compteur.dernier_numero += 1
        compteur.save(update_fields=['dernier_numero'])
        RapportIntervention.objects.filter(pk=rapport.pk).update(
            numero_rapport=compteur.dernier_numero,
            annee_numero_rapport=year,
        )
    rapport.numero_rapport = compteur.dernier_numero
    rapport.annee_numero_rapport = year


class PrestationRapport(models.Model):
    rapport = models.ForeignKey(
        RapportIntervention, on_delete=models.CASCADE, related_name='prestations'
    )
    localisation = models.CharField(max_length=500, verbose_name="Localisation")
    probleme = models.TextField(verbose_name="Problème constaté")
    solution = models.TextField(verbose_name="Solution")
    commentaire = models.TextField(blank=True, default='')
    prestation_possible = models.BooleanField(default=True, verbose_name="Prestation possible")
    prestation_realisee = models.TextField(blank=True, default='', verbose_name="Prestations réalisées")
    ordre = models.IntegerField(default=0)

    class Meta:
        ordering = ['ordre']
        verbose_name = "Prestation de rapport"
        verbose_name_plural = "Prestations de rapport"

    def __str__(self):
        return f"Prestation {self.ordre} - {self.localisation}"


class PhotoRapport(models.Model):
    TYPE_PHOTO_CHOICES = [
        ('avant', 'Avant travaux'),
        ('en_cours', 'En cours de travaux'),
        ('apres', 'Après travaux'),
    ]

    prestation = models.ForeignKey(
        PrestationRapport, on_delete=models.CASCADE, related_name='photos'
    )
    s3_key = models.CharField(max_length=500)
    filename = models.CharField(max_length=255)
    type_photo = models.CharField(max_length=20, choices=TYPE_PHOTO_CHOICES, default='avant')
    date_photo = models.DateField(default=datetime.date.today, verbose_name="Date de la photo")
    ordre = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['type_photo', 'ordre']
        verbose_name = "Photo de rapport"
        verbose_name_plural = "Photos de rapport"

    def __str__(self):
        return f"{self.get_type_photo_display()} - {self.filename}"
```

> **Dépendances implicites :** les FK `'Societe'`, `'Chantier'`, `'Devis'` pointent vers des modèles existants de l'app. Si `Devis` n'existe pas encore dans l'application cible, retirer temporairement la FK `devis_lie` (et les champs `devis_a_faire`, `devis_fait`) et tous les usages associés dans les serializers/vues.

### 4.2 `api/rapport_brouillon.py`

```python
"""
Utilitaires pour les brouillons de rapport (hors modèle RapportIntervention).
"""
from datetime import datetime


def compute_champs_manquants(payload):
    """
    Liste des clés de champs encore manquantes pour une validation finale
    (équivalent logique au RapportInterventionCreateSerializer hors statut brouillon).
    """
    if not isinstance(payload, dict):
        return ["payload"]

    missing = []
    p = payload
    type_rapport = p.get("type_rapport") or "intervention"

    dates = p.get("dates_intervention")
    has_date = False
    if isinstance(dates, list):
        for d in dates:
            if d and str(d).strip()[:10]:
                s = str(d).strip()[:10]
                try:
                    datetime.strptime(s, "%Y-%m-%d")
                    has_date = True
                    break
                except ValueError:
                    pass
    if not has_date:
        missing.append("dates_intervention")

    devis_a_faire = bool(p.get("devis_a_faire"))
    devis_fait = bool(p.get("devis_fait"))
    devis_lie = p.get("devis_lie")
    if devis_a_faire and devis_fait and not devis_lie:
        missing.append("devis_lie")

    if type_rapport == "vigik_plus":
        if not (p.get("adresse_vigik") or "").strip():
            missing.append("adresse_vigik")
        if p.get("presence_portail") is None:
            missing.append("presence_portail")
        if p.get("presence_portail") is True and p.get("presence_platine_portail") is None:
            missing.append("presence_platine_portail")
        return missing

    if not (p.get("technicien") or "").strip():
        missing.append("technicien")
    if not (p.get("objet_recherche") or "").strip():
        missing.append("objet_recherche")

    return missing
```

### 4.3 `api/rapport_brouillon_media.py`

Transfert des médias S3 du brouillon vers le rapport définitif lors de la promotion + enrichissement URLs présignées.

```python
"""
Médias brouillon (S3) : chemins dédiés, enrichissement URLs, transfert vers RapportIntervention à la promotion.
"""
import base64
import uuid
from datetime import date

from .models_rapport import PhotoRapport
from .utils import copy_s3_file, generate_presigned_url_for_display, get_s3_bucket_name, get_s3_client, is_s3_available


def _safe_presign(s3_key):
    if not s3_key:
        return None
    try:
        return generate_presigned_url_for_display(s3_key)
    except Exception:
        return None


def enrich_draft_media_with_presigned_urls(draft_media):
    """Ajoute des URLs présignées pour affichage client (GET brouillon)."""
    if not isinstance(draft_media, dict):
        return draft_media
    out = dict(draft_media)
    if out.get("signature_s3_key"):
        out["signature_presigned_url"] = _safe_presign(out["signature_s3_key"])
    plat_keys = out.get("photos_platine_s3_keys")
    if isinstance(plat_keys, list) and plat_keys:
        out["photo_platine_presigned_urls"] = [_safe_presign(k) for k in plat_keys if k]
    elif out.get("photo_platine_s3_key"):
        out["photo_platine_presigned_urls"] = [_safe_presign(out["photo_platine_s3_key"])]
        out["photo_platine_presigned_url"] = out["photo_platine_presigned_urls"][0]
    port_keys = out.get("photos_platine_portail_s3_keys")
    if isinstance(port_keys, list) and port_keys:
        out["photo_platine_portail_presigned_urls"] = [_safe_presign(k) for k in port_keys if k]
    elif out.get("photo_platine_portail_s3_key"):
        out["photo_platine_portail_presigned_urls"] = [_safe_presign(out["photo_platine_portail_s3_key"])]
        out["photo_platine_portail_presigned_url"] = out["photo_platine_portail_presigned_urls"][0]
    pp = out.get("prestation_photos")
    if isinstance(pp, dict):
        out_p = {}
        for idx_str, items in pp.items():
            if not isinstance(items, list):
                out_p[idx_str] = items
                continue
            out_p[idx_str] = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                row = dict(item)
                if row.get("s3_key"):
                    row["presigned_url"] = _safe_presign(row["s3_key"])
                out_p[idx_str].append(row)
        out["prestation_photos"] = out_p
    return out


def collect_s3_keys_from_draft_media(draft_media):
    """Liste toutes les clés S3 d'un _draft_media (pour suppression)."""
    keys = []
    if not isinstance(draft_media, dict):
        return keys
    sig = draft_media.get("signature_s3_key")
    if sig:
        keys.append(sig)
    for list_key in ("photos_platine_s3_keys", "photos_platine_portail_s3_keys"):
        lst = draft_media.get(list_key)
        if isinstance(lst, list):
            for v in lst:
                if v:
                    keys.append(v)
        elif list_key == "photos_platine_s3_keys" and draft_media.get("photo_platine_s3_key"):
            keys.append(draft_media["photo_platine_s3_key"])
        elif list_key == "photos_platine_portail_s3_keys" and draft_media.get("photo_platine_portail_s3_key"):
            keys.append(draft_media["photo_platine_portail_s3_key"])
    pp = draft_media.get("prestation_photos") or {}
    if isinstance(pp, dict):
        for items in pp.values():
            if not isinstance(items, list):
                continue
            for item in items:
                if isinstance(item, dict) and item.get("s3_key"):
                    keys.append(item["s3_key"])
    return keys


def delete_s3_keys(keys):
    if not keys or not is_s3_available():
        return
    s3 = get_s3_client()
    bucket = get_s3_bucket_name()
    for key in keys:
        if not key:
            continue
        try:
            s3.delete_object(Bucket=bucket, Key=key)
        except Exception:
            pass


def _parse_date_photo(val):
    if not val:
        return date.today()
    if hasattr(val, "year"):
        return val
    s = str(val).strip()[:10]
    try:
        y, m, d = [int(x) for x in s.split("-")]
        return date(y, m, d)
    except Exception:
        return date.today()


def _transfer_signature_base64(rapport, data_url):
    """Legacy : signature encore en data URL dans le payload."""
    if not data_url or not isinstance(data_url, str):
        return
    try:
        from .utils import get_s3_client, get_s3_bucket_name, is_s3_available

        if not is_s3_available():
            return
        payload = data_url.split(",", 1)[1] if "," in data_url else data_url
        image_bytes = base64.b64decode(payload)
        s3_key = f"rapports_intervention/signatures/signature_{rapport.id}_{uuid.uuid4().hex[:8]}.png"
        s3 = get_s3_client()
        bucket = get_s3_bucket_name()
        s3.put_object(Bucket=bucket, Key=s3_key, Body=image_bytes, ContentType="image/png")
        rapport.signature_s3_key = s3_key
        rapport.save(update_fields=["signature_s3_key"])
    except Exception:
        pass


def transfer_brouillon_media_to_rapport(brouillon_id, rapport, draft_media):
    """
    Copie les fichiers S3 du brouillon vers les chemins définitifs du rapport
    et crée les PhotoRapport. Gère aussi l'ancien format base64 (_draft_media v1).
    """
    if not draft_media or not isinstance(draft_media, dict):
        return

    rapport.refresh_from_db()
    if draft_media.get("signature_s3_key"):
        src = draft_media["signature_s3_key"]
        dest = f"rapports_intervention/signatures/signature_{rapport.id}_{uuid.uuid4().hex[:8]}.png"
        if copy_s3_file(src, dest):
            rapport.signature_s3_key = dest
            rapport.save(update_fields=["signature_s3_key"])
    elif draft_media.get("signature_draft_data_url"):
        _transfer_signature_base64(rapport, draft_media["signature_draft_data_url"])

    if rapport.type_rapport == "vigik_plus":
        plat_keys = draft_media.get("photos_platine_s3_keys")
        if not isinstance(plat_keys, list) or not plat_keys:
            legacy = draft_media.get("photo_platine_s3_key")
            plat_keys = [legacy] if legacy else []
        new_plat = []
        for pk_src in plat_keys:
            if not pk_src:
                continue
            ext = pk_src.split(".")[-1] if "." in pk_src else "jpg"
            dest = f"rapports_intervention/vigik_platine/rapport_{rapport.id}_{uuid.uuid4().hex[:8]}.{ext}"
            if copy_s3_file(pk_src, dest):
                new_plat.append(dest)
        if new_plat:
            rapport.photos_platine_s3_keys = new_plat
            rapport.save(update_fields=["photos_platine_s3_keys"])

        port_keys = draft_media.get("photos_platine_portail_s3_keys")
        if not isinstance(port_keys, list) or not port_keys:
            legacy2 = draft_media.get("photo_platine_portail_s3_key")
            port_keys = [legacy2] if legacy2 else []
        new_port = []
        for pk_src in port_keys:
            if not pk_src:
                continue
            ext = pk_src.split(".")[-1] if "." in pk_src else "jpg"
            dest = f"rapports_intervention/vigik_platine_portail/rapport_{rapport.id}_{uuid.uuid4().hex[:8]}.{ext}"
            if copy_s3_file(pk_src, dest):
                new_port.append(dest)
        if new_port:
            rapport.photos_platine_portail_s3_keys = new_port
            rapport.save(update_fields=["photos_platine_portail_s3_keys"])

    prestation_photos = draft_media.get("prestation_photos")
    if isinstance(prestation_photos, dict) and rapport.type_rapport != "vigik_plus":
        prestations = list(rapport.prestations.order_by("ordre"))
        for idx_str, items in prestation_photos.items():
            try:
                idx = int(idx_str)
            except (TypeError, ValueError):
                continue
            if idx < 0 or idx >= len(prestations):
                continue
            prestation = prestations[idx]
            if not isinstance(items, list):
                continue
            for meta in items:
                if not isinstance(meta, dict):
                    continue
                src = meta.get("s3_key")
                if not src:
                    continue
                type_photo = meta.get("type_photo") or "avant"
                ext = src.split(".")[-1] if "." in src else "jpg"
                dest = (
                    f"rapports_intervention/photos/rapport_{rapport.id}/prestation_{prestation.id}/"
                    f"{type_photo}_{uuid.uuid4().hex[:8]}.{ext}"
                )
                if not copy_s3_file(src, dest):
                    continue
                nb = PhotoRapport.objects.filter(prestation=prestation, type_photo=type_photo).count()
                PhotoRapport.objects.create(
                    prestation=prestation,
                    s3_key=dest,
                    filename=meta.get("filename") or "photo.jpg",
                    type_photo=type_photo,
                    date_photo=_parse_date_photo(meta.get("date_photo")),
                    ordre=nb,
                )

    keys_to_delete = collect_s3_keys_from_draft_media(draft_media)
    delete_s3_keys(keys_to_delete)
```

### 4.4 `api/serializers_rapport.py`

```python
from rest_framework import serializers
from .models_rapport import (
    TitreRapport,
    Residence,
    RapportIntervention,
    PrestationRapport,
    PhotoRapport,
    RapportInterventionBrouillon,
)
from .rapport_brouillon import compute_champs_manquants
from .rapport_brouillon_media import enrich_draft_media_with_presigned_urls
from .models import Societe, Chantier, Devis


def _is_vigik_plus(attrs):
    return attrs.get('type_rapport') == 'vigik_plus'


def _safe_delete_s3_key(key):
    if not key:
        return
    try:
        from .utils import get_s3_client, get_s3_bucket_name, is_s3_available
        if not is_s3_available():
            return
        get_s3_client().delete_object(Bucket=get_s3_bucket_name(), Key=key)
    except Exception:
        pass


def _normalize_vigik_portail_answers(validated_data, instance=None):
    """
    Vigik+ : sans portail, pas de réponse Ã‚Â« platine au portail Ã‚Â», mais des photos
    facultatives peuvent rester associées au rapport. Portail oui sans platine -> pas de photos portail.
    """
    type_r = validated_data.get('type_rapport')
    if type_r is None and instance is not None:
        type_r = instance.type_rapport
    if type_r != 'vigik_plus':
        return validated_data
    pp = validated_data.get('presence_portail')
    if pp is None and instance is not None:
        pp = instance.presence_portail
    if 'presence_platine_portail' in validated_data:
        ppp = validated_data.get('presence_platine_portail')
    elif instance is not None:
        ppp = instance.presence_platine_portail
    else:
        ppp = None

    if pp is False:
        validated_data['presence_platine_portail'] = None
    elif pp is True and ppp is False:
        validated_data['photos_platine_portail_s3_keys'] = []
    return validated_data


def _normalize_dates_intervention_attrs(attrs, instance=None):
    """Synchronise dates_intervention (liste ordonnée) et date (dernière date = tri / affichage court)."""
    from datetime import datetime
    from django.utils import timezone

    has_di = 'dates_intervention' in attrs
    has_single = 'date' in attrs

    if has_di:
        dates_intervention = attrs['dates_intervention']
        if dates_intervention is None:
            dates_intervention = []
        if not isinstance(dates_intervention, list):
            raise serializers.ValidationError(
                {'dates_intervention': 'Une liste de dates est attendue.'}
            )
        cleaned = []
        for d in dates_intervention:
            s = str(d).strip()[:10]
            if not s:
                continue
            try:
                datetime.strptime(s, '%Y-%m-%d')
            except ValueError:
                raise serializers.ValidationError(
                    {'dates_intervention': f'Date invalide : {d}'}
                )
            cleaned.append(s)
        if not cleaned:
            raise serializers.ValidationError(
                {'dates_intervention': "Au moins une date d'intervention est requise."}
            )
        attrs['dates_intervention'] = cleaned
        attrs['date'] = max(datetime.strptime(x, '%Y-%m-%d').date() for x in cleaned)
        return attrs

    if has_single and attrs.get('date') is not None:
        d = attrs['date']
        if hasattr(d, 'isoformat'):
            ds = d.isoformat()[:10]
            date_val = d
        else:
            ds = str(d)[:10]
            try:
                date_val = datetime.strptime(ds, '%Y-%m-%d').date()
            except ValueError:
                raise serializers.ValidationError({'date': 'Date invalide.'})
            attrs['date'] = date_val
        attrs['dates_intervention'] = [ds]
        return attrs

    if instance is None:
        today = timezone.now().date()
        attrs['dates_intervention'] = [today.isoformat()]
        attrs['date'] = today
    return attrs


class TitreRapportSerializer(serializers.ModelSerializer):
    class Meta:
        model = TitreRapport
        fields = ['id', 'nom', 'created_at']
        read_only_fields = ['created_at']


class ResidenceSerializer(serializers.ModelSerializer):
    client_societe_nom = serializers.SerializerMethodField()
    chantier_nom = serializers.SerializerMethodField()
    dernier_rapport = serializers.SerializerMethodField()

    class Meta:
        model = Residence
        fields = ['id', 'nom', 'adresse', 'client_societe', 'chantier',
                  'client_societe_nom', 'chantier_nom', 'dernier_rapport',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_client_societe_nom(self, obj):
        if obj.client_societe:
            return obj.client_societe.nom_societe
        return None

    def get_chantier_nom(self, obj):
        if obj.chantier:
            return obj.chantier.chantier_name
        return None

    def get_dernier_rapport(self, obj):
        dernier = obj.rapports.order_by('-created_at').select_related(
            'client_societe', 'chantier'
        ).first()
        if not dernier:
            return None
        return {
            'client_societe': dernier.client_societe_id,
            'client_societe_nom': dernier.client_societe.nom_societe if dernier.client_societe else None,
            'chantier': dernier.chantier_id,
            'chantier_nom': dernier.chantier.chantier_name if dernier.chantier else None,
            'technicien': dernier.technicien,
        }


class PhotoRapportSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = PhotoRapport
        fields = ['id', 'prestation', 's3_key', 'filename', 'type_photo', 'date_photo', 'ordre', 'created_at', 'image_url']
        read_only_fields = ['created_at', 'image_url']

    def get_image_url(self, obj):
        if obj.s3_key:
            try:
                from .utils import generate_presigned_url_for_display
                return generate_presigned_url_for_display(obj.s3_key, expires_in=3600)
            except Exception:
                return None
        return None


class PrestationRapportSerializer(serializers.ModelSerializer):
    photos = PhotoRapportSerializer(many=True, read_only=True)

    class Meta:
        model = PrestationRapport
        fields = [
            'id', 'rapport', 'localisation', 'probleme', 'solution',
            'commentaire', 'prestation_possible', 'prestation_realisee',
            'ordre', 'photos'
        ]
        read_only_fields = ['rapport']


class PrestationRapportWriteSerializer(serializers.ModelSerializer):
    """Serializer pour la creation/mise a jour de prestations (sans nested photos)."""
    id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = PrestationRapport
        fields = [
            'id', 'localisation', 'probleme', 'solution',
            'commentaire', 'prestation_possible', 'prestation_realisee', 'ordre'
        ]


class RapportInterventionSerializer(serializers.ModelSerializer):
    prestations = PrestationRapportSerializer(many=True, read_only=True)
    residence_data = ResidenceSerializer(source='residence', read_only=True)
    client_societe_nom = serializers.SerializerMethodField()
    client_societe_logo_url = serializers.SerializerMethodField()
    chantier_nom = serializers.SerializerMethodField()
    residence_nom = serializers.SerializerMethodField()
    residence_adresse = serializers.SerializerMethodField()
    signature_url = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()
    pdf_drive_url = serializers.SerializerMethodField()
    vigik_platine_photos = serializers.SerializerMethodField()
    vigik_platine_portail_photos = serializers.SerializerMethodField()
    devis_lie_numero = serializers.SerializerMethodField()
    devis_lie_preview_url = serializers.SerializerMethodField()

    class Meta:
        model = RapportIntervention
        fields = [
            'id', 'titre', 'date', 'dates_intervention', 'technicien', 'objet_recherche', 'resultat',
            'temps_trajet', 'temps_taches',
            'client_societe', 'chantier', 'residence', 'logement',
            'locataire_nom', 'locataire_prenom', 'locataire_telephone', 'locataire_email',
            'signature_s3_key', 'type_rapport', 'statut', 'devis_a_faire', 'devis_fait', 'devis_lie', 'pdf_s3_key',
            'adresse_vigik', 'numero_batiment', 'type_installation',
            'presence_platine', 'photos_platine_s3_keys',
            'presence_portail', 'presence_platine_portail', 'photos_platine_portail_s3_keys',
            'created_by', 'created_at', 'updated_at',
            'prestations', 'residence_data', 'residence_nom', 'residence_adresse',
            'client_societe_nom', 'client_societe_logo_url', 'chantier_nom',
            'signature_url', 'pdf_url', 'pdf_drive_url', 'vigik_platine_photos', 'vigik_platine_portail_photos',
            'devis_lie_numero', 'devis_lie_preview_url',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'signature_s3_key', 'pdf_s3_key']

    def get_client_societe_nom(self, obj):
        if obj.client_societe:
            return obj.client_societe.nom_societe
        return None

    def get_client_societe_logo_url(self, obj):
        if obj.client_societe and obj.client_societe.logo_s3_key:
            try:
                from .utils import generate_presigned_url_for_display
                return generate_presigned_url_for_display(obj.client_societe.logo_s3_key, expires_in=3600)
            except Exception:
                return None
        return None

    def get_chantier_nom(self, obj):
        if obj.chantier:
            return obj.chantier.chantier_name
        return None

    def get_residence_nom(self, obj):
        if obj.residence:
            return obj.residence.nom
        return None

    def get_residence_adresse(self, obj):
        if obj.residence:
            return obj.residence.adresse
        return None

    def get_signature_url(self, obj):
        if obj.signature_s3_key:
            try:
                from .utils import generate_presigned_url_for_display
                return generate_presigned_url_for_display(obj.signature_s3_key, expires_in=3600)
            except Exception:
                return None
        return None

    def get_pdf_url(self, obj):
        if obj.pdf_s3_key:
            try:
                from .utils import generate_presigned_url
                return generate_presigned_url('get_object', obj.pdf_s3_key, expires_in=3600)
            except Exception:
                return None
        return None

    def get_pdf_drive_url(self, obj):
        if obj.pdf_s3_key:
            return f"/drive-v2?path={obj.pdf_s3_key}&focus=file"
        return None

    def _vigik_photo_rows(self, keys):
        rows = []
        if not isinstance(keys, list):
            return rows
        from .utils import generate_presigned_url_for_display

        for k in keys:
            if not k or not isinstance(k, str):
                continue
            try:
                url = generate_presigned_url_for_display(k, expires_in=3600)
            except Exception:
                url = None
            rows.append({'s3_key': k, 'url': url})
        return rows

    def get_vigik_platine_photos(self, obj):
        return self._vigik_photo_rows(getattr(obj, 'photos_platine_s3_keys', None) or [])

    def get_vigik_platine_portail_photos(self, obj):
        return self._vigik_photo_rows(getattr(obj, 'photos_platine_portail_s3_keys', None) or [])

    def get_devis_lie_numero(self, obj):
        return obj.devis_lie.numero if obj.devis_lie else None

    def get_devis_lie_preview_url(self, obj):
        if not obj.devis_lie_id:
            return None
        return f"/api/preview-saved-devis-v2/{obj.devis_lie_id}/"


class RapportInterventionListSerializer(serializers.ModelSerializer):
    """Version legere pour les listes."""
    client_societe_nom = serializers.SerializerMethodField()
    chantier_nom = serializers.SerializerMethodField()
    titre_nom = serializers.SerializerMethodField()
    residence_nom = serializers.SerializerMethodField()
    residence_adresse = serializers.SerializerMethodField()
    nb_prestations = serializers.SerializerMethodField()
    devis_lie_numero = serializers.SerializerMethodField()
    devis_lie_preview_url = serializers.SerializerMethodField()

    class Meta:
        model = RapportIntervention
        fields = [
            'id', 'date', 'dates_intervention', 'titre', 'titre_nom', 'technicien',
            'temps_trajet', 'temps_taches',
            'client_societe', 'client_societe_nom', 'chantier', 'chantier_nom',
            'residence', 'residence_nom', 'residence_adresse', 'adresse_vigik', 'logement',
            'type_rapport', 'statut', 'devis_a_faire', 'devis_fait', 'devis_lie', 'devis_lie_numero', 'devis_lie_preview_url',
            'numero_batiment', 'type_installation',
            'presence_platine', 'presence_portail', 'presence_platine_portail',
            'created_at', 'updated_at', 'nb_prestations',
        ]

    def get_client_societe_nom(self, obj):
        if obj.client_societe:
            return obj.client_societe.nom_societe
        return None

    def get_chantier_nom(self, obj):
        if obj.chantier:
            return obj.chantier.chantier_name
        return None

    def get_titre_nom(self, obj):
        if obj.titre:
            return obj.titre.nom
        return None

    def get_residence_nom(self, obj):
        if obj.residence:
            return obj.residence.nom
        return None

    def get_residence_adresse(self, obj):
        if obj.residence:
            return obj.residence.adresse
        return None

    def get_nb_prestations(self, obj):
        c = getattr(obj, 'prestations_count', None)
        if c is not None:
            return c
        return obj.prestations.count()

    def get_devis_lie_numero(self, obj):
        return obj.devis_lie.numero if obj.devis_lie else None

    def get_devis_lie_preview_url(self, obj):
        if not obj.devis_lie_id:
            return None
        return f"/api/preview-saved-devis-v2/{obj.devis_lie_id}/"


class RapportInterventionCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la creation avec prestations nested."""
    titre = serializers.PrimaryKeyRelatedField(
        queryset=TitreRapport.objects.all(),
        required=False,
        allow_null=True,
    )
    objet_recherche = serializers.CharField(required=False, allow_blank=True)
    technicien = serializers.CharField(required=False, allow_blank=True)
    client_societe = serializers.PrimaryKeyRelatedField(
        queryset=Societe.objects.all(),
        required=False,
        allow_null=True,
    )
    chantier = serializers.PrimaryKeyRelatedField(
        queryset=Chantier.objects.all(),
        required=False,
        allow_null=True,
    )
    prestations = PrestationRapportWriteSerializer(many=True, required=False)
    residence_nom = serializers.CharField(write_only=True, required=False, allow_blank=True)
    residence_adresse = serializers.CharField(write_only=True, required=False, allow_blank=True)
    adresse_vigik = serializers.CharField(required=False, allow_blank=True)
    devis_lie = serializers.PrimaryKeyRelatedField(
        queryset=Devis.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = RapportIntervention
        fields = [
            'id', 'titre', 'date', 'dates_intervention', 'technicien', 'objet_recherche', 'resultat',
            'temps_trajet', 'temps_taches',
            'client_societe', 'chantier', 'residence', 'logement',
            'residence_nom', 'residence_adresse', 'adresse_vigik',
            'locataire_nom', 'locataire_prenom', 'locataire_telephone', 'locataire_email',
            'type_rapport', 'statut', 'devis_a_faire', 'devis_fait', 'devis_lie', 'prestations',
            'numero_batiment', 'type_installation',
            'presence_platine', 'presence_portail', 'presence_platine_portail',
        ]

    def _resolve_vigik_defaults(self, validated_data):
        """Pour Vigik+, champs absents du formulaire : appliquer des valeurs par défaut."""
        if validated_data.get('type_rapport') != 'vigik_plus':
            return validated_data
        titre = validated_data.get('titre')
        if titre is None or titre == '':
            titre_obj, _ = TitreRapport.objects.get_or_create(
                nom='Rapport Vigik+',
                defaults={}
            )
            validated_data['titre'] = titre_obj
        if not (validated_data.get('objet_recherche') or '').strip():
            validated_data['objet_recherche'] = 'Rapport système Vigik+'
        if not (validated_data.get('technicien') or '').strip():
            validated_data['technicien'] = '—'
        if validated_data.get('client_societe') is None or validated_data.get('client_societe') == '':
            validated_data['client_societe'] = None
        if validated_data.get('chantier') is None or validated_data.get('chantier') == '':
            validated_data['chantier'] = None
        if validated_data.get('resultat') is None:
            validated_data['resultat'] = ''
        if validated_data.get('logement') is None:
            validated_data['logement'] = ''
        if validated_data.get('locataire_nom') is None:
            validated_data['locataire_nom'] = ''
        if validated_data.get('locataire_prenom') is None:
            validated_data['locataire_prenom'] = ''
        if validated_data.get('locataire_telephone') is None:
            validated_data['locataire_telephone'] = ''
        if validated_data.get('locataire_email') is None:
            validated_data['locataire_email'] = ''
        if validated_data.get('adresse_vigik') is None:
            validated_data['adresse_vigik'] = ''
        return validated_data

    def validate(self, attrs):
        """Normalise dates d'intervention ; Vigik+ : adresse obligatoire ; sinon technicien et objet_recherche.
        Statut brouillon : champs assouplis pour sauvegarde auto sans tout remplir."""
        attrs.pop('photos_platine_s3_keys', None)
        attrs.pop('photos_platine_portail_s3_keys', None)
        attrs = _normalize_dates_intervention_attrs(attrs, instance=getattr(self, 'instance', None))
        instance = getattr(self, 'instance', None)

        merged = dict(attrs)
        if instance:
            for key in (
                'statut', 'type_rapport', 'technicien', 'objet_recherche', 'adresse_vigik',
                'devis_a_faire', 'devis_fait', 'devis_lie', 'chantier',
                'presence_portail', 'presence_platine', 'presence_platine_portail',
            ):
                if key not in merged:
                    merged[key] = getattr(instance, key)

        devis_a_faire = merged.get('devis_a_faire', False)
        devis_fait = merged.get('devis_fait', False)
        devis_lie = merged.get('devis_lie')
        chantier = merged.get('chantier')

        if not devis_a_faire:
            attrs['devis_fait'] = False
            attrs['devis_lie'] = None
        else:
            if devis_fait and not devis_lie:
                raise serializers.ValidationError({'devis_lie': "Un devis lié est requis quand le devis est marqué fait."})
            if devis_lie and chantier and devis_lie.chantier_id and devis_lie.chantier_id != chantier.id:
                raise serializers.ValidationError({'devis_lie': "Le devis lié doit appartenir au même chantier que le rapport."})

        statut_resolu = merged.get('statut')
        type_resolu = merged.get('type_rapport')

        if statut_resolu == 'brouillon':
            attrs = dict(attrs)
            if type_resolu == 'vigik_plus':
                pass
            else:
                if not (merged.get('technicien') or '').strip():
                    attrs['technicien'] = '—'
                if not (merged.get('objet_recherche') or '').strip():
                    attrs['objet_recherche'] = '—'
            return attrs

        if _is_vigik_plus(merged):
            if not (merged.get('adresse_vigik') or '').strip():
                raise serializers.ValidationError({'adresse_vigik': "L'adresse du rapport est obligatoire pour un rapport Vigik+."})
            if merged.get('presence_portail') is None:
                raise serializers.ValidationError({
                    'presence_portail': "Indiquez si un portail est présent sur le site.",
                })
            if merged.get('presence_portail') is True and merged.get('presence_platine_portail') is None:
                raise serializers.ValidationError({
                    'presence_platine_portail': "Indiquez si une platine Vigik+ est présente au portail.",
                })
            return attrs
        if 'technicien' in attrs and not (attrs.get('technicien') or '').strip():
            raise serializers.ValidationError({'technicien': 'Ce champ est obligatoire.'})
        if 'objet_recherche' in attrs and not (attrs.get('objet_recherche') or '').strip():
            raise serializers.ValidationError({'objet_recherche': 'Ce champ est obligatoire.'})
        return attrs

    def _resolve_residence(self, validated_data):
        """Get or create a Residence from nom/adresse if no FK provided. L'adresse Vigik+ reste sur le rapport (adresse_vigik), pas sur la résidence."""
        residence_nom = validated_data.pop('residence_nom', '').strip()
        residence_adresse = validated_data.pop('residence_adresse', '').strip()
        residence = validated_data.get('residence')

        if not residence and residence_nom:
            defaults = {'adresse': residence_adresse}
            client_societe = validated_data.get('client_societe')
            chantier = validated_data.get('chantier')
            if client_societe:
                defaults['client_societe'] = client_societe
            if chantier:
                defaults['chantier'] = chantier
            residence, _ = Residence.objects.get_or_create(
                nom=residence_nom, defaults=defaults
            )
            validated_data['residence'] = residence
        return validated_data

    def create(self, validated_data):
        prestations_data = validated_data.pop('prestations', [])
        validated_data = self._resolve_vigik_defaults(validated_data)
        validated_data = _normalize_vigik_portail_answers(validated_data, instance=None)
        validated_data = self._resolve_residence(validated_data)
        rapport = RapportIntervention.objects.create(**validated_data)
        for i, prestation_data in enumerate(prestations_data):
            prestation_data['ordre'] = prestation_data.get('ordre', i)
            PrestationRapport.objects.create(rapport=rapport, **prestation_data)
        return rapport

    def update(self, instance, validated_data):
        prestations_data = validated_data.pop('prestations', None)
        validated_data = self._resolve_vigik_defaults(validated_data)
        validated_data = _normalize_vigik_portail_answers(validated_data, instance=instance)
        new_pp = validated_data.get('photos_platine_portail_s3_keys')
        if new_pp is not None:
            old_pp = list(instance.photos_platine_portail_s3_keys or [])
            new_set = set(new_pp)
            for k in old_pp:
                if k and k not in new_set:
                    _safe_delete_s3_key(k)
        validated_data = self._resolve_residence(validated_data)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if prestations_data is not None:
            existing_ids = set(instance.prestations.values_list('id', flat=True))
            incoming_ids = set()

            for i, prestation_data in enumerate(prestations_data):
                prestation_id = prestation_data.pop('id', None) if isinstance(prestation_data, dict) else None
                prestation_data['ordre'] = prestation_data.get('ordre', i)

                if prestation_id and prestation_id in existing_ids:
                    PrestationRapport.objects.filter(id=prestation_id).update(**prestation_data)
                    incoming_ids.add(prestation_id)
                else:
                    new_prestation = PrestationRapport.objects.create(rapport=instance, **prestation_data)
                    incoming_ids.add(new_prestation.id)

            ids_to_delete = existing_ids - incoming_ids
            if ids_to_delete:
                PrestationRapport.objects.filter(id__in=ids_to_delete).delete()

        return instance


class RapportInterventionBrouillonListSerializer(serializers.ModelSerializer):
    """Ligne liste : champs alignés sur RapportInterventionListSerializer (depuis payload JSON)."""

    statut = serializers.SerializerMethodField()
    is_brouillon_serveur = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    dates_intervention = serializers.SerializerMethodField()
    titre = serializers.SerializerMethodField()
    titre_nom = serializers.SerializerMethodField()
    technicien = serializers.SerializerMethodField()
    client_societe = serializers.SerializerMethodField()
    client_societe_nom = serializers.SerializerMethodField()
    chantier = serializers.SerializerMethodField()
    chantier_nom = serializers.SerializerMethodField()
    residence = serializers.SerializerMethodField()
    residence_nom = serializers.SerializerMethodField()
    residence_adresse = serializers.SerializerMethodField()
    adresse_vigik = serializers.SerializerMethodField()
    logement = serializers.SerializerMethodField()
    type_rapport = serializers.SerializerMethodField()
    devis_a_faire = serializers.SerializerMethodField()
    devis_fait = serializers.SerializerMethodField()
    devis_lie = serializers.SerializerMethodField()
    devis_lie_numero = serializers.SerializerMethodField()
    devis_lie_preview_url = serializers.SerializerMethodField()
    nb_prestations = serializers.SerializerMethodField()

    class Meta:
        model = RapportInterventionBrouillon
        fields = [
            'id', 'date', 'dates_intervention', 'titre', 'titre_nom', 'technicien',
            'client_societe', 'client_societe_nom', 'chantier', 'chantier_nom',
            'residence', 'residence_nom', 'residence_adresse', 'adresse_vigik', 'logement',
            'type_rapport', 'statut', 'is_brouillon_serveur', 'devis_a_faire', 'devis_fait',
            'devis_lie', 'devis_lie_numero', 'devis_lie_preview_url',
            'created_at', 'updated_at', 'nb_prestations',
        ]

    def _p(self, obj):
        p = obj.payload
        return p if isinstance(p, dict) else {}

    def get_statut(self, obj):
        return 'brouillon_serveur'

    def get_is_brouillon_serveur(self, obj):
        return True

    def get_dates_intervention(self, obj):
        p = self._p(obj)
        di = p.get('dates_intervention')
        if isinstance(di, list) and di:
            return [str(x)[:10] for x in di if x]
        d = p.get('date')
        if d:
            return [str(d)[:10]]
        return []

    def get_date(self, obj):
        di = self.get_dates_intervention(obj)
        if not di:
            return None
        return max(di)

    def get_titre(self, obj):
        return self._p(obj).get('titre')

    def get_titre_nom(self, obj):
        tid = self._p(obj).get('titre')
        if not tid:
            return None
        t = TitreRapport.objects.filter(pk=tid).first()
        return t.nom if t else None

    def get_technicien(self, obj):
        return self._p(obj).get('technicien') or ''

    def get_client_societe(self, obj):
        return self._p(obj).get('client_societe')

    def get_client_societe_nom(self, obj):
        cid = self._p(obj).get('client_societe')
        if not cid:
            return None
        s = Societe.objects.filter(pk=cid).first()
        return s.nom_societe if s else None

    def get_chantier(self, obj):
        return self._p(obj).get('chantier')

    def get_chantier_nom(self, obj):
        cid = self._p(obj).get('chantier')
        if not cid:
            return None
        c = Chantier.objects.filter(pk=cid).first()
        return c.chantier_name if c else None

    def get_residence(self, obj):
        return self._p(obj).get('residence')

    def get_residence_nom(self, obj):
        p = self._p(obj)
        nom = p.get('residence_nom')
        if nom:
            return nom
        rid = p.get('residence')
        if not rid:
            return None
        res = Residence.objects.filter(pk=rid).first()
        return res.nom if res else None

    def get_residence_adresse(self, obj):
        p = self._p(obj)
        addr = p.get('residence_adresse')
        if addr:
            return addr
        rid = p.get('residence')
        if not rid:
            return None
        res = Residence.objects.filter(pk=rid).first()
        return res.adresse if res else None

    def get_adresse_vigik(self, obj):
        return self._p(obj).get('adresse_vigik') or ''

    def get_logement(self, obj):
        return self._p(obj).get('logement') or ''

    def get_type_rapport(self, obj):
        return self._p(obj).get('type_rapport') or 'intervention'

    def get_devis_a_faire(self, obj):
        return bool(self._p(obj).get('devis_a_faire'))

    def get_devis_fait(self, obj):
        return bool(self._p(obj).get('devis_fait'))

    def get_devis_lie(self, obj):
        return self._p(obj).get('devis_lie')

    def get_devis_lie_numero(self, obj):
        did = self._p(obj).get('devis_lie')
        if not did:
            return None
        d = Devis.objects.filter(pk=did).first()
        return d.numero if d else None

    def get_devis_lie_preview_url(self, obj):
        did = self._p(obj).get('devis_lie')
        if not did:
            return None
        return f'/api/preview-saved-devis-v2/{did}/'

    def get_nb_prestations(self, obj):
        pres = self._p(obj).get('prestations')
        if isinstance(pres, list):
            return len(pres)
        return 0


class RapportInterventionBrouillonSerializer(serializers.ModelSerializer):
    """Brouillon serveur : payload JSON aligné sur le corps du POST/PUT rapport (sans contraintes obligatoires)."""

    class Meta:
        model = RapportInterventionBrouillon
        fields = ["id", "payload", "champs_manquants", "created_at", "updated_at"]
        read_only_fields = ["champs_manquants", "created_at", "updated_at"]

    def validate_payload(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("Le payload doit être un objet JSON.")
        return value

    def create(self, validated_data):
        validated_data["champs_manquants"] = compute_champs_manquants(validated_data.get("payload") or {})
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "payload" in validated_data:
            validated_data["champs_manquants"] = compute_champs_manquants(validated_data.get("payload") or {})
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        p = ret.get("payload")
        if isinstance(p, dict) and p.get("_draft_media"):
            p = dict(p)
            p["_draft_media"] = enrich_draft_media_with_presigned_urls(p["_draft_media"])
            ret["payload"] = p
        return ret
```

### 4.5 `api/views_rapport.py`

```python
import json
import os
import subprocess
import tempfile
import uuid
import base64
import traceback
from django.db import transaction
from django.db.models import Count
from django.http import JsonResponse, HttpResponse
from rest_framework import viewsets, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models_rapport import (
    TitreRapport,
    Residence,
    RapportIntervention,
    PrestationRapport,
    PhotoRapport,
    RapportInterventionBrouillon,
    assign_numero_rapport_si_absent,
)
from .rapport_brouillon_media import (
    collect_s3_keys_from_draft_media,
    delete_s3_keys,
    transfer_brouillon_media_to_rapport,
)
from .serializers_rapport import (
    TitreRapportSerializer,
    ResidenceSerializer,
    RapportInterventionSerializer,
    RapportInterventionListSerializer,
    RapportInterventionCreateSerializer,
    RapportInterventionBrouillonSerializer,
    RapportInterventionBrouillonListSerializer,
    PrestationRapportSerializer,
    PrestationRapportWriteSerializer,
    PhotoRapportSerializer,
)


def _societe_pour_rapport(rapport):
    """Société client / bailleur : celle du rapport si renseignée, sinon celle du chantier."""
    if rapport.client_societe_id:
        return rapport.client_societe
    if rapport.chantier_id and rapport.chantier.societe_id:
        return rapport.chantier.societe
    return None


def _intervention_date_rows_for_template(rapport):
    """Lignes Date / Passage 2 / Passage 3 pour les templates PDF (dates formatées jj/mm/aaaa)."""
    from datetime import datetime

    rows = []
    raw = getattr(rapport, 'dates_intervention', None) or []
    if isinstance(raw, list) and raw:
        for i, ds in enumerate(raw):
            if not ds:
                continue
            s = str(ds).strip()[:10]
            try:
                dt = datetime.strptime(s, '%Y-%m-%d').date()
                formatted = dt.strftime('%d/%m/%Y')
            except ValueError:
                formatted = s
            if i == 0:
                label = 'Date'
            else:
                label = f'Passage {i + 1}'
            rows.append({'label': label, 'value': formatted})
    if not rows and getattr(rapport, 'date', None):
        rows.append({
            'label': 'Date',
            'value': rapport.date.strftime('%d/%m/%Y'),
        })
    return rows


def _format_societe_adresse(societe):
    """Adresse postale depuis le modèle Societe : rue_societe, codepostal_societe, ville_societe."""
    if not societe:
        return ""
    rue = (getattr(societe, "rue_societe", None) or "").strip()
    cp = getattr(societe, "codepostal_societe", None)
    cp_str = str(cp).strip() if cp not in (None, "") else ""
    ville = (getattr(societe, "ville_societe", None) or "").strip()
    lines = []
    if rue:
        lines.append(rue)
    ligne2 = " ".join(p for p in (cp_str, ville) if p).strip()
    if ligne2:
        lines.append(ligne2)
    return "\n".join(lines)


def _format_heures_hhmm(value):
    """Convertit un nombre d'heures (float) en format h:mm."""
    try:
        total_minutes = int(round(float(value or 0) * 60))
    except (TypeError, ValueError):
        total_minutes = 0
    if total_minutes < 0:
        total_minutes = 0
    heures = total_minutes // 60
    minutes = total_minutes % 60
    return f"{heures}:{minutes:02d}"


def _build_temps_intervention_for_template(rapport):
    """Prépare les temps (trajet, tâches, prestation) formatés pour le template PDF."""
    try:
        temps_trajet = float(getattr(rapport, 'temps_trajet', 0) or 0)
    except (TypeError, ValueError):
        temps_trajet = 0.0
    try:
        temps_taches = float(getattr(rapport, 'temps_taches', 0) or 0)
    except (TypeError, ValueError):
        temps_taches = 0.0

    temps_trajet = max(0.0, temps_trajet)
    temps_taches = max(0.0, temps_taches)
    total = temps_trajet + temps_taches

    return {
        'has_temps_intervention': total > 0,
        'temps_trajet_hhmm': _format_heures_hhmm(temps_trajet),
        'temps_taches_hhmm': _format_heures_hhmm(temps_taches),
        'temps_prestation_hhmm': _format_heures_hhmm(total),
    }


class RapportInterventionPagination(PageNumberPagination):
    """Liste paginée : moins de données par requête, chargement plus rapide."""

    page_size = 30
    page_size_query_param = "page_size"
    max_page_size = 200


class TitreRapportViewSet(viewsets.ModelViewSet):
    queryset = TitreRapport.objects.all()
    serializer_class = TitreRapportSerializer
    permission_classes = [IsAuthenticated]


class ResidenceViewSet(viewsets.ModelViewSet):
    serializer_class = ResidenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Residence.objects.select_related('client_societe', 'chantier')
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(nom__icontains=search)
        client_societe = self.request.query_params.get('client_societe')
        if client_societe:
            qs = qs.filter(client_societe_id=client_societe)
        chantier = self.request.query_params.get('chantier')
        if chantier:
            qs = qs.filter(chantier_id=chantier)
        return qs


class RapportInterventionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = RapportInterventionPagination

    def get_queryset(self):
        qs = RapportIntervention.objects.select_related(
            'titre', 'client_societe', 'chantier', 'residence', 'created_by'
        )
        action = getattr(self, 'action', None)
        if action == 'list':
            qs = qs.annotate(prestations_count=Count('prestations', distinct=True))
        else:
            qs = qs.prefetch_related('prestations__photos')

        chantier_id = self.request.query_params.get('chantier')
        if chantier_id:
            qs = qs.filter(chantier_id=chantier_id)

        technicien = self.request.query_params.get('technicien')
        if technicien:
            qs = qs.filter(technicien__icontains=technicien)

        client_societe_id = self.request.query_params.get('client_societe')
        if client_societe_id:
            qs = qs.filter(client_societe_id=client_societe_id)

        residence_id = self.request.query_params.get('residence')
        if residence_id:
            qs = qs.filter(residence_id=residence_id)

        logement = self.request.query_params.get('logement')
        if logement:
            qs = qs.filter(logement__icontains=logement)

        type_rapport = self.request.query_params.get('type_rapport')
        if type_rapport:
            qs = qs.filter(type_rapport=type_rapport)

        devis_a_faire = self.request.query_params.get('devis_a_faire')
        if devis_a_faire is not None and str(devis_a_faire).strip() != '':
            val = str(devis_a_faire).strip().lower()
            qs = qs.filter(devis_a_faire=val in ('1', 'true', 'yes'))

        devis_fait = self.request.query_params.get('devis_fait')
        if devis_fait is not None and str(devis_fait).strip() != '':
            val = str(devis_fait).strip().lower()
            qs = qs.filter(devis_fait=val in ('1', 'true', 'yes'))

        date_creation = self.request.query_params.get('date_creation')
        if date_creation:
            qs = qs.filter(created_at__date=date_creation)

        sans_chantier = self.request.query_params.get('sans_chantier', '').lower()
        if sans_chantier in ('1', 'true', 'yes'):
            qs = qs.filter(chantier__isnull=True)

        exclude_term = self.request.query_params.get('exclude_statut_termine', '').lower()
        if exclude_term in ('1', 'true', 'yes'):
            qs = qs.exclude(statut='termine')

        if action == 'list':
            ordering = (self.request.query_params.get('ordering') or '-date').strip()
            if ordering == 'date':
                qs = qs.order_by('date', 'id')
            elif ordering == '-date':
                qs = qs.order_by('-date', '-id')
            else:
                qs = qs.order_by('-date', '-id')

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return RapportInterventionListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return RapportInterventionCreateSerializer
        return RapportInterventionSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        assign_numero_rapport_si_absent(serializer.instance)

    @action(detail=True, methods=['post'])
    def lier_chantier(self, request, pk=None):
        rapport = self.get_object()
        chantier_id = request.data.get('chantier_id')
        if not chantier_id:
            return Response({'error': 'chantier_id requis'}, status=status.HTTP_400_BAD_REQUEST)

        from .models import Chantier
        try:
            chantier = Chantier.objects.get(id=chantier_id)
        except Chantier.DoesNotExist:
            return Response({'error': 'Chantier introuvable'}, status=status.HTTP_404_NOT_FOUND)

        rapport.chantier = chantier
        rapport.save()
        serializer = RapportInterventionSerializer(rapport)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def upload_signature(self, request, pk=None):
        rapport = self.get_object()
        signature_data = request.data.get('signature')
        if not signature_data:
            return Response({'error': 'signature requise (base64)'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display
            if not is_s3_available():
                return Response({'error': 'S3 non disponible'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            if ',' in signature_data:
                signature_data = signature_data.split(',')[1]

            image_bytes = base64.b64decode(signature_data)
            s3_key = f"rapports_intervention/signatures/signature_{rapport.id}_{uuid.uuid4().hex[:8]}.png"

            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=image_bytes,
                ContentType='image/png'
            )

            rapport.signature_s3_key = s3_key
            rapport.save()

            return Response({
                'success': True,
                's3_key': s3_key,
                'signature_url': generate_presigned_url_for_display(s3_key),
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def upload_photo(self, request):
        prestation_id = request.data.get('prestation_id')
        type_photo = request.data.get('type_photo', 'avant')
        date_photo = request.data.get('date_photo')
        file = request.FILES.get('photo')

        if not prestation_id or not file:
            return Response(
                {'error': 'prestation_id et photo requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            prestation = PrestationRapport.objects.get(id=prestation_id)
        except PrestationRapport.DoesNotExist:
            return Response({'error': 'Prestation introuvable'}, status=status.HTTP_404_NOT_FOUND)

        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display
            if not is_s3_available():
                return Response({'error': 'S3 non disponible'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
            s3_key = f"rapports_intervention/photos/rapport_{prestation.rapport_id}/prestation_{prestation_id}/{type_photo}_{uuid.uuid4().hex[:8]}.{ext}"

            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or 'image/jpeg'
            )

            nb_photos = PhotoRapport.objects.filter(prestation=prestation, type_photo=type_photo).count()
            create_kwargs = dict(
                prestation=prestation,
                s3_key=s3_key,
                filename=file.name,
                type_photo=type_photo,
                ordre=nb_photos,
            )
            if date_photo:
                create_kwargs['date_photo'] = date_photo
            photo = PhotoRapport.objects.create(**create_kwargs)

            return Response({
                'success': True,
                'photo': PhotoRapportSerializer(photo).data,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['patch'], url_path='update_photo/(?P<photo_id>[0-9]+)')
    def update_photo(self, request, photo_id=None):
        try:
            photo = PhotoRapport.objects.get(id=photo_id)
        except PhotoRapport.DoesNotExist:
            return Response({'error': 'Photo introuvable'}, status=status.HTTP_404_NOT_FOUND)

        date_photo = request.data.get('date_photo')
        if date_photo:
            photo.date_photo = date_photo

        type_photo = request.data.get('type_photo')
        if type_photo:
            photo.type_photo = type_photo

        photo.save()
        return Response({'success': True, 'photo': PhotoRapportSerializer(photo).data})

    @action(detail=False, methods=['delete'], url_path='delete_photo/(?P<photo_id>[0-9]+)')
    def delete_photo(self, request, photo_id=None):
        try:
            photo = PhotoRapport.objects.get(id=photo_id)
        except PhotoRapport.DoesNotExist:
            return Response({'error': 'Photo introuvable'}, status=status.HTTP_404_NOT_FOUND)

        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available
            if is_s3_available() and photo.s3_key:
                s3_client = get_s3_client()
                bucket_name = get_s3_bucket_name()
                s3_client.delete_object(Bucket=bucket_name, Key=photo.s3_key)
        except Exception:
            pass

        photo.delete()
        return Response({'success': True}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def upload_photo_platine(self, request):
        """Ajoute une photo platine (Vigik+) — plusieurs fichiers possibles."""
        rapport_id = request.data.get('rapport_id')
        file = request.FILES.get('photo')
        if not rapport_id or not file:
            return Response(
                {'error': 'rapport_id et photo requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            rapport = RapportIntervention.objects.get(id=rapport_id)
        except RapportIntervention.DoesNotExist:
            return Response({'error': 'Rapport introuvable'}, status=status.HTTP_404_NOT_FOUND)
        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display
            if not is_s3_available():
                return Response({'error': 'S3 non disponible'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
            s3_key = f"rapports_intervention/vigik_platine/rapport_{rapport_id}_{uuid.uuid4().hex[:8]}.{ext}"
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or 'image/jpeg'
            )
            keys = list(rapport.photos_platine_s3_keys or [])
            keys.append(s3_key)
            rapport.photos_platine_s3_keys = keys
            rapport.save(update_fields=['photos_platine_s3_keys', 'updated_at'])
            return Response({
                'success': True,
                's3_key': s3_key,
                'photo_platine_url': generate_presigned_url_for_display(s3_key),
                'photos_platine_s3_keys': keys,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def upload_photo_platine_portail(self, request):
        """Ajoute une photo platine portail (Vigik+) — plusieurs fichiers possibles."""
        rapport_id = request.data.get('rapport_id')
        file = request.FILES.get('photo')
        if not rapport_id or not file:
            return Response(
                {'error': 'rapport_id et photo requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            rapport = RapportIntervention.objects.get(id=rapport_id)
        except RapportIntervention.DoesNotExist:
            return Response({'error': 'Rapport introuvable'}, status=status.HTTP_404_NOT_FOUND)
        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display
            if not is_s3_available():
                return Response({'error': 'S3 non disponible'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            ext = file.name.split('.')[-1] if '.' in file.name else 'jpg'
            s3_key = f"rapports_intervention/vigik_platine_portail/rapport_{rapport_id}_{uuid.uuid4().hex[:8]}.{ext}"
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or 'image/jpeg'
            )
            keys = list(rapport.photos_platine_portail_s3_keys or [])
            keys.append(s3_key)
            rapport.photos_platine_portail_s3_keys = keys
            rapport.save(update_fields=['photos_platine_portail_s3_keys', 'updated_at'])
            return Response({
                'success': True,
                's3_key': s3_key,
                'photo_platine_portail_url': generate_presigned_url_for_display(s3_key),
                'photos_platine_portail_s3_keys': keys,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def delete_photo_vigik(self, request):
        """Retire une photo Vigik+ (platine ou portail) du rapport et supprime l'objet S3."""
        rapport_id = request.data.get('rapport_id')
        s3_key = (request.data.get('s3_key') or '').strip()
        question = (request.data.get('question') or '').strip().lower()
        if not rapport_id or not s3_key or question not in ('platine', 'portail'):
            return Response(
                {'error': 'rapport_id, s3_key et question (platine|portail) requis'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            rapport = RapportIntervention.objects.get(id=rapport_id)
        except RapportIntervention.DoesNotExist:
            return Response({'error': 'Rapport introuvable'}, status=status.HTTP_404_NOT_FOUND)
        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available
            attr = 'photos_platine_s3_keys' if question == 'platine' else 'photos_platine_portail_s3_keys'
            keys = list(getattr(rapport, attr) or [])
            if s3_key not in keys:
                return Response({'error': 'Clé absente du rapport'}, status=status.HTTP_404_NOT_FOUND)
            keys = [k for k in keys if k != s3_key]
            setattr(rapport, attr, keys)
            rapport.save(update_fields=[attr, 'updated_at'])
            if is_s3_available():
                try:
                    get_s3_client().delete_object(Bucket=get_s3_bucket_name(), Key=s3_key)
                except Exception:
                    pass
            return Response({'success': True, attr: keys}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        rapport = self.get_object()
        rapport.statut = 'en_cours'
        rapport.save()

        pdf_result = _generate_rapport_pdf(rapport, request)
        if pdf_result.get('success'):
            rapport.pdf_s3_key = pdf_result.get('s3_file_path', '')
            rapport.save()

        serializer = RapportInterventionSerializer(rapport)
        return Response({
            'rapport': serializer.data,
            'pdf': pdf_result,
        })

    @action(detail=True, methods=['post'])
    def generer_pdf(self, request, pk=None):
        rapport = self.get_object()
        pdf_result = _generate_rapport_pdf(rapport, request)
        if pdf_result.get('success'):
            rapport.pdf_s3_key = pdf_result.get('s3_file_path', '')
            rapport.save()
        return Response(pdf_result)


def _generate_rapport_pdf(rapport, request):
    """Genere le PDF du rapport via Puppeteer et le stocke dans S3.
    - Si le rapport est lie a un chantier : Chemin du chantier / dossier RAPPORT
    - Sinon : Racine du drive / dossier RAPPORT D'INTERVENTIONS
    - A la regeneration : remplace le document existant (force_replace)
    """
    try:
        from .pdf_manager import PDFManager
        from .utils import create_s3_folder_recursive
        from .utils import get_s3_client, get_s3_bucket_name, is_s3_available

        pdf_manager = PDFManager()
        preview_url = request.build_absolute_uri(
            f"/api/preview-rapport-intervention/{rapport.id}/"
        )

        societe_name = rapport.client_societe.nom_societe if rapport.client_societe else "Sans_Societe"
        safe = lambda s: "".join(c for c in (s or "") if c.isalnum() or c in " -_(),.'").strip() or "N-A"

        if rapport.type_rapport == 'vigik_plus':
            residence_nom = (rapport.residence.nom if rapport.residence and rapport.residence.nom else "Sans residence").strip()
            adresse = (getattr(rapport, 'adresse_vigik', None) or "").strip()
            if not adresse and rapport.residence and rapport.residence.adresse:
                adresse = rapport.residence.adresse.strip()
            numero_batiment = (getattr(rapport, 'numero_batiment', None) or "").strip()
            custom_path = f"RAPPORT D'INTERVENTION/VIGIK+/{safe(residence_nom)}"
            custom_filename = f"Vigik+ {safe(adresse)} {safe(numero_batiment)}.pdf"
        else:
            custom_path = ""
            if rapport.chantier:
                base_path = rapport.chantier.get_drive_path()
                if base_path:
                    custom_path = f"Chantiers/{base_path.strip('/')}/RAPPORT"

            if not custom_path:
                custom_path = "RAPPORT D'INTERVENTIONS"

            residence_nom = (rapport.residence.nom if rapport.residence and rapport.residence.nom else "Sans residence").strip()
            logement = (rapport.logement or "").strip() or "Sans logement"
            residence_nom = safe(residence_nom)
            logement = safe(logement)
            custom_filename = f"Rapport ({residence_nom}) {logement}.pdf"

        create_s3_folder_recursive(custom_path)
        filename = custom_filename

        pdf_kwargs = {
            'custom_path': custom_path,
            'custom_filename': filename,
        }
        if rapport.type_rapport == 'vigik_plus':
            pdf_kwargs['custom_path_is_full'] = True
        success, message, s3_path, conflict = pdf_manager.generate_andStore_pdf(
            document_type='rapport_intervention',
            preview_url=preview_url,
            societe_name=societe_name,
            force_replace=True,
            **pdf_kwargs,
        )

        if success:
            old_key = getattr(rapport, 'pdf_s3_key', None) or ""
            if old_key and old_key != s3_path and is_s3_available():
                try:
                    s3_client = get_s3_client()
                    bucket = get_s3_bucket_name()
                    s3_client.delete_object(Bucket=bucket, Key=old_key)
                except Exception:
                    pass

            return {
                'success': True,
                'message': 'PDF genere avec succes',
                's3_file_path': s3_path,
                'drive_url': f"/drive-v2?path={s3_path}&focus=file",
            }
        else:
            return {'success': False, 'error': message}
    except Exception as e:
        return {'success': False, 'error': str(e)}


@api_view(['GET'])
@permission_classes([AllowAny])
def preview_rapport_intervention(request, rapport_id):
    """Vue de previsualisation HTML pour la generation PDF via Puppeteer."""
    try:
        rapport = RapportIntervention.objects.select_related(
            'titre', 'client_societe', 'chantier', 'chantier__societe', 'residence'
        ).prefetch_related('prestations__photos').get(id=rapport_id)
    except RapportIntervention.DoesNotExist:
        return JsonResponse({'error': 'Rapport introuvable'}, status=404)

    assign_numero_rapport_si_absent(rapport)
    rapport.refresh_from_db(fields=['numero_rapport', 'annee_numero_rapport'])

    from .utils import generate_presigned_url_for_display

    logo_url = ""
    logo_s3_key = None
    if rapport.client_societe and rapport.client_societe.logo_s3_key:
        logo_s3_key = rapport.client_societe.logo_s3_key
    elif rapport.chantier and rapport.chantier.societe and rapport.chantier.societe.logo_s3_key:
        logo_s3_key = rapport.chantier.societe.logo_s3_key
    if logo_s3_key:
        try:
            logo_url = generate_presigned_url_for_display(logo_s3_key)
        except Exception:
            pass

    signature_url = ""
    if rapport.signature_s3_key:
        try:
            signature_url = generate_presigned_url_for_display(rapport.signature_s3_key)
        except Exception:
            pass

    prestations_data = []
    for prestation in rapport.prestations.all():
        photos_by_type = {'avant': [], 'en_cours': [], 'apres': []}
        for photo in prestation.photos.all():
            try:
                url = generate_presigned_url_for_display(photo.s3_key)
                photos_by_type[photo.type_photo].append({
                    'url': url,
                    'filename': photo.filename,
                    'date_photo': photo.date_photo,
                })
            except Exception:
                pass
        prestations_data.append({
            'prestation': prestation,
            'photos_by_type': photos_by_type,
        })

    societe = _societe_pour_rapport(rapport)
    societe_nom = societe.nom_societe if societe else ""
    societe_adresse = _format_societe_adresse(societe)
    intervention_date_rows = _intervention_date_rows_for_template(rapport)
    temps_ctx = _build_temps_intervention_for_template(rapport)

    photo_platine_urls = []
    photo_platine_portail_urls = []
    if rapport.type_rapport == 'vigik_plus':
        for k in rapport.photos_platine_s3_keys or []:
            if not k:
                continue
            try:
                photo_platine_urls.append(generate_presigned_url_for_display(k))
            except Exception:
                pass
        for k in rapport.photos_platine_portail_s3_keys or []:
            if not k:
                continue
            try:
                photo_platine_portail_urls.append(generate_presigned_url_for_display(k))
            except Exception:
                pass

    from django.shortcuts import render
    if rapport.type_rapport == 'vigik_plus':
        return render(request, 'rapport_vigik_plus.html', {
            'rapport': rapport,
            'logo_url': logo_url,
            'societe_nom': societe_nom,
            'societe_adresse': societe_adresse,
            'signature_url': signature_url,
            'photo_platine_urls': photo_platine_urls,
            'photo_platine_portail_urls': photo_platine_portail_urls,
            'intervention_date_rows': intervention_date_rows,
        })
    return render(request, 'rapport_intervention.html', {
        'rapport': rapport,
        'logo_url': logo_url,
        'societe_nom': societe_nom,
        'societe_adresse': societe_adresse,
        'signature_url': signature_url,
        'prestations_data': prestations_data,
        'intervention_date_rows': intervention_date_rows,
        **temps_ctx,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_rapport_intervention_pdf(request):
    """Génère le PDF du rapport d'intervention et le renvoie en téléchargement (navigateur)."""
    temp_pdf_path = None
    try:
        data = json.loads(request.body)
        rapport_id = data.get('rapport_id')
        if not rapport_id:
            return JsonResponse({'error': 'ID du rapport manquant'}, status=400)

        preview_url = request.build_absolute_uri(f"/api/preview-rapport-intervention/{rapport_id}/")
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        node_script_path = os.path.join(base_dir, 'frontend', 'src', 'components', 'generate_pdf.js')

        if not os.path.exists(node_script_path):
            return JsonResponse({'error': f'Script Node.js introuvable: {node_script_path}'}, status=500)

        node_paths = ['node', '/usr/bin/node', '/usr/local/bin/node', '/opt/nodejs/bin/node']
        node_path = 'node'
        for np in node_paths:
            try:
                subprocess.run([np, '--version'], check=True, capture_output=True, text=True)
                node_path = np
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue

        temp_pdf = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
        temp_pdf_path = temp_pdf.name
        temp_pdf.close()

        command = [node_path, node_script_path, preview_url, temp_pdf_path]
        subprocess.run(command, check=True, capture_output=True, text=True, timeout=60)

        if not os.path.exists(temp_pdf_path):
            return JsonResponse({'error': 'Le fichier PDF n\'a pas été généré.'}, status=500)

        rapport = RapportIntervention.objects.select_related('residence').get(pk=rapport_id)
        residence_nom = (rapport.residence.nom if rapport.residence and rapport.residence.nom else "Sans residence").strip()
        logement = (rapport.logement or "").strip() or "Sans logement"
        safe = lambda s: "".join(c for c in s if c.isalnum() or c in " -_(),.'").strip() or "N-A"
        residence_nom = safe(residence_nom)
        logement = safe(logement)
        filename = f"Rapport ({residence_nom}) {logement}.pdf"

        with open(temp_pdf_path, 'rb') as pdf_file:
            response = HttpResponse(pdf_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Données JSON invalides'}, status=400)
    except subprocess.CalledProcessError as e:
        return JsonResponse({'error': f'Erreur génération PDF: {e.stderr or str(e)}'}, status=500)
    except subprocess.TimeoutExpired:
        return JsonResponse({'error': 'Timeout lors de la génération du PDF (60 s)'}, status=500)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    finally:
        if temp_pdf_path and os.path.exists(temp_pdf_path):
            try:
                os.unlink(temp_pdf_path)
            except OSError:
                pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_rapport_intervention_pdf_drive(request):
    """Régénère le PDF du rapport d'intervention et le stocke dans le Drive (S3)."""
    rapport_id = request.query_params.get('rapport_id')
    if not rapport_id:
        return JsonResponse({'error': 'rapport_id requis'}, status=400)
    try:
        rapport = RapportIntervention.objects.select_related('chantier', 'residence', 'client_societe').get(pk=rapport_id)
    except RapportIntervention.DoesNotExist:
        return JsonResponse({'error': 'Rapport introuvable'}, status=404)
    pdf_result = _generate_rapport_pdf(rapport, request)
    if pdf_result.get('success'):
        rapport.pdf_s3_key = pdf_result.get('s3_file_path', '')
        rapport.save()
    status_code = 200 if pdf_result.get('success') else 400
    return JsonResponse(pdf_result, status=status_code)


class RapportInterventionBrouillonViewSet(viewsets.ModelViewSet):
    """
    Brouillons serveur (JSON). CRUD limité au propriétaire.
    promouvoir : crée un RapportIntervention valide puis supprime le brouillon (transaction atomique).
    """

    serializer_class = RapportInterventionBrouillonSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        if self.action == 'list':
            return RapportInterventionBrouillonListSerializer
        return RapportInterventionBrouillonSerializer

    def get_queryset(self):
        return RapportInterventionBrouillon.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_destroy(self, instance):
        dm = (instance.payload or {}).get("_draft_media")
        if dm:
            delete_s3_keys(collect_s3_keys_from_draft_media(dm))
        instance.delete()

    @action(detail=True, methods=["post"])
    def upload_photo(self, request, pk=None):
        """Photo prestation (brouillon) → S3 sous rapports_intervention/brouillons/{id}/…"""
        brouillon = self.get_object()
        try:
            prestation_index = int(request.data.get("prestation_index", 0))
        except (TypeError, ValueError):
            return Response({"error": "prestation_index invalide"}, status=status.HTTP_400_BAD_REQUEST)
        type_photo = request.data.get("type_photo", "avant")
        date_photo = request.data.get("date_photo")
        file = request.FILES.get("photo")
        if not file:
            return Response({"error": "photo requise"}, status=status.HTTP_400_BAD_REQUEST)
        brouillon_id = brouillon.pk
        ext = file.name.split(".")[-1] if "." in file.name else "jpg"
        s3_key = (
            f"rapports_intervention/brouillons/{brouillon_id}/p{prestation_index}/"
            f"{type_photo}_{uuid.uuid4().hex[:8]}.{ext}"
        )
        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display
            if not is_s3_available():
                return Response({"error": "S3 non disponible"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or "image/jpeg",
            )
            presigned_url = None
            try:
                presigned_url = generate_presigned_url_for_display(s3_key)
            except Exception:
                pass
            return Response(
                {
                    "success": True,
                    "s3_key": s3_key,
                    "type_photo": type_photo,
                    "prestation_index": prestation_index,
                    "filename": file.name,
                    "date_photo": date_photo,
                    "presigned_url": presigned_url,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def upload_signature(self, request, pk=None):
        brouillon = self.get_object()
        signature_data = request.data.get("signature")
        if not signature_data:
            return Response({"error": "signature requise (base64)"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display
            if not is_s3_available():
                return Response({"error": "S3 non disponible"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            if "," in signature_data:
                signature_data = signature_data.split(",", 1)[1]
            image_bytes = base64.b64decode(signature_data)
            s3_key = f"rapports_intervention/brouillons/{brouillon.pk}/signature_{uuid.uuid4().hex[:8]}.png"
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            p = brouillon.payload or {}
            dm = p.get("_draft_media") or {}
            old = dm.get("signature_s3_key")
            if old and is_s3_available():
                try:
                    s3_client.delete_object(Bucket=bucket_name, Key=old)
                except Exception:
                    pass
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=image_bytes,
                ContentType="image/png",
            )
            presigned_url = None
            try:
                presigned_url = generate_presigned_url_for_display(s3_key)
            except Exception:
                pass
            return Response({"success": True, "s3_key": s3_key, "presigned_url": presigned_url})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def upload_photo_platine(self, request, pk=None):
        brouillon = self.get_object()
        file = request.FILES.get("photo")
        if not file:
            return Response({"error": "photo requise"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display
            if not is_s3_available():
                return Response({"error": "S3 non disponible"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            ext = file.name.split(".")[-1] if "." in file.name else "jpg"
            s3_key = f"rapports_intervention/brouillons/{brouillon.pk}/platine_{uuid.uuid4().hex[:8]}.{ext}"
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or "image/jpeg",
            )
            presigned_url = None
            try:
                presigned_url = generate_presigned_url_for_display(s3_key)
            except Exception:
                pass
            return Response({"success": True, "s3_key": s3_key, "presigned_url": presigned_url})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def upload_photo_platine_portail(self, request, pk=None):
        brouillon = self.get_object()
        file = request.FILES.get("photo")
        if not file:
            return Response({"error": "photo requise"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available, generate_presigned_url_for_display
            if not is_s3_available():
                return Response({"error": "S3 non disponible"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            ext = file.name.split(".")[-1] if "." in file.name else "jpg"
            s3_key = f"rapports_intervention/brouillons/{brouillon.pk}/platine_portail_{uuid.uuid4().hex[:8]}.{ext}"
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file.read(),
                ContentType=file.content_type or "image/jpeg",
            )
            presigned_url = None
            try:
                presigned_url = generate_presigned_url_for_display(s3_key)
            except Exception:
                pass
            return Response({"success": True, "s3_key": s3_key, "presigned_url": presigned_url})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def delete_photo_vigik(self, request, pk=None):
        """Retire une clé S3 du manifeste _draft_media et supprime l'objet (brouillon Vigik+)."""
        brouillon = self.get_object()
        s3_key = (request.data.get("s3_key") or "").strip()
        question = (request.data.get("question") or "").strip().lower()
        if not s3_key or question not in ("platine", "portail"):
            return Response(
                {"error": "s3_key et question (platine|portail) requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            from .utils import get_s3_client, get_s3_bucket_name, is_s3_available

            p = dict(brouillon.payload or {})
            dm = dict(p.get("_draft_media") or {})
            attr = "photos_platine_s3_keys" if question == "platine" else "photos_platine_portail_s3_keys"
            keys = list(dm.get(attr) or [])
            if question == "platine" and not keys and dm.get("photo_platine_s3_key"):
                keys = [dm["photo_platine_s3_key"]]
            if question == "portail" and not keys and dm.get("photo_platine_portail_s3_key"):
                keys = [dm["photo_platine_portail_s3_key"]]
            if s3_key not in keys:
                return Response({"error": "Clé absente du brouillon"}, status=status.HTTP_404_NOT_FOUND)
            keys = [k for k in keys if k != s3_key]
            dm[attr] = keys
            dm.pop("photo_platine_s3_key", None)
            dm.pop("photo_platine_presigned_url", None)
            dm.pop("photo_platine_portail_s3_key", None)
            dm.pop("photo_platine_portail_presigned_url", None)
            dm.pop("photo_platine_presigned_urls", None)
            dm.pop("photo_platine_portail_presigned_urls", None)
            p["_draft_media"] = dm
            brouillon.payload = p
            brouillon.save(update_fields=["payload", "updated_at"])
            if is_s3_available():
                try:
                    get_s3_client().delete_object(Bucket=get_s3_bucket_name(), Key=s3_key)
                except Exception:
                    pass
            return Response({"success": True, attr: keys}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def promouvoir(self, request, pk=None):
        brouillon = self.get_object()
        merge = request.data if isinstance(request.data, dict) else {}
        merged = {**(brouillon.payload or {}), **merge}
        draft_media = merged.pop("_draft_media", None)
        data = merged
        if "statut" not in data:
            data["statut"] = "en_cours"
        brouillon_id = brouillon.pk
        with transaction.atomic():
            ser = RapportInterventionCreateSerializer(data=data, context={"request": request})
            ser.is_valid(raise_exception=True)
            rapport = ser.save(created_by=request.user)
            assign_numero_rapport_si_absent(rapport)
            transfer_brouillon_media_to_rapport(brouillon_id, rapport, draft_media)
            brouillon.delete()
        rapport.refresh_from_db()
        out = RapportInterventionSerializer(rapport, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)
```

### 4.6 `api/urls_rapport.py`

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_rapport import (
    TitreRapportViewSet,
    ResidenceViewSet,
    RapportInterventionViewSet,
    RapportInterventionBrouillonViewSet,
    preview_rapport_intervention,
    generate_rapport_intervention_pdf,
    generate_rapport_intervention_pdf_drive,
)

router = DefaultRouter()
router.register(r'rapports-intervention', RapportInterventionViewSet, basename='rapports-intervention')
router.register(
    r'rapports-intervention-brouillons',
    RapportInterventionBrouillonViewSet,
    basename='rapports-intervention-brouillons',
)
router.register(r'titres-rapport', TitreRapportViewSet, basename='titres-rapport')
router.register(r'residences', ResidenceViewSet, basename='residences')

urlpatterns = [
    path('', include(router.urls)),
    path('preview-rapport-intervention/<int:rapport_id>/', preview_rapport_intervention, name='preview-rapport-intervention'),
    path('generate-rapport-intervention-pdf/', generate_rapport_intervention_pdf, name='generate-rapport-intervention-pdf'),
    path('generate-rapport-intervention-pdf-drive/', generate_rapport_intervention_pdf_drive, name='generate-rapport-intervention-pdf-drive'),
]
```

### 4.7 `api/management/commands/assign_rapport_intervention_numeros.py`

Commande de réattribution des numéros annuels (à lancer après migration initiale si des rapports existent déjà).

```python
"""
Réattribue les numéros annuels des rapports d'intervention selon l'ordre des id.

Pour chaque année calendaire (champ date du rapport), les rapports sont triés par id
croissant et reçoivent les numéros 1, 2, 3, … Les compteurs par année sont alignés.

Usage:
  python manage.py assign_rapport_intervention_numeros --dry-run
  python manage.py assign_rapport_intervention_numeros
"""

from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models_rapport import RapportIntervention, RapportInterventionNumeroCompteur


class Command(BaseCommand):
    help = (
        "Réattribue numero_rapport / annee_numero_rapport pour tous les rapports existants, "
        "par année de date, triés par id croissant."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Affiche le plan sans modifier la base.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        by_year = defaultdict(list)
        for r in RapportIntervention.objects.all().order_by("id").iterator(chunk_size=500):
            by_year[r.date.year].append(r)

        if not by_year:
            self.stdout.write(self.style.WARNING("Aucun rapport d'intervention."))
            return

        plan_lines = []
        to_update = []
        for year in sorted(by_year.keys()):
            rows = by_year[year]
            for i, rapport in enumerate(rows, start=1):
                plan_lines.append(
                    f"  id={rapport.pk} -> nÃ‚Â°{i} - {year} (date rapport: {rapport.date})"
                )
                to_update.append(
                    RapportIntervention(
                        pk=rapport.pk,
                        numero_rapport=i,
                        annee_numero_rapport=year,
                    )
                )

        self.stdout.write(
            self.style.NOTICE(
                f"{'[dry-run] ' if dry_run else ''}"
                f"{len(to_update)} rapport(s), {len(by_year)} année(s) distincte(s)."
            )
        )
        for y in sorted(by_year.keys()):
            self.stdout.write(f"  Année {y}: {len(by_year[y])} rapport(s)")

        if dry_run:
            for line in plan_lines[:50]:
                self.stdout.write(line)
            if len(plan_lines) > 50:
                self.stdout.write(f"  ... et {len(plan_lines) - 50} ligne(s) de plus.")
            self.stdout.write(self.style.WARNING("Aucune écriture (dry-run)."))
            return

        with transaction.atomic():
            RapportIntervention.objects.bulk_update(
                to_update,
                ["numero_rapport", "annee_numero_rapport"],
                batch_size=500,
            )
            for year in sorted(by_year.keys()):
                n = len(by_year[year])
                RapportInterventionNumeroCompteur.objects.update_or_create(
                    annee=year,
                    defaults={"dernier_numero": n},
                )

        self.stdout.write(self.style.SUCCESS("Numéros et compteurs mis à jour."))
```

### 4.8 Helpers S3 dans `api/utils.py`

Les helpers suivants doivent exister dans `api/utils.py` (ou équivalent). Voici les implémentations extraites telles quelles :

```python
import os
import boto3
from urllib.parse import quote


def normalize_drive_segment(name: str) -> str:
    """
    Normalise un segment de chemin pour le Drive (dossier/fichier) en conservant l'intention visuelle.
    - Remplace les espaces par des underscores
    - Encode le slash '/' en '∕' (U+2215) pour éviter la création de sous-dossiers tout en l'affichant '/'
    - Conserve les autres caractères (S3 accepte les caractères spéciaux hors espaces)
    """
    if not name:
        return ""
    normalized = str(name).replace('/', '∕')
    normalized = normalized.replace(' ', '_')
    return normalized


def get_s3_client():
    """
    Retourne un client S3 configuré à partir des variables d'environnement,
    ou None si le S3 n'est pas configuré (utilise alors le stockage local).
    Variables utilisées :
      - AWS_ACCESS_KEY_ID
      - AWS_SECRET_ACCESS_KEY
      - AWS_STORAGE_BUCKET_NAME
      - S3_ENDPOINT_URL (optionnel)
    Région fixée à 'eu-north-1' (à paramétrer si besoin côté projet cible).
    """
    access_key = os.getenv('AWS_ACCESS_KEY_ID')
    secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    region = 'eu-north-1'
    endpoint_url = os.getenv('S3_ENDPOINT_URL')
    bucket_name = os.getenv('AWS_STORAGE_BUCKET_NAME')

    if not access_key or not secret_key or not bucket_name:
        return None

    client_params = {
        'service_name': 's3',
        'aws_access_key_id': access_key,
        'aws_secret_access_key': secret_key,
        'region_name': region,
        'config': boto3.session.Config(signature_version='s3v4'),
    }
    if endpoint_url and endpoint_url.strip():
        client_params['endpoint_url'] = endpoint_url.strip()

    try:
        return boto3.client(**client_params)
    except Exception:
        return None


def get_s3_bucket_name():
    """Nom du bucket depuis la variable d'environnement AWS_STORAGE_BUCKET_NAME."""
    return os.getenv('AWS_STORAGE_BUCKET_NAME') or None


def is_s3_available():
    """True si le S3 est configuré et joignable (client instanciable)."""
    try:
        client = get_s3_client()
        bucket = get_s3_bucket_name()
        return client is not None and bucket is not None
    except Exception:
        return False


def generate_presigned_url(operation, key, expires_in=3600):
    """URL présignée S3 pour une opération donnée (get_object / put_object)."""
    if not is_s3_available():
        raise ValueError("S3 non configuré")
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    return s3_client.generate_presigned_url(
        operation,
        Params={'Bucket': bucket_name, 'Key': key},
        ExpiresIn=expires_in,
    )


def generate_presigned_url_for_display(key, expires_in=3600):
    """URL présignée GET avec Content-Disposition=inline pour affichage dans une <img>."""
    if not is_s3_available():
        raise ValueError("S3 non configuré")
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    return s3_client.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': bucket_name,
            'Key': key,
            'ResponseContentDisposition': 'inline',
        },
        ExpiresIn=expires_in,
    )


def create_s3_folder_recursive(folder_path):
    """Crée (de façon récursive) un dossier virtuel S3 en plaçant un objet `<segment>/.keep` à chaque niveau."""
    if not is_s3_available():
        return False
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    try:
        parts = folder_path.split('/')
        current_path = ""
        for part in parts:
            if part:
                current_path = f"{current_path}/{part}" if current_path else part
                s3_client.put_object(Bucket=bucket_name, Key=f"{current_path}/.keep")
        return True
    except Exception:
        return False


def copy_s3_file(source_path, destination_path):
    """Copie un objet S3 vers une nouvelle clé (sans suppression de la source)."""
    if not is_s3_available():
        return False
    s3_client = get_s3_client()
    bucket_name = get_s3_bucket_name()
    try:
        s3_client.copy_object(
            Bucket=bucket_name,
            CopySource={'Bucket': bucket_name, 'Key': source_path},
            Key=destination_path,
        )
        return True
    except Exception:
        return False
```

> **Note sur la région :** la région est **codée en dur** à `'eu-north-1'` dans `get_s3_client`. Si l'application cible utilise une autre région, la paramétrer (variable d'environnement `AWS_S3_REGION_NAME` par exemple). Voir Section 10.

### 4.9 Intégration dans les fichiers existants

#### `api/models.py` — réexport

À la fin de `api/models.py` (ou au meilleur endroit pour votre projet), ajouter :

```python
from .models_rapport import (
    TitreRapport,
    Residence,
    RapportIntervention,
    RapportInterventionNumeroCompteur,
    RapportInterventionBrouillon,
    PrestationRapport,
    PhotoRapport,
)
```

#### `api/urls.py` — inclusion des routes

À la fin de `api/urls.py` :

```python
# --- URLs POUR LES RAPPORTS D'INTERVENTION ---
from django.urls import include as include_urls
urlpatterns += [
    path('', include_urls('api.urls_rapport')),
]
```

#### `Chantier.get_drive_path()` — méthode à ajouter sur le modèle `Chantier`

Indispensable : les PDF des rapports liés à un chantier sont stockés sous `Chantiers/<drive_path>/RAPPORT`. Si la méthode n'existe pas déjà, l'ajouter sur le modèle `Chantier` :

```python
def get_drive_path(self):
    """
    Retourne le chemin du drive (personnalisé ou calculé) sans préfixe Chantiers/.

    Priorité :
    1. Si drive_path est défini → retourne drive_path (sans préfixe Chantiers/ si présent)
    2. Sinon → calcule automatiquement {societe_slug}/{chantier_slug}
    3. Si pas de société → retourne None
    """
    if self.drive_path and self.drive_path.strip():
        path = self.drive_path.strip()
        if path.startswith('Chantiers/'):
            return path[len('Chantiers/'):]
        return path
    if self.societe:
        from api.utils import normalize_drive_segment
        societe_slug = normalize_drive_segment(self.societe.nom_societe)
        chantier_slug = normalize_drive_segment(self.chantier_name)
        return f"{societe_slug}/{chantier_slug}"
    return None
```

Cela suppose que `Chantier` a un champ `drive_path` (CharField nullable), un champ `societe` (FK `Societe`), un champ `chantier_name` (CharField unique), et que `Societe` a un champ `nom_societe`. Si la méthode existe déjà dans l'application cible, vérifier qu'elle renvoie un chemin **sans** préfixe `Chantiers/`.

#### Intégration `api/pdf_manager.py`

Le `PDFManager` existant doit supporter `document_type='rapport_intervention'` et les kwargs `custom_path`, `custom_filename`, `custom_path_is_full`, `force_replace`. Comportement attendu :

- Si `custom_path_is_full=True` : utiliser `custom_path` **tel quel** comme préfixe S3 (pas d'ajout de sous-dossier `RAPPORT_INTERVENTION/...`). Utilisé pour Vigik+.
- Sinon : `custom_path` reçoit le suffixe du type (`RAPPORT_INTERVENTION`). Pour un rapport classique lié à un chantier, on passe déjà un `custom_path = Chantiers/<path>/RAPPORT` donc on souhaite le comportement "full" également côté intervention — **attention** : vérifier le comportement réel du `PDFManager` cible ; au besoin forcer aussi `custom_path_is_full=True` pour `type_rapport='intervention'` lorsque `custom_path` contient déjà `/RAPPORT`.
- `force_replace=True` : remplace le document existant au même chemin S3.
- `custom_filename` est respecté (sinon nom auto `rapport_intervention_<timestamp>.pdf`).

Le `PDFManager` appelle `node frontend/src/components/generate_pdf.js <preview_url> <tempfile>.pdf` (timeout 60 s) puis upload S3. Fournir le script Node.js `generate_pdf.js` (Puppeteer) dans le projet cible.

---

## 5. Schéma final des modèles (pas de migrations)

Les migrations `0093` → `0115` de l'application source **ne sont PAS à copier** : leur numérotation et leur point de départ ne correspondent pas à l'état de la base de la cible. À la place, copier les modèles finaux ci-dessous dans `api/models_rapport.py` (ou `api/models.py`), ajouter les champs/méthodes manquants sur les modèles existants, puis laisser Django générer ses propres migrations avec :

```bash
python manage.py makemigrations api
python manage.py migrate
```

### 5.1 Modèles à créer (cf. Section 4.1 pour le code intégral)

Tous dans `api/models_rapport.py`, réexportés depuis `api/models.py` :

| Modèle | Rôle | Points clés |
|---|---|---|
| `TitreRapport` | Libellés de titres réutilisables | `nom` unique, ordre par nom |
| `Residence` | Résidence (nom + adresse), liée à `Societe` et `Chantier` | FK optionnelles (SET_NULL), related_name `residences` / `rapports` sur enfants |
| `RapportIntervention` | Rapport (intervention ou Vigik+) | nombreuses FK optionnelles, champs S3 directs (`signature_s3_key`, `pdf_s3_key`), `dates_intervention` (JSON), `numero_rapport` / `annee_numero_rapport`, champs Vigik+, `type_rapport` + `statut` (choices) |
| `RapportInterventionNumeroCompteur` | Compteur par année | `annee` unique, `dernier_numero` |
| `RapportInterventionBrouillon` | Brouillon serveur JSON libre | `payload` (JSONField dict), `champs_manquants` (liste), FK `User` |
| `PrestationRapport` | Ligne de prestation d'un rapport | FK cascade vers rapport, `ordre` |
| `PhotoRapport` | Photo liée à une prestation | FK cascade vers prestation, `s3_key`, `type_photo` (choices) |

Fonctions module-level :
- `default_dates_intervention_list()` → `[]` (callable en default de JSONField).
- `assign_numero_rapport_si_absent(rapport)` → attribue un numéro séquentiel annuel **si** aucun n'est encore posé ; appel **après** `create` en base ; utilise `select_for_update` pour la concurrence.

### 5.2 Champs / méthodes à ajouter sur modèles existants

Si les modèles cibles n'ont pas déjà ces éléments :

**`Societe`** (utilisé pour logo + bloc adresse dans les PDF) :

```python
# Ajouts si absents :
ville_societe = models.CharField(max_length=100, blank=True, default="")
rue_societe = models.CharField(max_length=100, blank=True, default="")
codepostal_societe = models.CharField(
    max_length=10,
    validators=[RegexValidator(
        regex=r'^\d{5}$',
        message='Le code postal doit être exactement 5 chiffres.',
        code='invalid_codepostal'
    )],
    blank=True,
    null=True,
)
logo_s3_key = models.CharField(max_length=500, blank=True, null=True, verbose_name="Clé S3 du logo")
```

**`Chantier`** (utilisé pour construire le chemin S3 des PDF rapports) :

- Le modèle doit posséder un champ `drive_path` (CharField nullable) **OU** à défaut, `Chantier.get_drive_path()` peut se contenter de calculer à partir de `societe.nom_societe` et `chantier_name`.
- Ajouter la méthode `get_drive_path()` telle que fournie en section 4.9.

**`Devis`** : la FK `RapportIntervention.devis_lie` pointe vers `Devis`. Le serializer vérifie `devis_lie.chantier_id == rapport.chantier_id`, et la liste renvoie `devis_lie.numero`. Si `Devis` n'existe pas dans l'application cible, retirer cette FK, les deux SerializerMethodField associés, et le bloc `devis_*` du serializer `validate`.

### 5.3 Choix de champs (choices) à conserver

```python
TYPE_CHOICES = [
    ('intervention', "Rapport d'intervention"),
    ('vigik_plus', 'Vigik+'),
]
STATUT_CHOICES = [
    ('brouillon', 'Brouillon'),
    ('a_faire', 'A faire'),
    ('en_cours', 'En cours'),
    ('termine', 'Terminé'),
]
TYPE_PHOTO_CHOICES = [
    ('avant', 'Avant travaux'),
    ('en_cours', 'En cours de travaux'),
    ('apres', 'Après travaux'),
]
```

### 5.4 Backfill logique (données existantes dans l'app cible)

Si l'app cible contient déjà des rapports équivalents (autre modèle), reprendre la logique des data-migrations de l'app source avec les équivalents suivants :

1. **Renseigner `numero_rapport` / `annee_numero_rapport`** : lancer la commande Django fournie à la section 4.7 (`python manage.py assign_rapport_intervention_numeros`). Elle aligne aussi les compteurs annuels.
2. **Backfill `dates_intervention`** : pour chaque rapport existant sans liste, `dates_intervention = [date.isoformat()]`. Script de data-migration possible :
   ```python
   for r in RapportIntervention.objects.filter(dates_intervention__in=[[], None]):
       if r.date:
           r.dates_intervention = [r.date.isoformat()]
           r.save(update_fields=['dates_intervention'])
   ```
3. **Mapping statut historique** : si des rapports avaient `statut='brouillon'` (dans l'ancien système), les mapper sur `'a_faire'` ou `'en_cours'` selon le contexte de l'application cible. Les brouillons réels sont désormais des `RapportInterventionBrouillon` séparés.
4. **`photos_platine_s3_keys` / `photos_platine_portail_s3_keys`** : anciens rapports Vigik+ ne sont pas concernés.

### 5.5 Procédure d'application

Dans l'app cible :

```bash
# 1. Coller models_rapport.py + réexport depuis models.py
# 2. Ajouter champs logo_s3_key, rue_societe, ville_societe, codepostal_societe sur Societe si absents
# 3. Ajouter Chantier.get_drive_path() si absente
# 4. Générer et appliquer les migrations :
python manage.py makemigrations api
python manage.py migrate
# 5. Optionnel : backfill numéros si données préexistantes
python manage.py assign_rapport_intervention_numeros
```

**Aucun fichier `0xxx_*.py` de l'app source n'est à transférer.**

---

## 6. Templates PDF

Templates Django (moteur par défaut) utilisés par la vue `preview_rapport_intervention` pour générer le HTML lu ensuite par Puppeteer. Placer dans `frontend/templates/` (ou le dossier templates configuré dans `settings.py` pour l'app `frontend`).

### 6.1 `frontend/templates/rapport_intervention.html`

```html
{% load static %}
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <title>{% if rapport.titre %}{{ rapport.titre }}{% else %}Rapport{% endif %}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Roboto', Arial, sans-serif;
            font-size: 11pt;
            color: #333;
            width: 210mm;
            margin: 0 auto;
            padding: 15mm 12mm;
            line-height: 1.4;
        }

        @page { size: A4; margin: 10mm; }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            width: 100%;
        }

        .report-title {
            text-align: center;
            font-size: 24pt;
            font-weight: 700;
            color: #000;
            text-decoration: underline;
            margin-bottom: 20px;
            padding: 8px 0;
        }

        .header-left { flex-shrink: 0; }
        .header-right { flex-shrink: 0; }

        .header-logo {
            max-height: 190px;
            max-width: 480px;
            object-fit: contain;
        }

        .header-logo-client {
            max-height: 190px;
            max-width: 480px;
            object-fit: contain;
        }

        .header-placeholder { display: inline-block; min-width: 480px; }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }

        .info-block {
            background: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 12px;
        }

        .info-block-full { grid-column: 1 / -1; }

        .info-block h3 {
            font-size: 10pt;
            font-weight: 700;
            color: #000;
            text-transform: uppercase;
            margin-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 4px;
        }

        .rapport-ref-outside {
            grid-column: 1 / -1;
            text-align: right;
            font-size: 9pt;
            font-weight: 600;
            color: #222;
            margin: 0 0 2px 0;
            line-height: 1.2;
        }

        .info-row { display: flex; margin-bottom: 3px; }

        .info-label {
            font-weight: 500;
            min-width: 140px;
            color: #666;
        }

        .info-value { flex: 1; font-weight: 400; }

        .prestation-section { margin-bottom: 20px; page-break-inside: avoid; }

        .prestation-header {
            background: #000;
            color: white;
            padding: 8px 14px;
            border-radius: 6px 6px 0 0;
            font-weight: 700;
            font-size: 11pt;
        }

        .prestation-body {
            border: 1px solid #e0e0e0;
            border-top: none;
            border-radius: 0 0 6px 6px;
            padding: 12px;
        }

        .prestation-field { margin-bottom: 8px; }

        .prestation-field-inline {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }

        .prestation-field-label {
            font-weight: 700;
            color: #555;
            font-size: 9pt;
            text-transform: uppercase;
            margin-bottom: 2px;
        }

        .prestation-field-inline .prestation-field-label { margin-bottom: 0; }

        .prestation-field-value { padding: 4px 0; white-space: pre-wrap; }

        .badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 9pt;
            font-weight: 600;
        }

        .badge-oui { background: #e8f5e9; color: #2e7d32; }
        .badge-non { background: #ffebee; color: #c62828; }

        .photos-section { margin-top: 12px; }

        .photos-section h4 {
            font-size: 10pt;
            color: #000;
            margin-bottom: 6px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 3px;
        }

        .photos-group { margin-bottom: 14px; }

        .photos-group-title {
            font-weight: 700;
            font-size: 10pt;
            text-transform: uppercase;
            padding: 5px 12px;
            border-radius: 4px;
            margin-bottom: 8px;
            display: inline-block;
        }

        .photos-group-title-avant    { background: #e3f2fd; color: #1565c0; border-left: 4px solid #1565c0; }
        .photos-group-title-en_cours { background: #fff3e0; color: #e65100; border-left: 4px solid #e65100; }
        .photos-group-title-apres    { background: #e8f5e9; color: #2e7d32; border-left: 4px solid #2e7d32; }

        .photos-grid { display: flex; flex-wrap: wrap; gap: 14px; }

        .photo-item { width: 48%; }

        .photo-item img {
            width: 100%;
            height: auto;
            max-height: 280px;
            object-fit: cover;
            border-radius: 6px;
        }

        .photo-item-avant img    { border: 3px solid #1565c0; }
        .photo-item-en_cours img { border: 3px solid #e65100; }
        .photo-item-apres img    { border: 3px solid #2e7d32; }

        .photo-item .photo-label { font-size: 8pt; color: #555; text-align: center; margin-top: 4px; }

        .photos-row { display: block; margin-bottom: 10px; }

        .signature-section {
            margin-top: 30px;
            margin-bottom: 20px;
            page-break-inside: avoid;
            text-align: right;
            page-break-after: always;
        }

        .signature-section h3 { font-size: 10pt; color: #000; margin-bottom: 8px; }

        .signature-quitus {
            font-size: 11pt;
            font-weight: 600;
            color: #000;
            margin-bottom: 12px;
        }

        .signature-section img {
            max-width: 250px;
            max-height: 120px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #e0e0e0;
            font-size: 8pt;
            color: #999;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <img src="{% static 'frontend/src/img/logo.png' %}" alt="Logo" class="header-logo" />
        </div>
        <div class="header-right">
            {% if logo_url %}
                <img src="{{ logo_url }}" alt="Client" class="header-logo-client" />
            {% else %}
                <span class="header-placeholder"></span>
            {% endif %}
        </div>
    </div>

    <h1 class="report-title">{% if rapport.titre %}{{ rapport.titre }}{% else %}Rapport{% endif %}</h1>

    <div class="info-grid">
        {% if rapport.numero_rapport and rapport.annee_numero_rapport %}
        <div class="rapport-ref-outside">Rapport nÃ‚Â°{{ rapport.numero_rapport }} - {{ rapport.annee_numero_rapport }}</div>
        {% endif %}

        <div class="info-block">
            <h3>Client / Bailleur</h3>
            <div class="info-row">
                <span class="info-value" style="font-weight:600;">
                    {{ societe_nom|default:"-" }}
                </span>
            </div>
            {% if societe_adresse %}
            <div class="info-row">
                <span class="info-label">Adresse :</span>
                <span class="info-value" style="white-space: pre-line;">{{ societe_adresse }}</span>
            </div>
            {% endif %}
        </div>

        <div class="info-block">
            <h3>Intervention</h3>
            {% for row in intervention_date_rows %}
            <div class="info-row">
                <span class="info-label">{{ row.label }} :</span>
                <span class="info-value">{{ row.value }}</span>
            </div>
            {% empty %}
            <div class="info-row">
                <span class="info-label">Date :</span>
                <span class="info-value">{{ rapport.date|date:"d/m/Y" }}</span>
            </div>
            {% endfor %}
            <div class="info-row">
                <span class="info-label">Technicien :</span>
                <span class="info-value">{{ rapport.technicien|default:"-" }}</span>
            </div>
            {% if has_temps_intervention %}
            <div class="info-row">
                <span class="info-label">Temps de prestation : </span>
                <span class="info-value"> {{ temps_prestation_hhmm }} h</span>
            </div>
            {% endif %}
        </div>

        <div class="info-block">
            <h3>Residence</h3>
            {% if rapport.residence %}
            <div class="info-row">
                <span class="info-label">Nom :</span>
                <span class="info-value"><strong>{{ rapport.residence.nom }}</strong></span>
            </div>
            {% if rapport.residence.adresse %}
            <div class="info-row">
                <span class="info-label">Adresse :</span>
                <span class="info-value"><strong>{{ rapport.residence.adresse }}</strong></span>
            </div>
            {% endif %}
            {% endif %}
            {% if rapport.logement %}
            <div class="info-row">
                <span class="info-label">Lieu d'intervention :</span>
                <span class="info-value">{{ rapport.logement }}</span>
            </div>
            {% endif %}
        </div>

        <div class="info-block">
            <h3>Locataire</h3>
            {% if rapport.locataire_nom or rapport.locataire_prenom %}
                <div class="info-row">
                    <span class="info-label">Nom :</span>
                    <span class="info-value">{{ rapport.locataire_prenom }} {{ rapport.locataire_nom }}</span>
                </div>
            {% endif %}
            {% if rapport.locataire_telephone %}
                <div class="info-row">
                    <span class="info-label">Telephone :</span>
                    <span class="info-value">{{ rapport.locataire_telephone }}</span>
                </div>
            {% endif %}
            {% if rapport.locataire_email %}
                <div class="info-row">
                    <span class="info-label">Email :</span>
                    <span class="info-value">{{ rapport.locataire_email }}</span>
                </div>
            {% endif %}
            {% if not rapport.locataire_nom and not rapport.locataire_prenom and not rapport.locataire_telephone and not rapport.locataire_email %}
                <div class="info-row"><span class="info-value">-</span></div>
            {% endif %}
        </div>

        <div class="info-block info-block-full">
            <h3>Objet de la recherche</h3>
            <div class="prestation-field-value">{{ rapport.objet_recherche }}</div>
        </div>

        {% if rapport.resultat %}
        <div class="info-block info-block-full">
            <h3>Resultat</h3>
            <div class="prestation-field-value">{{ rapport.resultat }}</div>
        </div>
        {% endif %}
    </div>

    {% if signature_url %}
    <div class="signature-section">
        <h3>Signature</h3>
        <p class="signature-quitus">Bon pour quitus</p>
        <img src="{{ signature_url }}" alt="Signature" />
    </div>
    {% endif %}

    {% for item in prestations_data %}
    <div class="prestation-section">
        <div class="prestation-header">
           {{ forloop.counter }} - {{ item.prestation.localisation }}
        </div>
        <div class="prestation-body">
            <div class="prestation-field">
                <div class="prestation-field-label">Probleme constate</div>
                <div class="prestation-field-value">{{ item.prestation.probleme }}</div>
            </div>

            <div class="prestation-field">
                <div class="prestation-field-label">Solution</div>
                <div class="prestation-field-value">{{ item.prestation.solution }}</div>
            </div>

            <div class="prestation-field-inline">
                <span class="prestation-field-label">Prestation possible :</span>
                {% if item.prestation.prestation_possible %}
                    <span class="badge badge-oui">Oui</span>
                {% else %}
                    <span class="badge badge-non">Non</span>
                {% endif %}
            </div>

            {% if item.prestation.prestation_realisee %}
            <div class="prestation-field">
                <div class="prestation-field-label">Prestations realisees</div>
                <div class="prestation-field-value">{{ item.prestation.prestation_realisee }}</div>
            </div>
            {% endif %}

            {% if item.photos_by_type.avant or item.photos_by_type.en_cours or item.photos_by_type.apres %}
            <div class="photos-section">
                <h4>Photos</h4>
                <div class="photos-row">
                    {% if item.photos_by_type.avant %}
                    <div class="photos-group">
                        <div class="photos-group-title photos-group-title-avant">Avant travaux</div>
                        <div class="photos-grid">
                            {% for photo in item.photos_by_type.avant %}
                            <div class="photo-item photo-item-avant">
                                <img src="{{ photo.url }}" alt="{{ photo.filename }}" />
                                <div class="photo-label">{{ photo.date_photo|date:"d/m/Y" }}</div>
                            </div>
                            {% endfor %}
                        </div>
                    </div>
                    {% endif %}

                    {% if item.photos_by_type.en_cours %}
                    <div class="photos-group">
                        <div class="photos-group-title photos-group-title-en_cours">En cours de travaux</div>
                        <div class="photos-grid">
                            {% for photo in item.photos_by_type.en_cours %}
                            <div class="photo-item photo-item-en_cours">
                                <img src="{{ photo.url }}" alt="{{ photo.filename }}" />
                                <div class="photo-label">{{ photo.date_photo|date:"d/m/Y" }}</div>
                            </div>
                            {% endfor %}
                        </div>
                    </div>
                    {% endif %}

                    {% if item.photos_by_type.apres %}
                    <div class="photos-group">
                        <div class="photos-group-title photos-group-title-apres">Apres travaux</div>
                        <div class="photos-grid">
                            {% for photo in item.photos_by_type.apres %}
                            <div class="photo-item photo-item-apres">
                                <img src="{{ photo.url }}" alt="{{ photo.filename }}" />
                                <div class="photo-label">{{ photo.date_photo|date:"d/m/Y" }}</div>
                            </div>
                            {% endfor %}
                        </div>
                    </div>
                    {% endif %}
                </div>
            </div>
            {% endif %}
        </div>
    </div>
    {% endfor %}

</body>
</html>
```

### 6.2 `frontend/templates/rapport_vigik_plus.html`

```html
{% load static %}
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <title>Rapport système Vigik+</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Roboto', Arial, sans-serif;
            font-size: 11pt;
            color: #333;
            width: 210mm;
            margin: 0 auto;
            padding: 15mm 12mm;
            line-height: 1.4;
        }

        @page { size: A4; margin: 10mm; }

        .header-vigik { text-align: center; margin-bottom: 20px; }

        .header-vigik .logo-img {
            max-height: 120px;
            max-width: 320px;
            object-fit: contain;
            margin-bottom: 16px;
        }

        .report-title {
            text-align: center;
            font-size: 24pt;
            font-weight: 700;
            color: #000;
            text-decoration: underline;
            padding: 8px 0;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }

        .info-block {
            background: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 12px;
        }

        .info-block-full { grid-column: 1 / -1; }

        .info-block h3 {
            font-size: 10pt;
            font-weight: 700;
            color: #000;
            text-transform: uppercase;
            margin-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 4px;
        }

        .rapport-ref-outside {
            grid-column: 1 / -1;
            text-align: left;
            font-size: 10pt;
            font-weight: 600;
            color: #222;
            margin: 0 0 2px 0;
            line-height: 1.2;
        }

        .info-row { display: flex; margin-bottom: 3px; }

        .info-label { font-weight: 500; min-width: 140px; color: #666; }

        .info-value { flex: 1; font-weight: 400; }

        .prestation-field-value { padding: 4px 0; white-space: pre-wrap; }

        .badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 9pt;
            font-weight: 600;
        }

        .badge-oui { background: #e8f5e9; color: #2e7d32; }
        .badge-non { background: #ffebee; color: #c62828; }

        .photos-section { margin-top: 12px; }

        .photos-section h4 {
            font-size: 10pt;
            color: #000;
            margin-bottom: 6px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 3px;
        }

        .photos-grid { display: flex; flex-wrap: wrap; gap: 14px; }

        .photo-item { width: 48%; }

        .photo-item img {
            width: 100%;
            height: auto;
            max-height: 280px;
            object-fit: cover;
            border-radius: 6px;
            border: 3px solid #1565c0;
        }

        .photo-item .photo-label {
            font-size: 8pt;
            color: #555;
            text-align: center;
            margin-top: 4px;
        }
       .logo-img {
        max-height: 240px;
        scale: 1.5;
       }
    </style>
</head>
<body>
    <div class="header-vigik">
        <img src="{% static 'frontend/src/img/logo.png' %}" alt="Logo" class="logo-img" />
        <h1 class="report-title">Rapport système Vigik+</h1>
    </div>

    <div class="info-grid">
        {% if rapport.numero_rapport and rapport.annee_numero_rapport %}
        <div class="rapport-ref-outside">Rapport nÃ‚Â°{{ rapport.numero_rapport }} - {{ rapport.annee_numero_rapport }}</div>
        {% endif %}

        <div class="info-block">
            <h3>Intervention</h3>
            {% for row in intervention_date_rows %}
            <div class="info-row">
                <span class="info-label">{{ row.label }} :</span>
                <span class="info-value">{{ row.value }}</span>
            </div>
            {% empty %}
            <div class="info-row">
                <span class="info-label">Date :</span>
                <span class="info-value">{{ rapport.date|date:"d/m/Y" }}</span>
            </div>
            {% endfor %}
            <div class="info-row">
                <span class="info-label">Technicien :</span>
                <span class="info-value">{{ rapport.technicien|default:"-" }}</span>
            </div>
        </div>

        <div class="info-block">
            <h3>Résidence</h3>
            {% if rapport.residence %}
            <div class="info-row">
                <span class="info-label">Nom :</span>
                <span class="info-value"><strong>{{ rapport.residence.nom }}</strong></span>
            </div>
            {% endif %}
        </div>

        <div class="info-block">
            <h3>Adresse</h3>
            <div class="info-row">
                <span class="info-value">{% if rapport.adresse_vigik %}{{ rapport.adresse_vigik }}{% elif rapport.residence and rapport.residence.adresse %}{{ rapport.residence.adresse }}{% else %}-{% endif %}</span>
            </div>
        </div>

        <div class="info-block">
            <h3>Numéro du bâtiment</h3>
            <div class="info-row">
                <span class="info-value">{{ rapport.numero_batiment|default:"-" }}</span>
            </div>
        </div>

        <div class="info-block">
            <h3>Type d'installation</h3>
            <div class="info-row">
                <span class="info-value">{{ rapport.type_installation|default:"-" }}</span>
            </div>
        </div>

        <div class="info-block info-block-full">
            <h3>Présence de platine Vigik+ :</h3>
            <div class="info-row">
                <span class="info-label">Réponse :</span>
                <span class="info-value">
                    {% if rapport.presence_platine is True %}
                        <span class="badge badge-oui">Oui</span>
                    {% elif rapport.presence_platine is False %}
                        <span class="badge badge-non">Non</span>
                    {% else %}
                        -
                    {% endif %}
                </span>
            </div>
            {% if photo_platine_urls %}
            <div class="photos-section">
                <h4>Photos</h4>
                <div class="photos-grid">
                    {% for u in photo_platine_urls %}
                    <div class="photo-item">
                        <img src="{{ u }}" alt="Photo platine" />
                    </div>
                    {% endfor %}
                </div>
            </div>
            {% endif %}
        </div>

        {% if rapport.presence_portail is not None %}
        <div class="info-block info-block-full">
            <h3>Présence d'un portail</h3>
            <div class="info-row">
                <span class="info-label">Réponse :</span>
                <span class="info-value">
                    {% if rapport.presence_portail is True %}
                        <span class="badge badge-oui">Oui</span>
                    {% elif rapport.presence_portail is False %}
                        <span class="badge badge-non">Non</span>
                    {% else %}
                        -
                    {% endif %}
                </span>
            </div>
            {% if rapport.presence_portail is False and photo_platine_portail_urls %}
            <div class="photos-section">
                <h4>Photos (facultatif)</h4>
                <div class="photos-grid">
                    {% for u in photo_platine_portail_urls %}
                    <div class="photo-item">
                        <img src="{{ u }}" alt="Photo site" />
                    </div>
                    {% endfor %}
                </div>
            </div>
            {% endif %}
        </div>
        {% if rapport.presence_portail %}
        <div class="info-block info-block-full">
            <h3>Présence de platine Vigik+ au niveau du portail</h3>
            <div class="info-row">
                <span class="info-label">Réponse :</span>
                <span class="info-value">
                    {% if rapport.presence_platine_portail is True %}
                        <span class="badge badge-oui">Oui</span>
                    {% elif rapport.presence_platine_portail is False %}
                        <span class="badge badge-non">Non</span>
                    {% else %}
                        -
                    {% endif %}
                </span>
            </div>
            {% if rapport.presence_platine_portail and photo_platine_portail_urls %}
            <div class="photos-section">
                <h4>Photos (facultatif)</h4>
                <div class="photos-grid">
                    {% for u in photo_platine_portail_urls %}
                    <div class="photo-item">
                        <img src="{{ u }}" alt="Photo platine portail" />
                    </div>
                    {% endfor %}
                </div>
            </div>
            {% endif %}
        </div>
        {% endif %}
        {% else %}
        <div class="info-block info-block-full">
            <h3>Présence de platine au niveau du portail (ancien format)</h3>
            <div class="info-row">
                <span class="info-label">Réponse :</span>
                <span class="info-value">
                    {% if rapport.presence_platine_portail is True %}
                        <span class="badge badge-oui">Oui</span>
                    {% elif rapport.presence_platine_portail is False %}
                        <span class="badge badge-non">Non</span>
                    {% else %}
                        -
                    {% endif %}
                </span>
            </div>
            {% if photo_platine_portail_urls %}
            <div class="photos-section">
                <h4>Photos</h4>
                <div class="photos-grid">
                    {% for u in photo_platine_portail_urls %}
                    <div class="photo-item">
                        <img src="{{ u }}" alt="Photo platine portail" />
                    </div>
                    {% endfor %}
                </div>
            </div>
            {% endif %}
        </div>
        {% endif %}
    </div>

</body>
</html>
```

### 6.3 Dépendance : `frontend/src/components/generate_pdf.js`

Ce script Node.js (Puppeteer) est déclenché par `PDFManager` pour transformer le HTML en PDF. Il doit être présent dans le projet cible. Interface attendue :

```bash
node <path>/generate_pdf.js <preview_url> <tempfile.pdf>
```

Et doit produire le PDF à `<tempfile.pdf>`. Toute implémentation Puppeteer compatible convient.

---

## 7. Frontend React — code complet

Tous les fichiers sont à placer dans `frontend/src/` en respectant l'arborescence (`components/RapportIntervention/`, `utils/`, `hooks/`, `config/`).

### 7.1 `frontend/src/hooks/useRapports.js`

Hook central : CRUD rapports, brouillons, photos, signature, PDF, titres.

```javascript
import { useCallback, useState } from "react";
import axios from "axios";

/** Taille de page par défaut (alignée sur RapportInterventionPagination côté API). */
export const RAPPORTS_LIST_PAGE_SIZE = 30;

export const useRapports = () => {
  const [rapports, setRapports] = useState([]);
  const [rapport, setRapport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rapportsCount, setRapportsCount] = useState(0);

  const fetchRapports = useCallback(async (filters = {}, opts = {}) => {
    const {
      page = 1,
      pageSize,
      ordering,
      excludeStatutTermine,
    } = opts;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value);
        }
      });
      params.append("page", String(page));
      if (pageSize != null && pageSize !== "") {
        params.append("page_size", String(pageSize));
      }
      if (ordering) {
        params.append("ordering", ordering);
      }
      if (excludeStatutTermine) {
        params.append("exclude_statut_termine", "true");
      }
      const response = await axios.get(`/api/rapports-intervention/?${params.toString()}`);
      const data = response.data;
      if (data != null && Array.isArray(data.results)) {
        setRapports(data.results);
        const total = typeof data.count === "number" ? data.count : data.results.length;
        setRapportsCount(total);
        return { results: data.results, count: total };
      }
      const list = Array.isArray(data) ? data : [];
      setRapports(list);
      setRapportsCount(list.length);
      return { results: list, count: list.length };
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement des rapports");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRapport = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/rapports-intervention/${id}/`);
      setRapport(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors du chargement du rapport");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createRapport = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("/api/rapports-intervention/", data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la creation du rapport");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRapport = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`/api/rapports-intervention/${id}/`, data);
      setRapport(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la mise a jour du rapport");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const patchRapport = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.patch(`/api/rapports-intervention/${id}/`, data);
      setRapport(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la mise a jour du rapport");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRapport = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`/api/rapports-intervention/${id}/`);
      setRapports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la suppression du rapport");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadPhoto = useCallback(async (prestationId, file, typePhoto = "avant", datePhoto = null) => {
    const formData = new FormData();
    formData.append("prestation_id", prestationId);
    formData.append("type_photo", typePhoto);
    formData.append("photo", file);
    if (datePhoto) {
      formData.append("date_photo", datePhoto);
    }
    const response = await axios.post("/api/rapports-intervention/upload_photo/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }, []);

  const updatePhoto = useCallback(async (photoId, data) => {
    const response = await axios.patch(`/api/rapports-intervention/update_photo/${photoId}/`, data);
    return response.data;
  }, []);

  const deletePhoto = useCallback(async (photoId) => {
    await axios.delete(`/api/rapports-intervention/delete_photo/${photoId}/`);
  }, []);

  const uploadSignature = useCallback(async (rapportId, signatureBase64) => {
    const response = await axios.post(
      `/api/rapports-intervention/${rapportId}/upload_signature/`,
      { signature: signatureBase64 }
    );
    return response.data;
  }, []);

  const genererPdf = useCallback(async (rapportId) => {
    const response = await axios.post(`/api/rapports-intervention/${rapportId}/generer_pdf/`);
    return response.data;
  }, []);

  const validerRapport = useCallback(async (rapportId) => {
    const response = await axios.post(`/api/rapports-intervention/${rapportId}/valider/`);
    return response.data;
  }, []);

  const lierChantier = useCallback(async (rapportId, chantierId) => {
    const response = await axios.post(
      `/api/rapports-intervention/${rapportId}/lier_chantier/`,
      { chantier_id: chantierId }
    );
    return response.data;
  }, []);

  const fetchTitres = useCallback(async () => {
    const response = await axios.get("/api/titres-rapport/");
    return response.data;
  }, []);

  const createTitre = useCallback(async (nom) => {
    const response = await axios.post("/api/titres-rapport/", { nom });
    return response.data;
  }, []);

  const deleteTitre = useCallback(async (titreId) => {
    await axios.delete(`/api/titres-rapport/${titreId}/`);
  }, []);

  const createRapportBrouillon = useCallback(async (data) => {
    const response = await axios.post("/api/rapports-intervention-brouillons/", data);
    return response.data;
  }, []);

  const patchRapportBrouillon = useCallback(async (id, data) => {
    const response = await axios.patch(`/api/rapports-intervention-brouillons/${id}/`, data);
    return response.data;
  }, []);

  const promouvoirRapportBrouillon = useCallback(async (id, data = {}) => {
    const response = await axios.post(`/api/rapports-intervention-brouillons/${id}/promouvoir/`, data);
    return response.data;
  }, []);

  const deleteRapportBrouillon = useCallback(async (id) => {
    await axios.delete(`/api/rapports-intervention-brouillons/${id}/`);
  }, []);

  return {
    rapports,
    rapport,
    loading,
    error,
    rapportsCount,
    setRapport,
    fetchRapports,
    fetchRapport,
    createRapport,
    updateRapport,
    patchRapport,
    deleteRapport,
    uploadPhoto,
    updatePhoto,
    deletePhoto,
    uploadSignature,
    genererPdf,
    validerRapport,
    lierChantier,
    fetchTitres,
    createTitre,
    deleteTitre,
    createRapportBrouillon,
    patchRapportBrouillon,
    promouvoirRapportBrouillon,
    deleteRapportBrouillon,
  };
};
```

### 7.2 `frontend/src/utils/compressImage.js`

```javascript
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const QUALITY = 0.8;

/** Photos rapport Vigik+ : dimensions modérées + JPEG pour limiter le poids (upload / nginx). */
export const VIGIK_REPORT_PHOTO_OPTIONS = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.78,
  force: true,
};

/**
 * @param {File} file
 * @param {{ maxWidth?: number, maxHeight?: number, quality?: number, force?: boolean, skipIfBytesUnder?: number }} [opts]
 *   force : si true, repasse toujours par le canvas JPEG (ignore le court-circuit Ã‚Â« déjà léger Ã‚Â»).
 *   skipIfBytesUnder : seuil du court-circuit quand force est false (défaut 500 ko).
 */
export function compressImage(
  file,
  { maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT, quality = QUALITY, force = false, skipIfBytesUnder = 500_000 } = {}
) {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      if (!force && width <= maxWidth && height <= maxHeight && file.size < skipIfBytesUnder) {
        resolve(file);
        return;
      }

      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round(width * (maxHeight / height));
        height = maxHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = (file.name || "photo").replace(/\.[^/.]+$/, "") || "photo";
          const outName = /\.jpe?g$/i.test(file.name || "") ? file.name || "photo.jpg" : `${baseName}.jpg`;
          const compressed = new File([blob], outName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
```

### 7.3 `frontend/src/utils/rapportDraftIDB.js`

IndexedDB dédié aux blobs des photos de brouillon (localStorage inadapté : trop petit).

```javascript
/**
 * Cache local des photos de brouillon (IndexedDB : capacité bien supérieure au localStorage).
 */

const DB_NAME = "rapport-intervention-draft-photos";
const DB_VERSION = 1;
const STORE = "drafts";

const openDb = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

function vigikSnapshotEntries(arr) {
  if (!arr?.length) return [];
  return arr
    .filter((p) => p?.file)
    .map((p) => ({
      blob: p.file,
      name: p.name || p.file.name || "photo.jpg",
    }));
}

/** Construit l'objet à stocker à partir de l'état React. */
export function buildPhotoSnapshot(pendingPhotos, pendingPhotosPlatine, pendingPhotosPlatinePortail) {
  const pendingPhotosOut = {};
  for (const [idxStr, arr] of Object.entries(pendingPhotos || {})) {
    if (!arr?.length) continue;
    pendingPhotosOut[idxStr] = arr.map((p) => ({
      blob: p.file,
      type_photo: p.type_photo,
      filename: p.filename || p.file?.name || "photo.jpg",
      date_photo: p.date_photo,
    }));
  }
  return {
    pendingPhotos: pendingPhotosOut,
    pendingPhotosPlatine: vigikSnapshotEntries(pendingPhotosPlatine),
    pendingPhotosPlatinePortail: vigikSnapshotEntries(pendingPhotosPlatinePortail),
  };
}

export function photoSnapshotIsEmpty(snapshot) {
  if (!snapshot) return true;
  const p = snapshot.pendingPhotos || {};
  if (Object.keys(p).some((k) => p[k]?.length)) return false;
  if (snapshot.pendingPhotosPlatine?.length) return false;
  if (snapshot.pendingPhotosPlatinePortail?.length) return false;
  return true;
}

export async function saveRapportDraftPhotos(draftKey, snapshot) {
  if (!draftKey) return;
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    if (photoSnapshotIsEmpty(snapshot)) {
      store.delete(draftKey);
    } else {
      store.put(snapshot, draftKey);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadRapportDraftPhotos(draftKey) {
  if (!draftKey) return null;
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(draftKey);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearRapportDraftPhotos(draftKey) {
  if (!draftKey) return;
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(draftKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Reconstruit pendingPhotos (fichiers + URLs de prévisualisation). */
export function restorePendingPhotosFromSnapshot(snapshot) {
  if (!snapshot?.pendingPhotos) return {};
  const out = {};
  for (const [idxStr, arr] of Object.entries(snapshot.pendingPhotos)) {
    if (!Array.isArray(arr)) continue;
    out[idxStr] = arr
      .map((item) => {
        const blob = item.blob;
        if (!(blob instanceof Blob)) return null;
        const file = new File([blob], item.filename || "photo.jpg", { type: blob.type || "image/jpeg" });
        const previewUrl = URL.createObjectURL(file);
        return {
          file,
          type_photo: item.type_photo,
          _previewUrl: previewUrl,
          filename: item.filename || file.name,
          date_photo: item.date_photo,
        };
      })
      .filter(Boolean);
  }
  return out;
}

export function restoreVigikPhotoFromSnapshot(entry) {
  if (!entry?.blob || !(entry.blob instanceof Blob)) return null;
  const file = new File([entry.blob], entry.name || "photo.jpg", { type: entry.blob.type || "image/jpeg" });
  const previewUrl = URL.createObjectURL(file);
  return { file, name: entry.name || file.name, previewUrl };
}

/** Applique un snapshot IDB à l'état utilisable par RapportForm. */
export function applyPhotoSnapshotToState(snapshot) {
  if (!snapshot || photoSnapshotIsEmpty(snapshot)) {
    return {
      pendingPhotos: {},
      pendingPhotosPlatine: [],
      pendingPhotosPlatinePortail: [],
    };
  }
  const pendingPhotos = restorePendingPhotosFromSnapshot(snapshot);
  const pendingPhotosPlatine = (snapshot.pendingPhotosPlatine || [])
    .map((e) => restoreVigikPhotoFromSnapshot(e))
    .filter(Boolean);
  const pendingPhotosPlatinePortail = (snapshot.pendingPhotosPlatinePortail || [])
    .map((e) => restoreVigikPhotoFromSnapshot(e))
    .filter(Boolean);
  return { pendingPhotos, pendingPhotosPlatine, pendingPhotosPlatinePortail };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.includes(",")) return null;
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const b64 = parts[1];
  if (!b64) return null;
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

/**
 * Sérialise le snapshot (blobs) pour inclusion JSON dans le payload brouillon serveur.
 */
export async function serializePhotoSnapshotForPayload(snapshot) {
  if (!snapshot || photoSnapshotIsEmpty(snapshot)) return null;
  const out = { pendingPhotos: {}, pendingPhotosPlatine: [], pendingPhotosPlatinePortail: [] };
  for (const [idxStr, arr] of Object.entries(snapshot.pendingPhotos || {})) {
    if (!arr?.length) continue;
    out.pendingPhotos[idxStr] = [];
    for (const p of arr) {
      const blob = p.blob;
      if (!(blob instanceof Blob)) continue;
      const dataUrl = await blobToDataUrl(blob);
      out.pendingPhotos[idxStr].push({
        dataUrl,
        type_photo: p.type_photo,
        filename: p.filename || p.file?.name || "photo.jpg",
        date_photo: p.date_photo,
      });
    }
  }
  for (const e of snapshot.pendingPhotosPlatine || []) {
    if (!(e.blob instanceof Blob)) continue;
    out.pendingPhotosPlatine.push({
      dataUrl: await blobToDataUrl(e.blob),
      name: e.name || "photo.jpg",
    });
  }
  for (const e of snapshot.pendingPhotosPlatinePortail || []) {
    if (!(e.blob instanceof Blob)) continue;
    out.pendingPhotosPlatinePortail.push({
      dataUrl: await blobToDataUrl(e.blob),
      name: e.name || "photo.jpg",
    });
  }
  for (const k of Object.keys(out.pendingPhotos)) {
    if (!out.pendingPhotos[k]?.length) delete out.pendingPhotos[k];
  }
  if (
    !Object.keys(out.pendingPhotos).length &&
    !out.pendingPhotosPlatine.length &&
    !out.pendingPhotosPlatinePortail.length
  ) {
    return null;
  }
  return out;
}

/**
 * Repasse du JSON serveur au format snapshot interne (blobs) pour applyPhotoSnapshotToState.
 */
export function deserializePhotoSnapshotFromPayload(serialized) {
  if (!serialized) return null;
  const pendingPhotosOut = {};
  for (const [idxStr, arr] of Object.entries(serialized.pendingPhotos || {})) {
    if (!Array.isArray(arr)) continue;
    pendingPhotosOut[idxStr] = arr
      .map((item) => {
        const blob = dataUrlToBlob(item.dataUrl);
        if (!blob) return null;
        return {
          blob,
          type_photo: item.type_photo,
          filename: item.filename || "photo.jpg",
          date_photo: item.date_photo,
        };
      })
      .filter(Boolean);
  }
  const snapshot = {
    pendingPhotos: pendingPhotosOut,
    pendingPhotosPlatine: [],
    pendingPhotosPlatinePortail: [],
  };
  const legacyPlat = serialized.pendingPhotoPlatine?.dataUrl
    ? [{ dataUrl: serialized.pendingPhotoPlatine.dataUrl, name: serialized.pendingPhotoPlatine.name }]
    : [];
  const arrPlat = serialized.pendingPhotosPlatine?.length ? serialized.pendingPhotosPlatine : legacyPlat;
  for (const item of arrPlat || []) {
    const blob = dataUrlToBlob(item.dataUrl);
    if (blob) snapshot.pendingPhotosPlatine.push({ blob, name: item.name || "photo.jpg" });
  }
  const legacyPort = serialized.pendingPhotoPlatinePortail?.dataUrl
    ? [{ dataUrl: serialized.pendingPhotoPlatinePortail.dataUrl, name: serialized.pendingPhotoPlatinePortail.name }]
    : [];
  const arrPort = serialized.pendingPhotosPlatinePortail?.length
    ? serialized.pendingPhotosPlatinePortail
    : legacyPort;
  for (const item of arrPort || []) {
    const blob = dataUrlToBlob(item.dataUrl);
    if (blob) snapshot.pendingPhotosPlatinePortail.push({ blob, name: item.name || "photo.jpg" });
  }
  return photoSnapshotIsEmpty(snapshot) ? null : snapshot;
}
```

### 7.4 `frontend/src/components/RapportIntervention/index.js`

```javascript
export { default as RapportsPage } from "./RapportsPage";
export { default as RapportForm } from "./RapportForm";
export { default as RapportPreview } from "./RapportPreview";
export { default as PrestationSection } from "./PrestationSection";
export { default as PhotoManager } from "./PhotoManager";
export { default as SignaturePad } from "./SignaturePad";
export { default as ChantierRapportsList } from "./ChantierRapportsList";
export { default as RapportMobileLayout } from "./RapportMobileLayout";
```

### 7.5 `frontend/src/components/RapportIntervention/PhotoManager.js`

```javascript
import React, { useRef, useMemo, useState, useEffect } from "react";
import { Box, Button, IconButton, Typography, Chip, TextField, CircularProgress, Dialog } from "@mui/material";
import {
  MdAddAPhoto,
  MdDelete,
  MdPhotoCamera,
  MdPhotoLibrary,
  MdChevronLeft,
  MdChevronRight,
  MdClose,
} from "react-icons/md";
import { COLORS } from "../../constants/colors";
import { compressImage } from "../../utils/compressImage";

const TYPE_LABELS = {
  avant: "Avant travaux",
  en_cours: "En cours",
  apres: "Apres travaux",
};

const TYPE_COLORS = {
  avant: COLORS.infoDark || "#1976d2",
  en_cours: "#ed6c02",
  apres: "#2e7d32",
};

const PhotoManager = ({
  photos = [],
  pendingPhotos = [],
  onUpload,
  onDelete,
  onUpdatePhoto,
  onAddPendingPhoto,
  onRemovePendingPhoto,
  disabled,
  prestationId,
  isMobile = false,
}) => {
  const fileInputRef = useRef(null);
  const fileInputCameraRef = useRef(null);
  const currentTypeRef = useRef("avant");
  const [compressing, setCompressing] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const touchStartXRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setCompressing(true);
    try {
      const compressed = await Promise.all(files.map((f) => compressImage(f)));

      if (prestationId) {
        for (const file of compressed) {
          await onUpload(prestationId, file, currentTypeRef.current);
        }
      } else if (onAddPendingPhoto) {
        for (const file of compressed) {
          onAddPendingPhoto(file, currentTypeRef.current);
        }
      }
    } finally {
      setCompressing(false);
    }
    e.target.value = "";
  };

  const triggerUpload = (type, source = "gallery") => {
    currentTypeRef.current = type;
    if (source === "camera" && fileInputCameraRef.current) {
      fileInputCameraRef.current.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDateChange = (photoId, newDate) => {
    if (onUpdatePhoto) {
      onUpdatePhoto(photoId, { date_photo: newDate });
    }
  };

  const allPhotos = useMemo(() => {
    const saved = photos.map((p) => ({ ...p, _pending: false }));
    const pending = pendingPhotos.map((p, i) => ({
      ...p,
      _pending: true,
      _index: i,
      image_url: p._previewUrl,
    }));
    return [...saved, ...pending];
  }, [photos, pendingPhotos]);

  const photosByType = {
    avant: allPhotos.filter((p) => p.type_photo === "avant"),
    en_cours: allPhotos.filter((p) => p.type_photo === "en_cours"),
    apres: allPhotos.filter((p) => p.type_photo === "apres"),
  };

  const openGallery = (photo) => {
    const idx = allPhotos.findIndex((p) =>
      (photo.id && p.id === photo.id) ||
      (!photo.id && p._pending && photo._pending && p._index === photo._index && p.filename === photo.filename)
    );
    setGalleryIndex(idx >= 0 ? idx : 0);
    setGalleryOpen(true);
  };

  const closeGallery = () => setGalleryOpen(false);

  const goPrev = () => {
    if (!allPhotos.length) return;
    setGalleryIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const goNext = () => {
    if (!allPhotos.length) return;
    setGalleryIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const activePhoto = allPhotos[galleryIndex] || null;
  const activeType = activePhoto?.type_photo;
  const activeDate = activePhoto?.date_photo || new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!galleryOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") closeGallery();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [galleryOpen, allPhotos.length]);

  useEffect(() => {
    if (galleryOpen) setZoom(1);
  }, [galleryOpen, galleryIndex]);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.changedTouches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e) => {
    const startX = touchStartXRef.current;
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    if (startX == null || endX == null) return;
    const delta = endX - startX;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) goPrev();
    else goNext();
  };

  return (
    <>
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
      <input
        ref={fileInputCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        {Object.entries(TYPE_LABELS).map(([type, label]) =>
          isMobile ? (
            <Box key={type} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: TYPE_COLORS[type] }}>
                {label}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MdPhotoCamera />}
                  disabled={disabled || compressing}
                  onClick={() => triggerUpload(type, "camera")}
                  sx={{
                    borderColor: TYPE_COLORS[type],
                    color: TYPE_COLORS[type],
                    minHeight: 44,
                    "&:hover": {
                      borderColor: TYPE_COLORS[type],
                      backgroundColor: `${TYPE_COLORS[type]}10`,
                    },
                  }}
                >
                  Prendre une photo
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MdPhotoLibrary />}
                  disabled={disabled || compressing}
                  onClick={() => triggerUpload(type, "gallery")}
                  sx={{
                    borderColor: TYPE_COLORS[type],
                    color: TYPE_COLORS[type],
                    minHeight: 44,
                    "&:hover": {
                      borderColor: TYPE_COLORS[type],
                      backgroundColor: `${TYPE_COLORS[type]}10`,
                    },
                  }}
                >
                  Galerie
                </Button>
              </Box>
            </Box>
          ) : (
            <Button
              key={type}
              size="small"
              variant="outlined"
              startIcon={<MdAddAPhoto />}
              disabled={disabled || compressing}
              onClick={() => triggerUpload(type, "gallery")}
              sx={{
                borderColor: TYPE_COLORS[type],
                color: TYPE_COLORS[type],
                "&:hover": {
                  borderColor: TYPE_COLORS[type],
                  backgroundColor: `${TYPE_COLORS[type]}10`,
                },
              }}
            >
              {label}
            </Button>
          )
        )}
        {compressing && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">Compression...</Typography>
          </Box>
        )}
      </Box>

      {Object.entries(photosByType).map(([type, typePhotos]) =>
        typePhotos.length > 0 ? (
          <Box key={type} sx={{ mb: 2 }}>
            <Chip
              label={TYPE_LABELS[type]}
              size="small"
              sx={{
                mb: 1,
                backgroundColor: `${TYPE_COLORS[type]}15`,
                color: TYPE_COLORS[type],
                fontWeight: 600,
              }}
            />
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              {typePhotos.map((photo, idx) => (
                <Box
                  key={photo.id || `pending-${photo._index}-${idx}`}
                  sx={{
                    width: 140,
                    borderRadius: 1,
                    overflow: "hidden",
                    border: `2px solid ${photo._pending ? "#ff980040" : `${TYPE_COLORS[type]}40`}`,
                    position: "relative",
                  }}
                >
                  {photo._pending && (
                    <Chip
                      label="En attente"
                      size="small"
                      sx={{
                        position: "absolute", top: 2, left: 2, zIndex: 1,
                        fontSize: 9, height: 18,
                        backgroundColor: "rgba(255,152,0,0.9)", color: "#fff",
                      }}
                    />
                  )}
                  <Box sx={{ position: "relative", width: "100%", height: 100 }}>
                    <img
                      src={photo.image_url}
                      alt={photo.filename || "Photo"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onClick={() => openGallery(photo)}
                    />
                    {!disabled && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (photo._pending) {
                            onRemovePendingPhoto?.(photo._index);
                          } else {
                            onDelete(photo.id);
                          }
                        }}
                        sx={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          backgroundColor: "rgba(255,255,255,0.85)",
                          "&:hover": { backgroundColor: "#ffebee" },
                          padding: "2px",
                        }}
                      >
                        <MdDelete size={16} color="#c62828" />
                      </IconButton>
                    )}
                  </Box>
                  {!photo._pending && (
                    <TextField
                      type="date"
                      size="small"
                      value={photo.date_photo || new Date().toISOString().split("T")[0]}
                      onChange={(e) => handleDateChange(photo.id, e.target.value)}
                      disabled={disabled}
                      inputProps={{ style: { fontSize: 11, padding: "3px 6px" } }}
                      sx={{ width: "100%", "& .MuiOutlinedInput-notchedOutline": { border: "none" } }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        ) : null
      )}

      {allPhotos.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
          Aucune photo. Utilisez les boutons ci-dessus pour ajouter des photos.
        </Typography>
      )}
    </Box>
    <Dialog
      open={galleryOpen}
      onClose={closeGallery}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { backgroundColor: "#111", color: "#fff" } }}
    >
      <Box sx={{ position: "relative", p: { xs: 1.5, md: 2 } }}>
        <IconButton
          onClick={closeGallery}
          sx={{ position: "absolute", top: 8, right: 8, color: "#fff", zIndex: 2 }}
        >
          <MdClose />
        </IconButton>

        {activePhoto && (
          <>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
                mb: 1.5,
                pr: 5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  label={TYPE_LABELS[activeType] || "Photo"}
                  size="small"
                  sx={{
                    backgroundColor: `${TYPE_COLORS[activeType] || "#1976d2"}50`,
                    color: "#fff",
                    fontWeight: 600,
                  }}
                />
                {activePhoto._pending && (
                  <Chip
                    label="En attente"
                    size="small"
                    sx={{ backgroundColor: "#ff9800", color: "#fff", fontWeight: 600 }}
                  />
                )}
                <Typography variant="body2" sx={{ color: "#ddd" }}>
                  Date: {activeDate}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "#bbb" }}>
                {galleryIndex + 1} / {allPhotos.length}
              </Typography>
            </Box>

            <Box sx={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
              {allPhotos.length > 1 && (
                <IconButton
                  onClick={goPrev}
                  sx={{
                    position: "absolute",
                    left: { xs: 4, md: 8 },
                    color: "#fff",
                    backgroundColor: "rgba(0,0,0,0.35)",
                    "&:hover": { backgroundColor: "rgba(0,0,0,0.5)" },
                    zIndex: 1,
                  }}
                >
                  <MdChevronLeft size={28} />
                </IconButton>
              )}

              <Box
                component="img"
                src={activePhoto.image_url}
                alt={activePhoto.filename || "Photo"}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                sx={{
                  width: "100%",
                  maxHeight: "72vh",
                  objectFit: "contain",
                  borderRadius: 1,
                  transform: `scale(${zoom})`,
                  transition: "transform 0.2s ease",
                }}
              />

              {allPhotos.length > 1 && (
                <IconButton
                  onClick={goNext}
                  sx={{
                    position: "absolute",
                    right: { xs: 4, md: 8 },
                    color: "#fff",
                    backgroundColor: "rgba(0,0,0,0.35)",
                    "&:hover": { backgroundColor: "rgba(0,0,0,0.5)" },
                    zIndex: 1,
                  }}
                >
                  <MdChevronRight size={28} />
                </IconButton>
              )}
            </Box>
            <Box sx={{ mt: 1.5, display: "flex", justifyContent: "center", gap: 1 }}>
              <Button size="small" variant="outlined" onClick={() => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}>Zoom -</Button>
              <Button size="small" variant="outlined" onClick={() => setZoom(1)}>Reset</Button>
              <Button size="small" variant="outlined" onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}>Zoom +</Button>
            </Box>
          </>
        )}
      </Box>
    </Dialog>
    </>
  );
};

export default PhotoManager;
```

### 7.6 `frontend/src/components/RapportIntervention/SignaturePad.js`

```javascript
import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { Box, Button, Typography } from "@mui/material";
import { MdDelete } from "react-icons/md";

const SignaturePad = forwardRef(
  (
    {
      existingSignatureUrl,
      disabled,
      restoreFromDataUrl,
      onRestoreFromDataUrlHandled,
      onSignatureCommit,
    },
    ref
  ) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const onCommitRef = useRef(onSignatureCommit);
    onCommitRef.current = onSignatureCommit;

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }, []);

    useEffect(() => {
      if (!restoreFromDataUrl || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const src = restoreFromDataUrl;
      const load = (withCrossOrigin) => {
        const img = new Image();
        if (typeof src === "string" && /^https?:\/\//i.test(src) && withCrossOrigin) {
          try {
            const u = new URL(src);
            if (u.origin !== window.location.origin) {
              img.crossOrigin = "anonymous";
            }
          } catch {
            /* ignore */
          }
        }
        img.onload = () => {
          try {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.restore();
            setHasSignature(true);
          } finally {
            onRestoreFromDataUrlHandled?.();
          }
        };
        img.onerror = () => {
          if (withCrossOrigin && typeof src === "string" && /^https?:\/\//i.test(src)) {
            load(false);
            return;
          }
          onRestoreFromDataUrlHandled?.();
        };
        img.src = src;
      };
      load(true);
    }, [restoreFromDataUrl, onRestoreFromDataUrlHandled]);

    const getPos = useCallback((e) => {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }, []);

    const clearCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      setHasSignature(false);
      onCommitRef.current?.();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getSignatureDataUrl: () => {
          if (!hasSignature) return null;
          try {
            return canvasRef.current?.toDataURL("image/png") || null;
          } catch {
            return null;
          }
        },
        hasSignature: () => hasSignature,
        clear: () => clearCanvas(),
      }),
      [hasSignature, clearCanvas]
    );

    const startDrawing = useCallback(
      (e) => {
        if (disabled) return;
        e.preventDefault();
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext("2d");
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
      },
      [disabled, getPos]
    );

    const draw = useCallback(
      (e) => {
        if (!isDrawing || disabled) return;
        e.preventDefault();
        const pos = getPos(e);
        const ctx = canvasRef.current.getContext("2d");
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        setHasSignature(true);
      },
      [isDrawing, disabled, getPos]
    );

    const stopDrawing = useCallback(() => {
      if (isDrawing) {
        onCommitRef.current?.();
      }
      setIsDrawing(false);
    }, [isDrawing]);

    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Signature
        </Typography>
        {existingSignatureUrl && !hasSignature ? (
          <Box sx={{ mb: 1 }}>
            <img
              src={existingSignatureUrl}
              alt="Signature existante"
              style={{ maxWidth: 300, maxHeight: 150, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </Box>
        ) : null}
        <Box
          sx={{
            border: "2px dashed #ccc",
            borderRadius: 1,
            position: "relative",
            touchAction: "none",
            cursor: disabled ? "not-allowed" : "crosshair",
            opacity: disabled ? 0.5 : 1,
            mb: 1,
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: 200, display: "block" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<MdDelete />}
            onClick={clearCanvas}
            disabled={disabled || !hasSignature}
          >
            Effacer
          </Button>
          {hasSignature && (
            <Typography variant="caption" color="success.main" sx={{ alignSelf: "center" }}>
              Signature prete - elle sera enregistree a la sauvegarde
            </Typography>
          )}
        </Box>
      </Box>
    );
  }
);

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
```

### 7.7 `frontend/src/components/RapportIntervention/PrestationSection.js`

```javascript
import React, { useState } from "react";
import {
  Box, TextField, Typography, IconButton, Switch, FormControlLabel, Paper, Divider, Collapse,
} from "@mui/material";
import { MdDelete, MdDragHandle } from "react-icons/md";
import PhotoManager from "./PhotoManager";
import { COLORS } from "../../constants/colors";

const PrestationSection = ({
  prestation,
  index,
  onChange,
  onDraftCommit,
  onRemove,
  onUploadPhoto,
  onDeletePhoto,
  onUpdatePhoto,
  onAddPendingPhoto,
  onRemovePendingPhoto,
  disabled,
  isSaved,
  pendingPhotos,
  isMobile,
}) => {
  const [expanded, setExpanded] = useState(true);

  const handleFieldChange = (field, value) => {
    onChange(index, { ...prestation, [field]: value });
  };

  const fieldGap = isMobile ? 2.5 : 2;
  const rowsMultiline = isMobile ? 3 : 2;

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${COLORS.border || "#e0e0e0"}`,
        borderRadius: 2,
        mb: isMobile ? 3 : 2,
        overflow: "hidden",
      }}
    >
      <Box
        onClick={() => setExpanded((prev) => !prev)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: COLORS.backgroundAlt || "#f5f5f5",
          px: { xs: 2, md: 2 },
          py: isMobile ? 1.5 : 1,
          cursor: "pointer",
          "&:hover": { backgroundColor: COLORS.borderLight || "#eee" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdDragHandle size={20} color="#999" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: isMobile ? "1rem" : undefined }}>
            {(prestation.localisation || "").trim() || `Prestation ${index + 1}`}
          </Typography>
        </Box>
        {!disabled && (
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            sx={isMobile ? { minWidth: 48, minHeight: 48 } : {}}
          >
            <MdDelete />
          </IconButton>
        )}
      </Box>

      <Collapse in={expanded}>
      <Box sx={{ p: isMobile ? 2.5 : 2, display: "flex", flexDirection: "column", gap: fieldGap }}>
        <TextField
          label="Localisation *"
          placeholder="Ex: Bat A03, hall d'entree bat 2..."
          value={prestation.localisation || ""}
          onChange={(e) => handleFieldChange("localisation", e.target.value)}
          onBlur={() => onDraftCommit?.()}
          fullWidth
          size="small"
          disabled={disabled}
        />

        <TextField
          label="Probleme constate *"
          placeholder="Dysfonction constatee..."
          value={prestation.probleme || ""}
          onChange={(e) => handleFieldChange("probleme", e.target.value)}
          onBlur={() => onDraftCommit?.()}
          fullWidth
          multiline
          minRows={2}
          maxRows={20}
          size="small"
          disabled={disabled}
        />

        <TextField
          label="Solution *"
          placeholder="Solution pour regler le probleme..."
          value={prestation.solution || ""}
          onChange={(e) => handleFieldChange("solution", e.target.value)}
          onBlur={() => onDraftCommit?.()}
          fullWidth
          multiline
          minRows={2}
          maxRows={20}
          size="small"
          disabled={disabled}
        />

        <TextField
          label="Commentaire"
          placeholder="Commentaire libre..."
          value={prestation.commentaire || ""}
          onChange={(e) => handleFieldChange("commentaire", e.target.value)}
          onBlur={() => onDraftCommit?.()}
          fullWidth
          multiline
          rows={rowsMultiline}
          size="small"
          disabled={disabled}
        />

        <FormControlLabel
          control={
            <Switch
              checked={prestation.prestation_possible !== false}
              onChange={(e) => {
                handleFieldChange("prestation_possible", e.target.checked);
                onDraftCommit?.();
              }}
              disabled={disabled}
            />
          }
          label="Prestation possible"
          sx={isMobile ? { mt: 0.5, mb: 0.5 } : {}}
        />

        <TextField
          label="Prestations realisees"
          placeholder="Liste des prestations realisees..."
          value={prestation.prestation_realisee || ""}
          onChange={(e) => handleFieldChange("prestation_realisee", e.target.value)}
          onBlur={() => onDraftCommit?.()}
          fullWidth
          multiline
          rows={rowsMultiline}
          size="small"
          disabled={disabled}
        />

        <Divider sx={{ my: isMobile ? 1.5 : 1 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: isMobile ? "0.9375rem" : undefined }}>
          Photos
        </Typography>
        <PhotoManager
          photos={prestation.photos || []}
          pendingPhotos={pendingPhotos || []}
          prestationId={isSaved ? prestation.id : null}
          onUpload={onUploadPhoto}
          onDelete={onDeletePhoto}
          onUpdatePhoto={onUpdatePhoto}
          onAddPendingPhoto={(file, type) => onAddPendingPhoto?.(index, file, type)}
          onRemovePendingPhoto={(photoIdx) => onRemovePendingPhoto?.(index, photoIdx)}
          disabled={disabled}
          isMobile={isMobile}
        />
      </Box>
      </Collapse>
    </Paper>
  );
};

export default PrestationSection;
```

### 7.8 `frontend/src/components/RapportIntervention/RapportForm.js`

Formulaire principal création/édition (intervention + Vigik+). Ce fichier est **volumineux** (~128 Ko) : il est copié tel quel, sans découpage.


```javascript
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Box, Button, TextField, Typography, Paper, MenuItem, Select,
  FormControl, InputLabel, Autocomplete, Chip, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  useTheme,
  useMediaQuery,
  IconButton,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  MdAdd, MdPictureAsPdf, MdArrowBack, MdDelete, MdChevronLeft, MdChevronRight, MdClose,
  MdCheckCircle, MdErrorOutline,
} from "react-icons/md";
import axios from "axios";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { COLORS } from "../../constants/colors";
import { useRapports } from "../../hooks/useRapports";
import PrestationSection from "./PrestationSection";
import SignaturePad from "./SignaturePad";
import elekableLogo from "../../img/logo.png";
import {
  buildPhotoSnapshot,
  saveRapportDraftPhotos,
  clearRapportDraftPhotos,
  loadRapportDraftPhotos,
  applyPhotoSnapshotToState,
  photoSnapshotIsEmpty,
  deserializePhotoSnapshotFromPayload,
} from "../../utils/rapportDraftIDB";
import { compressImage, VIGIK_REPORT_PHOTO_OPTIONS } from "../../utils/compressImage";

const EMPTY_PRESTATION = {
  localisation: "",
  probleme: "",
  solution: "",
  commentaire: "",
  prestation_possible: true,
  prestation_realisee: "",
};

/** Export PNG du pad ; null si vide ou canvas « tainted » (évite SecurityError en promotion / autosave). */
const safeGetSignatureDataUrl = (padRef) => {
  try {
    return padRef?.current?.getSignatureDataUrl?.() ?? null;
  } catch {
    return null;
  }
};

/** Libellés français pour les clés d'erreur API (DRF). */
const RAPPORT_FIELD_LABELS = {
  technicien: "Technicien",
  objet_recherche: "Objet de la recherche",
  resultat: "Résultat",
  dates_intervention: "Dates d'intervention",
  date: "Date",
  titre: "Titre",
  client_societe: "Client / Bailleur",
  chantier: "Chantier",
  residence: "Résidence",
  residence_nom: "Nom de la résidence",
  residence_adresse: "Adresse de la résidence",
  adresse_vigik: "Adresse du rapport (Vigik+)",
  logement: "Lieu d'intervention",
  type_rapport: "Type de rapport",
  statut: "Statut",
  prestations: "Prestations",
  localisation: "Lieu / Localisation",
  probleme: "Problème constaté",
  solution: "Solution apportée",
  commentaire: "Commentaire",
  prestation_possible: "Prestation possible",
  prestation_realisee: "Type de prestation réalisée",
  temps_trajet: "Temps de trajet",
  temps_taches: "Temps de tâches",
  numero_batiment: "Numéro du bâtiment",
  type_installation: "Type d'installation",
  presence_platine: "Présence de platine",
  presence_portail: "Présence d'un portail",
  presence_platine_portail: "Présence de platine Vigik+ au portail",
  devis_a_faire: "Devis à faire",
  devis_fait: "Devis fait",
  devis_lie: "Devis lié",
  locataire_nom: "Nom locataire",
  locataire_prenom: "Prénom locataire",
  locataire_telephone: "Téléphone locataire",
  locataire_email: "Email locataire",
  non_field_errors: "Formulaire",
};

const labelForApiKey = (key) => RAPPORT_FIELD_LABELS[key] || key;

/**
 * Aplatit les erreurs DRF (objets imbriqués, tableaux de messages, prestations).
 */
const flattenApiErrors = (data, pathPrefix = "") => {
  const out = [];
  if (data == null) return out;
  if (typeof data === "string") {
    out.push({ field: pathPrefix || "Erreur", message: data });
    return out;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return out;
    if (typeof data[0] === "string") {
      data.forEach((msg) => out.push({ field: pathPrefix || "Erreur", message: msg }));
    } else {
      data.forEach((item, idx) => {
        const childPath = pathPrefix
          ? `${pathPrefix} — ligne ${idx + 1}`
          : `Ligne ${idx + 1}`;
        out.push(...flattenApiErrors(item, childPath));
      });
    }
    return out;
  }
  if (typeof data === "object") {
    if (data.detail !== undefined && data.detail !== null) {
      if (typeof data.detail === "string") {
        out.push({ field: pathPrefix || "Message", message: data.detail });
      } else {
        out.push(...flattenApiErrors(data.detail, pathPrefix || "Message"));
      }
    }
    for (const [k, v] of Object.entries(data)) {
      if (k === "detail") continue;
      const label = labelForApiKey(k);
      const nextPath = pathPrefix ? `${pathPrefix} — ${label}` : label;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        if (typeof v[0] === "string") {
          v.forEach((msg) => out.push({ field: nextPath, message: msg }));
        } else {
          v.forEach((item, idx) => {
            const p = `${nextPath} (prestation ${idx + 1})`;
            out.push(...flattenApiErrors(item, p));
          });
        }
      } else if (v && typeof v === "object") {
        out.push(...flattenApiErrors(v, nextPath));
      } else if (v != null && v !== "") {
        out.push({ field: nextPath, message: String(v) });
      }
    }
  }
  return out;
};

const parseAxiosSaveError = (err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;
  let items = [];
  if (data !== undefined && data !== null) {
    items = flattenApiErrors(data);
  }
  if (!items.length && err?.message) {
    items = [{ field: "Erreur", message: err.message }];
  }
  if (!items.length) {
    items = [{ field: "Erreur", message: "Une erreur inattendue s'est produite." }];
  }
  let title = "Erreur lors de la sauvegarde";
  if (!err?.response) {
    title = "Impossible de joindre le serveur";
  } else if (status === 400) {
    title = "Données refusées par le serveur";
  } else if (status === 403) {
    title = "Accès refusé";
  } else if (status === 404) {
    title = "Ressource introuvable";
  } else if (status >= 500) {
    title = "Erreur serveur";
  }
  return { title, items };
};

/** Dernier segment du chemin API (nom lisible du champ). */
const labelForDisplay = (field) => {
  const raw = (field || "").trim();
  if (!raw) return "";
  const parts = raw.split(" — ").map((p) => p.trim());
  return parts[parts.length - 1] || raw;
};

const uniqueFieldLabelsFromItems = (items) => {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const raw = (it.field || "").trim();
    const prestationMatch = raw.match(/prestation\s*(\d+)/i);
    let d;
    if (prestationMatch) {
      const lastPart = labelForDisplay(raw);
      d = `Prestation ${prestationMatch[1]} : ${lastPart}`;
    } else {
      d = labelForDisplay(raw);
    }
    if (!d || d === "Erreur" || d === "Message") continue;
    if (!seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out;
};

const FRIENDLY_API_ERROR_TITLE = {
  "Erreur lors de la sauvegarde": "Enregistrement impossible",
  "Impossible de joindre le serveur": "Pas de connexion au serveur",
  "Données refusées par le serveur": "Informations incomplètes ou incorrectes",
  "Accès refusé": "Accès refusé",
  "Ressource introuvable": "Élément introuvable",
  "Erreur serveur": "Problème temporaire sur le serveur",
};

const translateCommonMessage = (msg) => {
  if (!msg || typeof msg !== "string") return "";
  const t = {
    "This field is required.": "Ce champ est obligatoire.",
    "This field may not be null.": "Ce champ est obligatoire.",
    "This field may not be blank.": "Ce champ ne peut pas être vide.",
    "Enter a valid email address.": "Adresse e-mail invalide.",
  };
  return t[msg] || msg;
};

const buildSaveErrorFromApi = (err) => {
  const { title, items } = parseAxiosSaveError(err);
  const fieldLabels = uniqueFieldLabelsFromItems(items);
  let fallbackMessage = "";
  if (fieldLabels.length === 0 && items.length) {
    const firstMsg = items.map((i) => i.message).find(Boolean);
    fallbackMessage =
      translateCommonMessage(firstMsg) ||
      firstMsg ||
      "Une erreur s'est produite. Réessayez dans un instant.";
  }
  return {
    title: FRIENDLY_API_ERROR_TITLE[title] || title,
    fieldLabels,
    fallbackMessage,
  };
};

/** Adresse chantier : rue, code postal + ville (aligné sur le modèle Chantier). */
const formatChantierAddress = (c) => {
  if (!c) return "";
  const rue = (c.rue || "").trim();
  const cp = c.code_postal != null && c.code_postal !== "" ? String(c.code_postal).trim() : "";
  const ville = (c.ville || "").trim();
  const ligne2 = [cp, ville].filter(Boolean).join(" ").trim();
  if (rue && ligne2) return `${rue}, ${ligne2}`;
  if (rue) return rue;
  return ligne2;
};

const todayISO = () => new Date().toISOString().split("T")[0];

const floatHoursToTimeInput = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  const totalMinutes = Math.max(0, Math.round(num * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const timeInputToFloatHours = (value) => {
  if (!value || typeof value !== "string" || !value.includes(":")) return 0;
  const [h, m] = value.split(":");
  const hours = Number(h);
  const minutes = Number(m);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return Math.max(0, hours + (minutes / 60));
};

/** Dernière date saisie (la plus récente) ; null si aucune liste utile. */
const latestInterventionISO = (dates) => {
  if (!dates?.length) return null;
  const sorted = [...dates].map((s) => String(s).slice(0, 10)).filter(Boolean).sort();
  return sorted[sorted.length - 1] || null;
};

const normalizeDatesInterventionFromApi = (data) => {
  if (Array.isArray(data.dates_intervention) && data.dates_intervention.length) {
    return data.dates_intervention.map((d) => String(d).slice(0, 10));
  }
  if (data.date) return [String(data.date).slice(0, 10)];
  return [todayISO()];
};

const RAPPORT_DRAFT_VERSION = 1;
const RAPPORT_DRAFT_PREFIX = "rapport-intervention-draft-v1";

const getRapportDraftStorageKey = (rapportId) =>
  rapportId ? `${RAPPORT_DRAFT_PREFIX}:id:${rapportId}` : `${RAPPORT_DRAFT_PREFIX}:new`;

const createInitialFormData = () => ({
  titre: "",
  dates_intervention: [todayISO()],
  technicien: "",
  objet_recherche: "",
  resultat: "",
  temps_trajet: "",
  temps_taches: "",
  client_societe: "",
  chantier: "",
  residence: null,
  residence_nom: "",
  residence_adresse: "",
  adresse_vigik: "",
  logement: "",
  locataire_nom: "",
  locataire_prenom: "",
  locataire_telephone: "",
  locataire_email: "",
  type_rapport: "intervention",
  statut: "brouillon",
  prestations: [{ ...EMPTY_PRESTATION }],
  numero_batiment: "",
  type_installation: "",
  presence_platine: null,
  presence_portail: null,
  presence_platine_portail: null,
  devis_a_faire: false,
  devis_fait: false,
  devis_lie: null,
});

const readRapportDraftFromStorage = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.v !== RAPPORT_DRAFT_VERSION || !data.formData) return null;
    return data;
  } catch {
    return null;
  }
};

const writeRapportDraftToStorage = (
  key,
  formData,
  selectedResidence,
  { cachedPhotos = false, signatureDraftDataUrl = null } = {}
) => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        v: RAPPORT_DRAFT_VERSION,
        savedAt: Date.now(),
        formData,
        selectedResidence: selectedResidence ?? null,
        cachedPhotos: !!cachedPhotos,
        signatureDraftDataUrl: signatureDraftDataUrl && String(signatureDraftDataUrl).length > 32 ? signatureDraftDataUrl : null,
      })
    );
  } catch (e) {
    console.warn("Brouillon rapport : enregistrement impossible", e);
  }
};

const clearRapportDraftStorageKey = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

const nonEmptyStr = (s) => String(s || "").trim().length > 0;

/** Indique si le brouillon contient plus que les valeurs par défaut (évite dialogue / stockage inutile). */
const isDraftPayloadMeaningful = (payload) => {
  if (nonEmptyStr(payload?.signatureDraftDataUrl)) return true;
  const fd = payload?.formData;
  if (!fd) return false;
  if (nonEmptyStr(fd.technicien)) return true;
  if (nonEmptyStr(fd.objet_recherche)) return true;
  if (nonEmptyStr(fd.resultat)) return true;
  if (nonEmptyStr(fd.residence_nom)) return true;
  if (nonEmptyStr(fd.adresse_vigik)) return true;
  if (nonEmptyStr(fd.logement)) return true;
  if (nonEmptyStr(fd.locataire_nom) || nonEmptyStr(fd.locataire_prenom)) return true;
  if (nonEmptyStr(fd.locataire_telephone) || nonEmptyStr(fd.locataire_email)) return true;
  if (fd.titre) return true;
  if (fd.client_societe) return true;
  if (fd.chantier) return true;
  if (fd.residence) return true;
  if (nonEmptyStr(fd.numero_batiment)) return true;
  if (nonEmptyStr(fd.type_installation)) return true;
  if (fd.presence_platine !== null && fd.presence_platine !== undefined) return true;
  if (fd.presence_portail !== null && fd.presence_portail !== undefined) return true;
  if (fd.presence_platine_portail !== null && fd.presence_platine_portail !== undefined) return true;
  if (fd.devis_a_faire || fd.devis_fait) return true;
  if (fd.devis_lie) return true;
  if (fd.type_rapport && fd.type_rapport !== "intervention") return true;
  if (fd.statut && fd.statut !== "a_faire" && fd.statut !== "brouillon") return true;
  const prestations = fd.prestations || [];
  if (prestations.length > 1) return true;
  if (prestations[0]) {
    const p = prestations[0];
    if (
      nonEmptyStr(p.localisation) ||
      nonEmptyStr(p.probleme) ||
      nonEmptyStr(p.solution) ||
      nonEmptyStr(p.commentaire)
    ) {
      return true;
    }
    if (p.prestation_realisee) return true;
    if (p.prestation_possible === false) return true;
  }
  if (nonEmptyStr(fd.temps_trajet) || nonEmptyStr(fd.temps_taches)) return true;
  const dates = fd.dates_intervention || [];
  if (dates.length > 1) return true;
  if (dates.length === 1 && dates[0] && String(dates[0]).slice(0, 10) !== todayISO()) return true;
  return false;
};

/** Hydratation depuis le JSON `payload` d'un RapportInterventionBrouillon (API). */
const mergeFormDataFromApiPayload = (data) => {
  if (!data || typeof data !== "object") return createInitialFormData();
  const prestationsSrc = Array.isArray(data.prestations) && data.prestations.length
    ? data.prestations.map((p) => ({ ...EMPTY_PRESTATION, ...p }))
    : [{ ...EMPTY_PRESTATION }];
  return {
    ...createInitialFormData(),
    titre: data.titre || "",
    dates_intervention: normalizeDatesInterventionFromApi(data),
    technicien: data.technicien || "",
    objet_recherche: data.objet_recherche || "",
    resultat: data.resultat || "",
    temps_trajet: floatHoursToTimeInput(data.temps_trajet),
    temps_taches: floatHoursToTimeInput(data.temps_taches),
    client_societe: data.client_societe || "",
    chantier: data.chantier || "",
    residence: data.residence ?? null,
    residence_nom: data.residence_nom || "",
    residence_adresse: data.residence_adresse || "",
    adresse_vigik: data.adresse_vigik ?? "",
    logement: data.logement || "",
    locataire_nom: data.locataire_nom || "",
    locataire_prenom: data.locataire_prenom || "",
    locataire_telephone: data.locataire_telephone || "",
    locataire_email: data.locataire_email || "",
    type_rapport: data.type_rapport || "intervention",
    statut: data.statut || "brouillon",
    prestations: prestationsSrc,
    numero_batiment: data.numero_batiment ?? "",
    type_installation: data.type_installation ?? "",
    presence_platine: data.presence_platine ?? null,
    presence_portail: data.presence_portail ?? null,
    presence_platine_portail: data.presence_platine_portail ?? null,
    devis_a_faire: !!data.devis_a_faire,
    devis_fait: !!data.devis_fait,
    devis_lie: data.devis_lie ?? null,
  };
};

const RapportForm = ({
  rapportId: propRapportId,
  onBack,
  saveButtonAtBottom,
  onReportCreated,
  onRapportIdAssigned,
  serverBrouillonIdToLoad = null,
}) => {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const rapportId = propRapportId || paramId;
  const isEdit = !!rapportId;
  const navigate = useNavigate();
  const brouillonLoadRaw =
    serverBrouillonIdToLoad != null && String(serverBrouillonIdToLoad).trim() !== ""
      ? String(serverBrouillonIdToLoad).trim()
      : searchParams.get("brouillon");
  const brouillonLoadId = brouillonLoadRaw && /^\d+$/.test(brouillonLoadRaw) ? brouillonLoadRaw : null;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const {
    fetchRapport, updateRapport, uploadPhoto, updatePhoto,
    deletePhoto, uploadSignature, genererPdf,
    fetchTitres, createTitre, deleteTitre, loading,
    createRapportBrouillon, patchRapportBrouillon, promouvoirRapportBrouillon,
  } = useRapports();

  const [formData, setFormData] = useState(createInitialFormData);

  const [rapportData, setRapportData] = useState(null);
  const [titres, setTitres] = useState([]);
  const [techniciensSuggestions, setTechniciensSuggestions] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [residences, setResidences] = useState([]);
  const [selectedResidence, setSelectedResidence] = useState(null);
  const [pendingPhotos, setPendingPhotos] = useState({});
  const [pendingPhotosPlatine, setPendingPhotosPlatine] = useState([]);
  const [pendingPhotosPlatinePortail, setPendingPhotosPlatinePortail] = useState([]);
  const photoPlatineInputRef = useRef(null);
  const photoPlatineCameraInputRef = useRef(null);
  const photoPlatinePortailInputRef = useRef(null);
  const photoPlatinePortailCameraInputRef = useRef(null);
  const signaturePadRef = useRef(null);
  const [newTitreDialog, setNewTitreDialog] = useState(false);
  const [newTitreName, setNewTitreName] = useState("");
  const [deleteTitreDialogOpen, setDeleteTitreDialogOpen] = useState(false);
  const [titreToDelete, setTitreToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [saveErrorModal, setSaveErrorModal] = useState({
    open: false,
    title: "",
    fieldLabels: [],
    fallbackMessage: "",
  });
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalContext, setSuccessModalContext] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [vigikGalleryOpen, setVigikGalleryOpen] = useState(false);
  const [vigikGalleryIndex, setVigikGalleryIndex] = useState(0);
  const [vigikZoom, setVigikZoom] = useState(1);
  const [vigikPhotoCompressing, setVigikPhotoCompressing] = useState(false);
  const vigikTouchStartXRef = useRef(null);
  const draftPromptForIdRef = useRef(null);
  const suppressDraftAutosaveRef = useRef(false);

  const [draftSaveEnabled, setDraftSaveEnabled] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [signatureDraftRestoreUrl, setSignatureDraftRestoreUrl] = useState(null);
  /** Brouillon serveur (nouveau rapport sans id) — promouvoir → RapportIntervention. */
  const [serverBrouillonId, setServerBrouillonId] = useState(null);

  const formDataRef = useRef(null);
  const selectedResidenceRef = useRef(null);
  const pendingPhotosRef = useRef(null);
  const pendingPhotosPlatineRef = useRef(null);
  const pendingPhotosPlatinePortailRef = useRef(null);
  const rapportDataRef = useRef(null);
  const draftSaveEnabledRef = useRef(false);
  const savingRef = useRef(false);
  const isEditRef = useRef(isEdit);
  const rapportIdRef = useRef(rapportId);
  const serverBrouillonIdRef = useRef(null);
  const serverBrouillonLoadedRef = useRef(null);
  const lastDraftMediaRef = useRef(null);
  const draftPersistCoalesceRef = useRef({ pending: false, running: false });
  const scheduleDraftPersistenceImplRef = useRef(() => {});

  const handleSignatureDraftRestoreHandled = useCallback(() => {
    setSignatureDraftRestoreUrl(null);
    scheduleDraftPersistenceImplRef.current();
  }, []);

  formDataRef.current = formData;
  selectedResidenceRef.current = selectedResidence;
  pendingPhotosRef.current = pendingPhotos;
  pendingPhotosPlatineRef.current = pendingPhotosPlatine;
  pendingPhotosPlatinePortailRef.current = pendingPhotosPlatinePortail;
  rapportDataRef.current = rapportData;
  draftSaveEnabledRef.current = draftSaveEnabled;
  savingRef.current = saving;
  isEditRef.current = isEdit;
  rapportIdRef.current = rapportId;
  serverBrouillonIdRef.current = serverBrouillonId;

  const scheduleDraftPersistence = () => scheduleDraftPersistenceImplRef.current();

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const loadReferences = useCallback(async () => {
    try {
      const [titresRes, rapportsRes, societesRes, chantiersRes, residencesRes] = await Promise.all([
        fetchTitres(),
        axios.get("/api/rapports-intervention/", { params: { page_size: 200 } }),
        axios.get("/api/societe/"),
        axios.get("/api/chantier/"),
        axios.get("/api/residences/"),
      ]);
      setTitres(titresRes || []);
      const rapportsList = rapportsRes.data?.results || rapportsRes.data || [];
      const uniqueTechniciens = [...new Set(rapportsList.map((r) => r.technicien).filter(Boolean))];
      setTechniciensSuggestions(uniqueTechniciens);
      setSocietes(societesRes.data?.results || societesRes.data || []);
      setChantiers(chantiersRes.data?.results || chantiersRes.data || []);
      setResidences(residencesRes.data?.results || residencesRes.data || []);
    } catch (err) {
      console.error("Erreur chargement references:", err);
    }
  }, [fetchTitres]);

  const loadRapport = useCallback(async (explicitId) => {
    const id = explicitId ?? rapportId;
    if (!id) return;
    try {
      const data = await fetchRapport(id);
      setRapportData(data);
      setFormData({
        titre: data.titre || "",
        dates_intervention: normalizeDatesInterventionFromApi(data),
        technicien: data.technicien || "",
        objet_recherche: data.objet_recherche || "",
        resultat: data.resultat || "",
        temps_trajet: floatHoursToTimeInput(data.temps_trajet),
        temps_taches: floatHoursToTimeInput(data.temps_taches),
        client_societe: data.client_societe || "",
        chantier: data.chantier || "",
        residence: data.residence || null,
        residence_nom: data.residence_nom || "",
        residence_adresse: data.residence_adresse || "",
        adresse_vigik: data.adresse_vigik ?? "",
        logement: data.logement || "",
        locataire_nom: data.locataire_nom || "",
        locataire_prenom: data.locataire_prenom || "",
        locataire_telephone: data.locataire_telephone || "",
        locataire_email: data.locataire_email || "",
        type_rapport: data.type_rapport || "intervention",
        statut: data.statut || "a_faire",
        prestations: data.prestations?.length
          ? data.prestations
          : [{ ...EMPTY_PRESTATION }],
        numero_batiment: data.numero_batiment ?? "",
        type_installation: data.type_installation ?? "",
        presence_platine: data.presence_platine ?? null,
        presence_portail: data.presence_portail ?? null,
        presence_platine_portail: data.presence_platine_portail ?? null,
        devis_a_faire: !!data.devis_a_faire,
        devis_fait: !!data.devis_fait,
        devis_lie: data.devis_lie ?? null,
      });
      if (data.residence_data) {
        setSelectedResidence({ ...data.residence_data, optionType: "residence" });
      } else {
        setSelectedResidence(null);
      }
      if (data.type_rapport === "vigik_plus") {
        const platRows = data.vigik_platine_photos || [];
        setPendingPhotosPlatine(
          platRows
            .filter((row) => row?.s3_key || row?.url)
            .map((row, i) => ({
              file: null,
              previewUrl: row.url || null,
              name: `photo-${i + 1}`,
              _draftS3Key: row.s3_key || null,
            }))
        );
        const portRows = data.vigik_platine_portail_photos || [];
        setPendingPhotosPlatinePortail(
          portRows
            .filter((row) => row?.s3_key || row?.url)
            .map((row, i) => ({
              file: null,
              previewUrl: row.url || null,
              name: `photo-portail-${i + 1}`,
              _draftS3Key: row.s3_key || null,
            }))
        );
      } else {
        setPendingPhotosPlatine([]);
        setPendingPhotosPlatinePortail([]);
      }
    } catch (err) {
      showSnackbar("Erreur lors du chargement du rapport", "error");
    }
  }, [rapportId, fetchRapport]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    if (rapportId) loadRapport();
  }, [rapportId, loadRapport]);

  useEffect(() => {
    if (!brouillonLoadId) {
      serverBrouillonLoadedRef.current = null;
    }
  }, [brouillonLoadId]);

  useEffect(() => {
    if (isEdit || !brouillonLoadId) return;
    if (serverBrouillonLoadedRef.current === brouillonLoadId) return;
    let cancel = false;
    (async () => {
      try {
        const { data } = await axios.get(`/api/rapports-intervention-brouillons/${brouillonLoadId}/`);
        if (cancel || !data?.payload) return;
        serverBrouillonLoadedRef.current = brouillonLoadId;
        setFormData(mergeFormDataFromApiPayload(data.payload));
        setServerBrouillonId(data.id);
        const dm = data.payload._draft_media;
        lastDraftMediaRef.current = dm || null;
        const typeRap = data.payload.type_rapport || "intervention";
        const isVigik = typeRap === "vigik_plus";
        const isV2 =
          dm &&
          (dm.version === 2 ||
            dm.signature_s3_key ||
            dm.prestation_photos ||
            dm.photo_platine_s3_key ||
            (Array.isArray(dm.photos_platine_s3_keys) && dm.photos_platine_s3_keys.length > 0));
        if (isV2) {
          const sigUrl = dm.signature_presigned_url || dm.signature_draft_data_url;
          setSignatureDraftRestoreUrl(sigUrl && String(sigUrl).length > 32 ? sigUrl : null);
          if (!isVigik && dm.prestation_photos && Object.keys(dm.prestation_photos).length > 0) {
            const out = {};
            for (const [idxStr, items] of Object.entries(dm.prestation_photos)) {
              if (!Array.isArray(items)) continue;
              out[idxStr] = [];
              for (const meta of items) {
                if (!meta?.s3_key) continue;
                const url = meta.presigned_url;
                if (url) {
                  try {
                    const blob = await fetch(url).then((r) => r.blob());
                    const file = new File([blob], meta.filename || "photo.jpg", { type: blob.type || "image/jpeg" });
                    out[idxStr].push({
                      file,
                      _previewUrl: URL.createObjectURL(file),
                      type_photo: meta.type_photo,
                      filename: meta.filename,
                      date_photo: meta.date_photo,
                      _draftS3Key: meta.s3_key,
                    });
                    continue;
                  } catch {
                    /* fallback _draftS3Key seul */
                  }
                }
                out[idxStr].push({
                  type_photo: meta.type_photo,
                  filename: meta.filename,
                  date_photo: meta.date_photo,
                  _draftS3Key: meta.s3_key,
                });
              }
            }
            setPendingPhotos(out);
          } else if (!isVigik) {
            setPendingPhotos({});
          }
          if (isVigik) {
            setPendingPhotos({});
            const platKeys = Array.isArray(dm.photos_platine_s3_keys)
              ? dm.photos_platine_s3_keys
              : dm.photo_platine_s3_key
                ? [dm.photo_platine_s3_key]
                : [];
            const platUrls = Array.isArray(dm.photo_platine_presigned_urls)
              ? dm.photo_platine_presigned_urls
              : dm.photo_platine_presigned_url
                ? [dm.photo_platine_presigned_url]
                : [];
            const platOut = [];
            for (let i = 0; i < platKeys.length; i++) {
              const k = platKeys[i];
              const u = platUrls[i];
              if (!k) continue;
              if (u) {
                try {
                  const blob = await fetch(u).then((r) => r.blob());
                  const file = new File([blob], `platine-${i + 1}.jpg`, { type: blob.type || "image/jpeg" });
                  platOut.push({
                    file,
                    previewUrl: URL.createObjectURL(file),
                    name: file.name,
                    _draftS3Key: k,
                  });
                } catch {
                  platOut.push({ name: `platine-${i + 1}.jpg`, previewUrl: null, _draftS3Key: k, file: null });
                }
              } else {
                platOut.push({ name: `platine-${i + 1}.jpg`, previewUrl: null, _draftS3Key: k, file: null });
              }
            }
            setPendingPhotosPlatine(platOut);

            const portKeys = Array.isArray(dm.photos_platine_portail_s3_keys)
              ? dm.photos_platine_portail_s3_keys
              : dm.photo_platine_portail_s3_key
                ? [dm.photo_platine_portail_s3_key]
                : [];
            const portUrls = Array.isArray(dm.photo_platine_portail_presigned_urls)
              ? dm.photo_platine_portail_presigned_urls
              : dm.photo_platine_portail_presigned_url
                ? [dm.photo_platine_portail_presigned_url]
                : [];
            const portOut = [];
            for (let i = 0; i < portKeys.length; i++) {
              const k = portKeys[i];
              const u = portUrls[i];
              if (!k) continue;
              if (u) {
                try {
                  const blob = await fetch(u).then((r) => r.blob());
                  const file = new File([blob], `platine-portail-${i + 1}.jpg`, { type: blob.type || "image/jpeg" });
                  portOut.push({
                    file,
                    previewUrl: URL.createObjectURL(file),
                    name: file.name,
                    _draftS3Key: k,
                  });
                } catch {
                  portOut.push({
                    name: `platine-portail-${i + 1}.jpg`,
                    previewUrl: null,
                    _draftS3Key: k,
                    file: null,
                  });
                }
              } else {
                portOut.push({ name: `platine-portail-${i + 1}.jpg`, previewUrl: null, _draftS3Key: k, file: null });
              }
            }
            setPendingPhotosPlatinePortail(portOut);
          } else {
            setPendingPhotosPlatine([]);
            setPendingPhotosPlatinePortail([]);
          }
        } else {
          const sigUrl = dm?.signature_draft_data_url;
          setSignatureDraftRestoreUrl(sigUrl && String(sigUrl).length > 32 ? sigUrl : null);
          const snap = deserializePhotoSnapshotFromPayload(dm?.photo_snapshot);
          if (snap && !photoSnapshotIsEmpty(snap)) {
            const applied = applyPhotoSnapshotToState(snap);
            setPendingPhotos(applied.pendingPhotos);
            setPendingPhotosPlatine(applied.pendingPhotosPlatine || []);
            setPendingPhotosPlatinePortail(applied.pendingPhotosPlatinePortail || []);
          } else {
            setPendingPhotos({});
            setPendingPhotosPlatine([]);
            setPendingPhotosPlatinePortail([]);
          }
        }
      } catch {
        serverBrouillonLoadedRef.current = null;
        setSnackbar({
          open: true,
          message: "Impossible de charger le brouillon serveur",
          severity: "error",
        });
      }
    })();
    return () => {
      cancel = true;
    };
  }, [isEdit, brouillonLoadId]);

  useEffect(() => {
    draftPromptForIdRef.current = null;
  }, [rapportId]);

  /** Brouillon local : nettoyage si vide ; pas de modal — reprise d’un brouillon via la liste (serveur). */
  useEffect(() => {
    if (isEdit) return;
    if (brouillonLoadId) {
      setDraftSaveEnabled(true);
      return;
    }
    const key = getRapportDraftStorageKey(null);
    const draft = readRapportDraftFromStorage(key);
    const hasPhotos = !!draft?.cachedPhotos;
    if (!draft || (!isDraftPayloadMeaningful(draft) && !hasPhotos)) {
      if (draft) {
        clearRapportDraftStorageKey(key);
        clearRapportDraftPhotos(key).catch(() => {});
      }
    }
    setDraftSaveEnabled(true);
  }, [isEdit, brouillonLoadId]);

  /** Brouillon local (édition) : même logique, pas de modal automatique. */
  useEffect(() => {
    if (!isEdit || !rapportId || !rapportData) return;
    if (draftPromptForIdRef.current === rapportId) return;
    draftPromptForIdRef.current = rapportId;
    const key = getRapportDraftStorageKey(rapportId);
    const draft = readRapportDraftFromStorage(key);
    const hasPhotos = !!draft?.cachedPhotos;
    if (!draft || (!isDraftPayloadMeaningful(draft) && !hasPhotos)) {
      if (draft) {
        clearRapportDraftStorageKey(key);
        clearRapportDraftPhotos(key).catch(() => {});
      }
    }
    setDraftSaveEnabled(true);
  }, [isEdit, rapportId, rapportData]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVigikPresencePortailChange = (value) => {
    setFormData((prev) => {
      const next = { ...prev, presence_portail: value };
      if (value === false) {
        next.presence_platine_portail = null;
      }
      return next;
    });
    scheduleDraftPersistence();
  };

  const handleVigikPlatinePortailChange = (value) => {
    setFormData((prev) => ({ ...prev, presence_platine_portail: value }));
    if (value === false) {
      (pendingPhotosPlatinePortail || []).forEach((p) => {
        if (p?.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
      });
      setPendingPhotosPlatinePortail([]);
    }
    scheduleDraftPersistence();
  };

  const residenceOptions = useMemo(() => {
    const fromRes = (residences || []).map((r) => ({
      ...r,
      optionType: "residence",
      key: `res-${r.id}`,
    }));
    const fromCh = (chantiers || []).map((c) => ({
      ...c,
      optionType: "chantier",
      nom: c.chantier_name,
      adresse: formatChantierAddress(c),
      chantierId: c.id,
      key: `ch-${c.id}`,
      client_societe_nom: c.societe && typeof c.societe === "object" ? c.societe.nom_societe : undefined,
    }));
    return [...fromRes, ...fromCh];
  }, [residences, chantiers]);

  const handleResidenceChange = (_, value) => {
    if (value == null) {
      setSelectedResidence(null);
      setFormData((prev) => ({
        ...prev,
        residence: null,
        residence_nom: "",
        residence_adresse: "",
        chantier: "",
      }));
      scheduleDraftPersistence();
      return;
    }
    if (typeof value === "string") {
      setSelectedResidence(null);
      setFormData((prev) => ({
        ...prev,
        residence: null,
        residence_nom: value,
        residence_adresse: "",
        chantier: "",
      }));
      scheduleDraftPersistence();
      return;
    }
    if (value && typeof value === "object" && value.inputValue != null) {
      const raw = String(value.inputValue || "").trim();
      setSelectedResidence(null);
      setFormData((prev) => ({
        ...prev,
        residence: null,
        residence_nom: raw,
        residence_adresse: "",
        chantier: "",
      }));
      scheduleDraftPersistence();
      return;
    }
    if (value && typeof value === "object" && value.optionType === "chantier") {
      const c = chantiers.find((ch) => ch.id === value.chantierId) || value;
      const addr = formatChantierAddress(c);
      setSelectedResidence({
        _fromChantier: true,
        chantierId: value.chantierId,
        nom: value.nom,
        adresse: addr,
        optionType: "chantier",
      });
      setFormData((prev) => ({
        ...prev,
        residence: null,
        residence_nom: value.nom,
        residence_adresse: addr,
        chantier: value.chantierId,
        client_societe: c.societe != null
          ? (typeof c.societe === "object" ? c.societe.id : c.societe)
          : prev.client_societe,
        technicien: prev.technicien,
      }));
      scheduleDraftPersistence();
      return;
    }
    if (value && typeof value === "object" && (value.optionType === "residence" || value.id) && !value.inputValue) {
      const res = value.optionType === "residence" ? value : { ...value, optionType: "residence" };
      setSelectedResidence(res);
      const dr = res.dernier_rapport;
      setFormData((prev) => ({
        ...prev,
        residence: res.id,
        residence_nom: res.nom,
        residence_adresse: res.adresse || "",
        client_societe: dr?.client_societe || res.client_societe || prev.client_societe,
        chantier: dr?.chantier || res.chantier || "",
        technicien: dr?.technicien || prev.technicien,
      }));
      scheduleDraftPersistence();
      return;
    }
    const newName = typeof value === "string" ? value : "";
    setSelectedResidence(null);
    setFormData((prev) => ({
      ...prev,
      residence: null,
      residence_nom: newName,
      residence_adresse: "",
      chantier: "",
    }));
    scheduleDraftPersistence();
  };

  /** Champ Chantier (liste dediee) : garde le meme etat que si le chantier est choisi dans Residence. */
  const handleChantierFieldChange = (_, val) => {
    if (!val) {
      if (selectedResidence?._fromChantier) {
        setSelectedResidence(null);
        setFormData((prev) => ({
          ...prev,
          chantier: "",
          residence_nom: "",
          residence_adresse: "",
        }));
      } else {
        handleFieldChange("chantier", "");
      }
      scheduleDraftPersistence();
      return;
    }
    const addr = formatChantierAddress(val);
    setFormData((prev) => ({
      ...prev,
      chantier: val.id,
      residence_nom: val.chantier_name,
      residence_adresse: addr,
      residence: null,
      client_societe:
        val.societe != null
          ? (typeof val.societe === "object" ? val.societe.id : val.societe)
          : prev.client_societe,
    }));
    setSelectedResidence({
      _fromChantier: true,
      chantierId: val.id,
      nom: val.chantier_name,
      adresse: addr,
      optionType: "chantier",
    });
    scheduleDraftPersistence();
  };

  const handleResidenceInputChange = (_, value, reason) => {
    if (reason === "input" && selectedResidence) {
      setSelectedResidence(null);
      setFormData((prev) => ({
        ...prev,
        residence: null,
        chantier: selectedResidence?._fromChantier ? "" : prev.chantier,
        residence_nom: value,
      }));
      return;
    }
    if (!selectedResidence) {
      setFormData((prev) => ({ ...prev, residence_nom: value }));
    }
  };

  useEffect(() => {
    if (!rapportId || !formData.chantier || formData.residence) return;
    if (rapportData?.residence_data) return;
    const c = chantiers.find((ch) => ch.id === formData.chantier);
    if (!c) return;
    setSelectedResidence({
      _fromChantier: true,
      chantierId: c.id,
      nom: c.chantier_name,
      adresse: formatChantierAddress(c),
      optionType: "chantier",
    });
  }, [rapportId, formData.chantier, formData.residence, rapportData?.residence_data, chantiers]);

  /** Nouveau rapport : résidence choisie par id (ex. chargement brouillon serveur) avant options chargées. */
  useEffect(() => {
    if (rapportId) return;
    if (!formData.residence) return;
    const r = residences.find((x) => x.id === formData.residence);
    if (!r) return;
    setSelectedResidence((prev) => {
      if (prev?.id === r.id && prev?.optionType === "residence" && !prev._fromChantier) return prev;
      return { ...r, optionType: "residence" };
    });
  }, [rapportId, formData.residence, residences]);

  const handlePrestationChange = (index, updatedPrestation) => {
    setFormData((prev) => {
      const newPrestations = [...prev.prestations];
      newPrestations[index] = updatedPrestation;
      return { ...prev, prestations: newPrestations };
    });
  };

  const handleAddPendingPhoto = (prestationIndex, file, typePhoto) => {
    const previewUrl = URL.createObjectURL(file);
    setPendingPhotos((prev) => {
      const current = prev[prestationIndex] || [];
      return {
        ...prev,
        [prestationIndex]: [...current, {
          file,
          type_photo: typePhoto,
          _previewUrl: previewUrl,
          filename: file.name,
          date_photo: new Date().toISOString().split("T")[0],
        }],
      };
    });
    scheduleDraftPersistence();
  };

  const handleRemovePendingPhoto = (prestationIndex, photoIndex) => {
    setPendingPhotos((prev) => {
      const current = [...(prev[prestationIndex] || [])];
      if (current[photoIndex]?._previewUrl) {
        URL.revokeObjectURL(current[photoIndex]._previewUrl);
      }
      current.splice(photoIndex, 1);
      return { ...prev, [prestationIndex]: current };
    });
    scheduleDraftPersistence();
  };

  const handleAddPrestation = () => {
    setFormData((prev) => ({
      ...prev,
      prestations: [...prev.prestations, { ...EMPTY_PRESTATION }],
    }));
    scheduleDraftPersistence();
  };

  const handleRemovePrestation = (index) => {
    setFormData((prev) => ({
      ...prev,
      prestations: prev.prestations.filter((_, i) => i !== index),
    }));
    scheduleDraftPersistence();
  };

  const uploadPendingPhotos = async (savedResult) => {
    const prestations = savedResult.prestations || [];
    const hasPending = Object.values(pendingPhotos).some((arr) => arr?.length > 0);
    if (!hasPending || !prestations.length) return;

    for (const [indexStr, photos] of Object.entries(pendingPhotos)) {
      const idx = parseInt(indexStr, 10);
      const prestation = prestations[idx];
      if (!prestation?.id || !photos?.length) continue;

      for (const pending of photos) {
        try {
          await uploadPhoto(prestation.id, pending.file, pending.type_photo);
        } catch (err) {
          console.error("Erreur upload photo en attente:", err);
        }
      }
    }
    setPendingPhotos({});
  };

  const uploadPendingSignature = async (savedRapportId) => {
    const signatureData = safeGetSignatureDataUrl(signaturePadRef);
    if (!signatureData) return;
    try {
      await uploadSignature(savedRapportId, signatureData);
      signaturePadRef.current?.clear?.();
    } catch (err) {
      console.error("Erreur upload signature:", err);
    }
  };

  const isVigikPlus = formData.type_rapport === "vigik_plus";
  const vigikPortailPhotosEnabled =
    formData.presence_portail === false ||
    (formData.presence_portail === true && formData.presence_platine_portail === true);
  const vigikPhotos = useMemo(() => {
    const out = [];
    const datePlat =
      latestInterventionISO(formData.dates_intervention) ||
      (rapportData?.date ? String(rapportData.date).slice(0, 10) : null) ||
      todayISO();
    (pendingPhotosPlatine || []).forEach((p, i) => {
      if (!p?.previewUrl) return;
      out.push({
        image_url: p.previewUrl,
        label: `Photo platine (${i + 1})`,
        date_photo: datePlat,
        pending: !!p.file,
      });
    });
    if (vigikPortailPhotosEnabled) {
      (pendingPhotosPlatinePortail || []).forEach((p, i) => {
        if (!p?.previewUrl) return;
        out.push({
          image_url: p.previewUrl,
          label: `Photo platine portail (${i + 1})`,
          date_photo: datePlat,
          pending: !!p.file,
        });
      });
    }
    return out;
  }, [
    pendingPhotosPlatine,
    pendingPhotosPlatinePortail,
    formData.dates_intervention,
    vigikPortailPhotosEnabled,
    rapportData?.date,
  ]);

  const openVigikGallery = (index) => {
    if (!vigikPhotos.length) return;
    const idx = Math.max(0, Math.min(index, vigikPhotos.length - 1));
    setVigikGalleryIndex(idx);
    setVigikGalleryOpen(true);
  };

  const closeVigikGallery = () => setVigikGalleryOpen(false);
  const goVigikPrev = () => {
    if (!vigikPhotos.length) return;
    setVigikGalleryIndex((prev) => (prev - 1 + vigikPhotos.length) % vigikPhotos.length);
  };
  const goVigikNext = () => {
    if (!vigikPhotos.length) return;
    setVigikGalleryIndex((prev) => (prev + 1) % vigikPhotos.length);
  };
  const activeVigikPhoto = vigikPhotos[vigikGalleryIndex] || null;

  useEffect(() => {
    if (!vigikGalleryOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") goVigikPrev();
      if (e.key === "ArrowRight") goVigikNext();
      if (e.key === "Escape") closeVigikGallery();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [vigikGalleryOpen, vigikPhotos.length]);

  useEffect(() => {
    if (vigikGalleryOpen) setVigikZoom(1);
  }, [vigikGalleryOpen, vigikGalleryIndex]);

  const handleVigikTouchStart = (e) => {
    vigikTouchStartXRef.current = e.changedTouches?.[0]?.clientX ?? null;
  };

  const handleVigikTouchEnd = (e) => {
    const startX = vigikTouchStartXRef.current;
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    if (startX == null || endX == null) return;
    const delta = endX - startX;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) goVigikPrev();
    else goVigikNext();
  };

  const validateClientBeforeSave = () => {
    const items = [];
    if (!isVigikPlus && !(formData.technicien || "").trim()) {
      items.push({ field: "Technicien", message: "Ce champ est obligatoire." });
    }
    if (!isVigikPlus && !(formData.objet_recherche || "").trim()) {
      items.push({ field: "Objet de la recherche", message: "Ce champ est obligatoire." });
    }
    if (isVigikPlus) {
      const hasResidence = formData.residence || (formData.residence_nom || "").trim();
      if (!hasResidence) {
        items.push({ field: "Résidence", message: "Sélectionnez ou créez une résidence." });
      }
      if (!(formData.adresse_vigik || "").trim()) {
        items.push({ field: "Adresse du rapport (Vigik+)", message: "Ce champ est obligatoire." });
      }
      if (formData.presence_portail !== true && formData.presence_portail !== false) {
        items.push({ field: RAPPORT_FIELD_LABELS.presence_portail, message: "Répondez à cette question." });
      }
      if (formData.presence_portail === true) {
        if (formData.presence_platine_portail !== true && formData.presence_platine_portail !== false) {
          items.push({
            field: RAPPORT_FIELD_LABELS.presence_platine_portail,
            message: "Répondez à cette question.",
          });
        }
      }
      const hasPhotoPlatine =
        (pendingPhotosPlatine || []).some((p) => p?.file || p?._draftS3Key || p?.previewUrl) ||
        (rapportData?.vigik_platine_photos || []).length > 0;
      if (!hasPhotoPlatine) {
        items.push({
          field: "Photo — présence de platine",
          message: "Joignez une photo sous la question « Présence de platine » (obligatoire pour Vigik+).",
        });
      }
    }
    const datesInterventionClean = (formData.dates_intervention || [])
      .map((s) => String(s).slice(0, 10))
      .filter(Boolean);
    if (!datesInterventionClean.length) {
      items.push({ field: "Dates d'intervention", message: "Au moins une date est requise." });
    }
    return { valid: items.length === 0, items };
  };

  const handleValidateClick = () => {
    const { valid, items } = validateClientBeforeSave();
    if (!valid) {
      setSaveErrorModal({
        open: true,
        title: "Champs à compléter",
        fieldLabels: uniqueFieldLabelsFromItems(items),
        fallbackMessage: "",
      });
      return;
    }
    executeValidateRapport();
  };

  const handleSuccessContinue = async () => {
    const ctx = successModalContext;
    setSuccessModalOpen(false);
    setSuccessModalContext(null);
    if (!ctx?.savedId) return;

    if (!ctx.isEdit) {
      if (onReportCreated) {
        onReportCreated(ctx.savedId);
      } else {
        navigate(`/RapportIntervention/${ctx.savedId}`, { replace: true });
      }
    }
    await loadRapport(ctx.savedId);
    loadReferences();
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!successModalOpen) return;
    const timer = setTimeout(() => {
      handleSuccessContinue();
    }, 2000);
    return () => clearTimeout(timer);
  }, [successModalOpen]);

  /** Construit le payload API ; `statutToSend` ex. brouillon, a_faire, en_cours, termine. */
  const buildRapportPayload = (statutToSend) => {
    const datesInterventionClean = (formData.dates_intervention || [])
      .map((s) => String(s).slice(0, 10))
      .filter(Boolean);
    const vigikTitre = isVigikPlus && !formData.titre ? (titres.find((t) => t.nom === "Rapport Vigik+") || titres[0])?.id : formData.titre;
    const normalizeFk = (value) => (value === "" || value === undefined ? null : value);
    return {
      ...formData,
      dates_intervention: datesInterventionClean,
      temps_trajet: timeInputToFloatHours(formData.temps_trajet),
      temps_taches: timeInputToFloatHours(formData.temps_taches),
      titre: normalizeFk(isVigikPlus ? (vigikTitre || formData.titre) : formData.titre),
      client_societe: normalizeFk(formData.client_societe),
      chantier: normalizeFk(formData.chantier),
      statut: statutToSend,
      numero_batiment: formData.numero_batiment ?? "",
      type_installation: formData.type_installation ?? "",
      presence_platine: formData.presence_platine,
      presence_portail: formData.presence_portail,
      presence_platine_portail: formData.presence_platine_portail,
      devis_a_faire: !!formData.devis_a_faire,
      devis_fait: !!formData.devis_fait,
      devis_lie: formData.devis_lie || null,
      prestations: isVigikPlus
        ? []
        : formData.prestations.map((p, i) => ({
            ...p,
            id: p.id || undefined,
            ordre: i,
            photos: undefined,
          })),
    };
  };

  const uploadPhotosAndSignatureAfterSave = async (savedId, result, opts = {}) => {
    if (opts.skipPendingUpload) return;
    if (savedId == null || savedId === undefined) return;
    if (!isVigikPlus && result?.prestations) {
      await uploadPendingPhotos(result);
    } else if (!isVigikPlus) {
      const fullResult = await fetchRapport(savedId);
      await uploadPendingPhotos(fullResult);
    }

    if (isVigikPlus) {
      for (const p of pendingPhotosPlatineRef.current || []) {
        if (!p?.file) continue;
        const fd = new FormData();
        fd.append("rapport_id", savedId);
        fd.append("photo", p.file);
        await axios.post("/api/rapports-intervention/upload_photo_platine/", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (p.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
      }
      if (
        formDataRef.current?.presence_portail === false ||
        (formDataRef.current?.presence_portail === true &&
          formDataRef.current?.presence_platine_portail === true)
      ) {
        for (const p of pendingPhotosPlatinePortailRef.current || []) {
          if (!p?.file) continue;
          const fd = new FormData();
          fd.append("rapport_id", savedId);
          fd.append("photo", p.file);
          await axios.post("/api/rapports-intervention/upload_photo_platine_portail/", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (p.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
        }
      }
      await loadRapport(savedId);
    }

    if (!isVigikPlus) await uploadPendingSignature(savedId);
  };

  /**
   * Brouillon serveur : upload S3 (même logique que les rapports) puis manifeste `_draft_media` v2.
   * Sans `bid`, retourne null (pas de médias dans le JSON tant que le brouillon n’existe pas).
   */
  const buildDraftMediaForServer = useCallback(async (bid) => {
    if (!bid) return null;
    const pp = pendingPhotosRef.current || {};
    const platItems = pendingPhotosPlatineRef.current || [];
    const portItems = pendingPhotosPlatinePortailRef.current || [];
    const vigik = formDataRef.current?.type_rapport === "vigik_plus";
    const dateRef = latestInterventionISO(formDataRef.current?.dates_intervention) || todayISO();

    const prestation_photos = {};
    for (const [idxStr, arr] of Object.entries(pp)) {
      if (!arr?.length) continue;
      const row = [];
      for (const p of arr) {
        if (p._draftS3Key) {
          row.push({
            s3_key: p._draftS3Key,
            type_photo: p.type_photo || "avant",
            filename: p.filename || p.file?.name || "photo.jpg",
            date_photo: p.date_photo || dateRef,
          });
          continue;
        }
        if (!p.file) continue;
        const fd = new FormData();
        fd.append("photo", p.file);
        fd.append("prestation_index", idxStr);
        fd.append("type_photo", p.type_photo || "avant");
        fd.append("date_photo", p.date_photo || dateRef);
        const { data } = await axios.post(
          `/api/rapports-intervention-brouillons/${bid}/upload_photo/`,
          fd,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        row.push({
          s3_key: data.s3_key,
          type_photo: data.type_photo || p.type_photo || "avant",
          filename: data.filename || p.filename || "photo.jpg",
          date_photo: data.date_photo || p.date_photo || dateRef,
        });
      }
      if (row.length) prestation_photos[idxStr] = row;
    }

    let signature_s3_key = lastDraftMediaRef.current?.signature_s3_key ?? null;
    const sigData = safeGetSignatureDataUrl(signaturePadRef);
    const padHasVisual = signaturePadRef.current?.hasSignature?.() ?? false;
    if (sigData && String(sigData).length > 32) {
      const { data: sigRes } = await axios.post(`/api/rapports-intervention-brouillons/${bid}/upload_signature/`, {
        signature: sigData,
      });
      signature_s3_key = sigRes.s3_key || null;
    } else if (padHasVisual && signature_s3_key) {
      /* Canvas non exportable (ex. image sans CORS avant correctif) : on garde la clé S3 déjà enregistrée. */
    }

    const photos_platine_s3_keys = [];
    const photos_platine_portail_s3_keys = [];
    if (vigik) {
      const nextPlatState = [];
      for (const p of platItems) {
        if (p._draftS3Key) {
          photos_platine_s3_keys.push(p._draftS3Key);
          nextPlatState.push({ ...p, file: null });
          continue;
        }
        if (!p.file) continue;
        const fd = new FormData();
        fd.append("photo", p.file);
        const { data } = await axios.post(
          `/api/rapports-intervention-brouillons/${bid}/upload_photo_platine/`,
          fd,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        if (data.s3_key) photos_platine_s3_keys.push(data.s3_key);
        if (p.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
        nextPlatState.push({
          _draftS3Key: data.s3_key,
          name: p.name || "photo.jpg",
          file: null,
          previewUrl: data.presigned_url || null,
        });
      }
      setPendingPhotosPlatine(nextPlatState);

      const fdVigik = formDataRef.current;
      const allowPortailPhoto =
        fdVigik?.presence_portail === false ||
        (fdVigik?.presence_portail === true && fdVigik?.presence_platine_portail === true);
      const nextPortState = [];
      if (allowPortailPhoto) {
        for (const p of portItems) {
          if (p._draftS3Key) {
            photos_platine_portail_s3_keys.push(p._draftS3Key);
            nextPortState.push({ ...p, file: null });
            continue;
          }
          if (!p.file) continue;
          const fd = new FormData();
          fd.append("photo", p.file);
          const { data } = await axios.post(
            `/api/rapports-intervention-brouillons/${bid}/upload_photo_platine_portail/`,
            fd,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          if (data.s3_key) photos_platine_portail_s3_keys.push(data.s3_key);
          if (p.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
          nextPortState.push({
            _draftS3Key: data.s3_key,
            name: p.name || "photo.jpg",
            file: null,
            previewUrl: data.presigned_url || null,
          });
        }
        setPendingPhotosPlatinePortail(nextPortState);
      } else if (fdVigik?.presence_portail === true && fdVigik?.presence_platine_portail === false) {
        setPendingPhotosPlatinePortail([]);
      }
    }

    const hasV2 =
      signature_s3_key ||
      (vigik && photos_platine_s3_keys.length > 0) ||
      (vigik && photos_platine_portail_s3_keys.length > 0) ||
      Object.keys(prestation_photos).length > 0;
    if (!hasV2) return null;

    setPendingPhotos((prev) => {
      const next = { ...prev };
      for (const idxStr of Object.keys(prestation_photos)) {
        const metaList = prestation_photos[idxStr];
        const arr = next[idxStr] || [];
        next[idxStr] = arr.map((item, i) => {
          const m = metaList[i];
          if (m?.s3_key && !item._draftS3Key) return { ...item, _draftS3Key: m.s3_key };
          return item;
        });
      }
      return next;
    });

    const media = {
      version: 2,
      signature_s3_key,
      prestation_photos: vigik ? {} : prestation_photos,
    };
    if (vigik) {
      media.photos_platine_s3_keys = photos_platine_s3_keys;
      media.photos_platine_portail_s3_keys = photos_platine_portail_s3_keys;
    }
    return media;
  }, []);

  /**
   * @param {string} statutToSend
   * @param {{ silent?: boolean, navigateAfterCreate?: boolean }} opts — silent = brouillon auto, pas de modale succès
   */
  const persistRapportCore = async (statutToSend, { silent = false, navigateAfterCreate = true } = {}) => {
    let dataToSend = buildRapportPayload(statutToSend);
    const hadNoId = !rapportId;

    if (!rapportId) {
      try {
        let bid = serverBrouillonIdRef.current;
        if (!bid) {
          const br = await createRapportBrouillon({
            payload: { ...buildRapportPayload(statutToSend), _draft_media: null },
          });
          setServerBrouillonId(br.id);
          bid = br.id;
        }
        const media = await buildDraftMediaForServer(bid);
        dataToSend = { ...buildRapportPayload(statutToSend), _draft_media: media };
        lastDraftMediaRef.current = media;
        await patchRapportBrouillon(bid, { payload: dataToSend });
      } catch (err) {
        console.warn("Sauvegarde brouillon serveur :", err);
        throw err;
      }
      if (silent) {
        return null;
      }
      return null;
    }

    const result = await updateRapport(rapportId, dataToSend);
    const savedId = result?.id || rapportId;
    await uploadPhotosAndSignatureAfterSave(savedId, result);

    if (silent) {
      await loadRapport(savedId);
      setFormData((prev) => ({ ...prev, statut: statutToSend }));
      return savedId;
    }

    setSuccessModalContext({ isEdit: !!rapportId, savedId });
    setSuccessModalOpen(true);
    clearRapportDraftStorageKey(getRapportDraftStorageKey(null));
    clearRapportDraftStorageKey(getRapportDraftStorageKey(savedId));
    clearRapportDraftPhotos(getRapportDraftStorageKey(null)).catch(() => {});
    clearRapportDraftPhotos(getRapportDraftStorageKey(savedId)).catch(() => {});
    return savedId;
  };

  const executeValidateRapport = async () => {
    suppressDraftAutosaveRef.current = true;
    setSaving(true);
    try {
      if (!rapportId) {
        let bid = serverBrouillonIdRef.current;
        if (!bid) {
          const br = await createRapportBrouillon({
            payload: { ...buildRapportPayload("brouillon"), _draft_media: null },
          });
          bid = br.id;
          setServerBrouillonId(bid);
        }
        const media = await buildDraftMediaForServer(bid);
        await patchRapportBrouillon(bid, {
          payload: { ...buildRapportPayload("brouillon"), _draft_media: media },
        });
        lastDraftMediaRef.current = media;
        const mergePayload = buildRapportPayload("en_cours");
        const result = await promouvoirRapportBrouillon(bid, mergePayload);
        const savedId = result?.id;
        if (!savedId) {
          throw new Error("Réponse invalide après promotion du brouillon");
        }
        setPendingPhotos({});
        setPendingPhotosPlatine([]);
        setPendingPhotosPlatinePortail([]);
        setSignatureDraftRestoreUrl(null);
        await uploadPhotosAndSignatureAfterSave(savedId, result, { skipPendingUpload: true });
        setSuccessModalContext({ isEdit: false, savedId });
        setSuccessModalOpen(true);
        setServerBrouillonId(null);
        lastDraftMediaRef.current = null;
        clearRapportDraftStorageKey(getRapportDraftStorageKey(null));
        clearRapportDraftPhotos(getRapportDraftStorageKey(null)).catch(() => {});
      } else {
        await persistRapportCore("en_cours", { silent: false });
      }
    } catch (err) {
      const payload = buildSaveErrorFromApi(err);
      setSaveErrorModal({ open: true, ...payload });
    } finally {
      setSaving(false);
      suppressDraftAutosaveRef.current = false;
    }
  };

  const persistRapportCoreRef = useRef(persistRapportCore);
  persistRapportCoreRef.current = persistRapportCore;

  /**
   * Brouillon local + sauvegarde serveur déclenchés à la fin d’interaction (blur, liste, photo…),
   * pas sur chaque frappe ni sur un intervalle fixe.
   */
  scheduleDraftPersistenceImplRef.current = () => {
    if (!draftSaveEnabledRef.current) return;
    if (rapportDataRef.current?.statut === "termine") return;
    if (suppressDraftAutosaveRef.current) return;
    if (savingRef.current) return;

    const q = draftPersistCoalesceRef.current;
    if (q.running) {
      q.pending = true;
      return;
    }
    q.running = true;
    q.pending = false;
    setTimeout(async () => {
      const runOnce = async () => {
        if (suppressDraftAutosaveRef.current) return;
        const key = getRapportDraftStorageKey(isEditRef.current ? rapportIdRef.current : null);
        const fd = formDataRef.current;
        const sr = selectedResidenceRef.current;
        const pp = pendingPhotosRef.current;
        const pPlat = pendingPhotosPlatineRef.current;
        const pPort = pendingPhotosPlatinePortailRef.current;
        const hasPendingPhotos =
          Object.values(pp || {}).some((arr) => arr?.length > 0) ||
          (pPlat && pPlat.length > 0) ||
          (pPort && pPort.length > 0);
        const sigDraft = safeGetSignatureDataUrl(signaturePadRef);
        const padHasSig = signaturePadRef.current?.hasSignature?.() ?? false;
        const signatureTaintedButPresent = padHasSig && !sigDraft;
        const draftHasContent =
          isDraftPayloadMeaningful({ formData: fd, signatureDraftDataUrl: sigDraft }) ||
          hasPendingPhotos ||
          signatureTaintedButPresent;

        if (!draftHasContent) {
          clearRapportDraftStorageKey(key);
          try {
            await clearRapportDraftPhotos(key);
          } catch {
            /* ignore */
          }
        } else {
          const snapshot = buildPhotoSnapshot(pp, pPlat, pPort);
          try {
            await saveRapportDraftPhotos(key, snapshot);
            writeRapportDraftToStorage(key, fd, sr, {
              cachedPhotos: !photoSnapshotIsEmpty(snapshot),
              signatureDraftDataUrl: sigDraft,
            });
          } catch (e) {
            console.warn("Brouillon photos (IndexedDB) :", e);
            writeRapportDraftToStorage(key, fd, sr, {
              cachedPhotos: false,
              signatureDraftDataUrl: sigDraft,
            });
          }
        }

        if (suppressDraftAutosaveRef.current) return;
        if (savingRef.current) return;
        const ds = rapportDataRef.current?.statut ?? fd.statut ?? "brouillon";
        if (ds === "termine") return;
        setSavingDraft(true);
        try {
          await persistRapportCoreRef.current(ds, { silent: true, navigateAfterCreate: true });
        } catch (err) {
          console.warn("Sauvegarde brouillon :", err);
        } finally {
          setSavingDraft(false);
        }
      };

      try {
        do {
          q.pending = false;
          await runOnce();
        } while (q.pending);
      } finally {
        q.running = false;
      }
    }, 0);
  };

  const handleGeneratePdf = async () => {
    if (!rapportId) return;
    setPdfGenerating(true);
    setSnackbar({ open: true, message: "Generation du PDF en cours...", severity: "info" });
    try {
      await genererPdf(rapportId);
      showSnackbar("PDF genere avec succes");
      await loadRapport();
    } catch (err) {
      showSnackbar("Erreur lors de la generation du PDF", "error");
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleUploadPhoto = async (prestationId, file, typePhoto) => {
    try {
      await uploadPhoto(prestationId, file, typePhoto);
      showSnackbar("Photo ajoutee");
      await loadRapport();
    } catch (err) {
      showSnackbar("Erreur upload photo", "error");
    }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await deletePhoto(photoId);
      showSnackbar("Photo supprimee");
      await loadRapport();
    } catch (err) {
      showSnackbar("Erreur suppression photo", "error");
    }
  };

  const appendVigikPlatineFiles = async (fileList) => {
    const arr = Array.from(fileList || []).filter(Boolean);
    if (!arr.length) return;
    setVigikPhotoCompressing(true);
    try {
      const processed = await Promise.all(arr.map((f) => compressImage(f, VIGIK_REPORT_PHOTO_OPTIONS)));
      setPendingPhotosPlatine((prev) => {
        const next = [...prev];
        for (const file of processed) {
          next.push({ file, name: file.name, previewUrl: URL.createObjectURL(file) });
        }
        return next;
      });
      scheduleDraftPersistence();
    } catch (err) {
      console.warn("Compression photo Vigik+ platine:", err);
      showSnackbar("Impossible de traiter une ou plusieurs images.", "error");
    } finally {
      setVigikPhotoCompressing(false);
    }
  };

  const removeVigikPlatineAt = async (index) => {
    const list = pendingPhotosPlatineRef.current || [];
    const p = list[index];
    if (!p) return;
    if (p.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
    const rid = rapportIdRef.current;
    const bid = serverBrouillonIdRef.current;
    try {
      if (p._draftS3Key && rid) {
        await axios.post("/api/rapports-intervention/delete_photo_vigik/", {
          rapport_id: rid,
          s3_key: p._draftS3Key,
          question: "platine",
        });
      } else if (p._draftS3Key && bid) {
        await axios.post(`/api/rapports-intervention-brouillons/${bid}/delete_photo_vigik/`, {
          s3_key: p._draftS3Key,
          question: "platine",
        });
      }
    } catch (e) {
      console.warn("Suppression photo Vigik+ platine:", e);
    }
    setPendingPhotosPlatine((prev) => prev.filter((_, i) => i !== index));
    scheduleDraftPersistence();
  };

  const appendVigikPortailFiles = async (fileList) => {
    const arr = Array.from(fileList || []).filter(Boolean);
    if (!arr.length) return;
    setVigikPhotoCompressing(true);
    try {
      const processed = await Promise.all(arr.map((f) => compressImage(f, VIGIK_REPORT_PHOTO_OPTIONS)));
      setPendingPhotosPlatinePortail((prev) => {
        const next = [...prev];
        for (const file of processed) {
          next.push({ file, name: file.name, previewUrl: URL.createObjectURL(file) });
        }
        return next;
      });
      scheduleDraftPersistence();
    } catch (err) {
      console.warn("Compression photo Vigik+ portail:", err);
      showSnackbar("Impossible de traiter une ou plusieurs images.", "error");
    } finally {
      setVigikPhotoCompressing(false);
    }
  };

  const removeVigikPortailAt = async (index) => {
    const list = pendingPhotosPlatinePortailRef.current || [];
    const p = list[index];
    if (!p) return;
    if (p.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
    const rid = rapportIdRef.current;
    const bid = serverBrouillonIdRef.current;
    try {
      if (p._draftS3Key && rid) {
        await axios.post("/api/rapports-intervention/delete_photo_vigik/", {
          rapport_id: rid,
          s3_key: p._draftS3Key,
          question: "portail",
        });
      } else if (p._draftS3Key && bid) {
        await axios.post(`/api/rapports-intervention-brouillons/${bid}/delete_photo_vigik/`, {
          s3_key: p._draftS3Key,
          question: "portail",
        });
      }
    } catch (e) {
      console.warn("Suppression photo Vigik+ portail:", e);
    }
    setPendingPhotosPlatinePortail((prev) => prev.filter((_, i) => i !== index));
    scheduleDraftPersistence();
  };

  const handleUpdatePhoto = async (photoId, data) => {
    try {
      await updatePhoto(photoId, data);
      showSnackbar("Photo mise a jour");
      await loadRapport();
    } catch (err) {
      showSnackbar("Erreur mise a jour photo", "error");
    }
  };

  const handleCreateTitre = async () => {
    if (!newTitreName.trim()) return;
    try {
      const newTitre = await createTitre(newTitreName.trim());
      setTitres((prev) => [...prev, newTitre]);
      setFormData((prev) => ({ ...prev, titre: newTitre.id }));
      setNewTitreDialog(false);
      setNewTitreName("");
      showSnackbar("Nouveau titre cree");
      scheduleDraftPersistence();
    } catch (err) {
      showSnackbar("Erreur creation titre", "error");
    }
  };

  const handleDeleteSelectedTitre = async () => {
    const selectedTitreId = formData.titre;
    if (!selectedTitreId) {
      showSnackbar("Veuillez selectionner un titre a supprimer", "warning");
      return;
    }
    const selectedTitre = titres.find((t) => t.id === selectedTitreId);
    setTitreToDelete(selectedTitre || { id: selectedTitreId, nom: "selectionne" });
    setDeleteTitreDialogOpen(true);
  };

  const handleConfirmDeleteTitre = async () => {
    if (!titreToDelete?.id) return;
    try {
      await deleteTitre(titreToDelete.id);
      setTitres((prev) => prev.filter((t) => t.id !== titreToDelete.id));
      setFormData((prev) => ({ ...prev, titre: "" }));
      setDeleteTitreDialogOpen(false);
      setTitreToDelete(null);
      showSnackbar("Titre supprime");
      scheduleDraftPersistence();
    } catch (err) {
      showSnackbar("Impossible de supprimer ce titre (il est peut-etre deja utilise)", "error");
    }
  };

  const isDisabled = rapportData?.statut === "termine";
  const isNewResidence = !selectedResidence && !!formData.residence_nom;

  const sectionSpacing = isMobile ? 4 : 3;
  const fieldGap = isMobile ? 3 : 2;
  const inputMinHeight = isMobile ? 48 : undefined;

  /** MenuProps pour Select : liste déroulante scrollable sur mobile */
  const selectMenuProps = {
    PaperProps: { sx: { maxHeight: isMobile ? "70vh" : 320 } },
    MenuListProps: { sx: { maxHeight: isMobile ? "70vh" : 320, overflow: "auto" } },
  };
  /** Props liste pour Autocomplete : dropdown scrollable sur mobile */
  const autocompleteListboxProps = {
    sx: { maxHeight: isMobile ? "70vh" : 320, overflow: "auto" },
  };

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 3 },
        pb: { xs: "max(env(safe-area-inset-bottom), 24px)", md: 3 },
        maxWidth: 1000,
        mx: "auto",
        "& .MuiOutlinedInput-root": {
          minHeight: inputMinHeight,
          borderRadius: 1,
          fontSize: isMobile ? "1rem" : undefined,
        },
        "& .MuiInputLabel-outlined": isMobile ? { fontSize: "1rem" } : {},
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "center" },
          mb: sectionSpacing,
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button
              startIcon={<MdArrowBack />}
              onClick={onBack || (() => navigate("/RapportsIntervention"))}
              sx={{
                color: { xs: "#000", md: "#fff" },
                minHeight: isMobile ? 48 : 36,
                fontWeight: 600,
              }}
            >
              Retour
            </Button>
            {rapportData?.statut && (
              <Chip
                label={
                  rapportData.statut === "termine"
                    ? "Terminé"
                    : rapportData.statut === "en_cours"
                      ? "En cours"
                      : rapportData.statut === "brouillon"
                        ? "Brouillon"
                        : "A faire"
                }
                size="small"
                color={
                  rapportData.statut === "termine"
                    ? "success"
                    : rapportData.statut === "en_cours"
                      ? "warning"
                      : rapportData.statut === "brouillon"
                        ? "info"
                        : "default"
                }
                sx={isMobile ? { borderRadius: 1, minHeight: 32, px: 1.5 } : {}}
              />
            )}
          </Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: { xs: "#000", md: "#fff" },
              fontSize: { xs: "1.25rem", md: "1.5rem" },
            }}
          >
            {isEdit ? "Modifier le rapport" : isVigikPlus ? "Nouveau rapport Vigik+" : "Nouveau rapport d'intervention"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", "& .MuiButton-root": { minHeight: isMobile ? 48 : 36 } }}>
          {!saveButtonAtBottom && !isDisabled && (
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} /> : <MdCheckCircle />}
              onClick={handleValidateClick}
              disabled={saving || savingDraft}
              sx={{ backgroundColor: COLORS.infoDark || "#1976d2" }}
            >
              {saving ? "Validation..." : "Valider le rapport"}
            </Button>
          )}
          {isEdit && (
            <Button
              variant="contained"
              startIcon={pdfGenerating ? <CircularProgress size={18} color="inherit" /> : <MdPictureAsPdf />}
              onClick={handleGeneratePdf}
              disabled={saving || pdfGenerating}
              sx={{ backgroundColor: "#e65100", color: "#fff", "&:hover": { backgroundColor: "#bf360c" } }}
            >
              {pdfGenerating ? "Generation..." : "Generer PDF"}
            </Button>
          )}
        </Box>
      </Box>

      {/* Informations generales */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: sectionSpacing,
          borderRadius: 2,
          border: `1px solid ${COLORS.border || "#e0e0e0"}`,
        }}
      >
        <Typography variant="h6" sx={{ mb: { xs: 2.5, md: 2 }, fontWeight: 600, color: COLORS.primary }}>
          Informations generales
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: fieldGap }}>
          <FormControl fullWidth size="small">
            <InputLabel>Type de rapport</InputLabel>
            <Select
              value={formData.type_rapport}
              label="Type de rapport"
              onChange={(e) => {
                handleFieldChange("type_rapport", e.target.value);
                scheduleDraftPersistence();
              }}
              disabled={isDisabled}
              MenuProps={selectMenuProps}
            >
              <MenuItem value="intervention">Rapport d'intervention</MenuItem>
              <MenuItem value="vigik_plus">Vigik+</MenuItem>
            </Select>
          </FormControl>

          {!isVigikPlus && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Titre</InputLabel>
              <Select
                value={formData.titre}
                label="Titre"
                onChange={(e) => {
                  handleFieldChange("titre", e.target.value);
                  scheduleDraftPersistence();
                }}
                disabled={isDisabled}
                MenuProps={selectMenuProps}
              >
                {titres.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.nom}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setNewTitreDialog(true)}
              disabled={isDisabled}
              sx={{ minWidth: 40, px: 1 }}
              title="Ajouter un titre"
            >
              <MdAdd />
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={handleDeleteSelectedTitre}
              disabled={isDisabled || !formData.titre}
              sx={{ minWidth: 40, px: 1 }}
              title="Supprimer le titre selectionne"
            >
              <MdDelete />
            </Button>
          </Box>
          )}

          <Autocomplete
            freeSolo
            options={residenceOptions}
            getOptionLabel={(opt) => {
              if (typeof opt === "string") return opt;
              return opt?.nom || "";
            }}
            value={selectedResidence || formData.residence_nom || ""}
            onChange={handleResidenceChange}
            onInputChange={handleResidenceInputChange}
            filterOptions={(options, params) => {
              const q = (params.inputValue || "").trim().toLowerCase();
              const filtered = options.filter((o) => {
                const nom = (o.nom || "").toLowerCase();
                const adr = (o.adresse || "").toLowerCase();
                const client = (o.client_societe_nom || o.dernier_rapport?.client_societe_nom || "").toLowerCase();
                return !q || nom.includes(q) || adr.includes(q) || client.includes(q);
              });
              if (params.inputValue && !filtered.some((o) => o.nom && o.nom.toLowerCase() === params.inputValue.toLowerCase())) {
                filtered.push({ inputValue: params.inputValue, nom: `Creer "${params.inputValue}"` });
              }
              return filtered;
            }}
            renderOption={(props, option) => (
              <li {...props} key={option.key || option.id || option.inputValue || option.nom}>
                <Box sx={{ py: 0.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: option.inputValue ? 600 : 400 }}>
                    {option.nom}
                  </Typography>
                  {option.adresse && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {option.adresse}
                    </Typography>
                  )}
                  {(option.client_societe_nom || option.dernier_rapport?.client_societe_nom) && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Client: {option.dernier_rapport?.client_societe_nom || option.client_societe_nom}
                    </Typography>
                  )}
                  {option.dernier_rapport?.technicien && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Technicien: {option.dernier_rapport.technicien}
                    </Typography>
                  )}
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Residence *"
                size="small"
                helperText="Residences enregistrees et chantiers (nom + adresse du chantier)"
                onBlur={(e) => {
                  params.inputProps?.onBlur?.(e);
                  scheduleDraftPersistence();
                }}
              />
            )}
            disabled={isDisabled}
            isOptionEqualToValue={(opt, val) => {
              if (typeof val === "string") return opt?.nom === val;
              if (val?._fromChantier || val?.optionType === "chantier") {
                return opt?.optionType === "chantier" && opt?.chantierId === (val?.chantierId ?? val?.id);
              }
              return opt?.optionType === "residence" && opt?.id === val?.id;
            }}
            ListboxProps={autocompleteListboxProps}
            sx={{ gridColumn: { md: "1 / -1" } }}
          />

          {selectedResidence && (
            <Alert severity="info" sx={{ gridColumn: { md: "1 / -1" } }}>
              {selectedResidence._fromChantier || selectedResidence.optionType === "chantier" ? (
                <>
                  Chantier selectionne : <strong>{selectedResidence.nom}</strong>
                  {selectedResidence.adresse && ` — ${selectedResidence.adresse}`}
                </>
              ) : (
                <>
                  Residence existante : <strong>{selectedResidence.nom}</strong>
                  {selectedResidence.adresse && ` - ${selectedResidence.adresse}`}
                  {(selectedResidence.dernier_rapport?.client_societe_nom || selectedResidence.client_societe_nom) &&
                    ` (Client: ${selectedResidence.dernier_rapport?.client_societe_nom || selectedResidence.client_societe_nom})`}
                  {selectedResidence.dernier_rapport?.technicien &&
                    ` | Technicien: ${selectedResidence.dernier_rapport.technicien}`}
                </>
              )}
            </Alert>
          )}

          {isNewResidence && !isVigikPlus && (
            <TextField
              label="Adresse de la nouvelle residence"
              value={formData.residence_adresse}
              onChange={(e) => handleFieldChange("residence_adresse", e.target.value)}
              onBlur={scheduleDraftPersistence}
              fullWidth
              size="small"
              disabled={isDisabled}
              sx={{ gridColumn: { md: "1 / -1" } }}
            />
          )}

          <Box sx={{ gridColumn: { md: "1 / -1" } }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: COLORS.primary }}>
              Dates d&apos;intervention *
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              Premier passage puis dates supplémentaires (Passage 2, 3…). Au moins une date.
            </Typography>
            {(formData.dates_intervention || []).map((d, idx) => (
              <Box
                key={`di-${idx}`}
                sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1 }}
              >
                <TextField
                  label={idx === 0 ? "Date" : `Passage ${idx + 1}`}
                  type="date"
                  value={d || ""}
                  onChange={(e) => {
                    const next = [...(formData.dates_intervention || [])];
                    next[idx] = e.target.value;
                    setFormData((prev) => ({ ...prev, dates_intervention: next }));
                  }}
                  onBlur={scheduleDraftPersistence}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  disabled={isDisabled}
                  sx={{ minWidth: 200, flex: { xs: "1 1 100%", sm: "0 1 auto" } }}
                />
                {(formData.dates_intervention || []).length > 1 && (
                  <IconButton
                    size="small"
                    aria-label="Supprimer cette date"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        dates_intervention: (prev.dates_intervention || []).filter((_, i) => i !== idx),
                      }));
                      scheduleDraftPersistence();
                    }}
                    disabled={isDisabled}
                    sx={{ color: "error.main" }}
                  >
                    <MdDelete />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button
              type="button"
              size="small"
              variant="outlined"
              startIcon={<MdAdd />}
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  dates_intervention: [...(prev.dates_intervention || []), todayISO()],
                }));
                scheduleDraftPersistence();
              }}
              disabled={isDisabled}
              sx={{ mt: 0.5 }}
            >
              Ajouter une date
            </Button>
          </Box>

          <Autocomplete
            freeSolo
            options={techniciensSuggestions}
            value={formData.technicien || ""}
            onChange={(_, val) => {
              handleFieldChange("technicien", val || "");
              scheduleDraftPersistence();
            }}
            onInputChange={(_, val) => handleFieldChange("technicien", val || "")}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Technicien *"
                size="small"
                onBlur={(e) => {
                  params.inputProps?.onBlur?.(e);
                  scheduleDraftPersistence();
                }}
              />
            )}
            disabled={isDisabled}
            ListboxProps={autocompleteListboxProps}
          />

          {!isVigikPlus && (
            <>
              <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={!!formData.devis_a_faire}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => ({
                          ...prev,
                          devis_a_faire: checked,
                          devis_fait: checked ? prev.devis_fait : false,
                          devis_lie: checked ? prev.devis_lie : null,
                        }));
                        scheduleDraftPersistence();
                      }}
                      disabled={isDisabled}
                    />
                  )}
                  label="Devis à faire"
                  sx={{
                    m: 0,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    border: `1px solid ${COLORS.border || "#e0e0e0"}`,
                    minHeight: isMobile ? 48 : 40,
                    width: "fit-content",
                  }}
                />
              </Box>
              <TextField
                label="Temps de trajet"
                type="time"
                value={formData.temps_trajet}
                onChange={(e) => handleFieldChange("temps_trajet", e.target.value || "")}
                onBlur={scheduleDraftPersistence}
                fullWidth
                size="small"
                disabled={isDisabled}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                helperText="Format h:mm"
              />
              <TextField
                label="Temps de taches"
                type="time"
                value={formData.temps_taches}
                onChange={(e) => handleFieldChange("temps_taches", e.target.value || "")}
                onBlur={scheduleDraftPersistence}
                fullWidth
                size="small"
                disabled={isDisabled}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                helperText="Format h:mm"
              />
            </>
          )}

          {!isVigikPlus && (
          <>
          <Autocomplete
            options={societes}
            getOptionLabel={(opt) => opt?.nom_societe || ""}
            value={societes.find((s) => s.id === formData.client_societe) || null}
            onChange={(_, val) => {
              handleFieldChange("client_societe", val?.id || "");
              scheduleDraftPersistence();
            }}
            renderInput={(params) => <TextField {...params} label="Client / Bailleur" size="small" />}
            disabled={isDisabled}
            ListboxProps={autocompleteListboxProps}
          />
          <Autocomplete
            options={chantiers}
            getOptionLabel={(opt) => opt?.chantier_name || ""}
            value={chantiers.find((c) => c.id === formData.chantier) || null}
            onChange={handleChantierFieldChange}
            renderInput={(params) => <TextField {...params} label="Chantier (optionnel)" size="small" />}
            disabled={isDisabled}
            ListboxProps={autocompleteListboxProps}
          />
          </>
          )}

          {isVigikPlus && (
            <>
              <TextField
                label="Adresse *"
                value={formData.adresse_vigik}
                onChange={(e) => handleFieldChange("adresse_vigik", e.target.value)}
                onBlur={scheduleDraftPersistence}
                fullWidth
                size="small"
                disabled={isDisabled}
                placeholder="Adresse propre au rapport Vigik+ (distincte de la residence)"
                sx={{ gridColumn: { md: "1 / -1" } }}
              />
              <TextField
                label="Numero du batiment *"
                value={formData.numero_batiment}
                onChange={(e) => handleFieldChange("numero_batiment", e.target.value)}
                onBlur={scheduleDraftPersistence}
                fullWidth
                size="small"
                disabled={isDisabled}
              />
              <TextField
                label="Type d'installation"
                value={formData.type_installation}
                onChange={(e) => handleFieldChange("type_installation", e.target.value)}
                onBlur={scheduleDraftPersistence}
                fullWidth
                size="small"
                disabled={isDisabled}
              />
              {/* Question 1 : Présence de platine */}
              <Typography variant="subtitle2" sx={{ gridColumn: { md: "1 / -1" }, fontWeight: 600, mb: 0.5 }}>
                Presence de platine Vigik+ :
              </Typography>
              <Box sx={{ gridColumn: { md: "1 / -1" }, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant={formData.presence_platine === true ? "contained" : "outlined"}
                  size="small"
                  onClick={() => {
                    handleFieldChange("presence_platine", true);
                    scheduleDraftPersistence();
                  }}
                  disabled={isDisabled}
                >
                  Oui
                </Button>
                <Button
                  variant={formData.presence_platine === false ? "contained" : "outlined"}
                  size="small"
                  color={formData.presence_platine === false ? "error" : "primary"}
                  onClick={() => {
                    handleFieldChange("presence_platine", false);
                    scheduleDraftPersistence();
                  }}
                  disabled={isDisabled}
                >
                  Non
                </Button>
              </Box>
              <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Joindre au moins une photo (obligatoire). Vous pouvez en ajouter plusieurs. Les images sont redimensionnées
                  (max. 1600 px) et compressées en JPEG pour limiter le poids des envois.
                </Typography>
                <input
                  ref={photoPlatineInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const fl = e.target.files;
                    e.target.value = "";
                    void appendVigikPlatineFiles(fl);
                  }}
                />
                <input
                  ref={photoPlatineCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const fl = e.target.files;
                    e.target.value = "";
                    void appendVigikPlatineFiles(fl);
                  }}
                />
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}>
                  {(pendingPhotosPlatine || []).map((p, i) => (
                    <Box
                      key={`plat-${i}-${p._draftS3Key || p.name || ""}`}
                      sx={{
                        width: 140,
                        borderRadius: 1,
                        overflow: "hidden",
                        border: p.file ? "2px solid #1976d240" : "2px solid #2e7d3240",
                        position: "relative",
                      }}
                    >
                      <Box sx={{ width: "100%", height: 100, position: "relative" }}>
                        {p.previewUrl ? (
                          <img
                            src={p.previewUrl}
                            alt={p.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                            onClick={() => openVigikGallery(i)}
                          />
                        ) : (
                          <Box sx={{ width: "100%", height: "100%", bgcolor: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Typography variant="caption">...</Typography>
                          </Box>
                        )}
                        {!isDisabled && (
                          <IconButton
                            size="small"
                            onClick={() => removeVigikPlatineAt(i)}
                            sx={{
                              position: "absolute", top: 2, right: 2,
                              backgroundColor: "rgba(255,255,255,0.85)",
                              "&:hover": { backgroundColor: "#ffebee" },
                              padding: "2px",
                            }}
                          >
                            <MdDelete size={16} color="#c62828" />
                          </IconButton>
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ display: "block", px: 0.5, py: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </Typography>
                    </Box>
                  ))}
                  {!isDisabled && (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                      {isMobile ? (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={vigikPhotoCompressing}
                            onClick={() => photoPlatineCameraInputRef.current?.click()}
                          >
                            Prendre une photo
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={vigikPhotoCompressing}
                            onClick={() => photoPlatineInputRef.current?.click()}
                          >
                            Galerie
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={vigikPhotoCompressing}
                          onClick={() => photoPlatineInputRef.current?.click()}
                        >
                          Ajouter des photos
                        </Button>
                      )}
                      {vigikPhotoCompressing && <CircularProgress size={22} sx={{ ml: 0.5 }} aria-label="Traitement des images" />}
                    </Box>
                  )}
                </Box>
              </Box>
              {/* Portail : étape 1 — présence d'un portail */}
              <Typography variant="subtitle2" sx={{ gridColumn: { md: "1 / -1" }, fontWeight: 600, mb: 0.5, mt: 2 }}>
                Présence d&apos;un portail :
              </Typography>
              <Box sx={{ gridColumn: { md: "1 / -1" }, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant={formData.presence_portail === true ? "contained" : "outlined"}
                  size="small"
                  onClick={() => handleVigikPresencePortailChange(true)}
                  disabled={isDisabled}
                >
                  Oui
                </Button>
                <Button
                  variant={formData.presence_portail === false ? "contained" : "outlined"}
                  size="small"
                  color={formData.presence_portail === false ? "error" : "primary"}
                  onClick={() => handleVigikPresencePortailChange(false)}
                  disabled={isDisabled}
                >
                  Non
                </Button>
              </Box>
              {/* Étape 2 — platine Vigik+ au portail (si portail oui) */}
              {formData.presence_portail === true && (
                <>
                  <Typography variant="subtitle2" sx={{ gridColumn: { md: "1 / -1" }, fontWeight: 600, mb: 0.5, mt: 2 }}>
                    Présence de platine Vigik+ au niveau du portail :
                  </Typography>
                  <Box sx={{ gridColumn: { md: "1 / -1" }, display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      variant={formData.presence_platine_portail === true ? "contained" : "outlined"}
                      size="small"
                      onClick={() => handleVigikPlatinePortailChange(true)}
                      disabled={isDisabled}
                    >
                      Oui
                    </Button>
                    <Button
                      variant={formData.presence_platine_portail === false ? "contained" : "outlined"}
                      size="small"
                      color={formData.presence_platine_portail === false ? "error" : "primary"}
                      onClick={() => handleVigikPlatinePortailChange(false)}
                      disabled={isDisabled}
                    >
                      Non
                    </Button>
                  </Box>
                </>
              )}
              {/* Photos « portail » : sans portail (facultatif) ou portail + platine oui (facultatif) */}
              {vigikPortailPhotosEnabled && (
              <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {formData.presence_portail === false
                    ? "Joindre des photos (facultatif), par exemple pour illustrer l'accès ou le contexte sur site. Vous pouvez en ajouter plusieurs. Même compression automatique que pour la platine (max. 1600 px, JPEG)."
                    : "Joindre des photos (facultatif). Vous pouvez en ajouter plusieurs. Même compression automatique que pour la platine (max. 1600 px, JPEG)."}
                </Typography>
                <input
                  ref={photoPlatinePortailInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const fl = e.target.files;
                    e.target.value = "";
                    void appendVigikPortailFiles(fl);
                  }}
                />
                <input
                  ref={photoPlatinePortailCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const fl = e.target.files;
                    e.target.value = "";
                    void appendVigikPortailFiles(fl);
                  }}
                />
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}>
                  {(pendingPhotosPlatinePortail || []).map((p, i) => {
                    const platCount = (pendingPhotosPlatine || []).length;
                    return (
                      <Box
                        key={`port-${i}-${p._draftS3Key || p.name || ""}`}
                        sx={{
                          width: 140,
                          borderRadius: 1,
                          overflow: "hidden",
                          border: p.file ? "2px solid #1976d240" : "2px solid #2e7d3240",
                          position: "relative",
                        }}
                      >
                        <Box sx={{ width: "100%", height: 100, position: "relative" }}>
                          {p.previewUrl ? (
                            <img
                              src={p.previewUrl}
                              alt={p.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                              onClick={() => openVigikGallery(platCount + i)}
                            />
                          ) : (
                            <Box sx={{ width: "100%", height: "100%", bgcolor: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Typography variant="caption">...</Typography>
                            </Box>
                          )}
                          {!isDisabled && (
                            <IconButton
                              size="small"
                              onClick={() => removeVigikPortailAt(i)}
                              sx={{
                                position: "absolute", top: 2, right: 2,
                                backgroundColor: "rgba(255,255,255,0.85)",
                                "&:hover": { backgroundColor: "#ffebee" },
                                padding: "2px",
                              }}
                            >
                              <MdDelete size={16} color="#c62828" />
                            </IconButton>
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ display: "block", px: 0.5, py: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.name}
                        </Typography>
                      </Box>
                    );
                  })}
                  {!isDisabled && (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                      {isMobile ? (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={vigikPhotoCompressing}
                            onClick={() => photoPlatinePortailCameraInputRef.current?.click()}
                          >
                            Prendre une photo
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={vigikPhotoCompressing}
                            onClick={() => photoPlatinePortailInputRef.current?.click()}
                          >
                            Galerie
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={vigikPhotoCompressing}
                          onClick={() => photoPlatinePortailInputRef.current?.click()}
                        >
                          Ajouter des photos
                        </Button>
                      )}
                      {vigikPhotoCompressing && <CircularProgress size={22} sx={{ ml: 0.5 }} aria-label="Traitement des images" />}
                    </Box>
                  )}
                </Box>
              </Box>
              )}
            </>
          )}
        </Box>

        {!isVigikPlus && (
          <>
        <TextField
          label="Objet de la recherche *"
          placeholder="Dire pourquoi tu viens sur site..."
          value={formData.objet_recherche}
          onChange={(e) => handleFieldChange("objet_recherche", e.target.value)}
          onBlur={scheduleDraftPersistence}
          fullWidth
          multiline
          rows={isMobile ? 3 : 2}
          size="small"
          sx={{ mt: fieldGap }}
          disabled={isDisabled}
        />

        <TextField
          label="Resultat"
          value={formData.resultat}
          onChange={(e) => handleFieldChange("resultat", e.target.value)}
          onBlur={scheduleDraftPersistence}
          fullWidth
          multiline
          rows={isMobile ? 3 : 2}
          size="small"
          sx={{ mt: fieldGap }}
          disabled={isDisabled}
        />
          </>
        )}
      </Paper>

      {/* Lieu d'intervention & Locataire (masque pour Vigik+) */}
      {!isVigikPlus && (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: sectionSpacing,
          borderRadius: 2,
          border: `1px solid ${COLORS.border || "#e0e0e0"}`,
        }}
      >
        <Typography variant="h6" sx={{ mb: { xs: 2.5, md: 2 }, fontWeight: 600, color: COLORS.primary }}>
          Lieu d'intervention & Locataire
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: fieldGap }}>
          <TextField
            label="Lieu d'intervention"
            value={formData.logement}
            onChange={(e) => handleFieldChange("logement", e.target.value)}
            onBlur={scheduleDraftPersistence}
            fullWidth
            size="small"
            disabled={isDisabled}
            placeholder="Ex: Apt 12, Cave 3, RDC..."
            sx={{ gridColumn: { md: "1 / -1" } }}
          />

          <TextField
            label="Nom locataire"
            value={formData.locataire_nom}
            onChange={(e) => handleFieldChange("locataire_nom", e.target.value)}
            onBlur={scheduleDraftPersistence}
            fullWidth
            size="small"
            disabled={isDisabled}
          />
          <TextField
            label="Prenom locataire"
            value={formData.locataire_prenom}
            onChange={(e) => handleFieldChange("locataire_prenom", e.target.value)}
            onBlur={scheduleDraftPersistence}
            fullWidth
            size="small"
            disabled={isDisabled}
          />
          <TextField
            label="Telephone locataire"
            value={formData.locataire_telephone}
            onChange={(e) => handleFieldChange("locataire_telephone", e.target.value)}
            onBlur={scheduleDraftPersistence}
            fullWidth
            size="small"
            disabled={isDisabled}
          />
          <TextField
            label="Email locataire"
            value={formData.locataire_email}
            onChange={(e) => handleFieldChange("locataire_email", e.target.value)}
            onBlur={scheduleDraftPersistence}
            fullWidth
            size="small"
            disabled={isDisabled}
          />
        </Box>
      </Paper>
      )}

      {/* Prestations (masque pour Vigik+) */}
      {!isVigikPlus && (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: sectionSpacing,
          borderRadius: 2,
          border: `1px solid ${COLORS.border || "#e0e0e0"}`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.primary, mb: { xs: 2.5, md: 2 } }}>
          Prestations
        </Typography>

        {formData.prestations.map((prestation, index) => (
          <PrestationSection
            key={prestation.id || `new-${index}`}
            prestation={prestation}
            index={index}
            onChange={handlePrestationChange}
            onDraftCommit={scheduleDraftPersistence}
            onRemove={handleRemovePrestation}
            onUploadPhoto={handleUploadPhoto}
            onDeletePhoto={handleDeletePhoto}
            onUpdatePhoto={handleUpdatePhoto}
            onAddPendingPhoto={handleAddPendingPhoto}
            onRemovePendingPhoto={handleRemovePendingPhoto}
            disabled={isDisabled}
            isSaved={!!prestation.id}
            pendingPhotos={pendingPhotos[index] || []}
            isMobile={isMobile}
          />
        ))}

        {!isDisabled && (
          <Button
            variant="outlined"
            startIcon={<MdAdd />}
            onClick={handleAddPrestation}
            size="small"
            sx={{ minHeight: isMobile ? 48 : 36, mt: 2 }}
          >
            Ajouter une prestation
          </Button>
        )}
      </Paper>
      )}

      {/* Signature (masquée pour Vigik+) */}
      {!isVigikPlus && (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: sectionSpacing,
          borderRadius: 2,
          border: `1px solid ${COLORS.border || "#e0e0e0"}`,
        }}
      >
        <SignaturePad
          ref={signaturePadRef}
          existingSignatureUrl={rapportData?.signature_url}
          restoreFromDataUrl={signatureDraftRestoreUrl}
          onRestoreFromDataUrlHandled={handleSignatureDraftRestoreHandled}
          onSignatureCommit={scheduleDraftPersistence}
          disabled={isDisabled}
        />
      </Paper>
      )}

      {/* Bouton Valider en bas du rapport (mobile) */}
      {saveButtonAtBottom && !isDisabled && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mt: 2,
            borderRadius: 2,
            border: `1px solid ${COLORS.border || "#e0e0e0"}`,
          }}
        >
          <Button
            variant="contained"
            fullWidth
            startIcon={saving ? <CircularProgress size={18} /> : <MdCheckCircle />}
            onClick={handleValidateClick}
            disabled={saving || savingDraft}
            sx={{
              minHeight: 48,
              backgroundColor: COLORS.infoDark || "#1976d2",
              fontWeight: 600,
            }}
          >
            {saving ? "Validation..." : "Valider le rapport"}
          </Button>
        </Paper>
      )}

      {/* Dialog nouveau titre */}
      <Dialog open={newTitreDialog} onClose={() => setNewTitreDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouveau titre de rapport</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Nom du titre"
            value={newTitreName}
            onChange={(e) => setNewTitreName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTitreDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateTitre}>Creer</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteTitreDialogOpen}
        onClose={() => {
          setDeleteTitreDialogOpen(false);
          setTitreToDelete(null);
        }}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Voulez-vous vraiment supprimer le titre "{titreToDelete?.nom || ""}" ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteTitreDialogOpen(false);
              setTitreToDelete(null);
            }}
          >
            Annuler
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDeleteTitre}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={saveErrorModal.open}
        onClose={() =>
          setSaveErrorModal({ open: false, title: "", fieldLabels: [], fallbackMessage: "" })
        }
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { borderRadius: isMobile ? 0 : 3, overflow: "hidden" },
        }}
      >
        <Box sx={{ textAlign: "center", pt: 3, px: 3 }}>
          <Box
            component="img"
            src={elekableLogo}
            alt="Elekable"
            sx={{ width: 90, height: "auto" }}
          />
        </Box>
        <Box sx={{ textAlign: "center", pt: 2, pb: 1, px: 3 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: `rgba(${COLORS.errorRgb}, 0.1)`,
              mb: 2,
              "@keyframes rapportErrorShake": {
                "0%, 100%": { transform: "translateX(0)" },
                "20%, 60%": { transform: "translateX(-6px)" },
                "40%, 80%": { transform: "translateX(6px)" },
              },
              animation: "rapportErrorShake 0.45s ease-in-out",
            }}
          >
            <MdErrorOutline size={36} color={COLORS.error} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.error, mb: 0.5 }}>
            {saveErrorModal.title || "Impossible d'enregistrer"}
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 1, pb: 1 }}>
          {saveErrorModal.fieldLabels?.length > 0 ? (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {saveErrorModal.fieldLabels.map((label) => (
                <Typography
                  component="li"
                  key={label}
                  variant="body2"
                  sx={{ color: COLORS.error, fontWeight: 600, py: 0.3 }}
                >
                  {label}
                </Typography>
              ))}
            </Box>
          ) : null}
          {saveErrorModal.fallbackMessage ? (
            <Typography variant="body2" sx={{ mt: 1, textAlign: "center", color: COLORS.textMuted }}>
              {saveErrorModal.fallbackMessage}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() =>
              setSaveErrorModal({ open: false, title: "", fieldLabels: [], fallbackMessage: "" })
            }
            sx={{
              fontWeight: 700,
              py: 1.25,
              borderRadius: 2,
              backgroundColor: COLORS.error,
              "&:hover": { backgroundColor: COLORS.errorDark },
            }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={successModalOpen}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ textAlign: "center", pt: 4, pb: 3, px: 3 }}>
          <Box
            sx={{
              "@keyframes rapportLogoFadeIn": {
                "0%": { opacity: 0, transform: "scale(0.7)" },
                "100%": { opacity: 1, transform: "scale(1)" },
              },
              animation: "rapportLogoFadeIn 0.35s ease-out forwards",
            }}
          >
            <Box
              component="img"
              src={elekableLogo}
              alt="Elekable"
              sx={{ width: 100, height: "auto", mb: 2 }}
            />
          </Box>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 68,
              height: 68,
              borderRadius: "50%",
              backgroundColor: "#fffde7",
              border: "3px solid #ffff00",
              mb: 2,
              "@keyframes rapportCheckPop": {
                "0%": { transform: "scale(0)", opacity: 0 },
                "60%": { transform: "scale(1.15)", opacity: 1 },
                "100%": { transform: "scale(1)" },
              },
              animation: "rapportCheckPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both",
            }}
          >
            <MdCheckCircle size={40} color="#f9a825" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.primary, mb: 0.5 }}>
            Rapport sauvegardé !
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {successModalContext?.isEdit
              ? "Vos modifications ont bien été enregistrées. Le rapport est en cours pour vérification."
              : "Votre rapport a bien été créé. Il est en cours pour vérification."}
          </Typography>
        </Box>
        <Box
          sx={{
            height: 4,
            backgroundColor: "#fff9c4",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              height: "100%",
              backgroundColor: "#f9a825",
              "@keyframes rapportCountdown": {
                from: { width: "100%" },
                to: { width: "0%" },
              },
              animation: "rapportCountdown 2s linear forwards",
            }}
          />
        </Box>
      </Dialog>

      <Dialog
        open={vigikGalleryOpen}
        onClose={closeVigikGallery}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "#111",
            color: "#fff",
          },
        }}
      >
        <Box sx={{ position: "relative", p: { xs: 1.5, md: 2 } }}>
          <IconButton
            onClick={closeVigikGallery}
            sx={{ position: "absolute", top: 8, right: 8, color: "#fff", zIndex: 2 }}
          >
            <MdClose />
          </IconButton>

          {activeVigikPhoto && (
            <>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                  mb: 1.5,
                  pr: 5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    label={activeVigikPhoto.label}
                    size="small"
                    sx={{ backgroundColor: "#1976d260", color: "#fff", fontWeight: 600 }}
                  />
                  <Chip
                    label={activeVigikPhoto.pending ? "En cours d'envoi" : "Terminee"}
                    size="small"
                    sx={{
                      backgroundColor: activeVigikPhoto.pending ? "#ed6c02" : "#2e7d32",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="body2" sx={{ color: "#ddd" }}>
                    Date: {activeVigikPhoto.date_photo || latestInterventionISO(formData.dates_intervention) || todayISO()}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "#bbb" }}>
                  {vigikGalleryIndex + 1} / {vigikPhotos.length}
                </Typography>
              </Box>

              <Box sx={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
                {vigikPhotos.length > 1 && (
                  <IconButton
                    onClick={goVigikPrev}
                    sx={{
                      position: "absolute",
                      left: { xs: 4, md: 8 },
                      color: "#fff",
                      backgroundColor: "rgba(0,0,0,0.35)",
                      "&:hover": { backgroundColor: "rgba(0,0,0,0.5)" },
                      zIndex: 1,
                    }}
                  >
                    <MdChevronLeft size={28} />
                  </IconButton>
                )}

                <Box
                  component="img"
                  src={activeVigikPhoto.image_url}
                  alt={activeVigikPhoto.label}
                  onTouchStart={handleVigikTouchStart}
                  onTouchEnd={handleVigikTouchEnd}
                  sx={{
                    width: "100%",
                    maxHeight: "72vh",
                    objectFit: "contain",
                    borderRadius: 1,
                    transform: `scale(${vigikZoom})`,
                    transition: "transform 0.2s ease",
                  }}
                />

                {vigikPhotos.length > 1 && (
                  <IconButton
                    onClick={goVigikNext}
                    sx={{
                      position: "absolute",
                      right: { xs: 4, md: 8 },
                      color: "#fff",
                      backgroundColor: "rgba(0,0,0,0.35)",
                      "&:hover": { backgroundColor: "rgba(0,0,0,0.5)" },
                      zIndex: 1,
                    }}
                  >
                    <MdChevronRight size={28} />
                  </IconButton>
                )}
              </Box>
              <Box sx={{ mt: 1.5, display: "flex", justifyContent: "center", gap: 1 }}>
                <Button size="small" variant="outlined" onClick={() => setVigikZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}>
                  Zoom -
                </Button>
                <Button size="small" variant="outlined" onClick={() => setVigikZoom(1)}>
                  Reset
                </Button>
                <Button size="small" variant="outlined" onClick={() => setVigikZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}>
                  Zoom +
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RapportForm;
```

### 7.9 `frontend/src/components/RapportIntervention/RapportPreview.js`

```javascript
import React from "react";
import { Box, Typography, Paper, Chip, Divider } from "@mui/material";
import { COLORS } from "../../constants/colors";

const TYPE_LABELS = {
  avant: "Avant travaux",
  en_cours: "En cours",
  apres: "Apres travaux",
};

const buildInterventionDateRows = (rapport) => {
  const raw = rapport.dates_intervention;
  if (Array.isArray(raw) && raw.length) {
    return raw.map((ds, i) => {
      const s = String(ds).slice(0, 10);
      let value = s;
      try {
        value = new Date(`${s}T12:00:00`).toLocaleDateString("fr-FR");
      } catch {
        /* keep s */
      }
      return { key: `d-${i}`, label: i === 0 ? "Date" : `Passage ${i + 1}`, value };
    });
  }
  if (rapport.date) {
    return [
      {
        key: "d-0",
        label: "Date",
        value: new Date(rapport.date).toLocaleDateString("fr-FR"),
      },
    ];
  }
  return [{ key: "d-0", label: "Date", value: "-" }];
};

const RapportPreview = ({ rapport }) => {
  if (!rapport) return null;

  const interventionDateRows = buildInterventionDateRows(rapport);

  return (
    <Paper
      elevation={0}
      sx={{
        maxWidth: 800,
        mx: "auto",
        p: { xs: 2, sm: 4 },
        border: "1px solid #e0e0e0",
        borderRadius: 2,
        backgroundColor: "#fff",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3, borderBottom: `3px solid ${COLORS.infoDark || "#1976d2"}`, pb: 2 }}>
        <Box>
          {rapport.client_societe_logo_url && (
            <img
              src={rapport.client_societe_logo_url}
              alt="Logo"
              style={{ maxHeight: 60, maxWidth: 180, objectFit: "contain" }}
            />
          )}
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.infoDark || "#1976d2", textTransform: "uppercase" }}>
          Rapport d'intervention
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 3 }}>
        <InfoBlock title="Client / Bailleur">
          <Typography sx={{ fontWeight: 600 }}>{rapport.client_societe_nom || "-"}</Typography>
        </InfoBlock>

        <InfoBlock title="Intervention">
          {interventionDateRows.map((row) => (
            <InfoRow key={row.key} label={row.label} value={row.value} />
          ))}
          <InfoRow label="Technicien" value={rapport.technicien_nom || rapport.technicien || "-"} />
        </InfoBlock>

        <InfoBlock title="Residence">
          <InfoRow label="Nom" value={rapport.residence_nom || "-"} />
          <InfoRow label="Adresse" value={rapport.residence_adresse || "-"} />
          {rapport.logement && <InfoRow label="Lieu d'intervention" value={rapport.logement} />}
        </InfoBlock>

        <InfoBlock title="Locataire">
          {rapport.locataire_nom || rapport.locataire_prenom ? (
            <>
              <InfoRow label="Nom" value={`${rapport.locataire_prenom || ""} ${rapport.locataire_nom || ""}`} />
              {rapport.locataire_telephone && <InfoRow label="Tel" value={rapport.locataire_telephone} />}
              {rapport.locataire_email && <InfoRow label="Email" value={rapport.locataire_email} />}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">-</Typography>
          )}
        </InfoBlock>
      </Box>

      <InfoBlock title="Objet de la recherche" fullWidth>
        <Typography sx={{ whiteSpace: "pre-wrap" }}>{rapport.objet_recherche || "-"}</Typography>
      </InfoBlock>

      {rapport.resultat && (
        <InfoBlock title="Resultat" fullWidth sx={{ mt: 2 }}>
          <Typography sx={{ whiteSpace: "pre-wrap" }}>{rapport.resultat}</Typography>
        </InfoBlock>
      )}

      {rapport.type_rapport === "vigik_plus" && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ backgroundColor: COLORS.infoDark || "#1976d2", color: "#fff", px: 2, py: 1, borderRadius: "6px 6px 0 0", fontWeight: 700 }}>
            Rapport Vigik+
          </Box>
          <Box sx={{ border: "1px solid #e0e0e0", borderTop: "none", borderRadius: "0 0 6px 6px", p: 2 }}>
            <InfoRow label="Adresse" value={rapport.adresse_vigik || "-"} />
            <InfoRow label="Numero batiment" value={rapport.numero_batiment || "-"} />
            {rapport.type_installation && <InfoRow label="Type d'installation" value={rapport.type_installation} />}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: COLORS.infoDark || "#1976d2" }}>
                Presence de platine
              </Typography>
              <Chip
                label={rapport.presence_platine === true ? "Oui" : rapport.presence_platine === false ? "Non" : "-"}
                size="small"
                color={rapport.presence_platine === true ? "success" : rapport.presence_platine === false ? "error" : "default"}
                variant="outlined"
                sx={{ mr: 1 }}
              />
              {(rapport.vigik_platine_photos || []).filter((x) => x?.url).map((row, idx) => (
                <Box key={row.s3_key || idx} sx={{ mt: 1 }}>
                  <img
                    src={row.url}
                    alt={`Photo platine ${idx + 1}`}
                    style={{ maxWidth: "100%", width: 280, height: 210, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }}
                  />
                </Box>
              ))}
            </Box>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: COLORS.infoDark || "#1976d2" }}>
                Presence d&apos;un portail
              </Typography>
              <Chip
                label={rapport.presence_portail === true ? "Oui" : rapport.presence_portail === false ? "Non" : "-"}
                size="small"
                color={rapport.presence_portail === true ? "success" : rapport.presence_portail === false ? "error" : "default"}
                variant="outlined"
                sx={{ mr: 1, mb: 1 }}
              />
              {rapport.presence_portail === false &&
                (rapport.vigik_platine_portail_photos || []).filter((x) => x?.url).map((row, idx) => (
                  <Box key={row.s3_key || idx} sx={{ mt: 1 }}>
                    <img
                      src={row.url}
                      alt={`Photo contexte site ${idx + 1}`}
                      style={{ maxWidth: "100%", width: 280, height: 210, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }}
                    />
                  </Box>
                ))}
            </Box>
            {(rapport.presence_portail === true || (rapport.presence_portail == null && rapport.presence_platine_portail != null)) && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: COLORS.infoDark || "#1976d2" }}>
                  Presence de platine Vigik+ au portail
                </Typography>
                <Chip
                  label={rapport.presence_platine_portail === true ? "Oui" : rapport.presence_platine_portail === false ? "Non" : "-"}
                  size="small"
                  color={rapport.presence_platine_portail === true ? "success" : rapport.presence_platine_portail === false ? "error" : "default"}
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                {rapport.presence_platine_portail === true &&
                  (rapport.vigik_platine_portail_photos || []).filter((x) => x?.url).map((row, idx) => (
                    <Box key={row.s3_key || idx} sx={{ mt: 1 }}>
                      <img
                        src={row.url}
                        alt={`Photo platine portail ${idx + 1}`}
                        style={{ maxWidth: "100%", width: 280, height: 210, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }}
                      />
                    </Box>
                  ))}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {rapport.prestations?.map((prestation, index) => (
        <Box key={prestation.id || index} sx={{ mt: 3 }}>
          <Box sx={{ backgroundColor: COLORS.infoDark || "#1976d2", color: "#fff", px: 2, py: 1, borderRadius: "6px 6px 0 0", fontWeight: 700 }}>
            Prestation {index + 1} - {prestation.localisation}
          </Box>
          <Box sx={{ border: "1px solid #e0e0e0", borderTop: "none", borderRadius: "0 0 6px 6px", p: 2 }}>
            <PreviewField label="Probleme constate" value={prestation.probleme} />
            <PreviewField label="Solution" value={prestation.solution} />
            {prestation.commentaire && <PreviewField label="Commentaire" value={prestation.commentaire} />}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#555", textTransform: "uppercase" }}>
                Prestation possible
              </Typography>
              <Box>
                <Chip
                  label={prestation.prestation_possible ? "Oui" : "Non"}
                  size="small"
                  color={prestation.prestation_possible ? "success" : "error"}
                  variant="outlined"
                />
              </Box>
            </Box>
            {prestation.prestation_realisee && (
              <PreviewField label="Prestations realisees" value={prestation.prestation_realisee} />
            )}

            {prestation.photos?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: COLORS.infoDark || "#1976d2" }}>
                  Photos
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {["avant", "en_cours", "apres"].map((type) => {
                    const typePhotos = prestation.photos.filter((p) => p.type_photo === type);
                    if (!typePhotos.length) return null;
                    return (
                      <Box key={type}>
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", color: "#666" }}>
                          {TYPE_LABELS[type]}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                          {typePhotos.map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.image_url}
                              alt={photo.filename}
                              style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }}
                            />
                          ))}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      ))}

      {rapport.signature_url && (
        <Box sx={{ mt: 4, textAlign: "right" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: COLORS.infoDark || "#1976d2", mb: 1 }}>
            Signature
          </Typography>
          <img
            src={rapport.signature_url}
            alt="Signature"
            style={{ maxWidth: 250, maxHeight: 120, border: "1px solid #ddd", borderRadius: 4 }}
          />
        </Box>
      )}
    </Paper>
  );
};

const InfoBlock = ({ title, children, fullWidth, sx }) => (
  <Box
    sx={{
      backgroundColor: "#f8f9fa",
      border: "1px solid #e0e0e0",
      borderRadius: 1.5,
      p: 1.5,
      ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
      ...sx,
    }}
  >
    <Typography
      variant="caption"
      sx={{ fontWeight: 700, color: COLORS.infoDark || "#1976d2", textTransform: "uppercase", display: "block", mb: 0.5, borderBottom: "1px solid #e0e0e0", pb: 0.5 }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

const InfoRow = ({ label, value }) => (
  <Box sx={{ display: "flex", mb: 0.3 }}>
    <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 100, color: "#666" }}>{label} :</Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

const PreviewField = ({ label, value }) => (
  <Box sx={{ mb: 1 }}>
    <Typography variant="caption" sx={{ fontWeight: 700, color: "#555", textTransform: "uppercase" }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{value || "-"}</Typography>
  </Box>
);

export default RapportPreview;
```

### 7.10 `frontend/src/components/RapportIntervention/RapportPreviewPage.js`

```javascript
import React, { useEffect, useState } from "react";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import { MdArrowBack, MdEdit } from "react-icons/md";
import { useParams, useNavigate } from "react-router-dom";
import { useRapports } from "../../hooks/useRapports";
import RapportPreview from "./RapportPreview";
import { COLORS } from "../../constants/colors";

const RapportPreviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchRapport, loading } = useRapports();
  const [rapport, setRapport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setError(null);
    fetchRapport(id)
      .then((data) => {
        if (!cancelled) setRapport(data);
      })
      .catch(() => {
        if (!cancelled) setError("Rapport introuvable");
      });
    return () => { cancelled = true; };
  }, [id, fetchRapport]);

  if (loading && !rapport) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !rapport) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<MdArrowBack />} onClick={() => navigate("/RapportsIntervention")} sx={{ mb: 2 }}>
          Retour
        </Button>
        <Typography color="error">{error || "Rapport introuvable"}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button
          startIcon={<MdArrowBack />}
          onClick={() => navigate("/RapportsIntervention")}
          sx={{ color: COLORS.textOnDark }}
        >
          Retour a la liste
        </Button>
        <Button
          variant="contained"
          startIcon={<MdEdit />}
          onClick={() => navigate(`/RapportIntervention/${id}`)}
          sx={{ backgroundColor: COLORS.infoDark || "#1976d2", "&:hover": { backgroundColor: "#1565c0" } }}
        >
          Modifier
        </Button>
      </Box>
      <RapportPreview rapport={rapport} />
    </Box>
  );
};

export default RapportPreviewPage;
```

### 7.11 `frontend/src/components/RapportIntervention/RapportsPage.js`

Page desktop (liste + filtres + brouillons + PDF).


```javascript
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, TextField,
  Snackbar, Alert, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Tooltip, FormControlLabel, Checkbox, Pagination, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import {
  MdAdd, MdEdit, MdDelete, MdDescription, MdArrowDownward, MdArrowUpward,
  MdCheck, MdClose, MdThumbUp,
} from "react-icons/md";
import { AiFillFilePdf } from "react-icons/ai";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import { COLORS } from "../../constants/colors";
import { useRapports, RAPPORTS_LIST_PAGE_SIZE } from "../../hooks/useRapports";
import StatusChangeModal from "../StatusChangeModal";
import { RegeneratePDFIconButton } from "../shared/RegeneratePDFButton";
import { DOCUMENT_TYPES } from "../../config/documentTypeConfig";

const STATUT_LABELS = {
  brouillon: "Brouillon",
  brouillon_serveur: "Brouillons",
  a_faire: "A faire",
  en_cours: "En cours",
  termine: "TerminÃ©",
};

const TYPE_RAPPORT_LABELS = {
  intervention: "Rapport d'intervention",
  vigik_plus: "Vigik+",
};

const getStatusStyles = (statut) => ({
  display: "inline-block",
  px: 1.5,
  py: 0.5,
  borderRadius: 1,
  backgroundColor:
    statut === "termine"
      ? "success.light"
      : statut === "en_cours"
      ? "warning.light"
      : statut === "brouillon_serveur"
      ? "#e0f2f1"
      : statut === "brouillon"
      ? "info.light"
      : "grey.200",
  color:
    statut === "termine"
      ? "success.dark"
      : statut === "en_cours"
      ? "warning.dark"
      : statut === "brouillon_serveur"
      ? "#00695c"
      : statut === "brouillon"
      ? "info.dark"
      : "grey.700",
  fontWeight: 500,
  textTransform: "capitalize",
  cursor: statut === "brouillon_serveur" ? "default" : "pointer",
  "&:hover": { opacity: statut === "brouillon_serveur" ? 1 : 0.9 },
});

const RapportsPage = () => {
  const navigate = useNavigate();
  const { rapports, rapportsCount, fetchRapports, deleteRapport, patchRapport, deleteRapportBrouillon, loading } = useRapports();
  const [brouillonsServeur, setBrouillonsServeur] = useState([]);
  const [filters, setFilters] = useState({
    technicien: "",
    client_societe: "",
    residence: "",
    date_creation: "",
    type_rapport: "",
  });
  const [residences, setResidences] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [rapportToUpdate, setRapportToUpdate] = useState(null);
  /** Tri par date : desc = plus rÃ©cent d'abord, asc = plus ancien d'abord */
  const [dateSortOrder, setDateSortOrder] = useState("desc");
  /** Par dÃ©faut : masquer les rapports au statut terminÃ© */
  const [showTermines, setShowTermines] = useState(false);
  /** Afficher uniquement les rapports avec Ã©tat devis Ã  faire (V) */
  const [showOnlyDevisAFaireV, setShowOnlyDevisAFaireV] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [devisDialogOpen, setDevisDialogOpen] = useState(false);
  const [rapportForDevis, setRapportForDevis] = useState(null);
  const [devisOptions, setDevisOptions] = useState([]);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const thumbClickTimeoutRef = useRef(null);

  useEffect(() => {
    axios.get("/api/residences/").then((res) => {
      setResidences(res.data?.results || res.data || []);
    }).catch(() => {});
  }, []);

  const loadRapports = useCallback(() => {
    const cleanFilters = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) cleanFilters[k] = v;
    });
    if (showOnlyDevisAFaireV) {
      cleanFilters.devis_a_faire = "true";
      cleanFilters.devis_fait = "false";
    }
    axios
      .get("/api/rapports-intervention-brouillons/")
      .then((r) => {
        const d = r.data;
        setBrouillonsServeur(Array.isArray(d) ? d : []);
      })
      .catch(() => setBrouillonsServeur([]));
    return fetchRapports(cleanFilters, {
      page: listPage,
      pageSize: RAPPORTS_LIST_PAGE_SIZE,
      ordering: dateSortOrder === "desc" ? "-date" : "date",
      excludeStatutTermine: !showTermines,
    });
  }, [fetchRapports, filters, listPage, dateSortOrder, showTermines, showOnlyDevisAFaireV]);

  const brouillonsFiltres = useMemo(() => {
    return brouillonsServeur.filter((b) => {
      if (filters.residence && Number(b.residence) !== Number(filters.residence)) return false;
      if (filters.type_rapport && b.type_rapport !== filters.type_rapport) return false;
      if (filters.date_creation) {
        const ds = b.date ? String(b.date).slice(0, 10) : "";
        if (ds !== filters.date_creation) return false;
      }
      if (filters.technicien) {
        const t = String(b.technicien || "").toLowerCase();
        if (!t.includes(String(filters.technicien).toLowerCase())) return false;
      }
      if (filters.client_societe && Number(b.client_societe) !== Number(filters.client_societe)) return false;
      if (showOnlyDevisAFaireV && (!b.devis_a_faire || b.devis_fait)) return false;
      return true;
    });
  }, [brouillonsServeur, filters, showOnlyDevisAFaireV]);

  const brouillonsSorted = useMemo(() => {
    return [...brouillonsFiltres].sort((a, b) => {
      const ta = new Date(a.updated_at || 0).getTime();
      const tb = new Date(b.updated_at || 0).getTime();
      return dateSortOrder === "desc" ? tb - ta : ta - tb;
    });
  }, [brouillonsFiltres, dateSortOrder]);

  const displayRapports = listPage === 1 ? [...brouillonsSorted, ...rapports] : rapports;

  const showInitialLoading =
    loading && rapports.length === 0 && (listPage > 1 || brouillonsSorted.length === 0);

  useEffect(() => {
    loadRapports();
  }, [loadRapports]);

  const handleDelete = async (row) => {
    if (row?.is_brouillon_serveur) {
      if (!window.confirm("Supprimer ce brouillon en ligne ?")) return;
      try {
        await deleteRapportBrouillon(row.id);
        setSnackbar({ open: true, message: "Brouillon supprimÃ©", severity: "success" });
        loadRapports();
      } catch {
        setSnackbar({ open: true, message: "Erreur lors de la suppression du brouillon", severity: "error" });
      }
      return;
    }
    if (!window.confirm("Supprimer ce rapport ?")) return;
    try {
      await deleteRapport(row.id);
      setSnackbar({ open: true, message: "Rapport supprime", severity: "success" });
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Erreur lors de la suppression", severity: "error" });
    }
  };

  const handleStatusClick = (e, rapport) => {
    e.stopPropagation();
    setRapportToUpdate(rapport);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async (newStatut) => {
    if (!rapportToUpdate) return;
    try {
      await patchRapport(rapportToUpdate.id, { statut: newStatut });
      if (newStatut === "termine") {
        setSnackbar({ open: true, message: "TÃ©lÃ©versement vers le Drive en cours...", severity: "info" });
        try {
          await axios.get(
            `/api/generate-rapport-intervention-pdf-drive/?rapport_id=${rapportToUpdate.id}`
          );
          setSnackbar({
            open: true,
            message: "Statut mis Ã  jour et rapport tÃ©lÃ©versÃ© dans le Drive",
            severity: "success",
          });
        } catch (driveErr) {
          setSnackbar({
            open: true,
            message:
              driveErr.response?.data?.error ||
              "Statut mis Ã  jour mais erreur lors du tÃ©lÃ©versement Drive",
            severity: "warning",
          });
        }
      } else {
        setSnackbar({ open: true, message: "Statut mis Ã  jour", severity: "success" });
      }
      setShowStatusModal(false);
      setRapportToUpdate(null);
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Erreur lors de la mise Ã  jour du statut", severity: "error" });
    }
  };

  const handleGeneratePDF = async (rapport) => {
    try {
      setSnackbar({ open: true, message: "TÃ©lÃ©chargement en cours...", severity: "info" });
      const response = await axios.post(
        "/api/generate-rapport-intervention-pdf/",
        { rapport_id: rapport.id },
        { responseType: "blob", headers: { "Content-Type": "application/json" } }
      );
      if (response.headers["content-type"] === "application/pdf") {
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = pdfUrl;
        const cd = response.headers["content-disposition"];
        let filename = `rapport_intervention_${rapport.id}.pdf`;
        if (cd) {
          const match = cd.match(/filename=["']?([^"';]+)["']?/i) || cd.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
          if (match) {
            try {
              filename = decodeURIComponent(match[1].trim().replace(/^["']|["']$/g, ""));
            } catch {
              filename = match[1].trim().replace(/^["']|["']$/g, "");
            }
          }
        }
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(pdfUrl);
        setSnackbar({ open: true, message: "TÃ©lÃ©chargement terminÃ© avec succÃ¨s", severity: "success" });
      } else {
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const err = JSON.parse(reader.result);
            setSnackbar({ open: true, message: `Erreur: ${err.error || "Erreur inconnue"}`, severity: "error" });
          } catch {
            setSnackbar({ open: true, message: "Erreur lors du tÃ©lÃ©chargement", severity: "error" });
          }
        };
        reader.readAsText(response.data);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || "Erreur lors de la gÃ©nÃ©ration du PDF.",
        severity: "error",
      });
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setListPage(1);
  };

  const openDevisDialogForRapport = async (rapport) => {
    try {
      const params = { page_size: 200 };
      if (rapport?.chantier) params.chantier = rapport.chantier;
      const [devisRes, rapportsRes] = await Promise.all([
        axios.get("/api/devisa/", { params }),
        axios.get("/api/rapports-intervention/", { params: { page_size: 500 } }),
      ]);
      const devisList = devisRes.data?.results || devisRes.data || [];
      const rapportsList = rapportsRes.data?.results || rapportsRes.data || [];
      const usedDevisIds = new Set(
        (Array.isArray(rapportsList) ? rapportsList : [])
          .filter((r) => r?.id !== rapport?.id)
          .map((r) => r?.devis_lie)
          .filter(Boolean)
      );
      const filteredDevis = (Array.isArray(devisList) ? devisList : []).filter(
        (d) => !usedDevisIds.has(d.id) || d.id === rapport?.devis_lie
      );
      setDevisOptions(filteredDevis);
      const currentDevis = filteredDevis.find((d) => d.id === rapport?.devis_lie) || null;
      setSelectedDevis(currentDevis);
      setRapportForDevis(rapport);
      setDevisDialogOpen(true);
    } catch {
      setSnackbar({ open: true, message: "Impossible de charger la liste des devis", severity: "error" });
    }
  };

  const handleConfirmDevisFait = async () => {
    if (!rapportForDevis?.id || !selectedDevis?.id) return;
    try {
      await patchRapport(rapportForDevis.id, {
        devis_a_faire: true,
        devis_fait: true,
        devis_lie: selectedDevis.id,
      });
      setSnackbar({ open: true, message: "Devis liÃ© et rapport marquÃ© comme devis fait", severity: "success" });
      setDevisDialogOpen(false);
      setRapportForDevis(null);
      setSelectedDevis(null);
      loadRapports();
    } catch (err) {
      const msg = err?.response?.data?.devis_lie?.[0] || "Impossible de lier ce devis";
      setSnackbar({ open: true, message: msg, severity: "error" });
    }
  };

  const handleDevisIconClick = async (e, rapport) => {
    e.stopPropagation();
    if (rapport.devis_a_faire) {
      await openDevisDialogForRapport(rapport);
    }
  };

  const handleBlueThumbClick = (e, rapport) => {
    e.stopPropagation();
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
    }
    thumbClickTimeoutRef.current = setTimeout(() => {
      if (rapport.devis_lie_preview_url) {
        window.open(rapport.devis_lie_preview_url, "_blank");
      } else {
        setSnackbar({ open: true, message: "Devis marquÃ© fait mais aucun devis liÃ©", severity: "warning" });
      }
      thumbClickTimeoutRef.current = null;
    }, 220);
  };

  const handleBlueThumbDoubleClick = async (e, rapport) => {
    e.stopPropagation();
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
      thumbClickTimeoutRef.current = null;
    }
    await openDevisDialogForRapport(rapport);
  };

  const handleResetToDevisAFaire = async () => {
    if (!rapportForDevis?.id) return;
    try {
      await patchRapport(rapportForDevis.id, {
        devis_a_faire: true,
        devis_fait: false,
        devis_lie: null,
      });
      setSnackbar({ open: true, message: "Rapport repassÃ© en devis Ã  faire", severity: "success" });
      setDevisDialogOpen(false);
      setRapportForDevis(null);
      setSelectedDevis(null);
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Impossible de repasser en devis Ã  faire", severity: "error" });
    }
  };

  useEffect(() => () => {
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
    }
  }, []);

  const listPageCount = Math.max(1, Math.ceil(rapportsCount / RAPPORTS_LIST_PAGE_SIZE));

  useEffect(() => {
    if (!loading && listPage > listPageCount) {
      setListPage(listPageCount);
    }
  }, [loading, listPage, listPageCount]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdDescription size={32} color={COLORS.accent || "#46acc2"} />
          <Typography variant="h4" component="h1" sx={{ color: COLORS.textOnDark }}>
            Rapports d'intervention
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<MdAdd />}
          onClick={() => navigate("/RapportIntervention/nouveau")}
          sx={{ backgroundColor: COLORS.infoDark || "#1976d2", "&:hover": { backgroundColor: "#1565c0" } }}
        >
          Nouveau rapport
        </Button>
      </Box>

      {/* Filtres */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <Autocomplete
            options={residences}
            getOptionLabel={(opt) => opt?.nom || ""}
            value={residences.find((r) => r.id === filters.residence) || null}
            onChange={(_, val) => handleFilterChange("residence", val?.id || "")}
            renderInput={(params) => <TextField {...params} label="Residence" size="small" />}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="filter-type-rapport-label">Type de rapport</InputLabel>
            <Select
              labelId="filter-type-rapport-label"
              label="Type de rapport"
              value={filters.type_rapport}
              onChange={(e) => handleFilterChange("type_rapport", e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="intervention">{TYPE_RAPPORT_LABELS.intervention}</MenuItem>
              <MenuItem value="vigik_plus">{TYPE_RAPPORT_LABELS.vigik_plus}</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Date de crÃ©ation du rapport"
            type="date"
            size="small"
            value={filters.date_creation}
            onChange={(e) => handleFilterChange("date_creation", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <Tooltip
            title={
              dateSortOrder === "desc"
                ? "Plus rÃ©cent d'abord â€” cliquer pour plus ancien d'abord"
                : "Plus ancien d'abord â€” cliquer pour plus rÃ©cent d'abord"
            }
          >
            <IconButton
              size="small"
              onClick={() => {
                setDateSortOrder((o) => (o === "desc" ? "asc" : "desc"));
                setListPage(1);
              }}
              sx={{
                alignSelf: "center",
                color: "text.secondary",
                opacity: 0.65,
                "&:hover": { opacity: 1, backgroundColor: "action.hover" },
              }}
              aria-label={
                dateSortOrder === "desc"
                  ? "Tri par date : plus rÃ©cent d'abord"
                  : "Tri par date : plus ancien d'abord"
              }
            >
              {dateSortOrder === "desc" ? (
                <MdArrowDownward size={20} />
              ) : (
                <MdArrowUpward size={20} />
              )}
            </IconButton>
          </Tooltip>

          <Box
            sx={{
              alignSelf: "center",
              display: "inline-flex",
              alignItems: "center",
              pl: 0.75,
              pr: 2,
              py: 0.75,
              borderRadius: 3,
              border: "1.5px solid",
              borderColor: showTermines ? COLORS.accent : COLORS.border,
              bgcolor: showTermines ? alpha(COLORS.accent, 0.1) : alpha(COLORS.primary, 0.03),
              transition: "border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
              boxShadow: showTermines
                ? `0 1px 0 ${alpha(COLORS.accent, 0.25)}, 0 4px 14px ${alpha(COLORS.accent, 0.12)}`
                : `inset 0 1px 0 ${alpha("#fff", 0.8)}`,
              "&:hover": {
                borderColor: COLORS.accent,
                bgcolor: showTermines ? alpha(COLORS.accent, 0.14) : alpha(COLORS.accent, 0.06),
                boxShadow: `0 2px 12px ${alpha(COLORS.primary, 0.08)}`,
              },
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  disableRipple
                  checked={showTermines}
                  onChange={(e) => {
                    setShowTermines(e.target.checked);
                    setListPage(1);
                  }}
                  sx={{
                    p: 0.65,
                    color: COLORS.borderDark,
                    transition: "color 0.2s ease, transform 0.15s ease",
                    "& .MuiSvgIcon-root": { fontSize: 22, borderRadius: "6px" },
                    "&.Mui-checked": {
                      color: COLORS.accent,
                      transform: "scale(1.02)",
                    },
                    "&:hover": { bgcolor: alpha(COLORS.accent, 0.08) },
                  }}
                />
              }
              label={
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    fontSize: "0.8125rem",
                    color: showTermines ? COLORS.primary : COLORS.textMuted,
                    lineHeight: 1.25,
                  }}
                >
                  Afficher terminÃ©s
                </Typography>
              }
              sx={{ m: 0, gap: 0.75, userSelect: "none", alignItems: "center" }}
            />
          </Box>

          <Box
            sx={{
              alignSelf: "center",
              display: "inline-flex",
              alignItems: "center",
              pl: 0.75,
              pr: 2,
              py: 0.75,
              borderRadius: 3,
              border: "1.5px solid",
              borderColor: showOnlyDevisAFaireV ? COLORS.success : COLORS.border,
              bgcolor: showOnlyDevisAFaireV ? alpha(COLORS.success, 0.1) : alpha(COLORS.primary, 0.03),
              transition: "border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
              boxShadow: showOnlyDevisAFaireV
                ? `0 1px 0 ${alpha(COLORS.success, 0.25)}, 0 4px 14px ${alpha(COLORS.success, 0.12)}`
                : `inset 0 1px 0 ${alpha("#fff", 0.8)}`,
              "&:hover": {
                borderColor: COLORS.success,
                bgcolor: showOnlyDevisAFaireV ? alpha(COLORS.success, 0.14) : alpha(COLORS.success, 0.06),
                boxShadow: `0 2px 12px ${alpha(COLORS.success, 0.08)}`,
              },
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  disableRipple
                  checked={showOnlyDevisAFaireV}
                  onChange={(e) => {
                    setShowOnlyDevisAFaireV(e.target.checked);
                    setListPage(1);
                  }}
                  sx={{
                    p: 0.65,
                    color: COLORS.borderDark,
                    transition: "color 0.2s ease, transform 0.15s ease",
                    "& .MuiSvgIcon-root": { fontSize: 22, borderRadius: "6px" },
                    "&.Mui-checked": {
                      color: COLORS.success,
                      transform: "scale(1.02)",
                    },
                    "&:hover": { bgcolor: alpha(COLORS.success, 0.08) },
                  }}
                />
              }
              label={
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    fontSize: "0.8125rem",
                    color: showOnlyDevisAFaireV ? COLORS.primary : COLORS.textMuted,
                    lineHeight: 1.25,
                  }}
                >
                  Devis Ã  faire
                </Typography>
              }
              sx={{ m: 0, gap: 0.75, userSelect: "none", alignItems: "center" }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Liste paginÃ©e cÃ´tÃ© serveur (tri + filtre terminÃ©s) */}
      {showInitialLoading ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 2, border: "1px solid #e0e0e0" }}>
          <Typography variant="body1" color="text.secondary">
            Chargement...
          </Typography>
        </Paper>
      ) : !loading && rapportsCount === 0 && brouillonsFiltres.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 2, border: "1px solid #e0e0e0" }}>
          <Typography variant="body1" color="text.secondary">
            Aucun rapport d&apos;intervention ne correspond Ã  ces critÃ¨res.
          </Typography>
          {!showTermines && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 480, mx: "auto" }}>
              Les rapports terminÃ©s sont masquÃ©s par dÃ©faut â€” cochez Â« Afficher terminÃ©s Â» pour les inclure.
            </Typography>
          )}
        </Paper>
      ) : (
        <>
        <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid #e0e0e0", overflow: "hidden" }}>
          <TableContainer sx={{ maxHeight: "calc(100vh - 280px)" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Residence</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Lieu d&apos;intervention / Adresse</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Titre</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Technicien</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Client</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Devis Ã  faire</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRapports.map((rapport) => {
                  const rowKey = rapport.is_brouillon_serveur ? `br-${rapport.id}` : rapport.id;
                  const st = rapport.statut || "a_faire";
                  return (
                  <TableRow
                    key={rowKey}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => {
                      if (rapport.is_brouillon_serveur) {
                        navigate(`/RapportIntervention/nouveau?brouillon=${rapport.id}`);
                      } else {
                        window.open(`/api/preview-rapport-intervention/${rapport.id}/`, "_blank");
                      }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>
                      {rapport.residence_nom || "Sans residence"}
                    </TableCell>
                    <TableCell>{rapport.date ? new Date(rapport.date).toLocaleDateString("fr-FR") : "-"}</TableCell>
                    <TableCell>{TYPE_RAPPORT_LABELS[rapport.type_rapport] || rapport.type_rapport || "-"}</TableCell>
                    <TableCell sx={{ fontWeight: 500, maxWidth: 220 }}>
                      {rapport.type_rapport === "vigik_plus"
                        ? (rapport.adresse_vigik || "-")
                        : (rapport.logement || "-")}
                    </TableCell>
                    <TableCell>{rapport.titre_nom || "-"}</TableCell>
                    <TableCell>{rapport.technicien || "-"}</TableCell>
                    <TableCell>{rapport.client_societe_nom || "-"}</TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      {rapport.is_brouillon_serveur ? (
                        <Typography variant="caption" color="text.disabled">â€”</Typography>
                      ) : rapport.devis_fait ? (
                        <IconButton
                          size="small"
                          onClick={(e) => handleBlueThumbClick(e, rapport)}
                          onDoubleClick={(e) => handleBlueThumbDoubleClick(e, rapport)}
                          title={rapport.devis_lie_numero ? `Devis ${rapport.devis_lie_numero} (double-clic pour corriger)` : "Voir le devis liÃ© (double-clic pour corriger)"}
                        >
                          <MdThumbUp size={20} color="#1565c0" />
                        </IconButton>
                      ) : rapport.devis_a_faire ? (
                        <IconButton size="small" onClick={(e) => handleDevisIconClick(e, rapport)} title="Cliquer pour lier le devis et marquer fait">
                          <MdCheck size={20} color="#2e7d32" />
                        </IconButton>
                      ) : (
                        <MdClose size={20} color="#c62828" title="Non" />
                      )}
                    </TableCell>
                    <TableCell
                      onClick={(e) => {
                        if (rapport.is_brouillon_serveur) e.stopPropagation();
                        else handleStatusClick(e, rapport);
                      }}
                      sx={
                        rapport.is_brouillon_serveur
                          ? { cursor: "default" }
                          : { cursor: "pointer", "&:hover": { backgroundColor: "rgba(27, 120, 188, 0.08)" } }
                      }
                    >
                      <Typography variant="body2" sx={getStatusStyles(st)}>
                        {STATUT_LABELS[st] || st || "A faire"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "center", whiteSpace: "nowrap" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!rapport.is_brouillon_serveur && (
                        <>
                      <IconButton
                        size="small"
                        onClick={() => handleGeneratePDF(rapport)}
                        sx={{ color: "success.main", "&:hover": { backgroundColor: "rgba(46, 125, 50, 0.04)" } }}
                        title="TÃ©lÃ©charger le PDF"
                      >
                        <AiFillFilePdf style={{ fontSize: "20px" }} />
                      </IconButton>
                      <RegeneratePDFIconButton
                        documentType={rapport.type_rapport === "vigik_plus" ? DOCUMENT_TYPES.RAPPORT_VIGIK_PLUS : DOCUMENT_TYPES.RAPPORT_INTERVENTION}
                        documentData={rapport}
                        size="small"
                        color="primary"
                        tooltipPlacement="top"
                      />
                        </>
                      )}
                      <IconButton size="small" color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (rapport.is_brouillon_serveur) {
                            navigate(`/RapportIntervention/nouveau?brouillon=${rapport.id}`);
                          } else {
                            navigate(`/RapportIntervention/${rapport.id}`);
                          }
                        }}
                      >
                        <MdEdit />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(rapport)}>
                        <MdDelete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        {listPageCount > 1 && (
          <Stack alignItems="center" sx={{ py: 2 }}>
            <Pagination
              count={listPageCount}
              page={listPage}
              onChange={(_, p) => setListPage(p)}
              color="primary"
              showFirstButton
              showLastButton
              size="small"
              siblingCount={1}
              boundaryCount={1}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {rapportsCount} rapport{rapportsCount > 1 ? "s" : ""} au total â€” {RAPPORTS_LIST_PAGE_SIZE} par page
            </Typography>
          </Stack>
        )}
        </>
      )}

      <StatusChangeModal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setRapportToUpdate(null);
        }}
        currentStatus={rapportToUpdate?.statut}
        onStatusChange={handleStatusUpdate}
        type="rapport"
        title="Modifier le statut du rapport"
      />

      <Dialog open={devisDialogOpen} onClose={() => setDevisDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Lier un devis (devis fait)</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={devisOptions}
            value={selectedDevis}
            onChange={(_, v) => setSelectedDevis(v)}
            getOptionLabel={(opt) => `${opt?.numero || "Sans numÃ©ro"}${opt?.chantier_name ? ` â€” ${opt.chantier_name}` : ""}`}
            renderInput={(params) => <TextField {...params} label="Choisir un devis" size="small" sx={{ mt: 1 }} />}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
          />
        </DialogContent>
        <DialogActions>
          {rapportForDevis?.devis_fait && (
            <Button color="warning" onClick={handleResetToDevisAFaire}>
              Repasser en devis Ã  faire (V)
            </Button>
          )}
          <Button onClick={() => setDevisDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleConfirmDevisFait} disabled={!selectedDevis}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RapportsPage;
```

### 7.12 `frontend/src/components/RapportIntervention/RapportsPageMobile.js`


```javascript
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  TextField,
  Autocomplete,
  Button,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Pagination,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { MdVisibility, MdEdit, MdArrowDownward, MdArrowUpward, MdCheck, MdClose, MdThumbUp } from "react-icons/md";
import { AiFillFilePdf } from "react-icons/ai";
import axios from "axios";
import { alpha } from "@mui/material/styles";
import { COLORS } from "../../constants/colors";
import { useRapports, RAPPORTS_LIST_PAGE_SIZE } from "../../hooks/useRapports";
import "./rapports-mobile.css";

const STATUT_LABELS = {
  brouillon: "Brouillon",
  brouillon_serveur: "Brouillons",
  a_faire: "A faire",
  en_cours: "En cours",
  termine: "TerminÃ©",
};

const TYPE_RAPPORT_LABELS = {
  intervention: "Rapport d'intervention",
  vigik_plus: "Vigik+",
};

/** Couleurs des badges de statut (rectangulaires, cohÃ©rent avec COLORS) */
const getStatusChipSx = (statut) => {
  const base = {
    flexShrink: 0,
    fontWeight: 600,
    fontSize: "0.75rem",
    borderRadius: 1,
    minHeight: 32,
    px: 2,
    border: "1px solid",
  };
  if (statut === "termine") {
    return { ...base, color: COLORS.successDark, backgroundColor: COLORS.successLight, borderColor: COLORS.success };
  }
  if (statut === "en_cours") {
    return { ...base, color: COLORS.accentDark, backgroundColor: COLORS.accentLight, borderColor: COLORS.accent };
  }
  if (statut === "brouillon") {
    return { ...base, color: COLORS.infoDark || "#1565c0", backgroundColor: "#e3f2fd", borderColor: COLORS.infoDark || "#1976d2" };
  }
  if (statut === "brouillon_serveur") {
    return {
      ...base,
      color: "#00695c",
      backgroundColor: "#e0f2f1",
      borderColor: "#00897b",
    };
  }
  return { ...base, color: COLORS.primary, backgroundColor: COLORS.backgroundAlt, borderColor: COLORS.primary };
};

/** Style commun pour boutons rectangulaires (mobile) : bordure + texte colorÃ©, hover inversÃ© */
const btnRectSx = (borderColor, bgColor, hoverTextColor) => ({
  minHeight: 48,
  minWidth: "auto",
  px: 2,
  borderRadius: 1,
  fontWeight: 600,
  fontSize: "0.8125rem",
  color: borderColor,
  backgroundColor: bgColor,
  border: `1px solid ${borderColor}`,
  "&:hover": {
    backgroundColor: borderColor,
    color: hoverTextColor,
    borderColor,
  },
});

const RapportsPageMobile = ({ onSelectRapport, onEditRapport }) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const { rapports, rapportsCount, fetchRapports, loading } = useRapports();
  const [brouillonsServeur, setBrouillonsServeur] = useState([]);
  const [residences, setResidences] = useState([]);
  const [filters, setFilters] = useState({
    residence: "",
    logement: "",
    type_rapport: "",
  });
  const [logementInput, setLogementInput] = useState("");
  const logementDebounceRef = useRef(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [dateSortOrder, setDateSortOrder] = useState("desc");
  const [showTermines, setShowTermines] = useState(false);
  const [showOnlyDevisAFaireV, setShowOnlyDevisAFaireV] = useState(false);
  const [listPage, setListPage] = useState(1);
  const skipNextLogementPageResetRef = useRef(true);
  const [devisDialogOpen, setDevisDialogOpen] = useState(false);
  const [rapportForDevis, setRapportForDevis] = useState(null);
  const [devisOptions, setDevisOptions] = useState([]);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const thumbClickTimeoutRef = useRef(null);

  useEffect(() => {
    axios.get("/api/residences/").then((res) => {
      setResidences(res.data?.results || res.data || []);
    }).catch(() => {});
  }, []);

  const loadRapports = useCallback(() => {
    const cleanFilters = {};
    if (filters.residence) cleanFilters.residence = filters.residence;
    if (filters.logement) cleanFilters.logement = filters.logement;
    if (filters.type_rapport) cleanFilters.type_rapport = filters.type_rapport;
    if (showOnlyDevisAFaireV) {
      cleanFilters.devis_a_faire = "true";
      cleanFilters.devis_fait = "false";
    }
    axios
      .get("/api/rapports-intervention-brouillons/")
      .then((r) => {
        const d = r.data;
        setBrouillonsServeur(Array.isArray(d) ? d : []);
      })
      .catch(() => setBrouillonsServeur([]));
    return fetchRapports(cleanFilters, {
      page: listPage,
      pageSize: RAPPORTS_LIST_PAGE_SIZE,
      ordering: dateSortOrder === "desc" ? "-date" : "date",
      excludeStatutTermine: !showTermines,
    });
  }, [fetchRapports, filters.residence, filters.logement, filters.type_rapport, listPage, dateSortOrder, showTermines, showOnlyDevisAFaireV]);

  const brouillonsFiltres = useMemo(() => {
    const log = (filters.logement || "").trim().toLowerCase();
    return brouillonsServeur.filter((b) => {
      if (filters.residence && Number(b.residence) !== Number(filters.residence)) return false;
      if (filters.type_rapport && b.type_rapport !== filters.type_rapport) return false;
      if (log && !String(b.logement || "").toLowerCase().includes(log)) return false;
      if (showOnlyDevisAFaireV && (!b.devis_a_faire || b.devis_fait)) return false;
      return true;
    });
  }, [brouillonsServeur, filters.residence, filters.logement, filters.type_rapport, showOnlyDevisAFaireV]);

  const brouillonsSorted = useMemo(() => {
    return [...brouillonsFiltres].sort((a, b) => {
      const ta = new Date(a.updated_at || 0).getTime();
      const tb = new Date(b.updated_at || 0).getTime();
      return dateSortOrder === "desc" ? tb - ta : ta - tb;
    });
  }, [brouillonsFiltres, dateSortOrder]);

  const displayRapports = listPage === 1 ? [...brouillonsSorted, ...rapports] : rapports;

  const showInitialLoading =
    loading && rapports.length === 0 && (listPage > 1 || brouillonsSorted.length === 0);

  useEffect(() => {
    loadRapports();
  }, [loadRapports]);

  useEffect(() => {
    if (logementDebounceRef.current) clearTimeout(logementDebounceRef.current);
    logementDebounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, logement: logementInput.trim() }));
    }, 300);
    return () => {
      if (logementDebounceRef.current) clearTimeout(logementDebounceRef.current);
    };
  }, [logementInput]);

  useEffect(() => {
    if (skipNextLogementPageResetRef.current) {
      skipNextLogementPageResetRef.current = false;
      return;
    }
    setListPage(1);
  }, [filters.logement]);

  const listPageCount = Math.max(1, Math.ceil(rapportsCount / RAPPORTS_LIST_PAGE_SIZE));

  useEffect(() => {
    if (!loading && listPage > listPageCount) {
      setListPage(listPageCount);
    }
  }, [loading, listPage, listPageCount]);

  const handleGeneratePDF = async (rapport, e) => {
    if (e) e.stopPropagation();
    try {
      setSnackbar({ open: true, message: "TÃ©lÃ©chargement en cours...", severity: "info" });
      const response = await axios.post(
        "/api/generate-rapport-intervention-pdf/",
        { rapport_id: rapport.id },
        { responseType: "blob", headers: { "Content-Type": "application/json" } }
      );
      if (response.headers["content-type"] === "application/pdf") {
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = pdfUrl;
        const cd = response.headers["content-disposition"];
        let filename = `rapport_intervention_${rapport.id}.pdf`;
        if (cd) {
          const match = cd.match(/filename=["']?([^"';]+)["']?/i) || cd.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
          if (match) {
            try {
              filename = decodeURIComponent(match[1].trim().replace(/^["']|["']$/g, ""));
            } catch {
              filename = match[1].trim().replace(/^["']|["']$/g, "");
            }
          }
        }
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(pdfUrl);
        setSnackbar({ open: true, message: "TÃ©lÃ©chargement terminÃ©", severity: "success" });
      } else {
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const err = JSON.parse(reader.result);
            setSnackbar({ open: true, message: err.error || "Erreur", severity: "error" });
          } catch {
            setSnackbar({ open: true, message: "Erreur tÃ©lÃ©chargement", severity: "error" });
          }
        };
        reader.readAsText(response.data);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || "Erreur gÃ©nÃ©ration PDF",
        severity: "error",
      });
    }
  };

  const handleFilterResidence = (_, value) => {
    setFilters((prev) => ({ ...prev, residence: value?.id || "" }));
    setListPage(1);
  };

  const openDevisDialogForRapport = async (rapport) => {
    try {
      const params = { page_size: 200 };
      if (rapport?.chantier) params.chantier = rapport.chantier;
      const [devisRes, rapportsRes] = await Promise.all([
        axios.get("/api/devisa/", { params }),
        axios.get("/api/rapports-intervention/", { params: { page_size: 500 } }),
      ]);
      const devisList = devisRes.data?.results || devisRes.data || [];
      const rapportsList = rapportsRes.data?.results || rapportsRes.data || [];
      const usedDevisIds = new Set(
        (Array.isArray(rapportsList) ? rapportsList : [])
          .filter((r) => r?.id !== rapport?.id)
          .map((r) => r?.devis_lie)
          .filter(Boolean)
      );
      const filteredDevis = (Array.isArray(devisList) ? devisList : []).filter(
        (d) => !usedDevisIds.has(d.id) || d.id === rapport?.devis_lie
      );
      setDevisOptions(filteredDevis);
      const currentDevis = filteredDevis.find((d) => d.id === rapport?.devis_lie) || null;
      setSelectedDevis(currentDevis);
      setRapportForDevis(rapport);
      setDevisDialogOpen(true);
    } catch {
      setSnackbar({ open: true, message: "Impossible de charger la liste des devis", severity: "error" });
    }
  };

  const handleConfirmDevisFait = async () => {
    if (!rapportForDevis?.id || !selectedDevis?.id) return;
    try {
      await axios.patch(`/api/rapports-intervention/${rapportForDevis.id}/`, {
        devis_a_faire: true,
        devis_fait: true,
        devis_lie: selectedDevis.id,
      });
      setSnackbar({ open: true, message: "Devis liÃ© et rapport marquÃ© comme devis fait", severity: "success" });
      setDevisDialogOpen(false);
      setRapportForDevis(null);
      setSelectedDevis(null);
      loadRapports();
    } catch (err) {
      const msg = err?.response?.data?.devis_lie?.[0] || "Impossible de lier ce devis";
      setSnackbar({ open: true, message: msg, severity: "error" });
    }
  };

  const handleDevisIconClick = async (e, rapport) => {
    e.stopPropagation();
    if (rapport.devis_a_faire) {
      await openDevisDialogForRapport(rapport);
    }
  };

  const handleBlueThumbClick = (e, rapport) => {
    e.stopPropagation();
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
    }
    thumbClickTimeoutRef.current = setTimeout(() => {
      if (rapport.devis_lie_preview_url) {
        window.open(rapport.devis_lie_preview_url, "_blank");
      } else {
        setSnackbar({ open: true, message: "Devis marquÃ© fait mais aucun devis liÃ©", severity: "warning" });
      }
      thumbClickTimeoutRef.current = null;
    }, 220);
  };

  const handleBlueThumbDoubleClick = async (e, rapport) => {
    e.stopPropagation();
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
      thumbClickTimeoutRef.current = null;
    }
    await openDevisDialogForRapport(rapport);
  };

  const handleResetToDevisAFaire = async () => {
    if (!rapportForDevis?.id) return;
    try {
      await axios.patch(`/api/rapports-intervention/${rapportForDevis.id}/`, {
        devis_a_faire: true,
        devis_fait: false,
        devis_lie: null,
      });
      setSnackbar({ open: true, message: "Rapport repassÃ© en devis Ã  faire", severity: "success" });
      setDevisDialogOpen(false);
      setRapportForDevis(null);
      setSelectedDevis(null);
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Impossible de repasser en devis Ã  faire", severity: "error" });
    }
  };

  useEffect(() => () => {
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
    }
  }, []);

  return (
    <Box
      className="rapports-mobile-layout"
      sx={{
        p: 2,
        pb: 1,
        px: { xs: 2, sm: 2.5 },
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
      }}
    >
      {/* Filtres â€” usage mobile : tactile, lisible, rÃ©initialisable */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          border: `1px solid ${COLORS.border || "#e0e0e0"}`,
          backgroundColor: COLORS.background || "#fff",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.primary, fontSize: "1rem" }}>
            Filtrer
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip
              title={
                dateSortOrder === "desc"
                  ? "Plus rÃ©cent d'abord â€” toucher pour plus ancien d'abord"
                  : "Plus ancien d'abord â€” toucher pour plus rÃ©cent d'abord"
              }
            >
              <IconButton
                size="small"
                onClick={() => {
                  setDateSortOrder((o) => (o === "desc" ? "asc" : "desc"));
                  setListPage(1);
                }}
                sx={{
                  color: COLORS.textMuted,
                  opacity: 0.75,
                  "&:hover": { opacity: 1, backgroundColor: COLORS.backgroundAlt },
                }}
                aria-label={
                  dateSortOrder === "desc"
                    ? "Tri par date : plus rÃ©cent d'abord"
                    : "Tri par date : plus ancien d'abord"
                }
              >
                {dateSortOrder === "desc" ? (
                  <MdArrowDownward size={22} />
                ) : (
                  <MdArrowUpward size={22} />
                )}
              </IconButton>
            </Tooltip>
            {(filters.residence || filters.logement || filters.type_rapport) && (
              <Button
                size="small"
                onClick={() => {
                  setFilters({ residence: "", logement: "", type_rapport: "" });
                  setLogementInput("");
                  setShowOnlyDevisAFaireV(false);
                  setListPage(1);
                }}
                sx={{
                  minHeight: 40,
                  px: 1.5,
                  borderRadius: 1,
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  color: COLORS.textMuted,
                  border: `1px solid ${COLORS.border}`,
                  "&:hover": { backgroundColor: COLORS.backgroundAlt, borderColor: COLORS.primary },
                }}
              >
                RÃ©initialiser
              </Button>
            )}
          </Box>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Autocomplete
            options={residences}
            getOptionLabel={(opt) => opt?.nom || ""}
            value={residences.find((r) => r.id === filters.residence) || null}
            onChange={handleFilterResidence}
            fullWidth
            renderInput={(params) => (
              <TextField
                {...params}
                label="RÃ©sidence"
                placeholder="Toutes les rÃ©sidences"
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    minHeight: 48,
                    borderRadius: 1,
                    fontSize: "1rem",
                    backgroundColor: COLORS.backgroundAlt,
                    "& fieldset": { borderColor: COLORS.border },
                    "&:hover fieldset": { borderColor: COLORS.primary },
                    "&.Mui-focused fieldset": { borderWidth: 2, borderColor: COLORS.accent },
                  },
                  "& .MuiInputLabel-outlined": { color: COLORS.textMuted },
                }}
              />
            )}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
            slotProps={{
              paper: { sx: { borderRadius: 2, mt: 1, boxShadow: 2 } },
              listbox: { sx: { maxHeight: 280, py: 0 } },
            }}
          />
          <TextField
            fullWidth
            label="Logement"
            value={logementInput}
            onChange={(e) => setLogementInput(e.target.value)}
            placeholder="Rechercher par nom de logement"
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                minHeight: 48,
                borderRadius: 1,
                fontSize: "1rem",
                backgroundColor: COLORS.backgroundAlt,
                "& fieldset": { borderColor: COLORS.border },
                "&:hover fieldset": { borderColor: COLORS.primary },
                "&.Mui-focused fieldset": { borderWidth: 2, borderColor: COLORS.accent },
              },
              "& .MuiInputLabel-outlined": { color: COLORS.textMuted },
            }}
          />
          <FormControl fullWidth size="small">
            <InputLabel id="mobile-filter-type-rapport-label">Type de rapport</InputLabel>
            <Select
              labelId="mobile-filter-type-rapport-label"
              label="Type de rapport"
              value={filters.type_rapport}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, type_rapport: e.target.value }));
                setListPage(1);
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  minHeight: 48,
                  borderRadius: 1,
                  backgroundColor: COLORS.backgroundAlt,
                },
              }}
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="intervention">{TYPE_RAPPORT_LABELS.intervention}</MenuItem>
              <MenuItem value="vigik_plus">{TYPE_RAPPORT_LABELS.vigik_plus}</MenuItem>
            </Select>
          </FormControl>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              pl: 1,
              pr: 2,
              py: 1.1,
              borderRadius: 2.5,
              border: "1.5px solid",
              borderColor: showTermines ? COLORS.accent : COLORS.border,
              bgcolor: showTermines ? alpha(COLORS.accent, 0.1) : alpha(COLORS.primary, 0.03),
              transition: "border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
              boxShadow: showTermines
                ? `0 1px 0 ${alpha(COLORS.accent, 0.2)}, 0 4px 16px ${alpha(COLORS.accent, 0.1)}`
                : `inset 0 1px 0 ${alpha("#fff", 0.9)}`,
              WebkitTapHighlightColor: "transparent",
              "@media (hover: hover)": {
                "&:hover": {
                  borderColor: COLORS.accent,
                  bgcolor: showTermines ? alpha(COLORS.accent, 0.14) : alpha(COLORS.accent, 0.06),
                  boxShadow: `0 2px 12px ${alpha(COLORS.primary, 0.07)}`,
                },
              },
              "&:active": {
                transform: "scale(0.995)",
                transition: "transform 0.1s ease",
              },
            }}
          >
            <FormControlLabel
              sx={{
                m: 0,
                width: "100%",
                mx: 0,
                gap: 1.25,
                alignItems: "center",
                userSelect: "none",
                justifyContent: "flex-start",
              }}
              control={
                <Checkbox
                  disableRipple
                  checked={showTermines}
                  onChange={(e) => {
                    setShowTermines(e.target.checked);
                    setListPage(1);
                  }}
                  sx={{
                    p: 0.75,
                    color: COLORS.borderDark,
                    transition: "color 0.2s ease, transform 0.15s ease",
                    "& .MuiSvgIcon-root": { fontSize: 24, borderRadius: "7px" },
                    "&.Mui-checked": {
                      color: COLORS.accent,
                      transform: "scale(1.03)",
                    },
                    "&:hover": { bgcolor: alpha(COLORS.accent, 0.08) },
                  }}
                />
              }
              label={
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    fontSize: "0.9375rem",
                    color: showTermines ? COLORS.primary : COLORS.textMuted,
                    lineHeight: 1.35,
                  }}
                >
                  Afficher terminÃ©s
                </Typography>
              }
            />
          </Box>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              pl: 1,
              pr: 2,
              py: 1.1,
              borderRadius: 2.5,
              border: "1.5px solid",
              borderColor: showOnlyDevisAFaireV ? COLORS.success : COLORS.border,
              bgcolor: showOnlyDevisAFaireV ? alpha(COLORS.success, 0.1) : alpha(COLORS.primary, 0.03),
              transition: "border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
              boxShadow: showOnlyDevisAFaireV
                ? `0 1px 0 ${alpha(COLORS.success, 0.2)}, 0 4px 16px ${alpha(COLORS.success, 0.1)}`
                : `inset 0 1px 0 ${alpha("#fff", 0.9)}`,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <FormControlLabel
              sx={{
                m: 0,
                width: "100%",
                mx: 0,
                gap: 1.25,
                alignItems: "center",
                userSelect: "none",
                justifyContent: "flex-start",
              }}
              control={
                <Checkbox
                  disableRipple
                  checked={showOnlyDevisAFaireV}
                  onChange={(e) => {
                    setShowOnlyDevisAFaireV(e.target.checked);
                    setListPage(1);
                  }}
                  sx={{
                    p: 0.75,
                    color: COLORS.borderDark,
                    transition: "color 0.2s ease, transform 0.15s ease",
                    "& .MuiSvgIcon-root": { fontSize: 24, borderRadius: "7px" },
                    "&.Mui-checked": {
                      color: COLORS.success,
                      transform: "scale(1.03)",
                    },
                    "&:hover": { bgcolor: alpha(COLORS.success, 0.08) },
                  }}
                />
              }
              label={
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    fontSize: "0.9375rem",
                    color: showOnlyDevisAFaireV ? COLORS.primary : COLORS.textMuted,
                    lineHeight: 1.35,
                  }}
                >
                  Devis Ã  faire
                </Typography>
              }
            />
          </Box>
        </Box>
      </Paper>

      {/* Liste paginÃ©e â€” mobile first */}
      {showInitialLoading ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          Chargement...
        </Typography>
      ) : !loading && rapportsCount === 0 && brouillonsFiltres.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            borderRadius: 2,
            border: `1px solid ${COLORS.border || "#e0e0e0"}`,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Aucun rapport ne correspond Ã  ces critÃ¨res.
          </Typography>
          {!showTermines && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, px: 1 }}>
              Les rapports terminÃ©s sont masquÃ©s â€” cochez Â« Afficher terminÃ©s Â» pour les inclure.
            </Typography>
          )}
        </Paper>
      ) : (
        <>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "repeat(2, 1fr)",
            gap: { xs: 2, sm: 2.5 },
            maxWidth: "100%",
          }}
        >
          {displayRapports.map((rapport) => {
            const rowKey = rapport.is_brouillon_serveur ? `br-${rapport.id}` : rapport.id;
            const st = rapport.statut || "a_faire";
            return (
            <Card
              key={rowKey}
              elevation={0}
              sx={{
                border: `1px solid ${COLORS.border || "#e0e0e0"}`,
                borderRadius: 2,
                overflow: "hidden",
                backgroundColor: COLORS.background || "#fff",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                transition: "box-shadow 0.2s ease, border-color 0.2s ease",
                "&:active": { borderColor: COLORS.accent || "#46acc2" },
              }}
            >
              <CardActionArea
                onClick={() => {
                  if (onSelectRapport) onSelectRapport(rapport);
                }}
                sx={{
                  minHeight: 48,
                  flex: 1,
                  display: "block",
                  "&.MuiCardActionArea-focusHighlight": { backgroundColor: "transparent" },
                }}
              >
                <CardContent
                  sx={{
                    p: 2,
                    pb: 1.5,
                    "&:last-child": { pb: 1.5 },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: "0.95rem", sm: "1rem" },
                        lineHeight: 1.3,
                        color: COLORS.primaryDark || COLORS.primary,
                        flex: 1,
                        minWidth: 0,
                        wordBreak: "break-word",
                      }}
                    >
                      {rapport.residence_nom || "Sans rÃ©sidence"}
                    </Typography>
                    <Chip
                      label={STATUT_LABELS[st] || st || "A faire"}
                      size="small"
                      sx={getStatusChipSx(st)}
                    />
                  </Box>
                  <Box sx={{ fontSize: "0.8125rem", mb: 0.5, color: "text.secondary" }}>
                    {TYPE_RAPPORT_LABELS[rapport.type_rapport] || rapport.type_rapport || "-"}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                    <Typography component="span" variant="body2" sx={{ color: COLORS.primary, fontWeight: 600, fontSize: "0.8125rem" }}>
                      Devis Ã  faire :
                    </Typography>
                    {rapport.is_brouillon_serveur ? (
                      <Typography variant="caption" color="text.disabled">â€”</Typography>
                    ) : rapport.devis_fait ? (
                      <IconButton
                        size="small"
                        onClick={(e) => handleBlueThumbClick(e, rapport)}
                        onDoubleClick={(e) => handleBlueThumbDoubleClick(e, rapport)}
                        title={rapport.devis_lie_numero ? `Devis ${rapport.devis_lie_numero} (double-clic pour corriger)` : "Voir le devis liÃ© (double-clic pour corriger)"}
                      >
                        <MdThumbUp size={18} color="#1565c0" />
                      </IconButton>
                    ) : rapport.devis_a_faire ? (
                      <IconButton size="small" onClick={(e) => handleDevisIconClick(e, rapport)} title="Cliquer pour lier le devis et marquer fait">
                        <MdCheck size={18} color="#2e7d32" />
                      </IconButton>
                    ) : (
                      <MdClose size={18} color="#c62828" title="Non" />
                    )}
                  </Box>
                  {rapport.client_societe_nom && (
                    <Box sx={{ fontSize: "0.8125rem", mb: 0.5, color: "text.secondary" }}>
                      Client : {rapport.client_societe_nom}
                    </Box>
                  )}
                  <Box sx={{ fontSize: "0.875rem", mb: 0.5, lineHeight: 1.4 }}>
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ color: COLORS.primary, fontWeight: 600, fontSize: "inherit" }}
                    >
                      Lieu d&apos;intervention :{" "}
                    </Typography>
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ color: COLORS.accent, fontSize: "inherit" }}
                    >
                      {rapport.type_rapport === "vigik_plus"
                        ? (rapport.adresse_vigik || "-")
                        : (rapport.logement || "-")}
                    </Typography>
                  </Box>
                  <Box sx={{ fontSize: "0.8125rem", lineHeight: 1.4 }}>
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ color: COLORS.accent, fontWeight: 600, fontSize: "inherit" }}
                    >
                      {rapport.date ? new Date(rapport.date).toLocaleDateString("fr-FR") : "-"}
                    </Typography>
                    {rapport.titre_nom && (
                      <>
                        <Typography component="span" variant="body2" sx={{ color: COLORS.textMuted, fontSize: "inherit" }}>
                          {" Â· "}
                        </Typography>
                        <Typography component="span" variant="body2" sx={{ color: COLORS.textLight, fontSize: "inherit" }}>
                          {rapport.titre_nom}
                        </Typography>
                      </>
                    )}
                  </Box>
                </CardContent>
              </CardActionArea>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "stretch",
                  justifyContent: "flex-end",
                  gap: 1,
                  px: 1.5,
                  py: 1.5,
                  borderTop: `1px solid ${COLORS.borderLight || "#eee"}`,
                  backgroundColor: COLORS.backgroundAlt || "#f8f9fa",
                  flexWrap: "wrap",
                }}
              >
                <Button
                  size="small"
                  startIcon={<MdVisibility />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectRapport) onSelectRapport(rapport);
                  }}
                  sx={btnRectSx(COLORS.primary, COLORS.background, COLORS.textOnDark)}
                >
                  Voir
                </Button>
                {!rapport.is_brouillon_serveur && (
                <Button
                  size="small"
                  startIcon={<AiFillFilePdf style={{ fontSize: 18 }} />}
                  onClick={(e) => handleGeneratePDF(rapport, e)}
                  sx={btnRectSx(COLORS.success, COLORS.background, COLORS.textOnDark)}
                >
                  PDF
                </Button>
                )}
                <Button
                  size="small"
                  startIcon={<MdEdit />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEditRapport) onEditRapport(rapport);
                  }}
                  sx={btnRectSx(COLORS.accent, COLORS.background, COLORS.textOnDark)}
                >
                  Modifier
                </Button>
              </Box>
            </Card>
          );
          })}
        </Box>
        {listPageCount > 1 && (
          <Stack alignItems="center" sx={{ py: 2, pb: 1 }}>
            <Pagination
              count={listPageCount}
              page={listPage}
              onChange={(_, p) => setListPage(p)}
              color="primary"
              showFirstButton
              showLastButton
              size="small"
              siblingCount={0}
              boundaryCount={1}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {rapportsCount} au total â€” {RAPPORTS_LIST_PAGE_SIZE} par page
            </Typography>
          </Stack>
        )}
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog open={devisDialogOpen} onClose={() => setDevisDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Lier un devis (devis fait)</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={devisOptions}
            value={selectedDevis}
            onChange={(_, v) => setSelectedDevis(v)}
            getOptionLabel={(opt) => `${opt?.numero || "Sans numÃ©ro"}${opt?.chantier_name ? ` â€” ${opt.chantier_name}` : ""}`}
            renderInput={(params) => <TextField {...params} label="Choisir un devis" size="small" sx={{ mt: 1 }} />}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
          />
        </DialogContent>
        <DialogActions>
          {rapportForDevis?.devis_fait && (
            <Button color="warning" onClick={handleResetToDevisAFaire}>
              Repasser en devis Ã  faire (V)
            </Button>
          )}
          <Button onClick={() => setDevisDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleConfirmDevisFait} disabled={!selectedDevis}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RapportsPageMobile;
```

### 7.13 `frontend/src/components/RapportIntervention/RapportMobileLayout.js`

```javascript
import React, { useState } from "react";
import { Box, BottomNavigation, BottomNavigationAction, Paper, Typography, AppBar, Toolbar, IconButton } from "@mui/material";
import { MdList, MdAdd, MdDescription, MdLogout } from "react-icons/md";
import RapportsPageMobile from "./RapportsPageMobile";
import RapportDetailMobile from "./RapportDetailMobile";
import RapportForm from "./RapportForm";
import { useAuth } from "../../hooks/useAuth";
import { COLORS } from "../../constants/colors";

const RapportMobileLayout = () => {
  const [currentView, setCurrentView] = useState("list");
  const [selectedRapportId, setSelectedRapportId] = useState(null);
  const [selectedServerBrouillonId, setSelectedServerBrouillonId] = useState(null);
  const [navValue, setNavValue] = useState(0);
  const { logout, user } = useAuth();

  const handleCreateNew = () => {
    setSelectedRapportId(null);
    setSelectedServerBrouillonId(null);
    setCurrentView("form");
    setNavValue(1);
  };

  const handleEditRapport = (rapport) => {
    if (rapport?.is_brouillon_serveur) {
      setSelectedRapportId(null);
      setSelectedServerBrouillonId(rapport.id);
    } else {
      setSelectedRapportId(typeof rapport === "object" ? rapport.id : rapport);
      setSelectedServerBrouillonId(null);
    }
    setCurrentView("form");
    setNavValue(1);
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedRapportId(null);
    setSelectedServerBrouillonId(null);
    setNavValue(0);
  };

  const handleSelectRapport = (rapport) => {
    if (rapport?.is_brouillon_serveur) {
      setSelectedRapportId(null);
      setSelectedServerBrouillonId(rapport.id);
      setCurrentView("form");
      setNavValue(1);
      return;
    }
    const id = typeof rapport === "object" ? rapport.id : rapport;
    setSelectedServerBrouillonId(null);
    setSelectedRapportId(id);
    setCurrentView("detail");
  };

  const handleBackFromDetail = () => {
    setCurrentView("list");
    setSelectedRapportId(null);
    setSelectedServerBrouillonId(null);
    setNavValue(0);
  };

  const handleReportCreated = (id) => {
    setSelectedServerBrouillonId(null);
    setSelectedRapportId(id);
    setCurrentView("detail");
    setNavValue(0);
  };

  const handleNavChange = (event, newValue) => {
    setNavValue(newValue);
    if (newValue === 0) {
      setCurrentView("list");
      setSelectedRapportId(null);
      setSelectedServerBrouillonId(null);
    } else if (newValue === 1) {
      setSelectedRapportId(null);
      setSelectedServerBrouillonId(null);
      setCurrentView("form");
    }
  };

  const renderContent = () => {
    if (currentView === "form") {
      return (
        <RapportForm
          rapportId={selectedRapportId}
          serverBrouillonIdToLoad={selectedServerBrouillonId}
          onBack={handleBackToList}
          saveButtonAtBottom
          onReportCreated={handleReportCreated}
          onRapportIdAssigned={(id) => {
            setSelectedServerBrouillonId(null);
            setSelectedRapportId(id);
          }}
        />
      );
    }
    if (currentView === "detail" && selectedRapportId) {
      return (
        <RapportDetailMobile
          rapportId={selectedRapportId}
          onBack={handleBackFromDetail}
          onEdit={handleEditRapport}
        />
      );
    }
    return (
      <RapportsPageMobile
        onSelectRapport={handleSelectRapport}
        onEditRapport={handleEditRapport}
      />
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        bgcolor: "#f5f5f5",
      }}
    >
      <AppBar position="static" sx={{ backgroundColor: COLORS.infoDark || "#1976d2" }}>
        <Toolbar sx={{ minHeight: 56 }}>
          <MdDescription size={24} style={{ marginRight: 8 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "1rem" }}>
            Rapports d'intervention
          </Typography>
          {user && (
            <Typography variant="caption" sx={{ mr: 1, opacity: 0.8 }}>
              {user.first_name || user.username}
            </Typography>
          )}
          <IconButton color="inherit" onClick={logout} size="small">
            <MdLogout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          pb: "80px",
        }}
      >
        {renderContent()}
      </Box>

      <Paper
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10 }}
        elevation={3}
      >
        <BottomNavigation
          value={navValue}
          onChange={handleNavChange}
          showLabels
        >
          <BottomNavigationAction label="Rapports" icon={<MdList size={24} />} />
          <BottomNavigationAction label="Nouveau" icon={<MdAdd size={24} />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default RapportMobileLayout;
```

### 7.14 `frontend/src/components/RapportIntervention/RapportDetailMobile.js`

```javascript
import React, { useEffect, useState, useCallback } from "react";
import { Box, Button, Typography, CircularProgress, Snackbar, Alert } from "@mui/material";
import { MdArrowBack, MdEdit } from "react-icons/md";
import { AiFillFilePdf } from "react-icons/ai";
import axios from "axios";
import { useRapports } from "../../hooks/useRapports";
import RapportPreview from "./RapportPreview";
import { COLORS } from "../../constants/colors";

const RapportDetailMobile = ({ rapportId, onBack, onEdit }) => {
  const { fetchRapport } = useRapports();
  const [rapport, setRapport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (!rapportId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRapport(rapportId)
      .then((data) => {
        if (!cancelled) setRapport(data);
      })
      .catch(() => {
        if (!cancelled) setError("Rapport introuvable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [rapportId, fetchRapport]);

  const handleGeneratePDF = useCallback(async () => {
    if (!rapportId) return;
    try {
      setSnackbar({ open: true, message: "Telechargement en cours...", severity: "info" });
      const response = await axios.post(
        "/api/generate-rapport-intervention-pdf/",
        { rapport_id: rapportId },
        { responseType: "blob", headers: { "Content-Type": "application/json" } }
      );
      if (response.headers["content-type"] === "application/pdf") {
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = pdfUrl;
        const cd = response.headers["content-disposition"];
        let filename = `rapport_intervention_${rapportId}.pdf`;
        if (cd) {
          const match = cd.match(/filename=["']?([^"';]+)["']?/i) || cd.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
          if (match) {
            try {
              filename = decodeURIComponent(match[1].trim().replace(/^["']|["']$/g, ""));
            } catch {
              filename = match[1].trim().replace(/^["']|["']$/g, "");
            }
          }
        }
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(pdfUrl);
        setSnackbar({ open: true, message: "Telechargement termine", severity: "success" });
      } else {
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const err = JSON.parse(reader.result);
            setSnackbar({ open: true, message: err.error || "Erreur", severity: "error" });
          } catch {
            setSnackbar({ open: true, message: "Erreur telechargement", severity: "error" });
          }
        };
        reader.readAsText(response.data);
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Erreur generation PDF",
        severity: "error",
      });
    }
  }, [rapportId]);

  if (loading && !rapport) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 280, p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !rapport) {
    return (
      <Box sx={{ p: 2 }}>
        <Button startIcon={<MdArrowBack />} onClick={onBack} sx={{ mb: 2 }}>
          Retour
        </Button>
        <Typography color="error">{error || "Rapport introuvable"}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 4 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
          mb: 2,
        }}
      >
        <Button startIcon={<MdArrowBack />} onClick={onBack} sx={{ minHeight: 44 }}>
          Retour
        </Button>
        <Button
          variant="contained"
          startIcon={<AiFillFilePdf />}
          onClick={handleGeneratePDF}
          sx={{
            backgroundColor: "#e65100",
            color: "#fff",
            minHeight: 44,
            "&:hover": { backgroundColor: "#bf360c" },
          }}
        >
          Telecharger PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<MdEdit />}
          onClick={() => onEdit && onEdit(rapportId)}
          sx={{
            backgroundColor: COLORS.infoDark || "#1976d2",
            minHeight: 44,
            "&:hover": { backgroundColor: "#1565c0" },
          }}
        >
          Modifier
        </Button>
      </Box>
      <RapportPreview rapport={rapport} />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RapportDetailMobile;
```

### 7.15 `frontend/src/components/RapportIntervention/ChantierRapportsList.js`

Liste des rapports pour un chantier donné (intégrée dans l'onglet documents du chantier).


```javascript
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Box, Button, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, TextField, Snackbar, Alert,
} from "@mui/material";
import { MdAdd, MdEdit, MdDelete, MdLink, MdCheck, MdClose, MdThumbUp } from "react-icons/md";
import { AiFillFilePdf } from "react-icons/ai";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../../constants/colors";
import { useRapports } from "../../hooks/useRapports";
import StatusChangeModal from "../StatusChangeModal";
import { RegeneratePDFIconButton } from "../shared/RegeneratePDFButton";
import { DOCUMENT_TYPES } from "../../config/documentTypeConfig";

const STATUT_LABELS = {
  brouillon: "Brouillon",
  brouillon_serveur: "Brouillons",
  a_faire: "A faire",
  en_cours: "En cours",
  termine: "TerminÃ©",
};

const TYPE_RAPPORT_LABELS = {
  intervention: "Rapport d'intervention",
  vigik_plus: "Vigik+",
};

const getStatusStyles = (statut) => ({
  display: "inline-block",
  px: 1.5,
  py: 0.5,
  borderRadius: 1,
  backgroundColor:
    statut === "termine"
      ? "success.light"
      : statut === "en_cours"
      ? "warning.light"
      : statut === "brouillon_serveur"
      ? "#e0f2f1"
      : statut === "brouillon"
      ? "info.light"
      : "grey.200",
  color:
    statut === "termine"
      ? "success.dark"
      : statut === "en_cours"
      ? "warning.dark"
      : statut === "brouillon_serveur"
      ? "#00695c"
      : statut === "brouillon"
      ? "info.dark"
      : "grey.700",
  fontWeight: 500,
  textTransform: "capitalize",
  cursor: statut === "brouillon_serveur" ? "default" : "pointer",
  "&:hover": { opacity: statut === "brouillon_serveur" ? 1 : 0.9 },
});

const ChantierRapportsList = ({ chantierData }) => {
  const navigate = useNavigate();
  const { rapports, fetchRapports, lierChantier, deleteRapport, patchRapport, deleteRapportBrouillon, loading } = useRapports();
  const [brouillonsServeur, setBrouillonsServeur] = useState([]);
  const [linkDialog, setLinkDialog] = useState(false);
  const [allRapports, setAllRapports] = useState([]);
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [rapportToUpdate, setRapportToUpdate] = useState(null);
  const [devisDialogOpen, setDevisDialogOpen] = useState(false);
  const [rapportForDevis, setRapportForDevis] = useState(null);
  const [devisOptions, setDevisOptions] = useState([]);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const thumbClickTimeoutRef = useRef(null);

  const loadRapports = useCallback(async () => {
    if (!chantierData?.id) return;
    const cid = chantierData.id;
    axios
      .get("/api/rapports-intervention-brouillons/")
      .then((r) => {
        const d = r.data;
        const list = Array.isArray(d) ? d : [];
        setBrouillonsServeur(list.filter((b) => Number(b.chantier) === Number(cid)));
      })
      .catch(() => setBrouillonsServeur([]));
    await fetchRapports({ chantier: cid }, { page: 1, pageSize: 200 });
  }, [chantierData?.id, fetchRapports]);

  const brouillonsSorted = useMemo(() => {
    return [...brouillonsServeur].sort(
      (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    );
  }, [brouillonsServeur]);

  const displayRapports = useMemo(() => [...brouillonsSorted, ...rapports], [brouillonsSorted, rapports]);

  useEffect(() => {
    loadRapports();
  }, [loadRapports]);

  const handleOpenLinkDialog = async () => {
    try {
      const res = await axios.get("/api/rapports-intervention/", {
        params: { sans_chantier: "true", page_size: 200 },
      });
      const list = res.data?.results ?? [];
      setAllRapports(Array.isArray(list) ? list : []);
    } catch {
      setAllRapports([]);
    }
    setLinkDialog(true);
  };

  const handleLinkRapport = async () => {
    if (!selectedRapport || !chantierData?.id) return;
    try {
      await lierChantier(selectedRapport.id, chantierData.id);
      setSnackbar({ open: true, message: "Rapport lie au chantier", severity: "success" });
      setLinkDialog(false);
      setSelectedRapport(null);
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Erreur lors de la liaison", severity: "error" });
    }
  };

  const handleDelete = async (row) => {
    if (row?.is_brouillon_serveur) {
      if (!window.confirm("Supprimer ce brouillon en ligne ?")) return;
      try {
        await deleteRapportBrouillon(row.id);
        setSnackbar({ open: true, message: "Brouillon supprimÃ©", severity: "success" });
        loadRapports();
      } catch {
        setSnackbar({ open: true, message: "Erreur lors de la suppression du brouillon", severity: "error" });
      }
      return;
    }
    if (!window.confirm("Supprimer ce rapport ?")) return;
    try {
      await deleteRapport(row.id);
      setSnackbar({ open: true, message: "Rapport supprime", severity: "success" });
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Erreur lors de la suppression", severity: "error" });
    }
  };

  const handleStatusClick = (e, rapport) => {
    e.stopPropagation();
    setRapportToUpdate(rapport);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async (newStatut) => {
    if (!rapportToUpdate) return;
    try {
      await patchRapport(rapportToUpdate.id, { statut: newStatut });
      if (newStatut === "termine") {
        setSnackbar({ open: true, message: "TÃ©lÃ©versement vers le Drive en cours...", severity: "info" });
        try {
          await axios.get(
            `/api/generate-rapport-intervention-pdf-drive/?rapport_id=${rapportToUpdate.id}`
          );
          setSnackbar({
            open: true,
            message: "Statut mis Ã  jour et rapport tÃ©lÃ©versÃ© dans le Drive",
            severity: "success",
          });
        } catch (driveErr) {
          setSnackbar({
            open: true,
            message:
              driveErr.response?.data?.error ||
              "Statut mis Ã  jour mais erreur lors du tÃ©lÃ©versement Drive",
            severity: "warning",
          });
        }
      } else {
        setSnackbar({ open: true, message: "Statut mis Ã  jour", severity: "success" });
      }
      setShowStatusModal(false);
      setRapportToUpdate(null);
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Erreur lors de la mise Ã  jour du statut", severity: "error" });
    }
  };

  const handleGeneratePDF = async (rapport) => {
    try {
      setSnackbar({ open: true, message: "TÃ©lÃ©chargement en cours...", severity: "info" });
      const response = await axios.post(
        "/api/generate-rapport-intervention-pdf/",
        { rapport_id: rapport.id },
        { responseType: "blob", headers: { "Content-Type": "application/json" } }
      );
      if (response.headers["content-type"] === "application/pdf") {
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = pdfUrl;
        const cd = response.headers["content-disposition"];
        let filename = `rapport_intervention_${rapport.id}.pdf`;
        if (cd) {
          const match = cd.match(/filename=["']?([^"';]+)["']?/i) || cd.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
          if (match) {
            try {
              filename = decodeURIComponent(match[1].trim().replace(/^["']|["']$/g, ""));
            } catch {
              filename = match[1].trim().replace(/^["']|["']$/g, "");
            }
          }
        }
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(pdfUrl);
        setSnackbar({ open: true, message: "TÃ©lÃ©chargement terminÃ© avec succÃ¨s", severity: "success" });
      } else {
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const err = JSON.parse(reader.result);
            setSnackbar({ open: true, message: `Erreur: ${err.error || "Erreur inconnue"}`, severity: "error" });
          } catch {
            setSnackbar({ open: true, message: "Erreur lors du tÃ©lÃ©chargement", severity: "error" });
          }
        };
        reader.readAsText(response.data);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || "Erreur lors de la gÃ©nÃ©ration du PDF.",
        severity: "error",
      });
    }
  };

  const openDevisDialogForRapport = async (rapport) => {
    try {
      const params = { page_size: 200 };
      if (rapport?.chantier) params.chantier = rapport.chantier;
      const [devisRes, rapportsRes] = await Promise.all([
        axios.get("/api/devisa/", { params }),
        axios.get("/api/rapports-intervention/", { params: { page_size: 500 } }),
      ]);
      const devisList = devisRes.data?.results || devisRes.data || [];
      const rapportsList = rapportsRes.data?.results || rapportsRes.data || [];
      const usedDevisIds = new Set(
        (Array.isArray(rapportsList) ? rapportsList : [])
          .filter((r) => r?.id !== rapport?.id)
          .map((r) => r?.devis_lie)
          .filter(Boolean)
      );
      const filteredDevis = (Array.isArray(devisList) ? devisList : []).filter(
        (d) => !usedDevisIds.has(d.id) || d.id === rapport?.devis_lie
      );
      setDevisOptions(filteredDevis);
      const currentDevis = filteredDevis.find((d) => d.id === rapport?.devis_lie) || null;
      setSelectedDevis(currentDevis);
      setRapportForDevis(rapport);
      setDevisDialogOpen(true);
    } catch {
      setSnackbar({ open: true, message: "Impossible de charger la liste des devis", severity: "error" });
    }
  };

  const handleConfirmDevisFait = async () => {
    if (!rapportForDevis?.id || !selectedDevis?.id) return;
    try {
      await patchRapport(rapportForDevis.id, {
        devis_a_faire: true,
        devis_fait: true,
        devis_lie: selectedDevis.id,
      });
      setSnackbar({ open: true, message: "Devis liÃ© et rapport marquÃ© comme devis fait", severity: "success" });
      setDevisDialogOpen(false);
      setRapportForDevis(null);
      setSelectedDevis(null);
      loadRapports();
    } catch (err) {
      const msg = err?.response?.data?.devis_lie?.[0] || "Impossible de lier ce devis";
      setSnackbar({ open: true, message: msg, severity: "error" });
    }
  };

  const handleDevisIconClick = async (e, rapport) => {
    e.stopPropagation();
    if (rapport.devis_a_faire) {
      await openDevisDialogForRapport(rapport);
    }
  };

  const handleBlueThumbClick = (e, rapport) => {
    e.stopPropagation();
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
    }
    thumbClickTimeoutRef.current = setTimeout(() => {
      if (rapport.devis_lie_preview_url) {
        window.open(rapport.devis_lie_preview_url, "_blank");
      } else {
        setSnackbar({ open: true, message: "Devis marquÃ© fait mais aucun devis liÃ©", severity: "warning" });
      }
      thumbClickTimeoutRef.current = null;
    }, 220);
  };

  const handleBlueThumbDoubleClick = async (e, rapport) => {
    e.stopPropagation();
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
      thumbClickTimeoutRef.current = null;
    }
    await openDevisDialogForRapport(rapport);
  };

  const handleResetToDevisAFaire = async () => {
    if (!rapportForDevis?.id) return;
    try {
      await patchRapport(rapportForDevis.id, {
        devis_a_faire: true,
        devis_fait: false,
        devis_lie: null,
      });
      setSnackbar({ open: true, message: "Rapport repassÃ© en devis Ã  faire", severity: "success" });
      setDevisDialogOpen(false);
      setRapportForDevis(null);
      setSelectedDevis(null);
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Impossible de repasser en devis Ã  faire", severity: "error" });
    }
  };

  useEffect(() => () => {
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
    }
  }, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textOnDark }}>
          Rapports d&apos;intervention ({displayRapports.length})
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<MdLink />}
            onClick={handleOpenLinkDialog}
          >
            Lier un rapport
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<MdAdd />}
            onClick={() => navigate(`/RapportIntervention/nouveau?chantier=${chantierData?.id}`)}
            sx={{ backgroundColor: COLORS.infoDark || "#1976d2" }}
          >
            Nouveau rapport
          </Button>
        </Box>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Titre</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Technicien</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Residence</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Logement/Adresse</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Devis Ã  faire</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRapports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: "center", py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? "Chargement..." : "Aucun rapport lie a ce chantier"}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayRapports.map((rapport) => {
                const rowKey = rapport.is_brouillon_serveur ? `br-${rapport.id}` : rapport.id;
                const st = rapport.statut || "a_faire";
                return (
                <TableRow
                  key={rowKey}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    if (rapport.is_brouillon_serveur) {
                      navigate(`/RapportIntervention/nouveau?brouillon=${rapport.id}`);
                    } else {
                      window.open(`/api/preview-rapport-intervention/${rapport.id}/`, "_blank");
                    }
                  }}
                >
                  <TableCell>{rapport.date ? new Date(rapport.date).toLocaleDateString("fr-FR") : "-"}</TableCell>
                  <TableCell>{TYPE_RAPPORT_LABELS[rapport.type_rapport] || rapport.type_rapport || "-"}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{rapport.titre_nom || "-"}</TableCell>
                  <TableCell>{rapport.technicien || "-"}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {rapport.residence_nom || "-"}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {rapport.type_rapport === "vigik_plus"
                      ? (rapport.adresse_vigik || "-")
                      : (rapport.logement || "-")}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {rapport.is_brouillon_serveur ? (
                      <Typography variant="caption" color="text.disabled">â€”</Typography>
                    ) : rapport.devis_fait ? (
                      <IconButton
                        size="small"
                        onClick={(e) => handleBlueThumbClick(e, rapport)}
                        onDoubleClick={(e) => handleBlueThumbDoubleClick(e, rapport)}
                        title={rapport.devis_lie_numero ? `Devis ${rapport.devis_lie_numero} (double-clic pour corriger)` : "Voir le devis liÃ© (double-clic pour corriger)"}
                      >
                        <MdThumbUp size={20} color="#1565c0" />
                      </IconButton>
                    ) : rapport.devis_a_faire ? (
                      <IconButton size="small" onClick={(e) => handleDevisIconClick(e, rapport)} title="Cliquer pour lier le devis et marquer fait">
                        <MdCheck size={20} color="#2e7d32" />
                      </IconButton>
                    ) : (
                      <MdClose size={20} color="#c62828" title="Non" />
                    )}
                  </TableCell>
                  <TableCell
                    onClick={(e) => {
                      if (rapport.is_brouillon_serveur) e.stopPropagation();
                      else handleStatusClick(e, rapport);
                    }}
                    sx={
                      rapport.is_brouillon_serveur
                        ? { cursor: "default" }
                        : { cursor: "pointer", "&:hover": { backgroundColor: "rgba(27, 120, 188, 0.08)" } }
                    }
                  >
                    <Typography variant="body2" sx={getStatusStyles(st)}>
                      {STATUT_LABELS[st] || st || "A faire"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                    {!rapport.is_brouillon_serveur && (
                      <>
                    <IconButton
                      size="small"
                      onClick={() => handleGeneratePDF(rapport)}
                      sx={{ color: "success.main", "&:hover": { backgroundColor: "rgba(46, 125, 50, 0.04)" } }}
                      title="TÃ©lÃ©charger le PDF"
                    >
                      <AiFillFilePdf style={{ fontSize: "20px" }} />
                    </IconButton>
                    <RegeneratePDFIconButton
                      documentType={rapport.type_rapport === "vigik_plus" ? DOCUMENT_TYPES.RAPPORT_VIGIK_PLUS : DOCUMENT_TYPES.RAPPORT_INTERVENTION}
                      documentData={{ ...rapport, chantier: chantierData }}
                      size="small"
                      color="primary"
                      tooltipPlacement="top"
                    />
                      </>
                    )}
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() =>
                        rapport.is_brouillon_serveur
                          ? navigate(`/RapportIntervention/nouveau?brouillon=${rapport.id}`)
                          : navigate(`/RapportIntervention/${rapport.id}`)
                      }
                    >
                      <MdEdit />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(rapport)}>
                      <MdDelete />
                    </IconButton>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog pour lier un rapport existant */}
      <Dialog open={linkDialog} onClose={() => setLinkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Lier un rapport existant</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={allRapports}
            getOptionLabel={(opt) =>
              `${opt.titre_nom || "Sans titre"} - ${new Date(opt.date).toLocaleDateString("fr-FR")} - ${opt.technicien || ""}`
            }
            value={selectedRapport}
            onChange={(_, val) => setSelectedRapport(val)}
            renderInput={(params) => (
              <TextField {...params} label="Rechercher un rapport non lie" size="small" sx={{ mt: 1 }} />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleLinkRapport} disabled={!selectedRapport}>
            Lier
          </Button>
        </DialogActions>
      </Dialog>

      <StatusChangeModal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setRapportToUpdate(null);
        }}
        currentStatus={rapportToUpdate?.statut}
        onStatusChange={handleStatusUpdate}
        type="rapport"
        title="Modifier le statut du rapport"
      />

      <Dialog open={devisDialogOpen} onClose={() => setDevisDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Lier un devis (devis fait)</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={devisOptions}
            value={selectedDevis}
            onChange={(_, v) => setSelectedDevis(v)}
            getOptionLabel={(opt) => `${opt?.numero || "Sans numÃ©ro"}${opt?.chantier_name ? ` â€” ${opt.chantier_name}` : ""}`}
            renderInput={(params) => <TextField {...params} label="Choisir un devis" size="small" sx={{ mt: 1 }} />}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
          />
        </DialogContent>
        <DialogActions>
          {rapportForDevis?.devis_fait && (
            <Button color="warning" onClick={handleResetToDevisAFaire}>
              Repasser en devis Ã  faire (V)
            </Button>
          )}
          <Button onClick={() => setDevisDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleConfirmDevisFait} disabled={!selectedDevis}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChantierRapportsList;
```

### 7.16 `frontend/src/components/RapportIntervention/rapports-mobile.css`

```css
/* Styles dedies a l'ecran /rapports-mobile (mobile et tablette). */

.rapports-mobile-layout {
  /* Safe area pour encoche / barre de navigation */
  padding-bottom: max(env(safe-area-inset-bottom), 8px);
}

/* Zone scroll : evite que le contenu passe sous la bottom nav */
.rapports-mobile-layout + .rapports-mobile-bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}
```

### 7.17 Config `documentTypeConfig.js` (entrées à ajouter)

Dans `frontend/src/config/documentTypeConfig.js`, ajouter ces deux entrées au dictionnaire `DOCUMENT_TYPES` et `DOCUMENT_CONFIG` (le reste du fichier dépend de l'existant de l'app cible) :

```javascript
export const DOCUMENT_TYPES = {
  // ...existants
  RAPPORT_INTERVENTION: 'rapport_intervention',
  RAPPORT_VIGIK_PLUS: 'rapport_vigik_plus',
};

export const DOCUMENT_CONFIG = {
  // ...existants
  [DOCUMENT_TYPES.RAPPORT_INTERVENTION]: {
    label: "Rapport d'intervention",
    endpoint: '/api/generate-rapport-intervention-pdf-drive/',
    icon: '📋',
    confirmMessage: "Êtes-vous sûr de vouloir régénérer ce rapport d'intervention dans le Drive ?",
    successMessage: "Rapport d'intervention régénéré avec succès dans le Drive",
    errorMessage: "Erreur lors de la régénération du rapport d'intervention",
    buildParams: (documentData) => ({
      rapport_id: documentData.id,
      force_replace: true,
    }),
  },

  [DOCUMENT_TYPES.RAPPORT_VIGIK_PLUS]: {
    label: 'Rapport Vigik+',
    endpoint: '/api/generate-rapport-intervention-pdf-drive/',
    icon: '📋',
    confirmMessage: 'Êtes-vous sûr de vouloir régénérer ce rapport Vigik+ dans le Drive ?',
    successMessage: 'Rapport Vigik+ régénéré avec succès dans le Drive',
    errorMessage: 'Erreur lors de la régénération du rapport Vigik+',
    buildParams: (documentData) => ({
      rapport_id: documentData.id,
      force_replace: true,
    }),
  },
};
```

> L'endpoint backend est identique pour les deux types (`/api/generate-rapport-intervention-pdf-drive/`) : le type est détecté côté serveur via `rapport.type_rapport`.

### 7.18 Intégrations dans `App.js`, `SlideBar.js`, `LoginMobile.js`

#### `frontend/src/components/App.js` — imports et routes à ajouter

```javascript
import RapportsPage from "./RapportIntervention/RapportsPage";
import RapportForm from "./RapportIntervention/RapportForm";
import RapportPreviewPage from "./RapportIntervention/RapportPreviewPage";
import RapportMobileLayout from "./RapportIntervention/RapportMobileLayout";

// ... dans <Routes>
<Route
  path="/RapportsIntervention"
  element={
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      <Layout user={user} onLogout={handleLogout}>
        <RapportsPage />
      </Layout>
    </ProtectedRoute>
  }
/>
<Route
  path="/RapportIntervention/nouveau"
  element={
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      <Layout user={user} onLogout={handleLogout}>
        <RapportForm />
      </Layout>
    </ProtectedRoute>
  }
/>
<Route
  path="/RapportIntervention/:id/preview"
  element={
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      <Layout user={user} onLogout={handleLogout}>
        <RapportPreviewPage />
      </Layout>
    </ProtectedRoute>
  }
/>
<Route
  path="/RapportIntervention/:id"
  element={
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      <Layout user={user} onLogout={handleLogout}>
        <RapportForm />
      </Layout>
    </ProtectedRoute>
  }
/>
<Route
  path="/rapports-mobile"
  element={
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      <RapportMobileLayout />
    </ProtectedRoute>
  }
/>
```

> `RapportMobileLayout` n'est **pas** encapsulé dans `<Layout>` : il apporte son propre `AppBar` et `BottomNavigation` plein écran pour le mode mobile/PWA.

#### `frontend/src/components/SlideBar.js` — entrée menu à ajouter

Dans la section "Documents" → "Liste document", ajouter :

```javascript
{ label: "Rapports d'intervention", to: "/RapportsIntervention" },
```

#### `frontend/src/components/LoginMobile.js` — redirection post-login

Après un login réussi côté mobile, rediriger vers `/rapports-mobile` :

```javascript
if (response.ok) {
  if (onLoginSuccess) onLoginSuccess(data.user);
  navigate("/rapports-mobile");
}
```

Cette page sert aussi de "home" pour la PWA mobile (Elekable) : les titres UI utilisent "Application Rapport Elekable" et "Rapports d'intervention" comme sous-titre.

---

## 8. Contrats API

Tous les endpoints sont montés sous `/api/` via `api/urls_rapport.py`. Ils sont protégés par le middleware d'authentification DRF hérité du projet.

### 8.1 Rapports d'intervention (CRUD)

| Méthode | URL                                        | Description                                                         |
|---------|--------------------------------------------|---------------------------------------------------------------------|
| GET     | `/api/rapports-intervention/`              | Liste paginée (filtres : `technicien`, `client_societe`, `residence`, `date_creation`, `type_rapport`, `devis_a_faire`, `devis_fait`, `exclude_statut_termine`, `ordering`, `page`, `page_size`) |
| POST    | `/api/rapports-intervention/`              | Création d'un rapport (numéro attribué automatiquement)             |
| GET     | `/api/rapports-intervention/{id}/`         | Détail complet (photos + signature_url + vigik_*_photos résolues)   |
| PATCH   | `/api/rapports-intervention/{id}/`         | Mise à jour partielle (statut, devis, champs métier)                |
| PUT     | `/api/rapports-intervention/{id}/`         | Mise à jour complète                                                |
| DELETE  | `/api/rapports-intervention/{id}/`         | Suppression (cascade sur prestations / photos, best-effort S3)      |
| GET     | `/api/rapports-intervention/for-chantier/?chantier_id=X` | Liste filtrée pour un chantier                           |

**Payload création (exemple, JSON) :**

```json
{
  "type_rapport": "intervention",
  "titre": 12,
  "date": "2026-04-17",
  "dates_intervention": ["2026-04-17"],
  "technicien": "Jean Dupont",
  "objet_recherche": "Vérification interphone",
  "resultat": "",
  "temps_trajet": 0.5,
  "temps_taches": 1.5,
  "client_societe": 3,
  "chantier": 17,
  "residence": 8,
  "logement": "Bât A — 2e étage",
  "locataire_nom": "Martin",
  "locataire_prenom": "Sophie",
  "locataire_telephone": "0600000000",
  "locataire_email": "",
  "statut": "a_faire",
  "devis_a_faire": false,
  "prestations": [
    {
      "localisation": "Hall bât A",
      "probleme": "Platine HS",
      "solution": "Remplacement platine",
      "commentaire": "",
      "prestation_possible": true,
      "prestation_realisee": "Platine remplacée"
    }
  ]
}
```

**Pour un rapport Vigik+**, le payload supplémentaire est :

```json
{
  "type_rapport": "vigik_plus",
  "adresse_vigik": "10 rue des Lilas, 93000 Bobigny",
  "numero_batiment": "A",
  "type_installation": "Vigik + BLE",
  "presence_platine": true,
  "presence_portail": false,
  "presence_platine_portail": null,
  "photos_platine_s3_keys": ["chantiers/.../draft/photo_platine_1.jpg", "..."],
  "photos_platine_portail_s3_keys": []
}
```

### 8.2 Upload photos & signature

| Méthode | URL                                                                 | Body                                |
|---------|---------------------------------------------------------------------|-------------------------------------|
| POST    | `/api/rapports-intervention/{id}/upload_photo/`                     | `multipart/form-data` `image=<file>`, `prestation_id=...`, `type_photo=avant\|en_cours\|apres` |
| DELETE  | `/api/rapports-intervention/{rapport_id}/delete_photo/?photo_id=N`  | —                                   |
| PATCH   | `/api/rapports-intervention/{rapport_id}/update_photo/?photo_id=N`  | `{ "date_photo": "YYYY-MM-DD" }`    |
| POST    | `/api/rapports-intervention/{id}/upload_signature/`                 | `multipart` avec `signature` (data URL ou fichier PNG) |

### 8.3 Brouillons serveur

| Méthode | URL                                                    | Description                                            |
|---------|--------------------------------------------------------|--------------------------------------------------------|
| GET     | `/api/rapports-intervention-brouillons/`               | Liste des brouillons (filtrée par utilisateur / rôle)  |
| POST    | `/api/rapports-intervention-brouillons/`               | Création / sauvegarde d'un brouillon                   |
| GET     | `/api/rapports-intervention-brouillons/{id}/`          | Détail d'un brouillon (media enrichis de presigned URLs) |
| PUT     | `/api/rapports-intervention-brouillons/{id}/`          | Mise à jour                                            |
| DELETE  | `/api/rapports-intervention-brouillons/{id}/`          | Suppression (best-effort clean S3 via `rapport_brouillon_media.delete_s3_keys`) |
| POST    | `/api/rapports-intervention-brouillons/{id}/promouvoir/` | Promote → crée un `RapportIntervention` + déplace S3 |

**Payload brouillon (simplifié) :** identique à celui d'un `RapportIntervention`, enrichi de `photo_snapshot` (sérialisé depuis IndexedDB via `rapportDraftIDB.serializePhotoSnapshotForPayload`) et `champs_manquants` (calculé serveur).

### 8.4 Génération PDF

| Méthode | URL                                                          | Description                                                        |
|---------|--------------------------------------------------------------|--------------------------------------------------------------------|
| GET     | `/api/preview-rapport-intervention/{id}/`                    | HTML preview (template Django, embed images en base64 ou URL)     |
| POST    | `/api/generate-rapport-intervention-pdf/`                    | Body `{ "rapport_id": N }` → renvoie le blob PDF (`application/pdf`) |
| GET     | `/api/generate-rapport-intervention-pdf-drive/?rapport_id=N&force_replace=true` | Génère + dépose dans S3 au chemin `<chantier.drive_path>/Rapport d'intervention/…` |

Le nom du fichier PDF est construit à partir de : numéro annuel, résidence, date, technicien (cf. `views_rapport.py`).

### 8.5 Référentiels annexes

| Méthode | URL                         | Description                                 |
|---------|-----------------------------|---------------------------------------------|
| GET     | `/api/titres-rapport/`      | Liste (ordering par `nom`)                 |
| POST    | `/api/titres-rapport/`      | Création (admin / authentifié)             |
| GET     | `/api/residences/`          | Liste (filtrage via `client_societe`, `chantier`) |
| POST    | `/api/residences/`          | Création                                   |
| PATCH   | `/api/residences/{id}/`     | Mise à jour                                |
| DELETE  | `/api/residences/{id}/`     | Suppression                                |

### 8.6 Réponse type `GET /api/rapports-intervention/{id}/`

```json
{
  "id": 42,
  "type_rapport": "intervention",
  "titre": 12,
  "titre_nom": "Panne interphone",
  "date": "2026-04-17",
  "dates_intervention": ["2026-04-17"],
  "technicien": "Jean Dupont",
  "objet_recherche": "...",
  "resultat": "...",
  "client_societe": 3,
  "client_societe_nom": "Paris Habitat",
  "client_societe_logo_url": "https://s3...",
  "chantier": 17,
  "residence": 8,
  "residence_nom": "Résidence Les Lilas",
  "residence_adresse": "10 rue X, 93000 Bobigny",
  "logement": "Bât A",
  "locataire_nom": "Martin",
  "locataire_prenom": "Sophie",
  "locataire_telephone": "0600000000",
  "locataire_email": "",
  "statut": "a_faire",
  "devis_a_faire": false,
  "devis_fait": false,
  "devis_lie": null,
  "devis_lie_numero": null,
  "devis_lie_preview_url": null,
  "signature_url": "https://s3.../signature.png?sig=...",
  "prestations": [
    {
      "id": 101,
      "localisation": "Hall bât A",
      "probleme": "…",
      "solution": "…",
      "commentaire": "",
      "prestation_possible": true,
      "prestation_realisee": "…",
      "photos": [
        {
          "id": 501,
          "type_photo": "avant",
          "image_url": "https://s3.../photo1.jpg?sig=...",
          "filename": "photo1.jpg",
          "date_photo": "2026-04-17"
        }
      ]
    }
  ],
  "vigik_platine_photos": [],
  "vigik_platine_portail_photos": [],
  "numero_rapport": 42,
  "annee_numero_rapport": 2026,
  "created_at": "2026-04-17T09:00:00Z",
  "updated_at": "2026-04-17T09:00:00Z"
}
```



---

## 9. Flux clé expliqués

### 9.1 Flux brouillon → rapport finalisé (mobile)

```
1. L'utilisateur ouvre /rapports-mobile et clique « Nouveau »
2. RapportForm monte sans id → state vierge + chargement dernier brouillon
     - photos (Files) : IndexedDB via rapportDraftIDB.loadRapportDraftPhotos
     - autres champs : localStorage (clé unique par user)
3. Utilisateur remplit / prend photos
     - compressImage.js (JPEG 0.85, max 1600px) avant stockage
     - photos Vigik+ : compressImage(VIGIK_REPORT_PHOTO_OPTIONS)
4. Commit automatique (onBlur / onChange) :
     - photo snapshot (rapportDraftIDB.serializePhotoSnapshotForPayload)
     - POST /api/rapports-intervention-brouillons/
     - upload direct S3 des fichiers Vigik+ platine/portail via endpoint dédié
5. L'utilisateur clique « Finaliser »
     - PATCH /api/rapports-intervention-brouillons/{id}/
     - POST /api/rapports-intervention-brouillons/{id}/promouvoir/
     - Backend :
         a) valide champs_manquants
         b) crée RapportIntervention (assign numéro annuel)
         c) copie objets S3 draft → final (rapport_brouillon_media.transfer_brouillon_media_to_rapport)
         d) crée PrestationRapport + PhotoRapport
         e) supprime le brouillon
6. Réponse : { "rapport_id": 42 } → navigation vers /RapportIntervention/42
```

### 9.2 Flux édition d'un rapport existant

```
1. /RapportIntervention/:id → GET rapport complet
2. RapportForm initialise state depuis le payload
     - photos existantes : objets {id, image_url, type_photo, date_photo}
     - signature : { signature_url } affichée comme miniature
     - Vigik+ photos : listes resolues { s3_key, url (presigned) }
3. Upload photo supplémentaire :
     - compressImage → POST upload_photo
     - backend génère s3_key sous <drive_path>/rapport_<id>/<prestation_id>/<type>/
     - crée PhotoRapport
4. Suppression :
     - DELETE delete_photo → supprime objet S3 (best-effort) + ligne DB
```

### 9.3 Flux génération PDF + dépôt Drive

```
1. Utilisateur clique « Terminé » ou icône PDF Drive
2. PATCH statut=termine (liste) → puis GET generate-rapport-intervention-pdf-drive
3. Backend :
     a) charge rapport + prestations + photos (presigned URLs)
     b) rend template (rapport_intervention.html ou rapport_vigik_plus.html)
     c) appelle service Node/Puppeteer → PDF bytes
     d) calcule chemin Drive via chantier.get_drive_path()
        + subfolder = "Rapport d'intervention" ou "Rapport Vigik+"
     e) create_s3_folder_recursive pour garantir l'arborescence
     f) copy / put_object du PDF final (clé pdf_s3_key stockée sur le modèle)
     g) force_replace=true → écrasement si fichier existant
4. Réponse : { "ok": true, "pdf_s3_key": "...", "pdf_url": "presigned" }
```

### 9.4 Flux numérotation annuelle

```
RapportIntervention.save() (via signal / serializer) :
  if numero_rapport is None:
      with transaction.atomic():
          annee = (self.date or today).year
          compteur, _ = RapportInterventionNumeroCompteur.objects \
              .select_for_update() \
              .get_or_create(annee=annee)
          compteur.dernier_numero += 1
          compteur.save()
          self.numero_rapport = compteur.dernier_numero
          self.annee_numero_rapport = annee
```

- Thread-safe via `select_for_update()` (verrou de ligne PostgreSQL).
- La commande de management `assign_rapport_intervention_numeros` permet de **re-numéroter** tous les rapports existants par date croissante (à exécuter une fois en migration data).

### 9.5 Flux compression photo (client)

```
File (HTMLInputElement) → createImageBitmap
  → canvas(drawImage)  // resize vers maxDim (default 1600)
  → canvas.toBlob('image/jpeg', 0.85)
  → File (nom + "_compressed.jpg", type image/jpeg)
```

Vigik+ utilise `VIGIK_REPORT_PHOTO_OPTIONS = { maxWidth: 1280, maxHeight: 960, quality: 0.8 }` pour des fichiers plus légers (grand nombre de photos possibles).

### 9.6 Flux brouillon local (IndexedDB)

- DB : `p3000-rapports-drafts` / store `photos`.
- Clé : `brouillon:<user_id>:<rapport_id|new>` — snapshot JSON `{ prestations: [{ photos: [File|Blob + metadata] }], vigik: {...} }`.
- `buildPhotoSnapshot` convertit l'état React en structure persistable.
- `applyPhotoSnapshotToState` restaure l'état à l'ouverture.
- Nettoyage : `clearRapportDraftPhotos` après promotion réussie ou suppression.



---

## 10. Points à ajuster côté nouvelle application

Cette section récapitule **toutes** les valeurs ou intégrations spécifiques à l'application d'origine qu'il faudra adapter côté cible. Rien n'est bloquant : tous ces points sont **paramétrables** sans refactor profond.

### 10.1 Configuration S3

| Valeur                      | Emplacement actuel                                | Action cible                                              |
|-----------------------------|---------------------------------------------------|-----------------------------------------------------------|
| `AWS_ACCESS_KEY_ID`         | `settings` (env)                                  | Reprendre depuis le projet cible                          |
| `AWS_SECRET_ACCESS_KEY`     | `settings` (env)                                  | Reprendre depuis le projet cible                          |
| `AWS_STORAGE_BUCKET_NAME`   | `settings` (env)                                  | Bucket différent possible — aucun hardcode                |
| `region_name='eu-north-1'`  | `api/utils.py::get_s3_client()` **(seule valeur restante hardcodée)** | Remplacer par `getattr(settings, "AWS_S3_REGION_NAME", "eu-north-1")` si la région cible diffère |

### 10.2 Convention Drive / chemin S3

- Construit par `chantier.get_drive_path()` → format actuel : `chantiers/<societe_slug>/<chantier_slug>/`.
- Sous-dossier par type de rapport : `Rapport d'intervention/` ou `Rapport Vigik+/`.
- **À vérifier** dans le projet cible : si `get_drive_path()` existe déjà et retourne une convention différente, **adapter uniquement** `views_rapport.py` (section "chemin PDF final").
- Les sous-dossiers draft : `chantiers/<…>/draft/rapport_intervention/<brouillon_id>/` — également configurable.

### 10.3 Société "client" par défaut / champs obligatoires

- Dans la liste `/api/rapports-intervention/`, le filtre `client_societe` attend un `id` de société. Les sociétés existantes du projet cible doivent être disponibles via `/api/societe/` (ou adapter le champ).
- Le modèle `Societe` doit exposer : `nom_societe`, `rue_societe`, `codepostal_societe`, `ville_societe`, `logo_s3_key` (pour le logo sur le PDF). **Si `logo_s3_key` n'existe pas**, ajouter ce champ (Section 5).

### 10.4 Modèle `Chantier`

- Doit exposer `get_drive_path()` (Section 4.9).
- Si l'app cible n'a pas encore ce helper, l'ajouter en respectant la convention du Drive cible.

### 10.5 Modèle `Devis`

- La liaison `RapportIntervention.devis_lie → Devis` suppose un modèle `Devis` avec un champ identifiant de numéro (ex : `numero`) et une URL preview PDF (`preview_url` calculé).
- Si les noms diffèrent, adapter `RapportInterventionSerializer.devis_lie_numero` et `devis_lie_preview_url`.

### 10.6 Authentification

- Le code ne pose aucune contrainte d'auth custom : il hérite du `DEFAULT_PERMISSION_CLASSES` DRF du projet (`IsAuthenticated` par défaut).
- Si le projet cible utilise JWT via `simplejwt`, aucun changement requis côté code (juste vérifier `axios.defaults.headers.common['Authorization']`).

### 10.7 Génération PDF (Puppeteer)

- Le backend appelle le même wrapper Node/Puppeteer que les autres documents du projet (`generer_pdf_via_node` ou équivalent).
- **À vérifier** dans le projet cible :
  1. Le service Node est-il déployé ?
  2. Accepte-t-il le payload `{ html, filename }` ? Sinon, adapter l'appel dans `views_rapport.py`.
  3. Le chemin des templates Django est-il bien déclaré dans `TEMPLATES['DIRS']` ?

### 10.8 Frontend — constantes de couleur (`COLORS`)

- Tous les composants importent `COLORS` depuis `../../constants/colors`.
- Si ce fichier n'existe pas dans la cible, créer un `constants/colors.js` exportant a minima :
  ```js
  export const COLORS = {
    primary: '#1b78bc',
    accent: '#46acc2',
    infoDark: '#1976d2',
    border: '#e0e0e0',
    borderDark: '#9e9e9e',
    borderLight: '#eee',
    backgroundAlt: '#f5f5f5',
    textOnDark: '#222',
    textMuted: '#666',
    success: '#2e7d32',
  };
  ```

### 10.9 Redirection post-login mobile

- Le mobile (`/rapports-mobile`) est pensé comme "home PWA" d'Elekable. Dans une app cible sans PWA dédiée, pointer `LoginMobile.js` sur la home existante (`/`) et simplement exposer `RapportsPage` côté desktop.

### 10.10 Textes UI spécifiques à adapter

- Libellés "Elekable" (LoginMobile) → remplacer par le nom de l'application cible.
- Icône de l'app (logo `config?.logo_url || logoDefault`) → provenir de la même source que le reste du projet cible.

### 10.11 Numérotation annuelle — initialisation

- Si la base du projet cible possède déjà des rapports, exécuter **une fois** :
  ```bash
  python manage.py assign_rapport_intervention_numeros
  ```
- Cela parcourt tous les rapports triés par `(date, created_at)` et assigne un `numero_rapport` séquentiel par année, ainsi que le compteur final.

### 10.12 Données de référence à créer / migrer

- `TitreRapport` : référentiel de titres standard. Peupler via admin ou fixture.
- `Residence` : à importer depuis l'existant client ou créer à la demande via l'UI.
- Pas de migration automatique de ces données — c'est au projet cible de décider (fixtures, script ad hoc, saisie manuelle).

### 10.13 Check-list de reprise dans l'app cible

- [ ] `settings.py` : variables AWS renseignées
- [ ] `api/utils.py` : helpers S3 présents (Section 4.8) ou fusionnés avec l'existant
- [ ] `api/models.py` : réexporter modèles de `models_rapport.py` et ajouter `logo_s3_key` / adresse sur `Societe` + `get_drive_path()` sur `Chantier`
- [ ] `api/urls.py` : `include('api.urls_rapport')`
- [ ] `python manage.py makemigrations && migrate`
- [ ] `python manage.py assign_rapport_intervention_numeros` (si données existantes)
- [ ] Templates `frontend/templates/rapport_intervention.html` et `rapport_vigik_plus.html` créés
- [ ] `frontend/src/components/RapportIntervention/*` copiés (Section 7)
- [ ] `frontend/src/hooks/useRapports.js` + `utils/compressImage.js` + `utils/rapportDraftIDB.js`
- [ ] Routes ajoutées dans `App.js` (Section 7.18)
- [ ] Lien Sidebar `/RapportsIntervention` (Section 7.18)
- [ ] Redirection `LoginMobile` si mobile/PWA (Section 7.18)
- [ ] Config `documentTypeConfig.js` : entrées `RAPPORT_INTERVENTION` et `RAPPORT_VIGIK_PLUS` (Section 7.17)
- [ ] Test manuel : création intervention + photos + signature → PDF Drive
- [ ] Test manuel : création Vigik+ + photos platine/portail → PDF Drive
- [ ] Test manuel : brouillon mobile offline → retour online → promotion
