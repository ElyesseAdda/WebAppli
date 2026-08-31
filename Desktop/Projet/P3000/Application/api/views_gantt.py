"""Vues DRF pour la fonctionnalité « Diagrammes de Gantt »."""

import os
import subprocess
import tempfile
import uuid as _uuid
from datetime import date, timedelta
from io import BytesIO

from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models_gantt import (
    GanttDesignation,
    GanttDiagramme,
    GanttHistorique,
    normaliser_libelle,
)
from .serializers_gantt import (
    GanttDesignationSerializer,
    GanttDiagrammeApercuSerializer,
    GanttDiagrammeSerializer,
    GanttHistoriqueSerializer,
)

LONGUEUR_MIN_DESIGNATION = 3


def _utilisateur(request):
    """Utilisateur courant, ou ``None`` si la requête est anonyme."""
    user = getattr(request, 'user', None)
    return user if user is not None and user.is_authenticated else None


def _date_lisible(valeur):
    if not valeur:
        return "non définie"
    return valeur.strftime('%d/%m/%Y')


def _snapshot(diagramme):
    """Photographie des éléments, indexée par identifiant, pour comparaison."""
    return {
        element.id: {
            'type_element': element.type_element,
            'libelle': element.libelle,
            'date_debut': element.date_debut,
            'date_fin': element.date_fin,
            'couleur': element.couleur,
            'ordre': element.ordre,
            'commentaire': element.commentaire,
            'afficher_duree': element.afficher_duree,
            'style_barre': element.style_barre,
        }
        for element in diagramme.elements.all()
    }


def _snapshot_serialisable(diagramme):
    """Snapshot complet en JSON, conservé à chaque validation."""
    return {
        'nom': diagramme.nom,
        'description': diagramme.description,
        'chantier_id': diagramme.chantier_id,
        'echelle': diagramme.echelle,
        'elements': [
            {
                'id': e.id,
                'type_element': e.type_element,
                'parent': e.parent_id,
                'libelle': e.libelle,
                'date_debut': e.date_debut.isoformat() if e.date_debut else None,
                'date_fin': e.date_fin.isoformat() if e.date_fin else None,
                'couleur': e.couleur,
                'ordre': e.ordre,
                'commentaire': e.commentaire,
                'afficher_duree': e.afficher_duree,
                'style_barre': e.style_barre,
            }
            for e in diagramme.elements.all()
        ],
    }


LIBELLES_CHAMPS = {
    'libelle': 'désignation',
    'date_debut': 'date de début',
    'date_fin': 'date de fin',
    'couleur': 'couleur',
    'commentaire': 'commentaire',
    'afficher_duree': 'affichage de la durée',
    'style_barre': 'style de barre',
}


def _journaliser_modifications(diagramme, avant, entetes_avant, utilisateur):
    """Compare l'état précédent et l'état courant, et écrit un journal lisible.

    N'est appelée que pour les diagrammes déjà validés : un brouillon en cours
    de saisie ne doit pas générer d'historique.
    """
    entrees = []

    # En-tête du diagramme
    for champ, libelle in (
        ('nom', 'Nom du diagramme'),
        ('description', 'Description'),
        ('echelle', 'Échelle'),
    ):
        ancien = entetes_avant.get(champ)
        nouveau = getattr(diagramme, champ)
        if ancien != nouveau:
            entrees.append((
                'modif_diagramme',
                f"{libelle} : « {ancien} » devient « {nouveau} »",
                {'champ': champ, 'avant': ancien, 'apres': nouveau},
            ))

    if entetes_avant.get('chantier_id') != diagramme.chantier_id:
        nom_chantier = (
            diagramme.chantier.chantier_name if diagramme.chantier else "aucun chantier"
        )
        entrees.append((
            'modif_diagramme',
            f"Chantier lié : {nom_chantier}",
            {
                'champ': 'chantier',
                'avant': entetes_avant.get('chantier_id'),
                'apres': diagramme.chantier_id,
            },
        ))

    apres = _snapshot(diagramme)

    for element_id, donnees in apres.items():
        precedent = avant.get(element_id)
        nature = "Titre" if donnees['type_element'] == 'titre' else "Ligne"

        if precedent is None:
            entrees.append((
                'ajout_element',
                f"{nature} « {donnees['libelle']} » ajouté(e)",
                {'element_id': element_id, 'apres': _details(donnees)},
            ))
            continue

        for champ, libelle_champ in LIBELLES_CHAMPS.items():
            ancien = precedent.get(champ)
            nouveau = donnees.get(champ)
            if ancien == nouveau:
                continue
            if champ in ('date_debut', 'date_fin'):
                ancien_txt, nouveau_txt = _date_lisible(ancien), _date_lisible(nouveau)
            else:
                ancien_txt, nouveau_txt = ancien or "vide", nouveau or "vide"
            entrees.append((
                'modif_element',
                f"{nature} « {donnees['libelle']} » : {libelle_champ} "
                f"{ancien_txt} → {nouveau_txt}",
                {
                    'element_id': element_id,
                    'champ': champ,
                    'avant': str(ancien) if ancien else None,
                    'apres': str(nouveau) if nouveau else None,
                },
            ))

    for element_id, donnees in avant.items():
        if element_id not in apres:
            nature = "Titre" if donnees['type_element'] == 'titre' else "Ligne"
            entrees.append((
                'suppression_element',
                f"{nature} « {donnees['libelle']} » supprimé(e)",
                {'element_id': element_id, 'avant': _details(donnees)},
            ))

    GanttHistorique.objects.bulk_create([
        GanttHistorique(
            diagramme=diagramme,
            utilisateur=utilisateur,
            action=action_type,
            description=description,
            details=details,
        )
        for action_type, description, details in entrees
    ])
    return len(entrees)


def _details(donnees):
    """Rend un snapshot d'élément sérialisable en JSON."""
    return {
        cle: (valeur.isoformat() if hasattr(valeur, 'isoformat') else valeur)
        for cle, valeur in donnees.items()
    }


def _alimenter_designations(diagramme, utilisateur):
    """Enrichit le catalogue de suggestions à partir des libellés du diagramme.

    Appelée à la validation uniquement, pour ne pas polluer le catalogue avec
    les libellés incomplets saisis dans les brouillons.
    """
    for element in diagramme.elements.all():
        libelle = (element.libelle or '').strip()
        if len(libelle) < LONGUEUR_MIN_DESIGNATION:
            continue
        normalise = normaliser_libelle(libelle)
        if not normalise:
            continue
        designation, cree = GanttDesignation.objects.get_or_create(
            libelle_normalise=normalise,
            type_element=element.type_element,
            defaults={
                'libelle': libelle,
                'couleur_defaut': element.couleur or '',
                'created_by': utilisateur,
            },
        )
        if not cree:
            designation.nb_utilisations += 1
            designation.couleur_defaut = element.couleur or designation.couleur_defaut
            designation.save()


def _optimiser_logo_gantt(contenu):
    """Redimensionne et compresse un logo pour le PDF (qualité visuelle, taille réduite)."""
    from PIL import Image

    image = Image.open(BytesIO(contenu))
    if image.mode in ('RGBA', 'LA', 'P'):
        image = image.convert('RGBA')
    elif image.mode != 'RGB':
        image = image.convert('RGB')

    largeur, hauteur = image.size
    max_dim = 512
    if max(largeur, hauteur) > max_dim:
        ratio = max_dim / max(largeur, hauteur)
        image = image.resize(
            (int(largeur * ratio), int(hauteur * ratio)),
            Image.Resampling.LANCZOS,
        )

    sortie = BytesIO()
    if image.mode == 'RGBA':
        image.save(sortie, format='PNG', optimize=True)
        return sortie.getvalue(), 'image/png', 'png'

    image.save(sortie, format='JPEG', quality=85, optimize=True)
    return sortie.getvalue(), 'image/jpeg', 'jpg'


class GanttDiagrammeViewSet(viewsets.ModelViewSet):
    """CRUD des diagrammes, avec validation, réouverture et historique.

    Le diagramme est persisté dès sa création au statut ``brouillon`` : tout
    utilisateur peut donc reprendre un brouillon laissé en cours par un autre.
    """

    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = GanttDiagramme.objects.select_related(
            'chantier', 'created_by', 'modified_by'
        ).prefetch_related('elements')

        params = self.request.query_params

        chantier_id = params.get('chantier_id')
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)

        lie = params.get('lie')
        if lie == 'oui':
            queryset = queryset.filter(chantier__isnull=False)
        elif lie == 'non':
            queryset = queryset.filter(chantier__isnull=True)

        statut = params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)

        recherche = params.get('q')
        if recherche:
            queryset = queryset.filter(nom__icontains=recherche)

        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return GanttDiagrammeApercuSerializer
        return GanttDiagrammeSerializer

    def perform_create(self, serializer):
        utilisateur = _utilisateur(self.request)
        serializer.save(created_by=utilisateur, modified_by=utilisateur)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        diagramme = self.get_object()
        etait_termine = diagramme.statut == 'termine'
        avant = _snapshot(diagramme) if etait_termine else {}
        entetes_avant = {
            'nom': diagramme.nom,
            'description': diagramme.description,
            'echelle': diagramme.echelle,
            'chantier_id': diagramme.chantier_id,
        }

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(diagramme, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save(modified_by=_utilisateur(request))

        # Le queryset précharge les éléments : sans invalidation, la réponse
        # serait construite sur la liste d'avant l'enregistrement et n'exposerait
        # pas les identifiants des éléments tout juste créés. Le client
        # renverrait alors ses identifiants temporaires et créerait des doublons.
        if getattr(diagramme, '_prefetched_objects_cache', None):
            diagramme._prefetched_objects_cache = {}

        if etait_termine:
            diagramme.refresh_from_db()
            _journaliser_modifications(
                diagramme, avant, entetes_avant, _utilisateur(request)
            )

        return Response(self.get_serializer(diagramme).data)

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """Passe le diagramme au statut terminé et ouvre son historique."""
        diagramme = self.get_object()
        if diagramme.statut == 'termine':
            return Response(
                {'error': 'Ce diagramme est déjà validé.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not diagramme.elements.exists():
            return Response(
                {'error': 'Impossible de valider un diagramme vide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        utilisateur = _utilisateur(request)
        with transaction.atomic():
            diagramme.statut = 'termine'
            diagramme.date_validation = timezone.now()
            diagramme.validated_by = utilisateur
            diagramme.modified_by = utilisateur
            diagramme.save()

            GanttHistorique.objects.create(
                diagramme=diagramme,
                utilisateur=utilisateur,
                action='validation',
                description="Diagramme validé comme terminé",
                details={'snapshot': _snapshot_serialisable(diagramme)},
            )
            _alimenter_designations(diagramme, utilisateur)

        return Response(GanttDiagrammeSerializer(diagramme).data)

    @action(detail=True, methods=['post'])
    def rouvrir(self, request, pk=None):
        """Repasse un diagramme validé en brouillon."""
        diagramme = self.get_object()
        if diagramme.statut != 'termine':
            return Response(
                {'error': "Ce diagramme n'est pas validé."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        utilisateur = _utilisateur(request)
        with transaction.atomic():
            diagramme.statut = 'brouillon'
            diagramme.modified_by = utilisateur
            diagramme.save()
            GanttHistorique.objects.create(
                diagramme=diagramme,
                utilisateur=utilisateur,
                action='reouverture',
                description="Diagramme rouvert en brouillon",
            )

        return Response(GanttDiagrammeSerializer(diagramme).data)

    @action(detail=True, methods=['post'])
    def upload_logo_client(self, request, pk=None):
        """Enregistre le logo client du diagramme sur S3 (image optimisée)."""
        diagramme = self.get_object()
        fichier = request.FILES.get('logo')
        if not fichier:
            return Response({'error': 'Fichier logo requis'}, status=400)
        try:
            from .utils import (
                generate_presigned_url_for_display,
                get_s3_bucket_name,
                get_s3_client,
                is_s3_available,
            )

            if not is_s3_available():
                return Response({'error': 'S3 non disponible'}, status=503)

            contenu, content_type, ext = _optimiser_logo_gantt(fichier.read())
            s3_key = (
                f"gantt/logos/{diagramme.id}_{_uuid.uuid4().hex[:8]}.{ext}"
            )
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()

            if diagramme.logo_client_s3_key:
                try:
                    s3_client.delete_object(
                        Bucket=bucket_name, Key=diagramme.logo_client_s3_key
                    )
                except Exception:
                    pass

            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=contenu,
                ContentType=content_type,
            )
            diagramme.logo_client_s3_key = s3_key
            diagramme.afficher_logo_client = True
            diagramme.modified_by = _utilisateur(request)
            diagramme.save(
                update_fields=[
                    'logo_client_s3_key',
                    'afficher_logo_client',
                    'modified_by',
                    'date_modification',
                ]
            )
            logo_url = generate_presigned_url_for_display(s3_key, expires_in=3600)
            return Response(
                {
                    'success': True,
                    'logo_client_s3_key': s3_key,
                    'logo_client_url': logo_url,
                    'afficher_logo_client': diagramme.afficher_logo_client,
                }
            )
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['delete'])
    def delete_logo_client(self, request, pk=None):
        diagramme = self.get_object()
        if not diagramme.logo_client_s3_key:
            return Response({'error': 'Aucun logo client'}, status=400)
        try:
            from .utils import get_s3_bucket_name, get_s3_client, is_s3_available

            if is_s3_available():
                s3_client = get_s3_client()
                bucket_name = get_s3_bucket_name()
                try:
                    s3_client.delete_object(
                        Bucket=bucket_name, Key=diagramme.logo_client_s3_key
                    )
                except Exception:
                    pass
        except Exception:
            pass

        diagramme.logo_client_s3_key = None
        diagramme.afficher_logo_client = False
        diagramme.modified_by = _utilisateur(request)
        diagramme.save(
            update_fields=[
                'logo_client_s3_key',
                'afficher_logo_client',
                'modified_by',
                'date_modification',
            ]
        )
        return Response(
            {
                'success': True,
                'logo_client_s3_key': None,
                'logo_client_url': '',
                'afficher_logo_client': False,
            }
        )

    @action(detail=True, methods=['get'])
    def historique(self, request, pk=None):
        diagramme = self.get_object()
        entrees = diagramme.historique.select_related('utilisateur').all()
        return Response(GanttHistoriqueSerializer(entrees, many=True).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Renvoie le PDF en téléchargement direct, sans passer par le Drive.

        Indispensable pour les diagrammes sans chantier, qui n'ont pas de
        dossier Drive naturel.
        """
        diagramme = self.get_object()
        chemin_temporaire = None
        try:
            chemin_temporaire = _generer_pdf_gantt(diagramme, request)
            with open(chemin_temporaire, 'rb') as fichier:
                reponse = HttpResponse(
                    fichier.read(), content_type='application/pdf'
                )
            nom_fichier = "".join(
                c for c in f"Gantt - {diagramme.nom}" if c.isalnum() or c in " -_(),.'"
            ).strip() or "Gantt"
            reponse['Content-Disposition'] = (
                f'attachment; filename="{nom_fichier}.pdf"'
            )
            return reponse
        except subprocess.CalledProcessError as e:
            return JsonResponse(
                {'error': f"Erreur génération PDF : {e.stderr or str(e)}"},
                status=500,
            )
        except subprocess.TimeoutExpired:
            return JsonResponse(
                {'error': 'Timeout lors de la génération du PDF.'}, status=500
            )
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
        finally:
            if chemin_temporaire and os.path.exists(chemin_temporaire):
                try:
                    os.unlink(chemin_temporaire)
                except OSError:
                    pass


# ---------------------------------------------------------------------------
# Mise en page du diagramme pour le PDF
#
# Ce bloc reproduit la logique de `frontend/src/components/Gantt/ganttLayout.js`.
# Puppeteer rend un template Django, où React ne s'exécute pas : le calcul doit
# donc exister aussi en Python. Toute évolution du rendu doit être appliquée
# dans les deux fichiers pour que l'écran et le PDF restent identiques.
# ---------------------------------------------------------------------------

MOIS_FR = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]


def _bornes(elements):
    debuts = [e.date_debut for e in elements if e.date_debut]
    fins = [e.date_fin for e in elements if e.date_fin]
    if not debuts or not fins:
        return None
    return min(debuts), max(fins)


def _calculer_periodes(bornes, echelle):
    if not bornes:
        return {'periodes': [], 'groupes': [], 'debut': None, 'fin': None}

    debut_global, fin_global = bornes

    if echelle == 'mois':
        curseur = debut_global.replace(day=1)
    elif echelle == 'semaine':
        curseur = debut_global - timedelta(days=debut_global.weekday())
    else:
        curseur = debut_global

    periodes = []
    garde = 0
    while curseur <= fin_global and garde < 800:
        garde += 1
        if echelle == 'mois':
            if curseur.month == 12:
                debut_suivant = date(curseur.year + 1, 1, 1)
            else:
                debut_suivant = date(curseur.year, curseur.month + 1, 1)
            fin_periode = debut_suivant - timedelta(days=1)
            libelle = MOIS_FR[curseur.month - 1][:4]
            groupe = str(curseur.year)
        elif echelle == 'semaine':
            fin_periode = curseur + timedelta(days=6)
            libelle = f"S{curseur.isocalendar()[1]}"
            groupe = f"{MOIS_FR[curseur.month - 1]} {curseur.year}"
        else:
            fin_periode = curseur
            libelle = f"{curseur.day:02d}"
            groupe = f"{MOIS_FR[curseur.month - 1]} {curseur.year}"

        periodes.append({
            'cle': curseur.isoformat(),
            'debut': curseur,
            'fin': fin_periode,
            'libelle': libelle,
            'groupe': groupe,
        })
        curseur = fin_periode + timedelta(days=1)

    groupes = []
    for periode in periodes:
        if groupes and groupes[-1]['libelle'] == periode['groupe']:
            groupes[-1]['nb_periodes'] += 1
        else:
            groupes.append({'libelle': periode['groupe'], 'nb_periodes': 1})

    return {
        'periodes': periodes,
        'groupes': groupes,
        'debut': periodes[0]['debut'] if periodes else None,
        'fin': periodes[-1]['fin'] if periodes else None,
    }


def _pourcentage_css(valeur):
    """Formate un pourcentage pour du CSS.

    Passe par une chaîne à séparateur décimal point : la locale française du
    projet rendrait sinon « 12,5 » dans le template, ce que le CSS ignore.
    """
    return f"{valeur:.4f}"


def _calculer_barre(date_debut, date_fin, axe):
    if not date_debut or not date_fin or not axe['debut'] or not axe['fin']:
        return None
    total = (axe['fin'] - axe['debut']).days + 1
    if total <= 0:
        return None
    decalage = max(0, (date_debut - axe['debut']).days)
    duree = max(1, (date_fin - date_debut).days + 1)
    gauche = decalage / total * 100
    largeur = min(100 - gauche, duree / total * 100)
    return {
        'gauche': _pourcentage_css(gauche),
        'largeur': _pourcentage_css(largeur),
        'largeur_num': largeur,
        'gauche_num': gauche,
        'centre': _pourcentage_css(gauche + largeur / 2),
        'duree': duree,
    }


def _format_date_courte(valeur):
    """Aligné sur ``formatDateCourte`` dans ``frontend/.../ganttLayout.js``."""
    if not valeur:
        return ''
    return valeur.strftime('%d/%m')


def _mode_dates_barre(largeur_pct, date_debut, date_fin):
    """Aligné sur ``modeDatesBarre`` dans ``frontend/.../ganttLayout.js``."""
    debut = _format_date_courte(date_debut)
    fin = _format_date_courte(date_fin)
    if not debut and not fin:
        return {'mode': 'none'}
    if debut == fin:
        return {'mode': 'unique', 'texte': debut}
    try:
        largeur = float(largeur_pct or 0)
    except (TypeError, ValueError):
        largeur = 0
    if largeur < 11:
        return {'mode': 'combinee', 'texte': f'{debut} → {fin}'}
    return {'mode': 'separees', 'debut': debut, 'fin': fin}


def _lignes_s_enchainent(ligne_prec, ligne_suiv):
    """Aligné sur ``lignesSEnchainent`` dans ``frontend/.../ganttLayout.js``."""
    if ligne_prec.get('est_titre') or ligne_suiv.get('est_titre'):
        return False
    fin_prec = ligne_prec.get('date_fin')
    debut_suiv = ligne_suiv.get('date_debut')
    if not fin_prec or not debut_suiv:
        return False
    return debut_suiv == fin_prec + timedelta(days=1)


def _calculer_enchainements(lignes):
    """Aligné sur ``calculerEnchainements`` dans ``frontend/.../ganttLayout.js``."""
    resultat = []
    derniere_ligne = None
    index_derniere = None

    for index, ligne in enumerate(lignes or []):
        if ligne.get('est_titre') or not ligne.get('barre'):
            continue
        if (
            derniere_ligne is not None
            and index_derniere is not None
            and _lignes_s_enchainent(derniere_ligne, ligne)
        ):
            barre_prec = derniere_ligne['barre']
            barre_suiv = ligne['barre']
            resultat.append({
                'index_de': index_derniere,
                'index_vers': index,
                'x_fin': barre_prec['gauche_num'] + barre_prec['largeur_num'],
                'x_debut': barre_suiv['gauche_num'],
            })
        derniere_ligne = ligne
        index_derniere = index

    return resultat


def _chemin_enchainement(lien, nb_lignes):
    """Aligné sur ``cheminEnchainement`` dans ``frontend/.../ganttLayout.js``."""
    y1 = lien['index_de'] * 100 + 50
    y2 = lien['index_vers'] * 100 + 50
    y_mid = (y1 + y2) / 2
    x_fin = lien['x_fin']
    x_debut = lien['x_debut']
    if abs(x_fin - x_debut) < 0.5:
        return f'M {x_fin} {y1} L {x_debut} {y2}'
    return (
        f'M {x_fin} {y1} L {x_fin} {y_mid} L {x_debut} {y_mid} L {x_debut} {y2}'
    )


def _libelle_dates_plage(date_debut, date_fin, duree=None):
    """Aligné sur ``libelleDatesPlage`` dans ``frontend/.../ganttLayout.js``."""
    if not duree:
        return ''
    return f"{duree} j"


def _style_barre_css(couleur, style_barre, est_titre):
    """Aligné sur ``sxBarreGantt`` dans ``frontend/.../ganttBarStyles.js``."""
    c = couleur or '#1976d2'
    radius = '999px' if style_barre == 'arrondi' else ('2px' if est_titre else '3px')
    op_titre_plein = '0.55' if est_titre else '1'
    op_titre = '0.75' if est_titre else '1'

    styles = {
        'leger': (
            f"background-color:{c}59;border-radius:{radius};opacity:{op_titre_plein};"
        ),
        'degrade': (
            f"background:linear-gradient(180deg,{c}8c 0%,{c} 100%);"
            f"border-radius:{radius};opacity:{op_titre_plein};"
        ),
        'hachure': (
            f"background-color:{c};"
            "background-image:repeating-linear-gradient(-45deg,"
            f"{c},{c} 4px,rgba(255,255,255,0.38) 4px,rgba(255,255,255,0.38) 8px);"
            f"border-radius:{radius};opacity:{op_titre};"
        ),
        'hachure_croise': (
            f"background-color:{c};"
            "background-image:"
            f"repeating-linear-gradient(-45deg,{c},{c} 3px,rgba(255,255,255,0.35) 3px,rgba(255,255,255,0.35) 6px),"
            f"repeating-linear-gradient(45deg,{c},{c} 3px,rgba(255,255,255,0.2) 3px,rgba(255,255,255,0.2) 6px);"
            f"border-radius:{radius};opacity:{op_titre};"
        ),
        'rayures_v': (
            f"background-color:{c};"
            "background-image:repeating-linear-gradient(90deg,"
            f"{c},{c} 5px,rgba(255,255,255,0.35) 5px,rgba(255,255,255,0.35) 10px);"
            f"border-radius:{radius};opacity:{op_titre};"
        ),
        'rayures_h': (
            f"background-color:{c};"
            "background-image:repeating-linear-gradient(0deg,"
            f"{c},{c} 4px,rgba(255,255,255,0.35) 4px,rgba(255,255,255,0.35) 8px);"
            f"border-radius:{radius};opacity:{op_titre};"
        ),
        'damier': (
            f"background-color:{c}59;"
            "background-image:"
            f"linear-gradient(45deg,{c} 25%,transparent 25%),"
            f"linear-gradient(-45deg,{c} 25%,transparent 25%),"
            f"linear-gradient(45deg,transparent 75%,{c} 75%),"
            f"linear-gradient(-45deg,transparent 75%,{c} 75%);"
            "background-size:8px 8px;"
            "background-position:0 0,0 4px,4px -4px,-4px 0;"
            f"border-radius:{radius};opacity:{op_titre};"
        ),
        'contour': (
            f"background-color:transparent;border:2px solid {c};"
            f"border-radius:{radius};opacity:1;"
        ),
        'contour_epais': (
            f"background-color:{c}2e;border:3px solid {c};"
            f"border-radius:{radius};opacity:1;"
        ),
        'double': (
            f"background-color:{c}2e;border:2px solid {c};"
            f"border-radius:{radius};box-shadow:inset 0 0 0 1px {c};opacity:1;"
        ),
        'pointille': (
            f"background-color:{c}40;border:2px dashed {c};"
            f"border-radius:{radius};opacity:1;"
        ),
        'tirets': (
            f"background-color:transparent;border:2px dotted {c};"
            f"border-radius:{radius};opacity:1;"
        ),
        'arrondi': (
            f"background-color:{c};border-radius:{radius};opacity:{op_titre_plein};"
        ),
        'ombre': (
            f"background-color:{c};border-radius:{radius};"
            f"box-shadow:0 2px 4px {c}8c;opacity:{op_titre_plein};"
        ),
        'bord_gauche': (
            f"background-color:{c}33;border-left:5px solid {c};"
            f"border-radius:{radius};opacity:1;"
        ),
        'bord_haut': (
            f"background-color:{c}26;border-top:4px solid {c};"
            f"border-radius:{radius};opacity:1;"
        ),
        'croix': (
            f"background-color:{c}33;"
            "background-image:"
            f"repeating-linear-gradient(45deg,{c}8c 0,{c}8c 1px,transparent 1px,transparent 6px),"
            f"repeating-linear-gradient(-45deg,{c}8c 0,{c}8c 1px,transparent 1px,transparent 6px);"
            f"border:1px solid {c};border-radius:{radius};opacity:1;"
        ),
    }
    return styles.get(
        style_barre,
        f"background-color:{c};border-radius:{radius};opacity:{op_titre_plein};",
    )


def _calculer_layout(diagramme):
    """Prépare les périodes et les lignes prêtes à afficher dans le template."""
    elements = list(diagramme.elements.all())
    lignes_datees = [
        e for e in elements
        if e.type_element != 'titre' and e.date_debut and e.date_fin
    ]
    axe = _calculer_periodes(_bornes(lignes_datees), diagramme.echelle)

    titres = [e for e in elements if e.type_element == 'titre']
    lignes = [e for e in elements if e.type_element != 'titre']

    resultat = []

    def ajouter_ligne(ligne, indente):
        barre = _calculer_barre(ligne.date_debut, ligne.date_fin, axe)
        resultat.append({
            'libelle': ligne.libelle,
            'est_titre': False,
            'indente': indente,
            'couleur': ligne.couleur,
            'date_debut': ligne.date_debut,
            'date_fin': ligne.date_fin,
            'date_debut_courte': _format_date_courte(ligne.date_debut),
            'date_fin_courte': _format_date_courte(ligne.date_fin),
            'dates_barre': _mode_dates_barre(
                barre['largeur_num'] if barre else 0,
                ligne.date_debut,
                ligne.date_fin,
            ),
            'libelle_dates': _libelle_dates_plage(
                ligne.date_debut,
                ligne.date_fin,
                barre['duree'] if barre else None,
            ),
            'style_barre': ligne.style_barre or 'plein',
            'style_barre_css': _style_barre_css(
                ligne.couleur, ligne.style_barre or 'plein', False
            ),
            'barre': barre,
        })

    for titre in titres:
        enfants = [l for l in lignes if l.parent_id == titre.id]
        bornes_titre = _bornes(enfants)
        barre_titre = (
            _calculer_barre(bornes_titre[0], bornes_titre[1], axe)
            if bornes_titre else None
        )
        resultat.append({
            'libelle': titre.libelle,
            'est_titre': True,
            'indente': False,
            'couleur': titre.couleur,
            'date_debut': bornes_titre[0] if bornes_titre else None,
            'date_fin': bornes_titre[1] if bornes_titre else None,
            'date_debut_courte': _format_date_courte(
                bornes_titre[0] if bornes_titre else None
            ),
            'date_fin_courte': _format_date_courte(
                bornes_titre[1] if bornes_titre else None
            ),
            'dates_barre': _mode_dates_barre(
                barre_titre['largeur_num'] if barre_titre else 0,
                bornes_titre[0] if bornes_titre else None,
                bornes_titre[1] if bornes_titre else None,
            ),
            'libelle_dates': _libelle_dates_plage(
                bornes_titre[0] if bornes_titre else None,
                bornes_titre[1] if bornes_titre else None,
                barre_titre['duree'] if barre_titre else None,
            ),
            'style_barre': titre.style_barre or 'plein',
            'style_barre_css': _style_barre_css(
                titre.couleur, titre.style_barre or 'plein', True
            ),
            'barre': barre_titre,
        })
        for enfant in enfants:
            ajouter_ligne(enfant, True)

    ids_titres = {t.id for t in titres}
    for ligne in lignes:
        if not ligne.parent_id or ligne.parent_id not in ids_titres:
            ajouter_ligne(ligne, False)

    largeur_periode = 100 / len(axe['periodes']) if axe['periodes'] else 100
    for periode in axe['periodes']:
        periode['largeur'] = _pourcentage_css(largeur_periode)
    for groupe in axe['groupes']:
        groupe['largeur'] = _pourcentage_css(
            groupe['nb_periodes'] * largeur_periode
        )

    enchainements = _calculer_enchainements(resultat)
    for lien in enchainements:
        lien['chemin'] = _chemin_enchainement(lien, len(resultat))

    return {
        'axe': axe,
        'lignes': resultat,
        'enchainements': enchainements,
        'largeur_periode': _pourcentage_css(largeur_periode),
    }


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def preview_gantt(request, diagramme_id):
    """Prévisualisation HTML consommée par Puppeteer.

    Ouverte sans authentification, comme les autres previews PDF du projet :
    le navigateur headless ne porte pas la session de l'utilisateur.
    """
    try:
        diagramme = GanttDiagramme.objects.select_related(
            'chantier', 'chantier__societe'
        ).prefetch_related('elements').get(id=diagramme_id)
    except GanttDiagramme.DoesNotExist:
        return JsonResponse({'error': 'Diagramme introuvable'}, status=404)

    layout = _calculer_layout(diagramme)
    societe = (
        diagramme.chantier.societe
        if diagramme.chantier and diagramme.chantier.societe_id
        else None
    )

    from .utils import generate_presigned_url_for_display

    logo_client_url = ''
    if diagramme.afficher_logo_client and diagramme.logo_client_s3_key:
        try:
            logo_client_url = generate_presigned_url_for_display(
                diagramme.logo_client_s3_key, expires_in=3600
            )
        except Exception:
            pass

    return render(request, 'preview_gantt.html', {
        'diagramme': diagramme,
        'chantier': diagramme.chantier,
        'societe_nom': societe.nom_societe if societe else '',
        'afficher_logo_client': diagramme.afficher_logo_client,
        'logo_client_url': logo_client_url,
        'axe': layout['axe'],
        'lignes': layout['lignes'],
        'enchainements': layout['enchainements'],
        'viewbox_h': len(layout['lignes']) * 100,
        'largeur_periode': layout['largeur_periode'],
        'date_edition': timezone.now(),
    })


def _generer_pdf_gantt(diagramme, request):
    """Lance Puppeteer sur la preview et renvoie le chemin du PDF temporaire."""
    preview_url = request.build_absolute_uri(
        f"/api/preview-gantt/{diagramme.id}/"
    )
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    script_path = os.path.join(
        base_dir, 'frontend', 'src', 'components', 'generate_gantt_pdf.js'
    )
    if not os.path.exists(script_path):
        raise FileNotFoundError(f"Script Node.js introuvable : {script_path}")

    node_path = 'node'
    for candidat in ['node', '/usr/bin/node', '/usr/local/bin/node']:
        try:
            subprocess.run(
                [candidat, '--version'], check=True, capture_output=True, text=True
            )
            node_path = candidat
            break
        except (subprocess.CalledProcessError, FileNotFoundError):
            continue

    temp_pdf = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
    temp_pdf_path = temp_pdf.name
    temp_pdf.close()

    subprocess.run(
        [node_path, script_path, preview_url, temp_pdf_path],
        check=True,
        capture_output=True,
        text=True,
        timeout=90,
    )
    return temp_pdf_path


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_gantt_pdf_drive(request):
    """Génère le PDF et le dépose dans le Drive (S3).

    Les diagrammes sans chantier n'ont pas de dossier `Chantiers/...` : le
    `PDFManager` bascule alors sur `Documents_Generaux/PLANNING_GANTT/{année}`.
    """
    diagramme_id = request.query_params.get('diagramme_id')
    if not diagramme_id:
        return JsonResponse({'error': 'diagramme_id requis'}, status=400)

    try:
        diagramme = GanttDiagramme.objects.select_related(
            'chantier', 'chantier__societe'
        ).get(id=diagramme_id)
    except GanttDiagramme.DoesNotExist:
        return JsonResponse({'error': 'Diagramme introuvable'}, status=404)

    from .pdf_manager import PDFManager

    preview_url = request.build_absolute_uri(
        f"/api/preview-gantt/{diagramme.id}/"
    )
    societe_nom = ''
    parametres = {'diagramme_nom': diagramme.nom, 'year': timezone.now().year}
    if diagramme.chantier:
        parametres['chantier_id'] = diagramme.chantier_id
        parametres['chantier_name'] = diagramme.chantier.chantier_name
        if diagramme.chantier.societe_id:
            societe_nom = diagramme.chantier.societe.nom_societe

    try:
        succes, message, chemin_s3, conflit = PDFManager().generate_andStore_pdf(
            document_type='gantt',
            preview_url=preview_url,
            societe_name=societe_nom,
            **parametres,
        )
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

    if not succes:
        return JsonResponse({'success': False, 'error': message}, status=400)

    return JsonResponse({
        'success': True,
        'message': message,
        's3_file_path': chemin_s3,
        'drive_url': f"/drive-v2?path={chemin_s3}&focus=file",
        'conflit': conflit,
    })


class GanttDesignationViewSet(viewsets.ModelViewSet):
    """Catalogue de suggestions de désignations.

    Alimenté automatiquement à la validation des diagrammes. Purement indicatif :
    supprimer une entrée ne touche aucun diagramme existant.
    """

    serializer_class = GanttDesignationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    http_method_names = ['get', 'delete', 'head', 'options']
    queryset = GanttDesignation.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        type_element = request.query_params.get('type')
        if type_element:
            queryset = queryset.filter(type_element=type_element)

        recherche = request.query_params.get('q')
        if recherche:
            queryset = queryset.filter(
                libelle_normalise__icontains=normaliser_libelle(recherche)
            )

        return Response(self.get_serializer(queryset[:10], many=True).data)
