"""Vues DRF pour la fonctionnalité « Diagrammes de Gantt »."""

import os
import subprocess
import tempfile
from datetime import date, timedelta

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
        'duree': duree,
    }


def _libelle_dates_plage(date_debut, date_fin, duree=None):
    """Aligné sur ``libelleDatesPlage`` dans ``frontend/.../ganttLayout.js``."""
    if not duree:
        return ''
    return f"{duree} j"


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
            'libelle_dates': _libelle_dates_plage(
                ligne.date_debut,
                ligne.date_fin,
                barre['duree'] if barre else None,
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
            'libelle_dates': _libelle_dates_plage(
                bornes_titre[0] if bornes_titre else None,
                bornes_titre[1] if bornes_titre else None,
                barre_titre['duree'] if barre_titre else None,
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

    return {
        'axe': axe,
        'lignes': resultat,
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

    return render(request, 'preview_gantt.html', {
        'diagramme': diagramme,
        'chantier': diagramme.chantier,
        'societe_nom': societe.nom_societe if societe else '',
        'axe': layout['axe'],
        'lignes': layout['lignes'],
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
