from rest_framework import viewsets, status, serializers, status
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import permission_classes
from rest_framework.response import Response
from django.core.paginator import Paginator
from django.db.models import Q
from django.utils.text import slugify
from datetime import datetime, timedelta
import os

from .models import Document, Societe, Chantier
from .serializers import (
    DocumentSerializer, 
    DocumentUploadSerializer, 
    DocumentListSerializer, 
    FolderItemSerializer
)
from .utils import build_document_key, generate_presigned_url, generate_presigned_post, custom_slugify
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action, api_view, permission_classes
from django.http import JsonResponse, HttpResponse
from django.db.models import Avg, Count, Min, Sum, F, Max, Q, Prefetch
from django.shortcuts import render, redirect, get_object_or_404
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from django.utils.timezone import now
from django.db.models.functions import TruncMonth
from datetime import timedelta, date, datetime
import subprocess
import os
import json
import calendar
from .serializers import  DocumentSerializer, DocumentUploadSerializer, DocumentListSerializer, FolderItemSerializer,AppelOffresSerializer, BanqueSerializer,FournisseurSerializer, SousTraitantSerializer, ContactSousTraitantSerializer, ContactSocieteSerializer, ContratSousTraitanceSerializer, AvenantSousTraitanceSerializer,PaiementFournisseurMaterielSerializer, PaiementSousTraitantSerializer, PaiementGlobalSousTraitantSerializer, FactureSousTraitantSerializer, PaiementFactureSousTraitantSerializer, RecapFinancierSerializer, ChantierSerializer, SocieteSerializer, DevisSerializer, PartieSerializer, SousPartieSerializer,LigneDetailSerializer, ClientSerializer, StockSerializer, AgentSerializer, PresenceSerializer, StockMovementSerializer, StockHistorySerializer, EventSerializer, ScheduleSerializer, LaborCostSerializer, FactureSerializer, ChantierDetailSerializer, BonCommandeSerializer, AgentPrimeSerializer, AvenantSerializer, FactureTSSerializer, FactureTSCreateSerializer, SituationSerializer, SituationCreateSerializer, SituationLigneSerializer, SituationLigneUpdateSerializer, FactureTSListSerializer, SituationLigneAvenantSerializer, SituationLigneSupplementaireSerializer,ChantierLigneSupplementaireSerializer,AgencyExpenseSerializer, AgencyExpenseMonthSerializer, EmetteurSerializer, ColorSerializer, SuiviPaiementSousTraitantMensuelSerializer, FactureSuiviSousTraitantSerializer
from .models import (
    AppelOffres, TauxFixe, update_chantier_cout_main_oeuvre, Chantier, PaiementSousTraitant, SousTraitant, ContactSousTraitant, ContactSociete, ContratSousTraitance, AvenantSousTraitance, Chantier, Devis, Facture, Quitus, Societe, Partie, SousPartie, 
    LigneDetail, Client, Stock, Agent, Presence, StockMovement, 
    StockHistory, Event, MonthlyHours, MonthlyPresence, Schedule, 
    LaborCost, DevisLigne, FactureLigne, FacturePartie, 
    FactureSousPartie, FactureLigneDetail, BonCommande, 
    LigneBonCommande, Fournisseur, FournisseurMagasin, TauxFixe, Parametres, Avenant, FactureTS, Situation, SituationLigne, SituationLigneSupplementaire, SituationLigneSpeciale,
    ChantierLigneSupplementaire, SituationLigneAvenant,ChantierLigneSupplementaire,AgencyExpense,AgencyExpenseOverride,AgencyExpenseMonth,PaiementSousTraitant,PaiementGlobalSousTraitant,PaiementFournisseurMateriel,
    Banque, Emetteur, FactureSousTraitant, PaiementFactureSousTraitant,
    AgencyExpenseAggregate, AgentPrime, Color, LigneSpeciale, FactureFournisseurMateriel,
    SuiviPaiementSousTraitantMensuel, FactureSuiviSousTraitant,
)
from .drive_automation import drive_automation
from .models import compute_agency_expense_aggregate_for_month
from .ecole_utils import (
    get_or_create_ecole_chantier,
    create_ecole_assignments,
    calculate_ecole_hours_for_agent,
    create_ecole_expense_for_agent,
    recalculate_all_ecole_expenses_for_month,
    delete_ecole_assignments
)
import logging
from django.db import transaction, models
from rest_framework.permissions import IsAdminUser, AllowAny
from calendar import day_name
import locale
import traceback
from django.views.decorators.csrf import ensure_csrf_cookie
from decimal import Decimal
from django.db.models import Q
import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import tempfile
from django.views import View
import random
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from datetime import date, timedelta
from rest_framework.permissions import IsAuthenticatedOrReadOnly
import holidays
from datetime import datetime, timedelta




logger = logging.getLogger(__name__)


# Create your views here.
class ChantierViewSet(viewsets.ModelViewSet):
    queryset = Chantier.objects.all()
    serializer_class = ChantierSerializer
    permission_classes = [AllowAny]  # Permettre l'accès à tous les utilisateurs

    def create(self, request, *args, **kwargs):
        # Récupérer les données estimées du frontend
        cout_estime_main_oeuvre = request.data.get('cout_estime_main_oeuvre', 0)
        cout_estime_materiel = request.data.get('cout_estime_materiel', 0)
        marge_estimee = request.data.get('marge_estimee', 0)
        
        # Créer le chantier avec les estimations
        serializer = self.get_serializer(data={
            **request.data,
            'cout_estime_main_oeuvre': cout_estime_main_oeuvre,
            'cout_estime_materiel': cout_estime_materiel,
            'marge_estimee': marge_estimee
        })
        
        serializer.is_valid(raise_exception=True)
        chantier = self.perform_create(serializer)
        
        # Créer automatiquement la structure de dossiers dans le drive
        try:
            societe = chantier.societe
            if societe and chantier.nom:
                drive_automation.create_chantier_structure(
                    societe_name=societe.nom,
                    chantier_name=chantier.nom
                )
        except Exception as e:
            print(f"Erreur lors de la création automatique des dossiers: {str(e)}")
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, 
            status=status.HTTP_201_CREATED, 
            headers=headers
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Mettre à jour les estimations si fournies
        if 'cout_estime_main_oeuvre' in request.data:
            instance.cout_estime_main_oeuvre = request.data['cout_estime_main_oeuvre']
        if 'cout_estime_materiel' in request.data:
            instance.cout_estime_materiel = request.data['cout_estime_materiel']
        if 'marge_estimee' in request.data:
            instance.marge_estimee = request.data['marge_estimee']
            
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        societe_id = self.request.query_params.get('societe_id')
        if societe_id:
            queryset = queryset.filter(societe_id=societe_id)
        return queryset



class SocieteViewSet(viewsets.ModelViewSet):
    queryset = Societe.objects.all()
    serializer_class = SocieteSerializer
    permission_classes = [AllowAny]

class FactureTSViewSet(viewsets.ModelViewSet):
    queryset = FactureTS.objects.all()
    serializer_class = FactureTSListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        chantier_id = self.request.query_params.get('chantier')
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        return queryset.select_related('devis', 'avenant')


class DevisPagination(PageNumberPagination):
    """Pagination pour la liste des devis"""
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


class DevisViewSet(viewsets.ModelViewSet):
    queryset = (
        Devis.objects.all()
        .select_related(
            'chantier',
            'chantier__societe',
            'chantier__societe__client_name',
            'appel_offres',
            'appel_offres__societe',
            'appel_offres__societe__client_name',
        )
        .prefetch_related('lignes', 'client')
        .order_by('-date_creation')
    )
    serializer_class = DevisSerializer
    permission_classes = [AllowAny]  # Permettre l'accès à tous les utilisateurs
    pagination_class = DevisPagination

    def get_serializer_class(self):
        from .serializers import DevisListSerializer
        if self.action == 'list':
            return DevisListSerializer
        return DevisSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        chantier_id = self.request.query_params.get('chantier')
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        # Toujours trier par date de création décroissante (plus récent en premier)
        return queryset.order_by('-date_creation')
    
    @action(detail=True, methods=['get'])
    def format_lignes(self, request, pk=None):
        devis = self.get_object()
        serializer = self.get_serializer(devis)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            # Calculer les coûts du nouveau devis
            calculer_couts_devis(response.data['id'])
            
            # Si c'est un devis de chantier, mettre à jour le chantier
            if response.data.get('devis_chantier') and response.data.get('chantier'):
                recalculer_couts_estimes_chantier(response.data['chantier'])
        return response
    
    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            # Recalculer les coûts du devis modifié
            calculer_couts_devis(response.data['id'])
            
            # Si c'est un devis de chantier, mettre à jour le chantier
            if response.data.get('devis_chantier') and response.data.get('chantier'):
                recalculer_couts_estimes_chantier(response.data['chantier'])
        return response
    
class FactureViewSet(viewsets.ModelViewSet):
    queryset = Facture.objects.all()
    serializer_class = FactureSerializer
    permission_classes = [AllowAny]  # Permettre l'accès à tous les utilisateurs
    
    def create(self, request, *args, **kwargs):
        # ✅ Si contact_societe n'est pas fourni, copier celui du devis si disponible
        data = request.data.copy()
        if 'contact_societe' not in data or not data.get('contact_societe'):
            devis_id = data.get('devis')
            if devis_id:
                try:
                    devis = Devis.objects.get(id=devis_id)
                    if devis.contact_societe:
                        data['contact_societe'] = devis.contact_societe.id
                except Devis.DoesNotExist:
                    pass
        
        # Créer une nouvelle requête avec les données modifiées
        request._full_data = data
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            # Calculer les coûts de la nouvelle facture
            calculer_couts_facture(response.data['id'])
            
            # Mettre à jour le chantier
            if response.data.get('chantier'):
                recalculer_couts_estimes_chantier(response.data['chantier'])
        return response
    
    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            # Recalculer les coûts de la facture modifiée
            calculer_couts_facture(response.data['id'])
            
            # Mettre à jour le chantier
            if response.data.get('chantier'):
                recalculer_couts_estimes_chantier(response.data['chantier'])
        return response
    
    def destroy(self, request, *args, **kwargs):
        # Récupérer le chantier avant suppression
        facture = self.get_object()
        chantier_id = facture.chantier.id if facture.chantier else None
        
        response = super().destroy(request, *args, **kwargs)
        if response.status_code == 204:
            # Mettre à jour le chantier après suppression
            if chantier_id:
                recalculer_couts_estimes_chantier(chantier_id)
        return response


def dashboard_data(request):
    # Récupérer les paramètres de filtrage
    month = request.GET.get('month', datetime.now().month)
    year = request.GET.get('year', datetime.now().year)
    chantier_id = request.GET.get('chantier_id')

    # Créer le filtre de date
    date_filter = Q(
        date_creation__month=month,
        date_creation__year=year
    )

    # Ajouter le filtre de chantier si spécifié
    chantier_filter = Q(id=chantier_id) if chantier_id else Q()

    # Appliquer les filtres aux requêtes
    chantiers = Chantier.objects.filter(chantier_filter)
    
    # Récupérer la dernière situation pour chaque chantier
    latest_situations = {}
    for chantier in chantiers:
        latest_situation = Situation.objects.filter(
            chantier=chantier
        ).order_by('-date_creation').first()
        if latest_situation:
            latest_situations[chantier.id] = {
                'montant_apres_retenues': float(latest_situation.montant_apres_retenues),
                'pourcentage_avancement': float(latest_situation.pourcentage_avancement)
            }

    if chantier_id:
        devis = Devis.objects.filter(chantier_id=chantier_id)
        factures = Facture.objects.filter(chantier_id=chantier_id)
    else:
        devis = Devis.objects.all()
        factures = Facture.objects.all()

    # Appliquer le filtre de date
    devis = devis.filter(date_filter)
    factures = factures.filter(date_filter)

    # Chantiers
    state_chantier = chantiers.filter(state_chantier='En Cours').count()
    cout_materiel = chantiers.aggregate(Sum('cout_materiel'))['cout_materiel__sum'] or 0
    cout_main_oeuvre = chantiers.aggregate(Sum('cout_main_oeuvre'))['cout_main_oeuvre__sum'] or 0
    cout_sous_traitance = chantiers.aggregate(Sum('cout_sous_traitance'))['cout_sous_traitance__sum'] or 0
    montant_total = chantiers.aggregate(Sum('montant_ttc'))['montant_ttc__sum'] or 0

    # Devis
    devis_terminer = devis.filter(status='Terminé').count()
    devis_en_cour = devis.filter(status='En Cours').count()
    devis_facturé = devis.filter(status='Facturé').count()
    
    # Factures
    facture_terminer = factures.filter(state_facture='Terminé').count()
    facture_en_cour = factures.filter(state_facture='En Cours').count()
    facture_facturé = factures.filter(state_facture='Facturé').count()

    # Totaux Devis
    total_devis_terminer = devis.filter(status='Terminé').aggregate(total=Sum('price_ttc'))['total'] or 0
    total_devis_facturé = devis.filter(status='Facturé').aggregate(total=Sum('price_ttc'))['total'] or 0
    
    # Totaux Factures
    total_facture_terminer = factures.filter(state_facture='Terminé').aggregate(total=Sum('price_ttc'))['total'] or 0
    total_facture_facturé = factures.filter(state_facture='Facturé').aggregate(total=Sum('price_ttc'))['total'] or 0
    
    total_devis_combined = total_devis_facturé + total_devis_terminer
    total_facture_combined = total_facture_terminer + total_facture_facturé

    data = {
        'chantier_en_cours': state_chantier,
        'cout_materiel': cout_materiel,
        'cout_main_oeuvre': cout_main_oeuvre,
        'cout_sous_traitance': cout_sous_traitance,
        'montant_total': montant_total,
        'devis_terminer': devis_terminer,
        'facture_terminer': facture_terminer,
        'devis_en_cour': devis_en_cour,
        'facture_en_cour': facture_en_cour,
        'devis_facturé': devis_facturé,
        'facture_facturé': facture_facturé,
        'total_devis_terminer': total_devis_terminer,
        'total_devis_facturé': total_devis_facturé,
        'total_facture_terminer': total_facture_terminer,
        'total_facture_facturé': total_facture_facturé,
        'total_devis_combined': total_devis_combined,
        'total_facture_combined': total_facture_combined,
        'latest_situations': latest_situations
    }
    return JsonResponse(data)


def preview_devis(request):
    devis_data_encoded = request.GET.get('devis')

    if devis_data_encoded:
        try:
            devis_data = json.loads(devis_data_encoded)
            chantier_id = devis_data['chantier']

            if chantier_id == -1:
                # Utiliser les données temporaires
                temp_data = devis_data.get('tempData', {})
                chantier = temp_data.get('chantier', {})
                client = temp_data.get('client', {})
                societe = temp_data.get('societe', {})

                

                # S'assurer que tous les champs ont une valeur par défaut
                for field in ['name', 'surname', 'phone_Number', 'client_mail']:
                    if not client.get(field):
                        client[field] = 'Non renseigné'

                for field in ['nom_societe', 'ville_societe', 'rue_societe', 'codepostal_societe']:
                    if not societe.get(field):
                        societe[field] = 'Non renseigné'
                    
                for field in ['chantier_name', 'ville', 'rue', 'code_postal']:
                    if not chantier.get(field):
                        chantier[field] = 'Non renseigné'

            else:
                # Utiliser les données existantes
                chantier = get_object_or_404(Chantier, id=chantier_id)
                societe = chantier.societe
                client = societe.client_name

                total_ht = 0
                parties_data = []
            
            # Fonction de tri naturel pour les parties
            def natural_sort_key(titre):
                import re
                # Extraire le numéro au début du titre (ex: "1-", "11-", "21-")
                match = re.match(r'^(\d+)-', titre)
                if match:
                    # Retourner un tuple (numéro, titre) pour un tri correct
                    return (int(match.group(1)), titre)
                # Si pas de numéro, retourner (0, titre) pour mettre en premier
                return (0, titre)
            
            # Récupérer toutes les parties et les trier
            parties_to_process = []
            for partie_id in devis_data['parties']:
                partie = get_object_or_404(Partie, id=partie_id)
                parties_to_process.append(partie)
            
            # Trier les parties par ordre naturel
            parties_to_process.sort(key=lambda p: natural_sort_key(p.titre))
            
            for partie in parties_to_process:
                sous_parties_data = []
                total_partie = 0
                
                # Récupérer les lignes spéciales pour cette partie
                special_lines_partie = devis_data.get('specialLines', {}).get('parties', {}).get(str(partie.id), [])
                
                # Récupérer et trier les sous-parties
                sous_parties_to_process = list(SousPartie.objects.filter(partie=partie, id__in=devis_data.get('sous_parties', [])))
                sous_parties_to_process.sort(key=lambda sp: natural_sort_key(sp.description))
                
                for sous_partie in sous_parties_to_process:
                    lignes_details_data = []
                    total_sous_partie = 0
                    
                    # Calculer le total des lignes de détail
                    for ligne in devis_data['lignes_details']:
                        if (LigneDetail.objects.get(id=ligne['id']).sous_partie_id == sous_partie.id 
                            and float(ligne['quantity']) > 0):
                            ligne_db = get_object_or_404(LigneDetail, id=ligne['id'])
                            quantity = Decimal(str(ligne['quantity']))
                            custom_price = Decimal(str(ligne['custom_price']))
                            total_ligne = quantity * custom_price
                            
                            lignes_details_data.append({
                                'description': ligne_db.description,
                                'unite': ligne_db.unite,
                                'quantity': quantity,
                                'custom_price': custom_price,
                                'total': total_ligne
                            })
                            total_sous_partie += total_ligne
                    
                    if lignes_details_data:
                        # Trier les lignes de détail par ordre naturel
                        lignes_details_data.sort(key=lambda l: natural_sort_key(l['description']))
                        
                        # Appliquer les lignes spéciales de la sous-partie
                        special_lines_sous_partie = devis_data.get('specialLines', {}).get('sousParties', {}).get(str(sous_partie.id), [])
                        sous_partie_data = {
                            'description': sous_partie.description,
                            'lignes_details': lignes_details_data,
                            'total_sous_partie': total_sous_partie,
                            'special_lines': []
                        }
                        
                        # Calculer et ajouter chaque ligne spéciale
                        for special_line in special_lines_sous_partie:
                            # Les lignes de type 'display' ne participent pas au calcul
                            if special_line['type'] == 'display':
                                sous_partie_data['special_lines'].append({
                                    'description': special_line['description'],
                                    'value': special_line['value'],
                                    'valueType': special_line['valueType'],
                                    'type': special_line['type'],
                                    'montant': Decimal(str(special_line['value'])),  # Montant affiché directement
                                    'isHighlighted': special_line['isHighlighted']
                                })
                                continue
                            
                            if special_line['valueType'] == 'percentage':
                                montant = (total_sous_partie * Decimal(str(special_line['value']))) / Decimal('100')
                            else:
                                montant = Decimal(str(special_line['value']))
                            
                            # Ajouter le montant au total selon le type (reduction ou addition)
                            if special_line['type'] == 'reduction':
                                total_sous_partie -= montant
                            else:
                                total_sous_partie += montant
                            
                            # Stocker le montant tel quel pour l'affichage
                            sous_partie_data['special_lines'].append({
                                'description': special_line['description'],
                                'value': special_line['value'],
                                'valueType': special_line['valueType'],
                                'type': special_line['type'],
                                'montant': montant,  # Montant toujours positif pour l'affichage
                                'isHighlighted': special_line['isHighlighted']
                            })
                        
                        sous_partie_data['total_sous_partie'] = total_sous_partie
                        sous_parties_data.append(sous_partie_data)
                        total_partie += total_sous_partie
                    
                if sous_parties_data:
                    partie_data = {
                        'titre': partie.titre,
                        'sous_parties': sous_parties_data,
                        'total_partie': total_partie,
                        'special_lines': []
                    }
                    
                    # Calculer et ajouter les lignes spéciales de la partie
                    for special_line in special_lines_partie:
                        # Les lignes de type 'display' ne participent pas au calcul
                        if special_line['type'] == 'display':
                            partie_data['special_lines'].append({
                                'description': special_line['description'],
                                'value': special_line['value'],
                                'valueType': special_line['valueType'],
                                'type': special_line['type'],
                                'montant': Decimal(str(special_line['value'])),  # Montant affiché directement
                                'isHighlighted': special_line['isHighlighted']
                            })
                            continue
                        
                        if special_line['valueType'] == 'percentage':
                            montant = (total_partie * Decimal(str(special_line['value']))) / Decimal('100')
                        else:
                            montant = Decimal(str(special_line['value']))
                        
                        # Ajouter le montant au total selon le type
                        if special_line['type'] == 'reduction':
                            total_partie -= montant
                        else:
                            total_partie += montant
                        
                        partie_data['special_lines'].append({
                            'description': special_line['description'],
                            'value': special_line['value'],
                            'valueType': special_line['valueType'],
                            'type': special_line['type'],
                            'montant': montant,  # Montant toujours positif pour l'affichage
                            'isHighlighted': special_line['isHighlighted']
                        })
                    
                    partie_data['total_partie'] = total_partie
                    parties_data.append(partie_data)
                    total_ht += total_partie
            
            # Appliquer les lignes spéciales globales
            special_lines_global = devis_data.get('specialLines', {}).get('global', [])
            for special_line in special_lines_global:
                # Les lignes de type 'display' ne participent pas au calcul
                if special_line['type'] == 'display':
                    special_line['montant'] = Decimal(str(special_line['value']))  # Montant affiché directement
                    continue
                
                if special_line['valueType'] == 'percentage':
                    montant = (total_ht * Decimal(str(special_line['value']))) / Decimal('100')
                else:
                    montant = Decimal(str(special_line['value']))
                
                special_line['montant'] = montant  # Montant toujours positif pour l'affichage
                
                # Ajouter le montant au total selon le type
                if special_line['type'] == 'reduction':
                    total_ht -= montant
                else:
                    total_ht += montant

            # Calculer TVA et TTC
            tva_rate = Decimal(str(devis_data.get('tva_rate', 20.0)))
            tva = total_ht * (tva_rate / Decimal('100'))
            montant_ttc = total_ht + tva

            context = {
                'chantier': chantier,
                'societe': societe,
                'client': client,
                'parties': parties_data,
                'total_ht': total_ht,  # Utiliser le nouveau total_ht calculé
                'tva': tva,
                'montant_ttc': montant_ttc,
                'special_lines_global': special_lines_global,  # Ajouter les lignes spéciales globales au contexte
                'devis': {
                    'tva_rate': tva_rate,
                    'nature_travaux': devis_data.get('nature_travaux', '')
                }
            }

            return render(request, 'preview_devis.html', context)

        except json.JSONDecodeError as e:
            return JsonResponse({'error': f'Erreur de décodage JSON: {str(e)}'}, status=400)
    else:
        return JsonResponse({'error': 'Aucune donnée de devis trouvée'}, status=400)

def generate_pdf_from_preview(request):
    try:
        # Ajout de logs
        logger.info("Début de generate_pdf_from_preview")
        
        data = json.loads(request.body)
        devis_id = data.get('devis_id')
        logger.info(f"Génération PDF - Devis ID: {devis_id}")

        if not devis_id:
            return JsonResponse({'error': 'ID du devis manquant'}, status=400)

        # URL de la page de prévisualisation pour un devis sauvegardé
        preview_url = request.build_absolute_uri(f"/api/preview-saved-devis/{devis_id}/")
        logger.debug(f"Preview URL: {preview_url}")

            # Chemin vers le script Puppeteer
        node_script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'src', 'components', 'generate_pdf.js')
        logger.debug(f"Node script path: {node_script_path}")

            # Commande pour exécuter Puppeteer avec Node.js
        command = ['node', node_script_path, preview_url]
        logger.debug(f"Commande: {command}")

        # Exécuter Puppeteer avec capture de la sortie
        result = subprocess.run(
            command, 
            check=True,
            capture_output=True,
            text=True
        )
        logger.debug(f"Sortie standard: {result.stdout}")
        logger.debug(f"Sortie d'erreur: {result.stderr}")

            # Lire le fichier PDF généré
        pdf_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'src', 'components', 'devis.pdf')
        logger.debug(f"Chemin du PDF: {pdf_path}")
        logger.debug(f"Le fichier existe: {os.path.exists(pdf_path)}")

        if os.path.exists(pdf_path):
            with open(pdf_path, 'rb') as pdf_file:
                response = HttpResponse(pdf_file.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="devis_{devis_id}.pdf"'
            logger.info("PDF généré avec succès")
            return response
        else:
            error_msg = 'Le fichier PDF n\'a pas été généré.'
            logger.error(error_msg)
            return JsonResponse({'error': error_msg}, status=500)

    except json.JSONDecodeError as e:
        error_msg = f'Données JSON invalides: {str(e)}'
        logger.error(error_msg)
        return JsonResponse({'error': error_msg}, status=400)
    except subprocess.CalledProcessError as e:
        error_msg = f'Erreur lors de la génération du PDF: {str(e)}\nSortie: {e.output}'
        logger.error(error_msg)
        return JsonResponse({'error': error_msg}, status=500)
    except Exception as e:
        error_msg = f'Erreur inattendue: {str(e)}'
        logger.error(error_msg)
        logger.error(f"Type d'erreur: {type(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return JsonResponse({'error': error_msg}, status=500)


def check_nom_devis_existe(request):
    nom_devis = request.GET.get('nom_devis', None)
    
    if nom_devis:
        exists = Devis.objects.filter(nom_devis=nom_devis).exists()
        return JsonResponse({'exists': exists})
    return JsonResponse({'error': 'Nom de devis non fourni'}, status=400)


class PartieViewSet(viewsets.ModelViewSet):
    queryset = Partie.objects.all()
    serializer_class = PartieSerializer
    permission_classes = [AllowAny]  # Permettre l'accès à tous les utilisateurs

    def get_queryset(self):
        # Vérifier si on est en mode modification de devis
        devis_id = self.request.query_params.get('devis_id')
        include_deleted = self.request.query_params.get('include_deleted', 'false').lower() == 'true'
        
        if devis_id and include_deleted:
            # En mode modification de devis, inclure les éléments supprimés
            # mais seulement ceux qui étaient présents dans le devis original
            queryset = Partie.objects.all()
            
            # Récupérer les parties présentes dans le devis original
            try:
                devis = Devis.objects.get(id=devis_id)
                devis_lignes = DevisLigne.objects.filter(devis=devis)
                partie_ids = set()
                
                for ligne in devis_lignes:
                    if ligne.ligne_detail and ligne.ligne_detail.partie:
                        partie_ids.add(ligne.ligne_detail.partie.id)
                
                # Filtrer pour ne montrer que les parties du devis original
                if partie_ids:
                    queryset = queryset.filter(id__in=partie_ids)
                else:
                    # Si aucune partie trouvée, retourner un queryset vide
                    queryset = Partie.objects.none()
            except (Devis.DoesNotExist, Exception) as e:
                # Si le devis n'existe pas ou erreur, revenir au comportement normal
                queryset = Partie.objects.filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
        else:
            # Comportement normal : filtrer les parties non supprimées
            queryset = Partie.objects.filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
        
        type_filter = self.request.query_params.get('type')
        if type_filter:
            queryset = queryset.filter(type=type_filter)
        return queryset
    
    def get_object(self):
        """
        Surcharger get_object pour permettre l'accès aux éléments supprimés
        en mode modification de devis
        """
        # Vérifier si on est en mode modification de devis
        devis_id = self.request.query_params.get('devis_id')
        include_deleted = self.request.query_params.get('include_deleted', 'false').lower() == 'true'
        
        if devis_id and include_deleted:
            # En mode modification, permettre l'accès aux éléments supprimés
            # mais seulement ceux qui étaient présents dans le devis original
            try:
                devis = Devis.objects.get(id=devis_id)
                devis_lignes = DevisLigne.objects.filter(devis=devis)
                partie_ids = set()
                
                for ligne in devis_lignes:
                    if ligne.ligne_detail and ligne.ligne_detail.partie:
                        partie_ids.add(ligne.ligne_detail.partie.id)
                
                # Récupérer l'objet même s'il est supprimé
                obj = Partie.objects.get(pk=self.kwargs['pk'])
                
                # Vérifier que l'objet fait partie du devis original
                if obj.id in partie_ids:
                    return obj
                else:
                    from django.http import Http404
                    raise Http404("Partie non trouvée dans ce devis")
                    
            except (Devis.DoesNotExist, Partie.DoesNotExist, Exception) as e:
                from django.http import Http404
                raise Http404("Partie non trouvée")
        else:
            # Pour les requêtes directes (sans paramètres de devis), permettre l'accès à toutes les parties
            # Cela permet la modification via le modal avec l'endpoint all_including_deleted
            try:
                return Partie.objects.get(pk=self.kwargs['pk'])
            except Partie.DoesNotExist:
                from django.http import Http404
                raise Http404("Partie non trouvée")
    
    def destroy(self, request, *args, **kwargs):
        """Suppression logique en cascade"""
        instance = self.get_object()
        
        # Supprimer logiquement la partie
        instance.is_deleted = True
        instance.save()
        
        # Supprimer logiquement toutes les sous-parties de cette partie
        SousPartie.objects.filter(partie=instance).update(is_deleted=True)
        
        # Supprimer logiquement toutes les lignes de détail de cette partie
        LigneDetail.objects.filter(partie=instance).update(is_deleted=True)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def domaines(self, request):
        """
        Récupère la liste des types de domaines existants
        """
        # Filtrer aussi les domaines des parties non supprimées
        domaines = Partie.objects.filter(Q(is_deleted=False) | Q(is_deleted__isnull=True)).values_list('type', flat=True).distinct().order_by('type')
        return Response(list(domaines))
    
    @action(detail=False, methods=['get'])
    def all_including_deleted(self, request):
        """
        DEBUG: Récupère toutes les parties y compris celles supprimées
        """
        parties = Partie.objects.all()
        serializer = self.get_serializer(parties, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        """
        Endpoint de recherche optimisé pour React Select
        Retourne les parties au format {value, label, data} pour React Select
        """
        search_query = request.query_params.get('q', '').strip()
        
        # Base queryset - exclure les parties supprimées
        queryset = Partie.objects.filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
        
        # Filtrer par recherche si fournie
        if search_query:
            queryset = queryset.filter(
                Q(titre__icontains=search_query) |
                Q(type__icontains=search_query)
            )
        
        # Limiter à 50 résultats pour les performances
        queryset = queryset[:50]
        
        # Formater pour React Select
        results = []
        for partie in queryset:
            results.append({
                'value': partie.id,
                'label': f"{partie.titre} ({partie.type})",
                'data': {
                    'id': partie.id,
                    'titre': partie.titre,
                    'type': partie.type,
                    'domaine': partie.type,  # Utiliser type comme domaine
                    'total_partie': 0,  # Sera calculé plus tard
                    'special_lines': [],
                    'sous_parties': []
                }
            })
        
        return Response({
            'options': results,
            'total': len(results)
        })

class SousPartieViewSet(viewsets.ModelViewSet):
    queryset = SousPartie.objects.all()
    serializer_class = SousPartieSerializer

    def get_queryset(self):
        # Vérifier si on est en mode modification de devis
        devis_id = self.request.query_params.get('devis_id')
        include_deleted = self.request.query_params.get('include_deleted', 'false').lower() == 'true'
        
        if devis_id and include_deleted:
            # En mode modification de devis, inclure les éléments supprimés
            # mais seulement ceux qui étaient présents dans le devis original
            queryset = SousPartie.objects.all()
            
            # Récupérer les sous-parties présentes dans le devis original
            try:
                devis = Devis.objects.get(id=devis_id)
                devis_lignes = DevisLigne.objects.filter(devis=devis)
                sous_partie_ids = set()
                
                for ligne in devis_lignes:
                    if ligne.ligne_detail and ligne.ligne_detail.sous_partie:
                        sous_partie_ids.add(ligne.ligne_detail.sous_partie.id)
                
                # Filtrer pour ne montrer que les sous-parties du devis original
                if sous_partie_ids:
                    queryset = queryset.filter(id__in=sous_partie_ids)
                else:
                    # Si aucune sous-partie trouvée, retourner un queryset vide
                    queryset = SousPartie.objects.none()
            except (Devis.DoesNotExist, Exception) as e:
                # Si le devis n'existe pas ou erreur, revenir au comportement normal
                queryset = SousPartie.objects.filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
        else:
            # Comportement normal : filtrer les sous-parties non supprimées
            queryset = SousPartie.objects.filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
        
        return queryset
    
    def destroy(self, request, *args, **kwargs):
        """Suppression logique en cascade"""
        instance = self.get_object()
        
        # Supprimer logiquement la sous-partie
        instance.is_deleted = True
        instance.save()
        
        # Supprimer logiquement toutes les lignes de détail de cette sous-partie
        LigneDetail.objects.filter(sous_partie=instance).update(is_deleted=True)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def all_including_deleted(self, request):
        """
        DEBUG: Récupère toutes les sous-parties y compris celles supprimées
        """
        sous_parties = SousPartie.objects.all()
        serializer = self.get_serializer(sous_parties, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Endpoint dédié pour React Select : recherche de sous-parties par description
        Retourne un format {value, label, data} compatible avec React Select
        """
        partie_id = request.query_params.get('partie', None)
        q = request.query_params.get('q', '').strip()
        
        queryset = SousPartie.objects.filter(is_deleted=False).prefetch_related('lignes_details')
        
        # Filtrer par partie si spécifiée (obligatoire)
        if partie_id:
            # ✅ Vérifier si c'est un ID temporaire (commence par 'temp_')
            if isinstance(partie_id, str) and partie_id.startswith('temp_'):
                # Pour les parties temporaires (pas encore sauvegardées), retourner une liste vide
                return Response([])
            
            queryset = queryset.filter(partie_id=partie_id)
        else:
            # Si pas de partie_id, retourner vide
            return Response([])
        
        # Recherche par description
        if q:
            queryset = queryset.filter(description__icontains=q)
        
        # Limiter à 50 résultats
        queryset = queryset[:50]
        
        # Formater pour React Select avec toutes les infos nécessaires
        results = []
        for sp in queryset:
            # Sérialiser les lignes_details
            lignes_details = [
                {
                    'id': ld.id,
                    'description': ld.description,
                    'unite': ld.unite,
                    'cout_main_oeuvre': str(ld.cout_main_oeuvre),
                    'cout_materiel': str(ld.cout_materiel),
                    'taux_fixe': str(ld.taux_fixe),
                    'marge': str(ld.marge),
                    'prix': str(ld.prix),
                    'sous_partie': ld.sous_partie_id,
                    'is_deleted': ld.is_deleted
                }
                for ld in sp.lignes_details.all() if not ld.is_deleted
            ]
            
            results.append({
                'value': sp.id,
                'label': sp.description or 'Sans description',
                'data': {
                    'id': sp.id,
                    'description': sp.description,
                    'partie': sp.partie_id,
                    'lignes_details': lignes_details,
                    'is_deleted': sp.is_deleted
                }
            })
        
        return Response(results)

from rest_framework import viewsets, status, serializers, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action, api_view, permission_classes
from django.http import JsonResponse, HttpResponse
from django.db.models import Avg, Count, Min, Sum, F, Max, Q, Prefetch
from django.shortcuts import render, redirect, get_object_or_404
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from django.utils.timezone import now
from django.db.models.functions import TruncMonth
from datetime import timedelta, date, datetime
import subprocess
import os
import json
import calendar
from .serializers import  AppelOffresSerializer, BanqueSerializer,FournisseurSerializer, SousTraitantSerializer, ContratSousTraitanceSerializer, AvenantSousTraitanceSerializer,PaiementFournisseurMaterielSerializer, PaiementSousTraitantSerializer, RecapFinancierSerializer, ChantierSerializer, SocieteSerializer, DevisSerializer, PartieSerializer, SousPartieSerializer,LigneDetailSerializer, ClientSerializer, StockSerializer, AgentSerializer, PresenceSerializer, StockMovementSerializer, StockHistorySerializer, EventSerializer, ScheduleSerializer, LaborCostSerializer, FactureSerializer, ChantierDetailSerializer, BonCommandeSerializer, AgentPrimeSerializer, AvenantSerializer, FactureTSSerializer, FactureTSCreateSerializer, SituationSerializer, SituationCreateSerializer, SituationLigneSerializer, SituationLigneUpdateSerializer, FactureTSListSerializer, SituationLigneAvenantSerializer, SituationLigneSupplementaireSerializer,ChantierLigneSupplementaireSerializer,AgencyExpenseSerializer
from .models import (
    AppelOffres, TauxFixe, update_chantier_cout_main_oeuvre, Chantier, PaiementSousTraitant, SousTraitant, ContratSousTraitance, AvenantSousTraitance, Chantier, Devis, Facture, Quitus, Societe, Partie, SousPartie, 
    LigneDetail, Client, Stock, Agent, Presence, StockMovement, 
    StockHistory, Event, MonthlyHours, MonthlyPresence, Schedule, 
    LaborCost, DevisLigne, FactureLigne, FacturePartie, 
    FactureSousPartie, FactureLigneDetail, BonCommande, 
    LigneBonCommande, Fournisseur, FournisseurMagasin, TauxFixe, Parametres, Avenant, FactureTS, Situation, SituationLigne, SituationLigneSupplementaire, 
    ChantierLigneSupplementaire, SituationLigneAvenant,ChantierLigneSupplementaire,AgencyExpense,AgencyExpenseOverride,PaiementSousTraitant,PaiementFournisseurMateriel,
    Banque,
    AgencyExpenseAggregate,
)
from .models import compute_agency_expense_aggregate_for_month
from .ecole_utils import (
    get_or_create_ecole_chantier,
    create_ecole_assignments,
    calculate_ecole_hours_for_agent,
    create_ecole_expense_for_agent,
    recalculate_all_ecole_expenses_for_month,
    delete_ecole_assignments
)
import logging
from django.db import transaction, models
from rest_framework.permissions import IsAdminUser, AllowAny
from calendar import day_name
import locale
import traceback
from django.views.decorators.csrf import ensure_csrf_cookie
from decimal import Decimal
from django.db.models import Q
import re
from decimal import Decimal, InvalidOperation
import tempfile
from django.views import View
import random
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from datetime import date, timedelta
from rest_framework.permissions import IsAuthenticatedOrReadOnly
import holidays
from datetime import datetime, timedelta




class SocieteViewSet(viewsets.ModelViewSet):
    queryset = Societe.objects.all()
    serializer_class = SocieteSerializer
    permission_classes = [AllowAny]

class FactureTSViewSet(viewsets.ModelViewSet):
    queryset = FactureTS.objects.all()
    serializer_class = FactureTSListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        chantier_id = self.request.query_params.get('chantier')
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        return queryset.select_related('devis', 'avenant')
class DevisViewSet(viewsets.ModelViewSet):
    queryset = Devis.objects.all().prefetch_related('lignes')
    serializer_class = DevisSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        chantier_id = self.request.query_params.get('chantier')
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        return queryset
    
    @action(detail=True, methods=['get'])
    def format_lignes(self, request, pk=None):
        devis = self.get_object()
        serializer = self.get_serializer(devis)
        return Response(serializer.data)

def dashboard_data(request):
    # Récupérer les paramètres de filtrage
    month = request.GET.get('month', datetime.now().month)
    year = request.GET.get('year', datetime.now().year)
    chantier_id = request.GET.get('chantier_id')

    # Créer le filtre de date
    date_filter = Q(
        date_creation__month=month,
        date_creation__year=year
    )

    # Ajouter le filtre de chantier si spécifié
    chantier_filter = Q(id=chantier_id) if chantier_id else Q()

    # Appliquer les filtres aux requêtes
    chantiers = Chantier.objects.filter(chantier_filter)
    
    # Récupérer la dernière situation pour chaque chantier
    latest_situations = {}
    for chantier in chantiers:
        latest_situation = Situation.objects.filter(
            chantier=chantier
        ).order_by('-date_creation').first()
        if latest_situation:
            latest_situations[chantier.id] = {
                'montant_apres_retenues': float(latest_situation.montant_apres_retenues),
                'pourcentage_avancement': float(latest_situation.pourcentage_avancement)
            }

    if chantier_id:
        devis = Devis.objects.filter(chantier_id=chantier_id)
        factures = Facture.objects.filter(chantier_id=chantier_id)
    else:
        devis = Devis.objects.all()
        factures = Facture.objects.all()

    # Appliquer le filtre de date
    devis = devis.filter(date_filter)
    factures = factures.filter(date_filter)

    # Chantiers
    state_chantier = chantiers.filter(state_chantier='En Cours').count()
    cout_materiel = chantiers.aggregate(Sum('cout_materiel'))['cout_materiel__sum'] or 0
    cout_main_oeuvre = chantiers.aggregate(Sum('cout_main_oeuvre'))['cout_main_oeuvre__sum'] or 0
    cout_sous_traitance = chantiers.aggregate(Sum('cout_sous_traitance'))['cout_sous_traitance__sum'] or 0
    montant_total = chantiers.aggregate(Sum('montant_ttc'))['montant_ttc__sum'] or 0

    # Devis
    devis_terminer = devis.filter(status='Terminé').count()
    devis_en_cour = devis.filter(status='En Cours').count()
    devis_facturé = devis.filter(status='Facturé').count()
    
    # Factures
    facture_terminer = factures.filter(state_facture='Terminé').count()
    facture_en_cour = factures.filter(state_facture='En Cours').count()
    facture_facturé = factures.filter(state_facture='Facturé').count()

    # Totaux Devis
    total_devis_terminer = devis.filter(status='Terminé').aggregate(total=Sum('price_ttc'))['total'] or 0
    total_devis_facturé = devis.filter(status='Facturé').aggregate(total=Sum('price_ttc'))['total'] or 0
    
    # Totaux Factures
    total_facture_terminer = factures.filter(state_facture='Terminé').aggregate(total=Sum('price_ttc'))['total'] or 0
    total_facture_facturé = factures.filter(state_facture='Facturé').aggregate(total=Sum('price_ttc'))['total'] or 0
    
    total_devis_combined = total_devis_facturé + total_devis_terminer
    total_facture_combined = total_facture_terminer + total_facture_facturé

    data = {
        'chantier_en_cours': state_chantier,
        'cout_materiel': cout_materiel,
        'cout_main_oeuvre': cout_main_oeuvre,
        'cout_sous_traitance': cout_sous_traitance,
        'montant_total': montant_total,
        'devis_terminer': devis_terminer,
        'facture_terminer': facture_terminer,
        'devis_en_cour': devis_en_cour,
        'facture_en_cour': facture_en_cour,
        'devis_facturé': devis_facturé,
        'facture_facturé': facture_facturé,
        'total_devis_terminer': total_devis_terminer,
        'total_devis_facturé': total_devis_facturé,
        'total_facture_terminer': total_facture_terminer,
        'total_facture_facturé': total_facture_facturé,
        'total_devis_combined': total_devis_combined,
        'total_facture_combined': total_facture_combined,
        'latest_situations': latest_situations
    }
    return JsonResponse(data)


def preview_devis(request):
    devis_data_encoded = request.GET.get('devis')

    if devis_data_encoded:
        try:
            devis_data = json.loads(devis_data_encoded)
            chantier_id = devis_data['chantier']

            if chantier_id == -1:
                # Utiliser les données temporaires
                temp_data = devis_data.get('tempData', {})
                chantier = temp_data.get('chantier', {})
                client = temp_data.get('client', {})
                societe = temp_data.get('societe', {})

                

                # S'assurer que tous les champs ont une valeur par défaut
                for field in ['name', 'surname', 'phone_Number', 'client_mail']:
                    if not client.get(field):
                        client[field] = 'Non renseigné'

                for field in ['nom_societe', 'ville_societe', 'rue_societe', 'codepostal_societe']:
                    if not societe.get(field):
                        societe[field] = 'Non renseigné'
                    
                for field in ['chantier_name', 'ville', 'rue', 'code_postal']:
                    if not chantier.get(field):
                        chantier[field] = 'Non renseigné'

            else:
                # Utiliser les données existantes
                chantier = get_object_or_404(Chantier, id=chantier_id)
                societe = chantier.societe
                client = societe.client_name

            total_ht = 0
            parties_data = []
            
            # Fonction de tri naturel pour les parties
            def natural_sort_key(titre):
                import re
                # Extraire le numéro au début du titre (ex: "1-", "11-", "21-")
                match = re.match(r'^(\d+)-', titre)
                if match:
                    # Retourner un tuple (numéro, titre) pour un tri correct
                    return (int(match.group(1)), titre)
                # Si pas de numéro, retourner (0, titre) pour mettre en premier
                return (0, titre)
            
            # Récupérer et trier les parties
            parties_to_process = list(Partie.objects.filter(id__in=devis_data['parties']))
            parties_to_process.sort(key=lambda p: natural_sort_key(p.titre))
            
            for partie in parties_to_process:
                sous_parties_data = []
                total_partie = 0
                
                # Récupérer les lignes spéciales pour cette partie
                special_lines_partie = devis_data.get('specialLines', {}).get('parties', {}).get(str(partie.id), [])
                
                # Récupérer et trier les sous-parties
                sous_parties_to_process = list(SousPartie.objects.filter(partie=partie, id__in=devis_data.get('sous_parties', [])))
                sous_parties_to_process.sort(key=lambda sp: natural_sort_key(sp.description))
                
                for sous_partie in sous_parties_to_process:
                    lignes_details_data = []
                    total_sous_partie = 0
                    
                    # Calculer le total des lignes de détail
                    for ligne in devis_data['lignes_details']:
                        if (LigneDetail.objects.get(id=ligne['id']).sous_partie_id == sous_partie.id 
                            and float(ligne['quantity']) > 0):
                            ligne_db = get_object_or_404(LigneDetail, id=ligne['id'])
                            quantity = Decimal(str(ligne['quantity']))
                            custom_price = Decimal(str(ligne['custom_price']))
                            total_ligne = quantity * custom_price
                            
                            lignes_details_data.append({
                                'description': ligne_db.description,
                                'unite': ligne_db.unite,
                                'quantity': quantity,
                                'custom_price': custom_price,
                                'total': total_ligne
                            })
                            total_sous_partie += total_ligne
                    
                    if lignes_details_data:
                        # Trier les lignes de détail par ordre naturel
                        lignes_details_data.sort(key=lambda l: natural_sort_key(l['description']))
                        
                        # Appliquer les lignes spéciales de la sous-partie
                        special_lines_sous_partie = devis_data.get('specialLines', {}).get('sousParties', {}).get(str(sous_partie.id), [])
                        sous_partie_data = {
                            'description': sous_partie.description,
                            'lignes_details': lignes_details_data,
                            'total_sous_partie': total_sous_partie,
                            'special_lines': []
                        }
                        
                        # Calculer et ajouter chaque ligne spéciale
                        for special_line in special_lines_sous_partie:
                            # Les lignes de type 'display' ne participent pas au calcul
                            if special_line['type'] == 'display':
                                # Ajouter la ligne pour l'affichage uniquement
                                sous_partie_data['special_lines'].append({
                                    'description': special_line['description'],
                                    'value': special_line['value'],
                                    'valueType': special_line['valueType'],
                                    'type': special_line['type'],
                                    'montant': Decimal(str(special_line['value'])),  # Montant affiché directement
                                    'isHighlighted': special_line.get('isHighlighted', False)
                                })
                                continue  # Skip calculation for this line
                            
                            if special_line['valueType'] == 'percentage':
                                montant = (total_sous_partie * Decimal(str(special_line['value']))) / Decimal('100')
                            else:
                                montant = Decimal(str(special_line['value']))
                            
                            # Ajouter le montant au total selon le type (reduction ou addition)
                            if special_line['type'] == 'reduction':
                                total_sous_partie -= montant
                            else:
                                total_sous_partie += montant
                            
                            # Stocker le montant tel quel pour l'affichage
                            sous_partie_data['special_lines'].append({
                                'description': special_line['description'],
                                'value': special_line['value'],
                                'valueType': special_line['valueType'],
                                'type': special_line['type'],
                                'montant': montant,  # Montant toujours positif pour l'affichage
                                'isHighlighted': special_line['isHighlighted']
                            })
                        
                        sous_partie_data['total_sous_partie'] = total_sous_partie
                        sous_parties_data.append(sous_partie_data)
                        total_partie += total_sous_partie
                    
                if sous_parties_data:
                    partie_data = {
                        'titre': partie.titre,
                        'sous_parties': sous_parties_data,
                        'total_partie': total_partie,
                        'special_lines': []
                    }
                    
                    # Calculer et ajouter les lignes spéciales de la partie
                    for special_line in special_lines_partie:
                        # Les lignes de type 'display' ne participent pas au calcul
                        if special_line['type'] == 'display':
                            # Ajouter la ligne pour l'affichage uniquement
                            partie_data['special_lines'].append({
                                'description': special_line['description'],
                                'value': special_line['value'],
                                'valueType': special_line['valueType'],
                                'type': special_line['type'],
                                'montant': Decimal(str(special_line['value'])),  # Montant affiché directement
                                'isHighlighted': special_line.get('isHighlighted', False)
                            })
                            continue  # Skip calculation for this line
                        
                        if special_line['valueType'] == 'percentage':
                            montant = (total_partie * Decimal(str(special_line['value']))) / Decimal('100')
                        else:
                            montant = Decimal(str(special_line['value']))
                        
                        # Ajouter le montant au total selon le type
                        if special_line['type'] == 'reduction':
                            total_partie -= montant
                        else:
                            total_partie += montant
                        
                        partie_data['special_lines'].append({
                            'description': special_line['description'],
                            'value': special_line['value'],
                            'valueType': special_line['valueType'],
                            'type': special_line['type'],
                            'montant': montant,  # Montant toujours positif pour l'affichage
                            'isHighlighted': special_line['isHighlighted']
                        })
                    
                    partie_data['total_partie'] = total_partie
                    parties_data.append(partie_data)
                    total_ht += total_partie
            
            # Appliquer les lignes spéciales globales
            special_lines_global = devis_data.get('specialLines', {}).get('global', [])
            for special_line in special_lines_global:
                # Les lignes de type 'display' ne participent pas au calcul
                if special_line['type'] == 'display':
                    special_line['montant'] = Decimal(str(special_line['value']))  # Montant affiché directement
                    continue  # Skip calculation for this line
                
                if special_line['valueType'] == 'percentage':
                    montant = (total_ht * Decimal(str(special_line['value']))) / Decimal('100')
                else:
                    montant = Decimal(str(special_line['value']))
                
                special_line['montant'] = montant  # Montant toujours positif pour l'affichage
                
                # Ajouter le montant au total selon le type
                if special_line['type'] == 'reduction':
                    total_ht -= montant
                else:
                    total_ht += montant

            # Calculer TVA et TTC
            tva_rate = Decimal(str(devis_data.get('tva_rate', 20.0)))
            tva = total_ht * (tva_rate / Decimal('100'))
            montant_ttc = total_ht + tva

            context = {
                'chantier': chantier,
                'societe': societe,
                'client': client,
                'parties': parties_data,
                'total_ht': total_ht,  # Utiliser le nouveau total_ht calculé
                'tva': tva,
                'montant_ttc': montant_ttc,
                'special_lines_global': special_lines_global,  # Ajouter les lignes spéciales globales au contexte
                'devis': {
                    'tva_rate': tva_rate,
                    'nature_travaux': devis_data.get('nature_travaux', '')
                }
            }

            return render(request, 'preview_devis.html', context)

        except json.JSONDecodeError as e:
            return JsonResponse({'error': f'Erreur de décodage JSON: {str(e)}'}, status=400)
    else:
        return JsonResponse({'error': 'Aucune donnée de devis trouvée'}, status=400)

def generate_pdf_from_preview(request):
    try:
        # Ajout de logs
        print("Début de generate_pdf_from_preview")
        print("Request body:", request.body)
        
        data = json.loads(request.body)
        devis_id = data.get('devis_id')
        print("Devis ID:", devis_id)

        if not devis_id:
            return JsonResponse({'error': 'ID du devis manquant'}, status=400)

        # URL de la page de prévisualisation pour un devis sauvegardé
        preview_url = request.build_absolute_uri(f"/api/preview-saved-devis/{devis_id}/")
        print("Preview URL:", preview_url)

            # Chemin vers le script Puppeteer
        node_script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'src', 'components', 'generate_pdf.js')
        print("Node script path:", node_script_path)

            # Commande pour exécuter Puppeteer avec Node.js
        command = ['node', node_script_path, preview_url]
        print("Commande à exécuter:", command)

        # Exécuter Puppeteer avec capture de la sortie
        result = subprocess.run(
            command, 
            check=True,
            capture_output=True,
            text=True
        )
        print("Sortie standard:", result.stdout)
        print("Sortie d'erreur:", result.stderr)

            # Lire le fichier PDF généré
        pdf_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'src', 'components', 'devis.pdf')
        print("Chemin du PDF:", pdf_path)
        print("Le fichier existe ?", os.path.exists(pdf_path))

        if os.path.exists(pdf_path):
                with open(pdf_path, 'rb') as pdf_file:
                    response = HttpResponse(pdf_file.read(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="devis_{devis_id}.pdf"'
                print("PDF généré avec succès")
                return response
        else:
            error_msg = 'Le fichier PDF n\'a pas été généré.'
            print(error_msg)
            return JsonResponse({'error': error_msg}, status=500)

    except json.JSONDecodeError as e:
        error_msg = f'Données JSON invalides: {str(e)}'
        print(error_msg)
        return JsonResponse({'error': error_msg}, status=400)
    except subprocess.CalledProcessError as e:
        error_msg = f'Erreur lors de la génération du PDF: {str(e)}\nSortie: {e.output}'
        print(error_msg)
        return JsonResponse({'error': error_msg}, status=500)
    except Exception as e:
        error_msg = f'Erreur inattendue: {str(e)}'
        print(error_msg)
        print("Type d'erreur:", type(e))
        print("Traceback:", traceback.format_exc())
        return JsonResponse({'error': error_msg}, status=500)


def check_nom_devis_existe(request):
    nom_devis = request.GET.get('nom_devis', None)
    
    if nom_devis:
        exists = Devis.objects.filter(nom_devis=nom_devis).exists()
        return JsonResponse({'exists': exists})
    return JsonResponse({'error': 'Nom de devis non fourni'}, status=400)



class LigneDetailViewSet(viewsets.ModelViewSet):
    queryset = LigneDetail.objects.all()
    serializer_class = LigneDetailSerializer

    def get_queryset(self):
        # Vérifier si on est en mode modification de devis
        devis_id = self.request.query_params.get('devis_id')
        include_deleted = self.request.query_params.get('include_deleted', 'false').lower() == 'true'
        
        if devis_id and include_deleted:
            # En mode modification de devis, inclure les éléments supprimés
            # mais seulement ceux qui étaient présents dans le devis original
            queryset = LigneDetail.objects.all()
            
            # Récupérer les lignes présentes dans le devis original
            try:
                devis = Devis.objects.get(id=devis_id)
                devis_lignes = DevisLigne.objects.filter(devis=devis)
                ligne_detail_ids = set()
                
                for ligne in devis_lignes:
                    if ligne.ligne_detail:
                        ligne_detail_ids.add(ligne.ligne_detail.id)
                
                # Filtrer pour ne montrer que les lignes du devis original
                if ligne_detail_ids:
                    queryset = queryset.filter(id__in=ligne_detail_ids)
                else:
                    # Si aucune ligne trouvée, retourner un queryset vide
                    queryset = LigneDetail.objects.none()
            except (Devis.DoesNotExist, Exception) as e:
                # Si le devis n'existe pas ou erreur, revenir au comportement normal
                queryset = LigneDetail.objects.filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
        else:
            # Comportement normal : filtrer les lignes non supprimées
            queryset = LigneDetail.objects.filter(Q(is_deleted=False) | Q(is_deleted__isnull=True))
        
        return queryset
    
    def destroy(self, request, *args, **kwargs):
        """Suppression logique simple"""
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Endpoint dédié pour React Select : recherche de lignes de détails par description
        Retourne un format {value, label, data} compatible avec React Select
        """
        sous_partie_id = request.query_params.get('sous_partie', None)
        q = request.query_params.get('q', '').strip()
        
        queryset = LigneDetail.objects.filter(is_deleted=False)
        
        # Filtrer par sous-partie (obligatoire)
        if sous_partie_id:
            queryset = queryset.filter(sous_partie_id=sous_partie_id)
        else:
            # Si pas de sous_partie_id, retourner vide
            return Response([])
        
        # Recherche par description
        if q:
            queryset = queryset.filter(description__icontains=q)
        
        # Limiter à 50 résultats
        queryset = queryset[:50]
        
        # Formater pour React Select
        results = []
        for ld in queryset:
            results.append({
                'value': ld.id,
                'label': ld.description or 'Sans description',
                'data': {
                    'id': ld.id,
                    'description': ld.description,
                    'unite': ld.unite,
                    'cout_main_oeuvre': str(ld.cout_main_oeuvre),
                    'cout_materiel': str(ld.cout_materiel),
                    'taux_fixe': str(ld.taux_fixe),
                    'marge': str(ld.marge),
                    'prix': str(ld.prix),
                    'sous_partie': ld.sous_partie_id,
                    'partie': ld.partie_id,
                    'is_deleted': ld.is_deleted
                }
            })
        
        return Response(results)

    @action(detail=False, methods=['get'])
    def all_including_deleted(self, request):
        """
        DEBUG: Récupère toutes les lignes de détail y compris celles supprimées
        """
        lignes = LigneDetail.objects.all()
        serializer = self.get_serializer(lignes, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        try:
            data = request.data.copy()
            
            # Conversion des valeurs en décimal avec quantize pour 2 décimales
            TWOPLACES = Decimal('0.01')
            cout_main_oeuvre = Decimal(str(data.get('cout_main_oeuvre', 0))).quantize(TWOPLACES)
            cout_materiel = Decimal(str(data.get('cout_materiel', 0))).quantize(TWOPLACES)
            taux_fixe = Decimal(str(data.get('taux_fixe', 0))).quantize(TWOPLACES)
            marge = Decimal(str(data.get('marge', 0))).quantize(TWOPLACES)

            # Déterminer si on doit calculer le prix ou utiliser le prix saisi manuellement
            # Mode manuel : si les coûts sont à 0 et qu'un prix est fourni
            prix_manuel = data.get('prix')
            has_couts = cout_main_oeuvre > 0 or cout_materiel > 0
            
            if has_couts:
                # Mode calcul automatique : recalculer le prix
                base = (cout_main_oeuvre + cout_materiel).quantize(TWOPLACES)
                montant_taux_fixe = (base * (taux_fixe / Decimal('100'))).quantize(TWOPLACES)
                sous_total = (base + montant_taux_fixe).quantize(TWOPLACES)
                montant_marge = (sous_total * (marge / Decimal('100'))).quantize(TWOPLACES)
                prix = (sous_total + montant_marge).quantize(TWOPLACES)
                data['prix'] = prix
            elif prix_manuel:
                # Mode saisie manuelle : utiliser le prix fourni
                data['prix'] = Decimal(str(prix_manuel)).quantize(TWOPLACES)
            else:
                # Aucun prix ni coûts : erreur
                return Response(
                    {'error': 'Prix ou coûts requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            data = request.data.copy()
            
            # Conversion des valeurs en décimal avec quantize pour 2 décimales
            TWOPLACES = Decimal('0.01')
            cout_main_oeuvre = Decimal(str(data.get('cout_main_oeuvre', 0))).quantize(TWOPLACES)
            cout_materiel = Decimal(str(data.get('cout_materiel', 0))).quantize(TWOPLACES)
            taux_fixe = Decimal(str(data.get('taux_fixe', 0))).quantize(TWOPLACES)
            marge = Decimal(str(data.get('marge', 0))).quantize(TWOPLACES)

            # Déterminer si on doit calculer le prix ou utiliser le prix saisi manuellement
            # Mode manuel : si les coûts sont à 0 et qu'un prix est fourni
            prix_manuel = data.get('prix')
            has_couts = cout_main_oeuvre > 0 or cout_materiel > 0
            
            if has_couts:
                # Mode calcul automatique : recalculer le prix
                base = (cout_main_oeuvre + cout_materiel).quantize(TWOPLACES)
                montant_taux_fixe = (base * (taux_fixe / Decimal('100'))).quantize(TWOPLACES)
                sous_total = (base + montant_taux_fixe).quantize(TWOPLACES)
                montant_marge = (sous_total * (marge / Decimal('100'))).quantize(TWOPLACES)
                prix = (sous_total + montant_marge).quantize(TWOPLACES)
                data['prix'] = prix
            elif prix_manuel:
                # Mode saisie manuelle : utiliser le prix fourni
                data['prix'] = Decimal(str(prix_manuel)).quantize(TWOPLACES)
            else:
                # Aucun prix ni coûts : garder le prix existant
                data['prix'] = instance.prix

            serializer = self.get_serializer(instance, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [AllowAny]

class AgentViewSet(viewsets.ModelViewSet):
    queryset = Agent.objects.all()
    serializer_class = AgentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """Filtrer les agents selon leur statut d'effectif et la période"""
        queryset = Agent.objects.all()
        
        # Paramètres pour la logique temporelle
        week = self.request.query_params.get('week')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        year_param = self.request.query_params.get('year')
        
        # Paramètre pour récupérer tous les agents (actifs et inactifs)
        # Utile pour la logique temporelle côté frontend
        include_inactive = self.request.query_params.get('include_inactive', 'false').lower() == 'true'
        
        # Si on demande tous les agents (actifs et inactifs), les retourner sans filtre
        if include_inactive:
            return queryset
        
        # Si on a des paramètres de période, appliquer la logique temporelle
        if week and year:
            from datetime import datetime
            import calendar
            
            # Convertir semaine/année en date de début de semaine
            try:
                # Utiliser dayjs-like logic pour calculer le début de semaine
                year_int = int(year)
                week_int = int(week)
                
                # Calculer le premier jour de l'année
                jan_1 = datetime(year_int, 1, 1)
                # Trouver le premier lundi de l'année
                first_monday = jan_1 + timedelta(days=(7 - jan_1.weekday()) % 7)
                # Calculer le début de la semaine demandée
                week_start = first_monday + timedelta(weeks=week_int - 1)
                
                # Filtrer : agent actif OU désactivé après le début de la semaine
                queryset = queryset.filter(
                    Q(is_active=True) | 
                    Q(date_desactivation__gt=week_start)
                )
            except (ValueError, TypeError):
                # En cas d'erreur de conversion, retourner tous les agents actifs
                queryset = queryset.filter(is_active=True)
                
        elif month and year_param:
            # Pour les rapports mensuels
            try:
                year_int = int(year_param)
                month_int = int(month)
                month_start = datetime(year_int, month_int, 1)
                
                # Filtrer : agent actif OU désactivé après le début du mois
                queryset = queryset.filter(
                    Q(is_active=True) | 
                    Q(date_desactivation__gt=month_start)
                )
            except (ValueError, TypeError):
                queryset = queryset.filter(is_active=True)
        else:
            # Par défaut, ne montrer que les agents actifs
            queryset = queryset.filter(is_active=True)
            
        return queryset

    @action(detail=True, methods=['post'])
    def desactiver(self, request, pk=None):
        """Désactiver un agent (le retirer de l'effectif)"""
        agent = self.get_object()
        date_desactivation = request.data.get('date_desactivation')
        
        if not date_desactivation:
            return Response(
                {'error': 'La date de désactivation est requise'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            agent.is_active = False
            agent.date_desactivation = date_desactivation
            agent.save()
            
            return Response({
                'message': f'Agent {agent.name} {agent.surname} retiré de l\'effectif',
                'agent': {
                    'id': agent.id,
                    'name': agent.name,
                    'surname': agent.surname,
                    'is_active': agent.is_active,
                    'date_desactivation': agent.date_desactivation
                }
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la désactivation: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def reactiver(self, request, pk=None):
        """Réactiver un agent (le remettre dans l'effectif)"""
        # Récupérer l'agent directement depuis la base de données, 
        # sans passer par get_queryset() qui filtre les agents inactifs
        try:
            agent = Agent.objects.get(pk=pk)
        except Agent.DoesNotExist:
            return Response(
                {'error': 'Agent non trouvé'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            agent.is_active = True
            agent.date_desactivation = None
            agent.save()
            
            return Response({
                'message': f'Agent {agent.name} {agent.surname} remis dans l\'effectif',
                'agent': {
                    'id': agent.id,
                    'name': agent.name,
                    'surname': agent.surname,
                    'is_active': agent.is_active,
                    'date_desactivation': agent.date_desactivation
                }
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la réactivation: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def inactifs(self, request):
        """Récupérer la liste des agents inactifs"""
        queryset = Agent.objects.filter(is_active=False).order_by('-date_desactivation')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            agent = serializer.save()
            # Vous pouvez ajouter une logique pour gérer les heures de travail ici
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def perform_update(self, serializer):
        agent = serializer.save()
        current_date = datetime.now()
        year = current_date.year
        month = current_date.month
        monthly_hours = self.calculate_monthly_hours(agent, year, month)
        month_start = current_date.replace(day=1)  # Premier jour du mois courant
        MonthlyHours.objects.update_or_create(
            agent=agent,
            month=month_start,
            defaults={'hours': monthly_hours}
        )

    def calculate_monthly_hours(self, agent, year, month, holidays=[]):
        daily_hours = self.calculate_daily_hours(agent.heure_debut, agent.heure_fin, agent.heure_pause_debut, agent.heure_pause_fin)
        
        jours_mapping = {
            'lundi': 'Monday',
            'mardi': 'Tuesday',
            'mercredi': 'Wednesday',
            'jeudi': 'Thursday',
            'vendredi': 'Friday',
            'samedi': 'Saturday',
            'dimanche': 'Sunday'
        }
        
        jours_travail = [j.strip() for j in agent.jours_travail.split(',')]
        jours_travail_indices = [list(calendar.day_name).index(jours_mapping[jour.lower()]) for jour in jours_travail]

        num_days = calendar.monthrange(year, month)[1]

        # Calculer les jours travaillés
        days_worked = sum(
            1 for day in range(1, num_days + 1)
            if datetime(year, month, day).weekday() in jours_travail_indices and datetime(year, month, day) not in holidays
        )

        # Récupérer les événements pour l'agent et le mois
        events = Event.objects.filter(agent=agent, start_date__year=year, start_date__month=month)

        # Accumulateur pour les heures modifiées
        total_hours_modified = sum(event.hours_modified for event in events if event.status == 'M')

        # Appliquer les règles d'impact des événements
        for event in events:
            if event.status == 'A':
                days_worked -= 1
            elif event.status == 'C':
                if event.start_date.weekday() in jours_travail_indices:
                    agent.conge -= 1

        # Calculer les heures mensuelles
        monthly_hours = (daily_hours * days_worked) + total_hours_modified


        return monthly_hours

    
    def calculate_daily_hours(self, heure_debut, heure_fin, heure_pause_debut, heure_pause_fin):
        if heure_debut and heure_fin:
            start = datetime.combine(datetime.today(), heure_debut)
            end = datetime.combine(datetime.today(), heure_fin)
            daily_hours = (end - start).total_seconds() / 3600  # Convertir en heures

            if heure_pause_debut and heure_pause_fin:
                pause_start = datetime.combine(datetime.today(), heure_pause_debut)
                pause_end = datetime.combine(datetime.today(), heure_pause_fin)
                pause_duration = (pause_end - pause_start).total_seconds() / 3600  # Convertir en heures
                daily_hours -= pause_duration

            return max(0, daily_hours)  # S'assurer que le résultat n'est pas négatif
        return 0

    def get_hours_modified(self, agent_id):
        current_year = now().year
        events = Event.objects.filter(agent_id=agent_id, start_date__year=current_year)
        hours_modified = (
            events
            .annotate(month=TruncMonth('start_date'))
            .values('month')
            .annotate(total_hours=Sum('hours_modified'))
            .order_by('month')
        )
        return list(hours_modified)

    def get_days_worked_in_month(self, agent):
        try:
            # Liste des jours en anglais dans l'ordre (lundi à dimanche)
            english_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            
            # Dictionnaire de correspondance français -> anglais
            fr_to_en = {
                'Lundi': 'Monday',
                'Mardi': 'Tuesday',
                'Mercredi': 'Wednesday',
                'Jeudi': 'Thursday',
                'Vendredi': 'Friday',
                'Samedi': 'Saturday',
                'Dimanche': 'Sunday'
            }
            
            jours_travail = [j.strip() for j in agent.jours_travail.split(',')]
            # Obtenir les indices (0 pour Lundi, 1 pour Mardi, etc.)
            jours_travail_indices = [english_days.index(fr_to_en[jour.strip().capitalize()]) for jour in jours_travail]
            
            return jours_travail_indices
            
        except Exception as e:
            return []

    def retrieve(self, request, *args, **kwargs):
        agent = self.get_object()
        days_worked = self.get_days_worked_in_month(agent)
        
        serializer = self.get_serializer(agent)
        data = serializer.data
        data['days_worked'] = days_worked
        
        return Response(data)
    
@api_view(['DELETE'])
def delete_events_by_agent_and_period(request):
    agent_id = request.query_params.get('agent')
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')

    logger.info(f"Received request to delete events for agent {agent_id} from {start_date_str} to {end_date_str}")

    if not agent_id or not start_date_str or not end_date_str:
        logger.error("Missing required parameters")
        return Response({'error': 'Paramètres manquants.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError as e:
        logger.error(f'Erreur de format de date: {str(e)}')
        return Response({'error': f'Erreur de format de date: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Récupérer tous les événements dans la période (y compris ceux qui couvrent plusieurs jours)
        events = Event.objects.filter(
            agent_id=agent_id,
            start_date__lte=end_date,
            end_date__gte=start_date
        )
        
        # Pour chaque événement, supprimer les assignations associées si c'est un événement école
        for event in events:
            if event.event_type == 'ecole':
                logger.info(f'Deleting école assignments for agent {agent_id} from {event.start_date} to {event.end_date}')
                # Importer la fonction de suppression
                from api.ecole_utils import delete_ecole_assignments
                delete_ecole_assignments(agent_id, event.start_date, event.end_date)
                
                # Recalculer les dépenses après suppression
                from api.ecole_utils import create_ecole_expense_for_agent
                current_date = event.start_date
                while current_date <= event.end_date:
                    month = current_date.month
                    year = current_date.year
                    create_ecole_expense_for_agent(agent_id, month, year)
                    
                    # Passer au mois suivant
                    if current_date.month == 12:
                        current_date = date(current_date.year + 1, 1, 1)
                    else:
                        current_date = date(current_date.year, current_date.month + 1, 1)
        
        # Supprimer les événements
        events_count = events.count()
        if events_count > 0:
            logger.info(f'Deleting {events_count} events for agent {agent_id}')
            events.delete()

        logger.info("Events deleted successfully")
        return Response({'message': 'Événements supprimés avec succès.'}, status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        logger.exception(f'Erreur lors de la suppression des événements: {str(e)}')
        return Response({'error': f'Erreur interne du serveur: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def get_agents_with_work_days(request):
    agents = Agent.objects.all()
    agents_data = [
        {
            'id': agent.id,
            'name': f"{agent.name} {agent.surname}",
            'jours_travail': agent.jours_travail if agent.jours_travail else "lundi, mardi, mercredi, jeudi, vendredi"
        }
        for agent in agents
    ]
    return JsonResponse(agents_data, safe=False)

@api_view(['POST'])
def update_days_present(request):
    agent_id = request.data.get('agent_id')
    month = request.data.get('month')

    if not agent_id or not month:
        return Response({'error': 'Agent ID and month are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Convertir le mois en date
        month_date = datetime.strptime(month, '%Y-%m-%d').replace(day=1)
        agent = Agent.objects.get(id=agent_id)

        # Calculer les jours travaillés
        current_year = month_date.year
        current_month = month_date.month
        days_worked = AgentViewSet().calculate_monthly_hours(agent, current_year, current_month)

        # Mettre à jour ou créer l'enregistrement MonthlyPresence
        presence, created = MonthlyPresence.objects.update_or_create(
            agent_id=agent_id,
            month=month_date,
            defaults={'days_present': days_worked}
        )

        return Response({'success': 'Days present updated successfully.'}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PresenceViewSet(viewsets.ModelViewSet):
    queryset = Presence.objects.all()
    serializer_class = PresenceSerializer

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        agent_id = self.request.query_params.get('agent_id', None)
        if agent_id is not None:
            queryset = queryset.filter(agent_id=agent_id)
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(start_date__gte=start_date, start_date__lte=end_date)
        return queryset

class StockViewSet(viewsets.ModelViewSet):
    serializer_class = StockSerializer
    
    def get_queryset(self):
        queryset = Stock.objects.all()
        
        # Tri naturel par code produit
        queryset = queryset.extra(
            select={
                'code_numeric': """
                    CASE 
                        WHEN code_produit ~ '^[0-9]+$' 
                        THEN CAST(code_produit AS INTEGER)
                        ELSE 999999 
                    END
                """
            }
        ).order_by('code_numeric', 'code_produit')
        
        return queryset

    # Action personnalisée pour ajouter du stock
    @action(detail=True, methods=['post'])
    def add_stock(self, request, pk=None):
        stock = self.get_object()
        quantite = request.data.get('quantite')
        chantier_id = request.data.get('chantier_id')  # Récupérer l'ID du chantier
        agent_id = request.data.get('agent_id')  # Récupérer l'ID de l'agent


        if not quantite or int(quantite) <= 0:
            return Response({"error": "Quantité invalide"}, status=status.HTTP_400_BAD_REQUEST)

        # Mise à jour de la quantité disponible
        stock.quantite_disponible += int(quantite)
        stock.save()

        # Enregistrer l'historique de l'ajout de stock
        chantier = get_object_or_404(Chantier, id=chantier_id) if chantier_id else None
        agent = get_object_or_404(Agent, id=agent_id) if agent_id else None
        self.enregistrer_historique_stock(stock, quantite, 'ajout', chantier, agent)

        return Response({"message": "Stock ajouté avec succès"}, status=status.HTTP_200_OK)

    # Action personnalisée pour retirer du stock
    @action(detail=True, methods=['post'])
    def remove_stock(self, request, pk=None):
        stock = self.get_object()
        quantite = request.data.get('quantite', 0)
        chantier_id = request.data.get('chantier_id')  # Récupère correctement l'ID du chantier
        agent_id = request.data.get('agent_id')  # Récupère correctement l'ID de l'agent

        if not quantite or int(quantite) <= 0 or stock.quantite_disponible < int(quantite):
            return Response({"error": "Quantité insuffisante ou invalide"}, status=status.HTTP_400_BAD_REQUEST)

        # Récupérer l'objet Chantier
        chantier = get_object_or_404(Chantier, id=chantier_id) if chantier_id else None
        
        # Récupérer l'objet Agent
        agent = get_object_or_404(Agent, id=agent_id) if agent_id else None

        # Mise à jour des quantités après retrait
        stock.quantite_disponible -= int(quantite)
        stock.save()

        # Enregistrer le mouvement dans une table de log des mouvements
        StockMovement.objects.create(stock=stock, quantite=int(quantite), chantier=chantier, agent=agent, mouvement_type='sortie')

        # Enregistrer dans l'historique du stock
        self.enregistrer_historique_stock(stock, quantite, 'retrait', chantier, agent)

        return Response({"message": "Stock retiré avec succès"}, status=status.HTTP_200_OK)
    # Méthode pour enregistrer les modifications dans StockHistory
    def enregistrer_historique_stock(self, produit, quantite, type_operation, chantier, agent):
        montant = produit.prix_unitaire * abs(int(quantite))

        # Log pour s'assurer que chantier et agent ne sont pas None

        StockHistory.objects.create(
            stock=produit,
            quantite=quantite,
            type_operation=type_operation,
            chantier=chantier,  # L'objet Chantier doit être passé ici, pas un ID
            agent=agent,        # L'objet Agent doit être passé ici, pas un ID
            montant=montant
        )

    @api_view(['POST'])
    def create_stock(request):
        if request.method == 'POST':
            serializer = StockSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer

@api_view(['GET'])
def historique_stock(request):
    historique = StockHistory.objects.all().order_by('-date_operation')
    serializer = StockHistorySerializer(historique, many=True)
    return Response(serializer.data)

class StockHistoryPagination(PageNumberPagination):
    page_size = 10  # Nombre d'éléments par page
    page_size_query_param = 'page_size'
    max_page_size = 100
@api_view(['GET'])
def historique_stock(request):
    # Filtres optionnels pour type d'opération et dates
    type_operation = request.GET.get('type', None)
    start_date = request.GET.get('startDate', None)
    end_date = request.GET.get('endDate', None)

    historique = StockHistory.objects.all().order_by('-date_operation')

    # Appliquer les filtres si présents
    if type_operation:
        historique = historique.filter(type_operation=type_operation)
    if start_date:
        historique = historique.filter(date_operation__gte=start_date)
    if end_date:
        historique = historique.filter(date_operation__lte=end_date)

    # Pagination de l'historique
    paginator = StockHistoryPagination()
    result_page = paginator.paginate_queryset(historique, request)
    serializer = StockHistorySerializer(result_page, many=True)
    
    return paginator.get_paginated_response(serializer.data)

@api_view(['GET'])
def get_latest_code_produit(request):
    # Récupérer le fournisseur depuis les paramètres
    fournisseur_id = request.query_params.get('fournisseur_id')
    
    if fournisseur_id:
        # Si un fournisseur est spécifié, récupérer le dernier code pour ce fournisseur
        last_stock = Stock.objects.filter(fournisseur_id=fournisseur_id).order_by('-id').first()
    else:
        # Sinon, récupérer le dernier code global (pour compatibilité)
        last_stock = Stock.objects.order_by('-id').first()
    
    last_code = last_stock.code_produit if last_stock else '0'
    return Response({'last_code_produit': last_code})

@api_view(['POST'])
def create_event(request):
    serializer = EventSerializer(data=request.data)
    if serializer.is_valid():
        event = serializer.save()
        
        # Recalculer les heures mensuelles après la création de l'événement
        agent = event.agent
        year = event.start_date.year
        month = event.start_date.month
        AgentViewSet().calculate_monthly_hours(agent, year, month)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def recalculate_monthly_hours(request):
    agent_id = request.data.get('agent_id')
    month_str = request.data.get('month')

    if not agent_id or not month_str:
        return Response({'error': 'Agent ID and month are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        month_date = datetime.strptime(month_str, '%Y-%m-%d').replace(day=1)
        agent = Agent.objects.get(id=agent_id)
        year = month_date.year
        month = month_date.month

        # Recalculer les heures mensuelles
        monthly_hours = AgentViewSet().calculate_monthly_hours(agent, year, month)

        # Mettre à jour ou créer l'enregistrement MonthlyHours
        MonthlyHours.objects.update_or_create(
            agent=agent,
            month=month_date,
            defaults={'hours': monthly_hours}
        )

        return Response({'success': 'Monthly hours recalculated successfully.'}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def assign_chantier(request):
    """
    Assigne un chantier aux cellules sélectionnées.
    Attendu : Liste d'objets contenant agentId, week, year, day, hour, chantierId
    """
    updates = request.data  # Directement la liste envoyée
    logger.debug(f"Données reçues pour assign_chantier: {updates}")

    if not isinstance(updates, list):
        logger.error("Les données reçues ne sont pas une liste.")
        return Response({'error': 'Les données doivent être une liste d\'objets.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            for index, update in enumerate(updates):
                # Vérifiez que chaque mise à jour est un dictionnaire
                if not isinstance(update, dict):
                    logger.error(f"L'élément à l'index {index} n'est pas un objet.")
                    return Response({'error': 'Chaque mise à jour doit être un objet.'}, status=status.HTTP_400_BAD_REQUEST)

                agent_id = update.get('agentId')
                week = update.get('week')
                year = update.get('year')
                day = update.get('day')
                hour_str = update.get('hour')
                chantier_id = update.get('chantierId')
                is_sav = update.get('isSav', False)  # Par défaut False si non fourni
                overtime_hours = update.get('overtimeHours', 0)  # Par défaut 0 si non fourni

                # Validation des données
                if not all([agent_id, week, year, day, hour_str, chantier_id]):
                    logger.error(f"Champ manquant dans la mise à jour à l'index {index}.")
                    return Response({'error': 'Tous les champs sont requis pour chaque mise à jour.'}, status=status.HTTP_400_BAD_REQUEST)

                # Vérifier d'abord si c'est un agent journalier
                try:
                    agent = Agent.objects.get(id=agent_id)
                except Agent.DoesNotExist:
                    logger.error(f"Agent avec id {agent_id} n'existe pas à l'index {index}.")
                    return Response({'error': f'Agent avec id {agent_id} n\'existe pas.'}, status=status.HTTP_400_BAD_REQUEST)

                # Pour les agents journaliers, hour_str peut être "Matin" ou "Après-midi"
                # Pour les agents horaires, hour_str doit être au format "HH:MM"
                if agent.type_paiement == 'journalier':
                    if hour_str not in ['Matin', 'Après-midi']:
                        logger.error(f"Heure invalide pour agent journalier: '{hour_str}' à l'index {index}.")
                        return Response({'error': f'Pour un agent journalier, l\'heure doit être "Matin" ou "Après-midi", reçu: {hour_str}.'}, status=status.HTTP_400_BAD_REQUEST)
                    hour = hour_str  # Garder "Matin" ou "Après-midi" tel quel
                else:
                    try:
                        # Convertir l'heure au format TimeField pour agents horaires
                        datetime.strptime(hour_str, '%H:%M').time()  # Validation seulement
                        hour = hour_str  # Garder le format string "HH:MM"
                    except ValueError:
                        logger.error(f"Format d'heure invalide pour '{hour_str}' à l'index {index}.")
                        return Response({'error': f'Format d\'heure invalide pour {hour_str}.'}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    chantier = Chantier.objects.get(id=chantier_id)
                except Chantier.DoesNotExist:
                    logger.error(f"Chantier avec id {chantier_id} n'existe pas à l'index {index}.")
                    return Response({'error': f'Chantier avec id {chantier_id} n\'existe pas.'}, status=status.HTTP_400_BAD_REQUEST)

                # Supprimer d'abord toute assignation existante pour cette plage horaire
                existing_schedules = Schedule.objects.filter(
                    agent=agent,
                    week=week,
                    year=year,
                    day=day,
                    hour=hour
                )
                
                if existing_schedules.exists():
                    existing_schedules.delete()

                # Créer la nouvelle assignation
                schedule = Schedule.objects.create(
                    agent=agent,
                    week=week,
                    year=year,
                    day=day,
                    hour=hour,
                    chantier=chantier,
                    is_sav=is_sav,
                    overtime_hours=overtime_hours
                )

        logger.info("Chantiers assignés avec succès.")
        # À la fin, déclenche le recalcul pour la semaine/année concernée
        week = request.data[0]['week'] if isinstance(request.data, list) else request.data['week']
        year = request.data[0]['year'] if isinstance(request.data, list) else request.data['year']
        return Response({"status": "ok"})

    except Exception as e:
        logger.exception("Erreur imprévue lors de l'assignation du chantier.")
        return Response({'error': 'Une erreur imprévue est survenue.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_schedule(request):
    """
    Récupérer le planning d'un agent pour une semaine et une année données.
    """
    agent_id = request.GET.get('agent')
    week = request.GET.get('week')
    year = request.GET.get('year')  # Récupérer le paramètre année

    if not agent_id or not week or not year:
        return Response({'error': 'Paramètres "agent", "week" et "year" requis.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        schedules = Schedule.objects.filter(agent_id=agent_id, week=week, year=year)
        serializer = ScheduleSerializer(schedules, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Schedule.DoesNotExist:
        return Response({'error': 'Planification non trouvée.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du planning: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST']) # Restriction aux administrateurs si nécessaire
def copy_schedule(request):
    source_agent_id = request.data.get('sourceAgentId')
    target_agent_id = request.data.get('targetAgentId')
    source_week = request.data.get('sourceWeek')
    target_week = request.data.get('targetWeek')
    source_year = request.data.get('sourceYear')
    target_year = request.data.get('targetYear')

    if not all([source_agent_id, target_agent_id, source_week, target_week, source_year, target_year]):
        return Response({'error': 'Tous les paramètres sont requis.'}, status=400)

    try:
        # Vérifier l'existence des agents et récupérer leurs types
        try:
            source_agent = Agent.objects.get(id=source_agent_id)
            target_agent = Agent.objects.get(id=target_agent_id)
        except Agent.DoesNotExist:
            return Response({'error': 'Agent source ou cible invalide.'}, status=400)
        
        # Vérifier la compatibilité des types d'agents
        if source_agent.type_paiement != target_agent.type_paiement:
            source_type = "journalier" if source_agent.type_paiement == "journalier" else "horaire"
            target_type = "journalier" if target_agent.type_paiement == "journalier" else "horaire"
            return Response({
                'error': f'Impossible de copier le planning entre agents de types différents.\n'
                         f'Agent source: {source_type} - Agent cible: {target_type}\n'
                         f'Veuillez sélectionner un agent du même type de paiement.'
            }, status=400)

        # Récupérer le planning de l'agent source pour la semaine et l'année spécifiées
        source_schedules = Schedule.objects.filter(
            agent_id=source_agent_id,
            week=source_week,
            year=source_year
        )
        
        if not source_schedules.exists():
            return Response({'error': 'Aucun planning trouvé pour l\'agent source à la semaine et l\'année spécifiées.'}, status=404)

        # Vérifier si un planning existe déjà pour l'agent cible à la semaine et l'année cibles
        existing_target_schedules = Schedule.objects.filter(
            agent_id=target_agent_id,
            week=target_week,
            year=target_year
        )
        if existing_target_schedules.exists():
            return Response({'error': 'Un planning existe déjà pour l\'agent cible à la semaine et l\'année spécifiées.'}, status=400)

        # Utiliser une transaction atomique pour garantir la cohérence des données
        with transaction.atomic():
            # Copier les plannings vers l'agent cible avec la nouvelle semaine et année
            copied_schedules = []
            for schedule in source_schedules:
                new_schedule = Schedule(
                    agent_id=target_agent_id,
                    week=target_week,
                    year=target_year,
                    hour=schedule.hour,
                    day=schedule.day,
                    chantier_id=schedule.chantier_id
                )
                copied_schedules.append(new_schedule)
            Schedule.objects.bulk_create(copied_schedules)

            # --- Synchronisation LaborCost ---
            # 1. Supprimer les LaborCost existants pour l'agent cible, semaine/année cible
            LaborCost.objects.filter(
                agent_id=target_agent_id,
                week=target_week,
                year=target_year
            ).delete()

            # 2. Recréer les LaborCost à partir des nouveaux Schedule
            from collections import defaultdict
            agent = Agent.objects.get(id=target_agent_id)
            schedules = Schedule.objects.filter(
                agent_id=target_agent_id,
                week=target_week,
                year=target_year
            )
            chantier_hours = defaultdict(int)
            for s in schedules:
                if s.chantier_id:
                    chantier_hours[s.chantier_id] += 1  # 1h par créneau
            labor_costs = []
            for chantier_id, hours in chantier_hours.items():
                labor_costs.append(LaborCost(
                    agent_id=target_agent_id,
                    chantier_id=chantier_id,
                    week=target_week,
                    year=target_year,
                    hours_normal=hours,  # Toutes les heures sont considérées comme normales par défaut
                    cost_normal=hours * (agent.taux_journalier / 8 if agent.type_paiement == 'journalier' else agent.taux_Horaire or 0)
                ))
            LaborCost.objects.bulk_create(labor_costs)

        # MAJ coût main d'oeuvre pour chaque chantier concerné
        chantiers_concernes = set([c.chantier for c in copied_schedules])
        for chantier in chantiers_concernes:
            update_chantier_cout_main_oeuvre(chantier)

        return Response({'message': 'Planning copié avec succès.'}, status=200)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def delete_schedule(request):
    """
    Supprime les horaires spécifiés.
    Attendu : Liste d'objets contenant agentId, week, year, day, hour
    """
    deletions = request.data  # Liste d'objets

    logger.debug(f"Données reçues pour delete_schedule: {deletions}")

    if not isinstance(deletions, list):
        logger.error("Les données reçues ne sont pas une liste.")
        return Response({'error': 'Les données doivent être une liste d\'objets.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Importer les fonctions de recalcul école
        from api.ecole_utils import get_or_create_ecole_chantier, create_ecole_expense_for_agent
        
        # Garder trace des agents concernés et des mois à recalculer
        agents_to_recalculate = set()
        months_to_recalculate = {}  # {agent_id: [(month, year), ...]}
        
        with transaction.atomic():
            for index, deletion in enumerate(deletions):
                # Vérifiez que chaque mise à jour est un dictionnaire
                if not isinstance(deletion, dict):
                    logger.error(f"L'élément à l'index {index} n'est pas un objet.")
                    return Response({'error': 'Chaque mise à jour doit être un objet.'}, status=status.HTTP_400_BAD_REQUEST)

                agent_id = deletion.get('agentId')
                week = deletion.get('week')
                year = deletion.get('year')
                day = deletion.get('day')
                hour_str = deletion.get('hour')

                # Validation des données nécessaires
                if not all([agent_id, week, year, day, hour_str]):
                    logger.error(f"Données manquantes dans l'élément à l'index {index}: {deletion}")
                    return Response({'error': f'Données manquantes dans l\'élément à l\'index {index}.'}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    agent = Agent.objects.get(id=agent_id)
                except Agent.DoesNotExist:
                    logger.error(f"Agent avec id {agent_id} n'existe pas à l'index {index}.")
                    return Response({'error': f'Agent avec id {agent_id} n\'existe pas.'}, status=status.HTTP_400_BAD_REQUEST)

                # Gérer les formats d'heure selon le type d'agent
                if agent.type_paiement == 'journalier':
                    # Pour les agents journaliers, l'heure est "Matin" ou "Après-midi"
                    if hour_str not in ['Matin', 'Après-midi']:
                        logger.error(f"Format d'heure invalide pour agent journalier à l'index {index}: {hour_str}")
                        return Response({'error': f'Pour un agent journalier, l\'heure doit être "Matin" ou "Après-midi".'}, status=status.HTTP_400_BAD_REQUEST)
                    hour = hour_str
                else:
                    # Pour les agents horaires, garder le format string
                    hour = hour_str

                # Récupérer l'objet Schedule correspondant
                try:
                    schedule = Schedule.objects.get(
                        agent=agent,
                        week=week,
                        year=year,
                        day=day,
                        hour=hour
                    )
                    
                    # Vérifier si c'est une assignation école
                    ecole_chantier = get_or_create_ecole_chantier()
                    if schedule.chantier_id == ecole_chantier.id:
                        # Calculer le mois à partir de la semaine ISO
                        from datetime import datetime
                        # Obtenir le premier jour de la semaine ISO
                        first_day = datetime.strptime(f'{year}-W{int(week):02d}-1', "%Y-W%W-%w")
                        month = first_day.month
                        
                        # Marquer cet agent et ce mois pour recalcul
                        if agent_id not in months_to_recalculate:
                            months_to_recalculate[agent_id] = set()
                        months_to_recalculate[agent_id].add((month, year))
                        
                        logger.info(f"Suppression d'une assignation école pour l'agent {agent_id}, semaine {week}/{year}")
                    
                    schedule.delete()
                except Schedule.DoesNotExist:
                    logger.warning(f"Schedule inexistant à l'index {index}: {deletion}")
                    continue
        
        # Recalculer les dépenses école pour les agents concernés
        for agent_id, months in months_to_recalculate.items():
            for month, year in months:
                try:
                    create_ecole_expense_for_agent(agent_id, month, year)
                    logger.info(f"✅ Dépenses école recalculées pour l'agent {agent_id} - {month:02d}/{year}")
                except Exception as e:
                    logger.error(f"❌ Erreur lors du recalcul des dépenses école pour l'agent {agent_id}: {e}")

        logger.info("Horaires supprimés avec succès.")
        return Response({'message': 'Horaires supprimés avec succès.'}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception("Erreur imprévue lors de la suppression des horaires.")
        return Response({'error': 'Une erreur imprévue est survenue.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def save_labor_costs(request):
    import logging
    logger = logging.getLogger(__name__)
    try:
        agent_id = request.data.get('agent_id')
        week = request.data.get('week')
        year = request.data.get('year')
        costs = request.data.get('costs', [])

        agent = Agent.objects.get(id=agent_id)
        # Définir days_of_week et fr_holidays pour tous les types d'agents
        days_of_week = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        fr_holidays = holidays.country_holidays('FR', years=[int(year)])
        
        if agent.type_paiement == 'journalier':
            taux_horaire = (agent.taux_journalier or 0) / 8  # Convertir taux journalier en taux horaire
        else:
            taux_horaire = agent.taux_Horaire or 0

        for cost_entry in costs:
            chantier_name = cost_entry['chantier_name']
            chantier = Chantier.objects.get(chantier_name=chantier_name)
            schedule = request.data.get('schedule', {})  # On suppose que le planning complet est envoyé

            # Si pas de planning détaillé, utiliser le champ hours
            if not schedule:
                hours_sent = cost_entry.get('hours', 0)
                
                if agent.type_paiement == 'journalier':
                    # Pour un agent journalier : convertir les heures reçues en jours puis en heures d'affichage
                    # Le frontend envoie 4h par créneau (Matin/Après-midi), donc 8h = 1 jour
                    jours_travailles = hours_sent / 8  # 8h = 1 jour
                    hours_normal = jours_travailles * 8  # Affichage en heures (8h par jour)
                else:
                    # Pour un agent horaire : utiliser directement les heures
                    hours_normal = hours_sent
                    
                hours_samedi = 0
                hours_dimanche = 0
                hours_ferie = 0
                details_majoration = []
            else:
                # Initialisation des compteurs
                hours_normal = 0
                hours_samedi = 0
                hours_dimanche = 0
                hours_ferie = 0
                details_majoration = []

                # Parcours du planning pour ce chantier
                for hour, day_data in schedule.items():
                    for day, chantier_nom in day_data.items():
                        # Gérer le nouveau format d'objet et l'ancien format de chaîne
                        if isinstance(chantier_nom, dict) and 'chantierName' in chantier_nom:
                            actual_chantier_name = chantier_nom['chantierName']
                        else:
                            actual_chantier_name = chantier_nom
                        
                        if actual_chantier_name != chantier_name:
                            continue
                        day_index = days_of_week.index(day)
                        lundi = datetime.strptime(f'{year}-W{int(week):02d}-1', "%Y-W%W-%w")
                        date_creneau = lundi + timedelta(days=day_index)
                        date_str = date_creneau.strftime("%Y-%m-%d")

                        if agent.type_paiement == 'journalier':
                            # Pour les agents journaliers : toujours taux normal, peu importe le jour
                            hours_normal += 4  # Matin ou Après-midi = 4 heures
                        else:
                            # Pour les agents horaires : appliquer les majorations
                            if date_creneau in fr_holidays:
                                hours_ferie += 1
                                details_majoration.append({
                                    "date": date_str,
                                    "type": "ferie",
                                    "hours": 1,
                                    "taux": 1.5
                                })
                            elif day == "Samedi":
                                hours_samedi += 1
                                details_majoration.append({
                                    "date": date_str,
                                    "type": "samedi",
                                    "hours": 1,
                                    "taux": 1.25
                                })
                            elif day == "Dimanche":
                                hours_dimanche += 1
                                details_majoration.append({
                                    "date": date_str,
                                    "type": "dimanche",
                                    "hours": 1,
                                    "taux": 1.5
                                })
                            else:
                                hours_normal += 1

            if agent.type_paiement == 'journalier':
                # Pour un agent journalier : calculer le coût basé sur les jours travaillés
                jours_travailles = hours_normal / 8  # Convertir les heures d'affichage en jours
                cost_normal = jours_travailles * (agent.taux_journalier or 0)
                # Pour les majorations, utiliser le taux horaire équivalent
                taux_horaire_equiv = (agent.taux_journalier or 0) / 8
                cost_samedi = hours_samedi * taux_horaire_equiv * 1.25
                cost_dimanche = hours_dimanche * taux_horaire_equiv * 1.5
                cost_ferie = hours_ferie * taux_horaire_equiv * 1.5
            else:
                # Pour un agent horaire : utiliser le taux horaire
                cost_normal = hours_normal * taux_horaire
                cost_samedi = hours_samedi * taux_horaire * 1.25
                cost_dimanche = hours_dimanche * taux_horaire * 1.5
                cost_ferie = hours_ferie * taux_horaire * 1.5

            obj, created = LaborCost.objects.update_or_create(
                agent=agent,
                chantier=chantier,
                week=week,
                year=year,
                defaults={
                    "hours_normal": hours_normal,
                    "hours_samedi": hours_samedi,
                    "hours_dimanche": hours_dimanche,
                    "hours_ferie": hours_ferie,
                    "cost_normal": cost_normal,
                    "cost_samedi": cost_samedi,
                    "cost_dimanche": cost_dimanche,
                    "cost_ferie": cost_ferie,
                    "details_majoration": details_majoration,
                }
            )
            logger.info(f"LaborCost {'created' if created else 'updated'}: agent={agent}, chantier={chantier}, week={week}, year={year}, hours_normal={hours_normal}, hours_samedi={hours_samedi}, hours_dimanche={hours_dimanche}, hours_ferie={hours_ferie}")

        return Response({"message": "Coûts sauvegardés avec succès"}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Erreur dans save_labor_costs: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def get_labor_costs(request):
    try:
        week = request.query_params.get('week')
        year = request.query_params.get('year')
        agent_id = request.query_params.get('agent_id')

        queryset = LaborCost.objects.filter(
            week=week,
            year=year
        )

        if agent_id:
            queryset = queryset.filter(agent_id=agent_id)

        costs = queryset.select_related('agent', 'chantier').all()
        
        # Organiser les données par chantier
        results = {}
        for cost in costs:
            chantier_name = cost.chantier.chantier_name
            if chantier_name not in results:
                results[chantier_name] = {
                    'total_hours': 0,
                    'total_cost': 0,
                    'details': []
                }
            
            results[chantier_name]['total_hours'] += float(cost.hours_normal) + float(cost.hours_samedi) + float(cost.hours_dimanche) + float(cost.hours_ferie)
            results[chantier_name]['total_cost'] += float(cost.cost_normal) + float(cost.cost_samedi) + float(cost.cost_dimanche) + float(cost.cost_ferie)
            results[chantier_name]['details'].append({
                'agent_name': cost.agent.name,
                'hours_normal': float(cost.hours_normal),
                'hours_samedi': float(cost.hours_samedi),
                'hours_dimanche': float(cost.hours_dimanche),
                'hours_ferie': float(cost.hours_ferie),
                'cost_normal': float(cost.cost_normal),
                'cost_samedi': float(cost.cost_samedi),
                'cost_dimanche': float(cost.cost_dimanche),
                'cost_ferie': float(cost.cost_ferie),
            })

        return Response(results)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_events(request):
    """
    Récupère les événements en fonction des filtres spécifiés.
    Paramètres :
    - agent_id: ID de l'agent
    - start_date: Date de début (YYYY-MM-DD)
    - end_date: Date de fin (YYYY-MM-DD)
    - status: Statut des événements ("M", "A", "C", etc.)
    """
    try:
        agent_id = request.query_params.get('agent_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        status_param = request.query_params.get('status')

        if not all([start_date, end_date, status_param]):
            return Response({
                'error': 'start_date, end_date et status sont requis.'
            }, status=status.HTTP_400_BAD_REQUEST)

        events = Event.objects.filter(
            date__range=[start_date, end_date],
            status=status_param
        )

        if agent_id:
            events = events.filter(agent_id=agent_id)

        # Sérialisation des événements
        events_data = events.values('chantier', 'chantier_name', 'hours_modified', 'status')

        return Response(events_data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'error': f'Erreur lors de la récupération des événements: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_labor_costs_summary(request):
    try:
        # Récupération des paramètres de filtrage
        agent_id = request.GET.get('agent_id')
        chantier_id = request.GET.get('chantier_id')
        week = request.GET.get('week')
        year = request.GET.get('year')

        # Construction de la requête
        queryset = LaborCost.objects.all()

        # Application des filtres
        if agent_id:
            queryset = queryset.filter(agent_id=agent_id)
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        if week:
            queryset = queryset.filter(week=week)
        if year:
            queryset = queryset.filter(year=year)

        # Calcul des totaux
        summary = queryset.aggregate(
            total_hours_normal=Sum('hours_normal'),
            total_hours_samedi=Sum('hours_samedi'),
            total_hours_dimanche=Sum('hours_dimanche'),
            total_hours_ferie=Sum('hours_ferie'),
            total_cost_normal=Sum('cost_normal'),
            total_cost_samedi=Sum('cost_samedi'),
            total_cost_dimanche=Sum('cost_dimanche'),
            total_cost_ferie=Sum('cost_ferie'),
        )

        return Response(summary)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def create_chantier_from_devis(request):
    devis_id = request.data.get('devis_id')
    try:
        devis = Devis.objects.get(id=devis_id)
        
        # Créer le chantier
        chantier = Chantier.objects.create(
            chantier_name=f"Chantier-{devis.numero}",
            societe=devis.client.first().societe,
            montant_ttc=devis.price_ttc,  # Exemple de calcul TVA
            montant_ht=devis.price_ht,
            state_chantier='En Cours',
            ville=devis.client.first().societe.ville_societe,
            rue=devis.client.first().societe.rue_societe,
            code_postal=devis.client.first().societe.codepostal_societe,
            taux_fixe=TauxFixe.objects.first().valeur
        )
        
        return Response({'message': 'Chantier créé avec succès', 'id': chantier.id})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
def create_devis(request):
    try:
        with transaction.atomic():
            devis_chantier = request.data.get('devis_chantier', False)
            
            # Si c'est un devis de chantier, créer un appel d'offres au lieu d'un chantier
            if devis_chantier:
                # Récupérer l'instance de la société
                societe_id = request.data.get('societe_id')
                try:
                    societe = Societe.objects.get(id=societe_id)
                except Societe.DoesNotExist:
                    return Response({'error': f'Société avec ID {societe_id} non trouvée'}, status=400)
                
                # Créer l'appel d'offres
                appel_offres_data = {
                    'chantier_name': request.data.get('chantier_name', ''),
                    'societe': societe,
                    'montant_ht': Decimal(str(request.data['price_ht'])),
                    'montant_ttc': Decimal(str(request.data['price_ttc'])),
                    'ville': request.data.get('ville', ''),
                    'rue': request.data.get('rue', ''),
                    'code_postal': request.data.get('code_postal', ''),
                    'cout_estime_main_oeuvre': Decimal(str(request.data.get('cout_estime_main_oeuvre', '0'))),
                    'cout_estime_materiel': Decimal(str(request.data.get('cout_estime_materiel', '0'))),
                    'marge_estimee': Decimal(str(request.data.get('marge_estimee', '0'))),
                    'taux_fixe': Decimal(str(request.data.get('taux_fixe', '20'))),
                    'description': request.data.get('description', ''),
                    'statut': 'en_attente'
                }
                
                appel_offres = AppelOffres.objects.create(**appel_offres_data)
                
                # ✅ Vérifier si lignes_display est déjà présent (envoyé par le frontend)
                # Si oui, utiliser directement, sinon filtrer depuis lignes_speciales
                if 'lignes_display' in request.data and request.data['lignes_display']:
                    # Le frontend a déjà séparé les lignes display
                    lignes_display = request.data.get('lignes_display', {})
                    lignes_speciales_filtered = request.data.get('lignes_speciales', {})
                else:
                    # Ancien comportement : séparer les lignes spéciales normales des lignes de type 'display'
                    lignes_speciales_raw = request.data.get('lignes_speciales', {})
                    lignes_speciales_filtered = {
                        'global': [line for line in lignes_speciales_raw.get('global', []) if line.get('type') != 'display'],
                        'parties': {},
                        'sousParties': {}
                    }
                    
                    lignes_display = {
                        'global': [line for line in lignes_speciales_raw.get('global', []) if line.get('type') == 'display'],
                        'parties': {},
                        'sousParties': {}
                    }
                    
                    # Filtrer les lignes spéciales des parties
                    for partie_id, lines in lignes_speciales_raw.get('parties', {}).items():
                        lignes_speciales_filtered['parties'][partie_id] = [line for line in lines if line.get('type') != 'display']
                        lignes_display['parties'][partie_id] = [line for line in lines if line.get('type') == 'display']
                    
                    # Filtrer les lignes spéciales des sous-parties
                    for sous_partie_id, lines in lignes_speciales_raw.get('sousParties', {}).items():
                        lignes_speciales_filtered['sousParties'][sous_partie_id] = [line for line in lines if line.get('type') != 'display']
                        lignes_display['sousParties'][sous_partie_id] = [line for line in lines if line.get('type') == 'display']
                
                # Création du devis lié à l'appel d'offres
                devis_data = {
                    'numero': request.data['numero'],
                    'appel_offres': appel_offres,
                    'price_ht': Decimal(str(request.data['price_ht'])),
                    'price_ttc': Decimal(str(request.data['price_ttc'])),
                    'tva_rate': Decimal(str(request.data.get('tva_rate', '20.00'))),
                    'nature_travaux': request.data.get('nature_travaux', ''),
                    'description': request.data.get('description', ''),
                    'status': 'En attente',
                    'devis_chantier': True,
                    'lignes_speciales': lignes_speciales_filtered,
                    'lignes_display': lignes_display,
                    'parties_metadata': request.data.get('parties_metadata', {}),
                    'cout_estime_main_oeuvre': Decimal(str(request.data.get('cout_estime_main_oeuvre', '0'))),
                    'cout_estime_materiel': Decimal(str(request.data.get('cout_estime_materiel', '0')))
                }
                
                # ✅ Ajouter contact_societe si fourni
                if 'contact_societe' in request.data and request.data['contact_societe']:
                    devis_data['contact_societe_id'] = request.data['contact_societe']
                
                # ✅ Ajouter date_creation si fournie (pour permettre une date personnalisée)
                # Si non fournie, le modèle utilisera auto_now_add=True
                if 'date_creation' in request.data and request.data['date_creation']:
                    from django.utils.dateparse import parse_datetime
                    try:
                        date_creation = parse_datetime(request.data['date_creation'])
                        if date_creation:
                            devis_data['date_creation'] = date_creation
                    except (ValueError, TypeError):
                        # Si la date n'est pas valide, utiliser auto_now_add (date actuelle)
                        pass
            else:
                # ✅ Vérifier si lignes_display est déjà présent (envoyé par le frontend)
                # Si oui, utiliser directement, sinon filtrer depuis lignes_speciales
                if 'lignes_display' in request.data and request.data['lignes_display']:
                    # Le frontend a déjà séparé les lignes display
                    lignes_display = request.data.get('lignes_display', {})
                    lignes_speciales_filtered = request.data.get('lignes_speciales', {})
                else:
                    # Ancien comportement : séparer les lignes spéciales normales des lignes de type 'display'
                    lignes_speciales_raw = request.data.get('lignes_speciales', {})
                    lignes_speciales_filtered = {
                        'global': [line for line in lignes_speciales_raw.get('global', []) if line.get('type') != 'display'],
                        'parties': {},
                        'sousParties': {}
                    }
                    
                    lignes_display = {
                        'global': [line for line in lignes_speciales_raw.get('global', []) if line.get('type') == 'display'],
                        'parties': {},
                        'sousParties': {}
                    }
                    
                    # Filtrer les lignes spéciales des parties
                    for partie_id, lines in lignes_speciales_raw.get('parties', {}).items():
                        lignes_speciales_filtered['parties'][partie_id] = [line for line in lines if line.get('type') != 'display']
                        lignes_display['parties'][partie_id] = [line for line in lines if line.get('type') == 'display']
                    
                    # Filtrer les lignes spéciales des sous-parties
                    for sous_partie_id, lines in lignes_speciales_raw.get('sousParties', {}).items():
                        lignes_speciales_filtered['sousParties'][sous_partie_id] = [line for line in lines if line.get('type') != 'display']
                        lignes_display['sousParties'][sous_partie_id] = [line for line in lines if line.get('type') == 'display']
                
                # Création du devis de base (comme avant)
                devis_data = {
                    'numero': request.data['numero'],
                    'chantier_id': request.data['chantier'],
                    'price_ht': Decimal(str(request.data['price_ht'])),
                    'price_ttc': Decimal(str(request.data['price_ttc'])),
                    'tva_rate': Decimal(str(request.data.get('tva_rate', '20.00'))),
                    'nature_travaux': request.data.get('nature_travaux', ''),
                    'description': request.data.get('description', ''),
                    'status': 'En attente',
                    'devis_chantier': False,
                    'lignes_speciales': lignes_speciales_filtered,
                    'lignes_display': lignes_display,
                    'parties_metadata': request.data.get('parties_metadata', {}),
                    'cout_estime_main_oeuvre': Decimal(str(request.data.get('cout_estime_main_oeuvre', '0'))),
                    'cout_estime_materiel': Decimal(str(request.data.get('cout_estime_materiel', '0')))
                }
                
                # ✅ Ajouter contact_societe si fourni
                if 'contact_societe' in request.data and request.data['contact_societe']:
                    devis_data['contact_societe_id'] = request.data['contact_societe']
                
                # ✅ Ajouter date_creation si fournie (pour permettre une date personnalisée)
                # Si non fournie, le modèle utilisera auto_now_add=True
                if 'date_creation' in request.data and request.data['date_creation']:
                    from django.utils.dateparse import parse_datetime
                    try:
                        date_creation = parse_datetime(request.data['date_creation'])
                        if date_creation:
                            devis_data['date_creation'] = date_creation
                    except (ValueError, TypeError):
                        # Si la date n'est pas valide, utiliser auto_now_add (date actuelle)
                        pass
            
            devis = Devis.objects.create(**devis_data)

            # Associer le(s) client(s) de manière robuste
            # 1) Nettoyer la liste reçue du frontend pour retirer None/valeurs falsy
            client_values = request.data.get('client') or []
            if isinstance(client_values, (list, tuple)):
                client_ids = [c for c in client_values if c]
            else:
                client_ids = [client_values] if client_values else []

            # 2) Si aucun client valide fourni, déduire depuis le chantier/société
            if not client_ids:
                try:
                    if devis.devis_chantier and devis.appel_offres and devis.appel_offres.societe and devis.appel_offres.societe.client_name:
                        client_ids = [devis.appel_offres.societe.client_name.id]
                    elif devis.chantier and devis.chantier.societe and devis.chantier.societe.client_name:
                        client_ids = [devis.chantier.societe.client_name.id]
                except Exception:
                    client_ids = []

            # 3) Associer si on a au moins un id valide
            if client_ids:
                devis.client.set(client_ids)
            
            # Création des lignes de devis
            for ligne in request.data.get('lignes', []):
                # Préparer les données pour la création
                ligne_data = {
                    'devis': devis,
                    'ligne_detail_id': ligne['ligne_detail'],  # ← Corrigé : ligne_detail au lieu de ligne
                    'quantite': Decimal(str(ligne['quantite'])),  # ← Corrigé : quantite au lieu de quantity
                    'prix_unitaire': Decimal(str(ligne['prix_unitaire']))  # ← Corrigé : prix_unitaire au lieu de custom_price
                }
                
                # ✅ Ajouter index_global si présent (pour conserver l'ordre des lignes)
                # Le champ index_global est maintenant dans le modèle DevisLigne
                if 'index_global' in ligne and ligne['index_global'] is not None:
                    try:
                        # index_global peut être décimal (1.101, 1.102, etc.)
                        index_global = float(ligne['index_global'])
                        if index_global >= 0:
                            ligne_data['index_global'] = Decimal(str(index_global))
                    except (ValueError, TypeError):
                        # Si l'index n'est pas valide, utiliser default=0
                        pass
                
                # ✅ Note: Le numero des lignes n'est pas stocké dans DevisLigne
                # Il est géré via parties_metadata.lignesDetails (ordre dans le tableau)
                # Les numéros des lignes sont calculés à l'affichage selon leur position dans parties_metadata
                
                # ✅ Note: total_ht est une propriété calculée (quantite * prix_unitaire)
                # Il est envoyé dans le payload pour vérification mais n'est pas stocké
                # Le backend calcule automatiquement total_ht = quantite * prix_unitaire
                
                DevisLigne.objects.create(**ligne_data)
            
            # Préparer la réponse avec l'ID du devis et de l'appel d'offres si applicable
            response_data = {'id': devis.id}
            if devis_chantier and appel_offres:
                response_data['appel_offres_id'] = appel_offres.id
                response_data['appel_offres_name'] = appel_offres.chantier_name
            
            return Response(response_data, status=201)
            
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def list_devis(request):
    try:
        devis_list = Devis.objects.all().order_by('-date_creation')
        data = []
        
        for devis in devis_list:
            # Récupérer le client via le chantier
            chantier = devis.chantier
            client = chantier.societe.client_name if chantier and chantier.societe else None
            client_name = f"{client.name} {client.surname}" if client else "Client non spécifié"
            
            devis_data = {
                'id': devis.id,
                'numero': devis.numero,
                'chantier_name': devis.chantier.chantier_name,
                'client_name': client_name,
                'date_creation': devis.date_creation,
                'price_ht': float(devis.price_ht),
                'price_ttc': float(devis.price_ttc),
                'status': devis.status,
                'description': devis.description
            }
            data.append(devis_data)
            
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def get_next_devis_number(request):
    try:
        chantier_id = request.GET.get('chantier_id')
        devis_chantier = request.GET.get('devis_chantier') == 'true'
        is_ts = request.GET.get('is_ts') == 'true'
        prefix = request.GET.get('prefix', 'DEV')  # Préfixe personnalisable
        
        print(f"Paramètres reçus - chantier_id: {chantier_id}, devis_chantier: {devis_chantier}, is_ts: {is_ts}")
        
        # Obtenir l'année en cours
        current_year = timezone.now().year
        year_suffix = str(current_year)[-2:]
        
        # Récupérer le dernier devis créé pour l'année courante
        # Chercher d'abord le nouveau format "Devis n°017.2025"
        last_devis_new_format = Devis.objects.filter(
            numero__contains=f".{current_year}"
        ).order_by('-id').first()
        
        # Si pas de devis au nouveau format, chercher l'ancien format "DEV-001-25"
        if not last_devis_new_format:
            last_devis_old_format = Devis.objects.filter(
                numero__startswith=f"DEV-"
            ).order_by('-id').first()
            
            if last_devis_old_format:
                try:
                    # Extraire le numéro de l'ancien format (ex: "001" de "DEV-001-25")
                    old_sequence_match = re.search(r'DEV-(\d+)-', last_devis_old_format.numero)
                    if old_sequence_match:
                        sequence = int(old_sequence_match.group(1))
                        next_sequence = sequence + 1
                    else:
                        next_sequence = 1
                except (ValueError, AttributeError):
                    next_sequence = 1
            else:
                next_sequence = 1
        else:
            try:
                # Extraire le numéro de séquence du nouveau format (ex: "017" de "Devis n°017.2025")
                sequence_match = re.search(r'Devis n°(\d+)\.', last_devis_new_format.numero)
                if sequence_match:
                    sequence = int(sequence_match.group(1))
                    next_sequence = sequence + 1
                else:
                    next_sequence = 1
            except (ValueError, AttributeError):
                next_sequence = 1
            
        # Formater le nouveau numéro selon le format demandé
        numero = f"Devis n°{str(next_sequence).zfill(3)}.{current_year}"
        print(f"Génération du numéro de devis: {numero} (séquence: {next_sequence}, année: {current_year})")
        
        # Si c'est un TS (chantier existant), calculer le prochain numéro de TS
        next_ts = None
        if chantier_id and not devis_chantier:
            # Trouver le dernier TS pour ce chantier
            last_ts = Devis.objects.filter(
                chantier_id=chantier_id,
                devis_chantier=False
            ).count()
            next_ts = str(last_ts + 1).zfill(3)
            print(f"Calcul TS pour chantier {chantier_id}: {next_ts}")
        
        return Response({
            'numero': numero,
            'next_ts': next_ts,
            'sequence': str(next_sequence).zfill(3),
            'year': current_year
        })
        
    except Exception as e:
        print(f"Erreur dans get_next_devis_number: {str(e)}")
        current_year = timezone.now().year
        return Response({
            'numero': f"Devis n°001.{current_year}",
            'next_ts': "001",
            'sequence': "001",
            'year': current_year
        })

@api_view(['GET'])
def get_chantier_relations(request):
    chantiers = Chantier.objects.all()
    societes = Societe.objects.select_related('client_name').all()
    
    # Créer un dictionnaire de correspondance société -> client
    societe_client_map = {
        societe.id: {
            'nom_societe': societe.nom_societe,
            'client': {
                'name': societe.client_name.name,
                'surname': societe.client_name.surname,
                'email': societe.client_name.client_mail,
                'phone': societe.client_name.phone_Number
            }
        } for societe in societes
    }
    
    data = []
    for chantier in chantiers:
        # Convertir le montant_ttc en Decimal pour le calcul
        montant_ttc = Decimal(str(chantier.montant_ttc)) if chantier.montant_ttc else Decimal('0')
        
        # Calculer le CA réel (somme des devis validés)
        devis_valides = Devis.objects.filter(
            chantier=chantier,
            status='Validé'
        )
        ca_reel = sum(devis.price_ttc for devis in devis_valides)
        
        # Calculer le taux de facturation avec les valeurs du même type
        taux_facturation = float((ca_reel / montant_ttc * 100) if montant_ttc else 0)
        
        societe_info = societe_client_map.get(chantier.societe_id) if chantier.societe_id else None
        
        data.append({
            'id': chantier.id,
            'chantier_name': chantier.chantier_name,
            'date_debut': chantier.date_debut,
            'date_fin': chantier.date_fin,
            'montant_ttc': chantier.montant_ttc,
            'ca_reel': ca_reel,
            'taux_facturation': round(taux_facturation, 2),
            'state_chantier': chantier.state_chantier,
            'ville': chantier.ville,
            'rue': chantier.rue,
            'code_postal': chantier.code_postal,
            'societe_info': societe_info
        })
    
    return Response(data)

def is_new_system_devis(devis):
    """
    Détecte si un devis utilise le nouveau système (avec index_global et parties_metadata)
    Utilise la même logique que DevisSerializer
    """
    # Vérifier si le devis a des DevisLigne avec index_global > 0
    has_unified_lignes = DevisLigne.objects.filter(
        devis=devis, 
        index_global__gt=0
    ).exists()
    
    # Vérifier si le devis a des parties/sous-parties/lignes avec index_global > 0
    has_unified_items = (
        Partie.objects.filter(devis=devis, index_global__gt=0).exists() or
        SousPartie.objects.filter(devis=devis, index_global__gt=0).exists() or
        LigneDetail.objects.filter(devis=devis, index_global__gt=0).exists()
    )
    
    # Vérifier si parties_metadata existe et contient des données
    has_parties_metadata = (
        devis.parties_metadata and 
        devis.parties_metadata.get('selectedParties', [])
    )
    
    return has_unified_lignes or has_unified_items or bool(has_parties_metadata)


@api_view(['GET'])
@permission_classes([AllowAny])
def preview_saved_devis(request, devis_id):
    """
    Vue de prévisualisation qui redirige automatiquement vers la bonne version
    selon le système utilisé par le devis (ancien ou nouveau)
    """
    try:
        devis = get_object_or_404(Devis, id=devis_id)
        
        # Détecter si le devis utilise le nouveau système
        if is_new_system_devis(devis):
            # Rediriger vers preview_saved_devis_v2 pour le nouveau système
            return redirect(f'/api/preview-saved-devis-v2/{devis_id}/')
        
        # Sinon, continuer avec l'ancien système (code existant)
        # Gérer les deux cas : devis normal (avec chantier) et devis de chantier (avec appel_offres)
        if devis.devis_chantier and devis.appel_offres:
            # Cas d'un devis de chantier (appel d'offres)
            chantier = devis.appel_offres
            societe = devis.appel_offres.societe
            client = societe.client_name if societe else None
        else:
            # Cas d'un devis normal
            chantier = devis.chantier
            societe = chantier.societe if chantier else None
            client = societe.client_name if societe else None

        total_ht = Decimal('0')
        parties_data = []

        # Récupérer les lignes spéciales du devis
        lignes_speciales = devis.lignes_speciales or {}
        lignes_display = devis.lignes_display or {}

        # Fonction de tri naturel pour les parties
        def natural_sort_key(titre):
            import re
            # Extraire le numéro au début du titre (ex: "1-", "11-", "21-")
            match = re.match(r'^(\d+)-', titre)
            if match:
                # Retourner un tuple (numéro, titre) pour un tri correct
                return (int(match.group(1)), titre)
            # Si pas de numéro, retourner (0, titre) pour mettre en premier
            return (0, titre)

        # Récupérer et trier les parties
        parties_to_process = list(Partie.objects.filter(id__in=[ligne.ligne_detail.sous_partie.partie.id for ligne in devis.lignes.all()]).distinct())
        parties_to_process.sort(key=lambda p: natural_sort_key(p.titre))

        for partie in parties_to_process:
            sous_parties_data = []
            total_partie = Decimal('0')

            # Récupérer les lignes spéciales pour cette partie
            special_lines_partie = lignes_speciales.get('parties', {}).get(str(partie.id), [])
            # Récupérer les lignes display pour cette partie
            display_lines_partie = lignes_display.get('parties', {}).get(str(partie.id), [])

            # Récupérer et trier les sous-parties
            sous_parties_to_process = list(SousPartie.objects.filter(partie=partie, id__in=[ligne.ligne_detail.sous_partie.id for ligne in devis.lignes.all()]).distinct())
            sous_parties_to_process.sort(key=lambda sp: natural_sort_key(sp.description))

            for sous_partie in sous_parties_to_process:
                lignes_details_data = []
                total_sous_partie = Decimal('0')

                # Calculer le total des lignes de détail
                for ligne in devis.lignes.filter(ligne_detail__sous_partie=sous_partie):
                    total_ligne = Decimal(str(ligne.quantite)) * Decimal(str(ligne.prix_unitaire))
                    lignes_details_data.append({
                        'description': ligne.ligne_detail.description,
                        'unite': ligne.ligne_detail.unite,
                        'quantity': ligne.quantite,
                        'custom_price': ligne.prix_unitaire,
                        'total': total_ligne
                    })
                    total_sous_partie += total_ligne

                if lignes_details_data:
                    # Trier les lignes de détail par ordre naturel
                    lignes_details_data.sort(key=lambda l: natural_sort_key(l['description']))
                    
                    # Récupérer les lignes spéciales pour cette sous-partie
                    special_lines_sous_partie = lignes_speciales.get('sousParties', {}).get(str(sous_partie.id), [])
                    # Récupérer les lignes display pour cette sous-partie
                    display_lines_sous_partie = lignes_display.get('sousParties', {}).get(str(sous_partie.id), [])
                    sous_partie_data = {
                        'description': sous_partie.description,
                        'lignes_details': lignes_details_data,
                        'total_sous_partie': total_sous_partie,
                        'special_lines': []
                    }

                    # Calculer et ajouter chaque ligne spéciale
                    for special_line in special_lines_sous_partie:
                        if special_line['valueType'] == 'percentage':
                            montant = (total_sous_partie * Decimal(str(special_line['value']))) / Decimal('100')
                        else:
                            montant = Decimal(str(special_line['value']))

                        if special_line['type'] == 'reduction':
                            total_sous_partie -= montant
                        else:
                            total_sous_partie += montant

                        sous_partie_data['special_lines'].append({
                            'description': special_line['description'],
                            'value': special_line['value'],
                            'valueType': special_line['valueType'],
                            'type': special_line['type'],
                            'montant': montant,
                            'isHighlighted': special_line.get('isHighlighted', False)
                        })
                    
                    # Ajouter les lignes display de la sous-partie
                    for display_line in display_lines_sous_partie:
                        sous_partie_data['special_lines'].append({
                            'description': display_line['description'],
                            'value': display_line['value'],
                            'valueType': display_line['valueType'],
                            'type': display_line['type'],
                            'montant': Decimal(str(display_line['value'])),  # Montant affiché directement
                            'isHighlighted': display_line.get('isHighlighted', False)
                        })

                    sous_partie_data['total_sous_partie'] = total_sous_partie
                    sous_parties_data.append(sous_partie_data)
                    total_partie += total_sous_partie

            if sous_parties_data:
                partie_data = {
                    'titre': partie.titre,
                    'sous_parties': sous_parties_data,
                    'total_partie': total_partie,
                    'special_lines': []
                }

                # Calculer et ajouter les lignes spéciales de la partie
                for special_line in special_lines_partie:
                    if special_line['valueType'] == 'percentage':
                        montant = (total_partie * Decimal(str(special_line['value']))) / Decimal('100')
                    else:
                        montant = Decimal(str(special_line['value']))

                    if special_line['type'] == 'reduction':
                        total_partie -= montant
                    else:
                        total_partie += montant

                    partie_data['special_lines'].append({
                        'description': special_line['description'],
                        'value': special_line['value'],
                        'valueType': special_line['valueType'],
                        'type': special_line['type'],
                        'montant': montant,
                        'isHighlighted': special_line.get('isHighlighted', False)
                    })
                
                # Ajouter les lignes display de la partie
                for display_line in display_lines_partie:
                    partie_data['special_lines'].append({
                        'description': display_line['description'],
                        'value': display_line['value'],
                        'valueType': display_line['valueType'],
                        'type': display_line['type'],
                        'montant': Decimal(str(display_line['value'])),  # Montant affiché directement
                        'isHighlighted': display_line.get('isHighlighted', False)
                    })

                partie_data['total_partie'] = total_partie
                parties_data.append(partie_data)
                total_ht += total_partie

        # Appliquer les lignes spéciales globales
        special_lines_global = lignes_speciales.get('global', [])
        for special_line in special_lines_global:
            if special_line['valueType'] == 'percentage':
                montant = (total_ht * Decimal(str(special_line['value']))) / Decimal('100')
            else:
                montant = Decimal(str(special_line['value']))

            special_line['montant'] = montant

            if special_line['type'] == 'reduction':
                total_ht -= montant
            else:
                total_ht += montant
        
        # Ajouter les lignes display globales
        display_lines_global = lignes_display.get('global', [])
        for display_line in display_lines_global:
            display_line['montant'] = Decimal(str(display_line['value']))  # Montant affiché directement
            special_lines_global.append(display_line)

        # Calculer TVA et TTC
        tva = total_ht * (Decimal(str(devis.tva_rate)) / Decimal('100'))
        montant_ttc = total_ht + tva

        context = {
            'devis': devis,
            'chantier': chantier,
            'societe': societe,
            'client': client,
            'parties': parties_data,
            'total_ht': total_ht,
            'tva': tva,
            'montant_ttc': montant_ttc,
            'special_lines_global': special_lines_global
        }

        return render(request, 'preview_devis.html', context)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@api_view(['PUT'])
def update_devis_status(request, devis_id):
    try:
        devis = Devis.objects.get(id=devis_id)
        new_status = request.data.get('status')
        
        # Utiliser update() pour mettre à jour uniquement le statut
        Devis.objects.filter(id=devis_id).update(status=new_status)
        
        # Récupérer le devis mis à jour
        devis.refresh_from_db()
        
        return Response({
            'id': devis.id,
            'status': devis.status,
            'message': 'Statut mis à jour avec succès'
        })
    except Devis.DoesNotExist:
        return Response({'error': 'Devis non trouvé'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
def create_facture(request):
    try:
        devis_id = request.data.get('devis_id')
        devis = get_object_or_404(Devis, id=devis_id)
        
        # Vérifier si une facture existe déjà pour ce devis
        if Facture.objects.filter(devis=devis).exists():
            return Response({
                'error': 'Une facture existe déjà pour ce devis'
            }, status=400)
        
        # ✅ Préparer les données de la facture avec contact_societe depuis le devis
        facture_data = {
            'numero': request.data.get('numero'),
            'devis': devis,
            'date_echeance': request.data.get('date_echeance'),
            'mode_paiement': request.data.get('mode_paiement'),
            # Transférer les coûts estimés du devis
            'cout_estime_main_oeuvre': devis.cout_estime_main_oeuvre,
            'cout_estime_materiel': devis.cout_estime_materiel
        }
        
        # ✅ Copier contact_societe depuis le devis si disponible
        if devis.contact_societe:
            facture_data['contact_societe'] = devis.contact_societe
        
        # Créer la facture
        facture = Facture.objects.create(**facture_data)

        # Sérialiser la réponse
        serializer = FactureSerializer(facture)
        return Response(serializer.data, status=201)

    except Devis.DoesNotExist:
        return Response({
            'error': 'Devis non trouvé'
        }, status=404)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def preview_facture(request, facture_id):
    """
    Vue de prévisualisation qui redirige automatiquement vers la bonne version
    selon le système utilisé par le devis (ancien ou nouveau)
    """
    try:
        # ✅ Charger contact_societe avec select_related pour optimiser la requête
        facture = Facture.objects.select_related(
            'devis',
            'devis__chantier',
            'devis__chantier__societe',
            'devis__chantier__societe__client_name',
            'contact_societe',
            'devis__contact_societe'
        ).get(id=facture_id)
        
        devis = facture.devis
        
        # ✅ Récupérer le contact_societe (priorité à celui de la facture, sinon celui du devis)
        contact_societe = facture.contact_societe if hasattr(facture, 'contact_societe') and facture.contact_societe else (devis.contact_societe if hasattr(devis, 'contact_societe') and devis.contact_societe else None)
        
        # Détecter si le devis utilise le nouveau système
        from .Devis_views import is_new_system_devis
        if is_new_system_devis(devis):
            # Rediriger vers preview_facture_v2 pour le nouveau système
            from django.shortcuts import redirect
            return redirect(f'/api/preview-facture-v2/{facture_id}/')
        
        # Sinon, continuer avec l'ancien système (code existant)
        chantier = devis.chantier
        societe = chantier.societe
        client = societe.client_name

        # Initialiser les totaux
        total_ht = Decimal('0')
        parties_data = []

        # Récupérer les lignes spéciales du devis
        lignes_speciales = devis.lignes_speciales or {}
        lignes_display = devis.lignes_display or {}

        # Fonction de tri naturel pour les parties
        def natural_sort_key(titre):
            import re
            # Extraire le numéro au début du titre (ex: "1-", "11-", "21-")
            match = re.match(r'^(\d+)-', titre)
            if match:
                # Retourner un tuple (numéro, titre) pour un tri correct
                return (int(match.group(1)), titre)
            # Si pas de numéro, retourner (0, titre) pour mettre en premier
            return (0, titre)

        # Récupérer et trier les parties
        parties_to_process = list(Partie.objects.filter(
            id__in=[ligne.ligne_detail.sous_partie.partie.id 
                   for ligne in devis.lignes.all()]
        ).distinct())
        parties_to_process.sort(key=lambda p: natural_sort_key(p.titre))

        # Traiter les parties et leurs lignes
        for partie in parties_to_process:
            sous_parties_data = []
            total_partie = Decimal('0')

            # Récupérer les lignes spéciales pour cette partie
            special_lines_partie = lignes_speciales.get('parties', {}).get(str(partie.id), [])
            # Récupérer les lignes display pour cette partie
            display_lines_partie = lignes_display.get('parties', {}).get(str(partie.id), [])

            # Récupérer et trier les sous-parties
            sous_parties_to_process = list(SousPartie.objects.filter(
                partie=partie, 
                id__in=[ligne.ligne_detail.sous_partie.id 
                       for ligne in devis.lignes.all()]
            ).distinct())
            sous_parties_to_process.sort(key=lambda sp: natural_sort_key(sp.description))

            for sous_partie in sous_parties_to_process:
                lignes_details_data = []
                total_sous_partie = Decimal('0')

                # Calculer le total des lignes de détail
                for ligne in devis.lignes.filter(ligne_detail__sous_partie=sous_partie):
                    total_ligne = ligne.quantite * ligne.prix_unitaire
                    lignes_details_data.append({
                        'description': ligne.ligne_detail.description,
                        'unite': ligne.ligne_detail.unite,
                        'quantity': float(ligne.quantite),
                        'custom_price': float(ligne.prix_unitaire),
                        'total': float(total_ligne)
                    })
                    total_sous_partie += total_ligne

                if lignes_details_data:
                    # Récupérer les lignes spéciales pour cette sous-partie
                    special_lines_sous_partie = lignes_speciales.get('sousParties', {}).get(str(sous_partie.id), [])
                    # Récupérer les lignes display pour cette sous-partie
                    display_lines_sous_partie = lignes_display.get('sousParties', {}).get(str(sous_partie.id), [])
                    sous_partie_data = {
                        'description': sous_partie.description,
                        'lignes_details': lignes_details_data,
                        'total_sous_partie': total_sous_partie,
                        'special_lines': []
                    }

                    # Appliquer les lignes spéciales de la sous-partie
                    for special_line in special_lines_sous_partie:
                        montant = (total_sous_partie * Decimal(str(special_line['value'])) / Decimal('100')) \
                            if special_line['valueType'] == 'percentage' \
                            else Decimal(str(special_line['value']))

                        if special_line['type'] == 'reduction':
                            total_sous_partie -= montant
                        else:
                            total_sous_partie += montant

                        sous_partie_data['special_lines'].append({
                            'description': special_line['description'],
                            'value': special_line['value'],
                            'valueType': special_line['valueType'],
                            'type': special_line['type'],
                            'montant': montant,
                            'isHighlighted': special_line.get('isHighlighted', False)
                        })
                    
                    # Ajouter les lignes display de la sous-partie
                    for display_line in display_lines_sous_partie:
                        sous_partie_data['special_lines'].append({
                            'description': display_line['description'],
                            'value': display_line['value'],
                            'valueType': display_line['valueType'],
                            'type': display_line['type'],
                            'montant': Decimal(str(display_line['value'])),  # Montant affiché directement
                            'isHighlighted': display_line.get('isHighlighted', False)
                        })

                    sous_partie_data['total_sous_partie'] = total_sous_partie
                    sous_parties_data.append(sous_partie_data)
                    total_partie += total_sous_partie

            if sous_parties_data:
                partie_data = {
                    'titre': partie.titre,
                    'sous_parties': sous_parties_data,
                    'total_partie': total_partie,
                    'special_lines': []
                }

                # Appliquer les lignes spéciales de la partie
                for special_line in special_lines_partie:
                    montant = (total_partie * Decimal(str(special_line['value'])) / Decimal('100')) \
                        if special_line['valueType'] == 'percentage' \
                        else Decimal(str(special_line['value']))

                    if special_line['type'] == 'reduction':
                        total_partie -= montant
                    else:
                        total_partie += montant

                    partie_data['special_lines'].append({
                        'description': special_line['description'],
                        'value': special_line['value'],
                        'valueType': special_line['valueType'],
                        'type': special_line['type'],
                        'montant': montant,
                        'isHighlighted': special_line.get('isHighlighted', False)
                    })
                
                # Ajouter les lignes display de la partie
                for display_line in display_lines_partie:
                    partie_data['special_lines'].append({
                        'description': display_line['description'],
                        'value': display_line['value'],
                        'valueType': display_line['valueType'],
                        'type': display_line['type'],
                        'montant': Decimal(str(display_line['value'])),  # Montant affiché directement
                        'isHighlighted': display_line.get('isHighlighted', False)
                    })

                partie_data['total_partie'] = total_partie
                parties_data.append(partie_data)
                total_ht += total_partie

        # Appliquer les lignes spéciales globales
        special_lines_global = lignes_speciales.get('global', [])
        for special_line in special_lines_global:
            montant = (total_ht * Decimal(str(special_line['value'])) / Decimal('100')) \
                if special_line['valueType'] == 'percentage' \
                else Decimal(str(special_line['value']))

            if special_line['type'] == 'reduction':
                total_ht -= montant
            else:
                total_ht += montant

            special_line['montant'] = montant
        
        # Ajouter les lignes display globales
        display_lines_global = lignes_display.get('global', [])
        for display_line in display_lines_global:
            display_line['montant'] = Decimal(str(display_line['value']))  # Montant affiché directement
            special_lines_global.append(display_line)

        # Calculer TVA et TTC
        tva = total_ht * (Decimal(str(devis.tva_rate)) / Decimal('100'))
        montant_ttc = total_ht + tva  # Changé de total_ttc à montant_ttc

        # ✅ Créer un objet facture avec contact_societe pour le template
        class FactureForTemplate:
            def __init__(self, facture_obj, contact):
                self.id = facture_obj.id
                self.numero = facture_obj.numero
                self.date_creation = facture_obj.date_creation
                self.date_echeance = facture_obj.date_echeance
                self.date_paiement = facture_obj.date_paiement
                self.state_facture = facture_obj.state_facture
                self.contact_societe = contact
        
        facture_for_template = FactureForTemplate(facture, contact_societe)

        context = {
            'facture': facture_for_template,
            'devis': devis,
            'chantier': chantier,
            'societe': societe,
            'client': client,
            'parties': parties_data,
            'total_ht': float(total_ht),
            'tva': float(tva),
            'montant_ttc': float(montant_ttc),  # Changé de total_ttc à montant_ttc
            'special_lines_global': special_lines_global
        }

        return render(request, 'facture.html', context)

    except Exception as e:
        print(f"Erreur lors de la prévisualisation de la facture: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([AllowAny])
def preview_facture_v2(request, facture_id):
    """
    Version V2 de la prévisualisation des factures
    Utilise parties_metadata du devis comme preview_saved_devis_v2 pour un affichage cohérent
    """
    try:
        from .Devis_views import build_inline_style
        
        # ✅ Charger contact_societe avec select_related pour optimiser la requête
        facture = Facture.objects.select_related(
            'devis',
            'devis__chantier',
            'devis__chantier__societe',
            'devis__chantier__societe__client_name',
            'contact_societe',
            'devis__contact_societe'
        ).get(id=facture_id)
        
        devis = facture.devis
        chantier = devis.chantier
        societe = chantier.societe if chantier else None
        
        # ✅ Récupérer le contact_societe (priorité à celui de la facture, sinon celui du devis)
        contact_societe = facture.contact_societe if hasattr(facture, 'contact_societe') and facture.contact_societe else (devis.contact_societe if hasattr(devis, 'contact_societe') and devis.contact_societe else None)
        
        # Priorité au client directement associé au devis, sinon utiliser celui de la société
        clients_devis = list(devis.client.all())
        if clients_devis:
            client = clients_devis[0]
        else:
            client = societe.client_name if societe else None

        total_ht = Decimal('0')
        parties_data = []

        def parse_index(value, default=Decimal('999')):
            try:
                return float(value)
            except (TypeError, ValueError):
                return float(default)

        # Récupérer les lignes spéciales du devis
        lignes_speciales = devis.lignes_speciales or {}
        lignes_display = devis.lignes_display or {}

        # Récupérer parties_metadata pour construire la structure (comme preview_saved_devis_v2)
        parties_metadata = devis.parties_metadata or {}
        selected_parties = parties_metadata.get('selectedParties', [])

        # Si parties_metadata est vide, utiliser l'ancienne méthode de récupération
        if not selected_parties:
            # Fallback : récupérer les parties depuis les lignes
            parties_to_process = list(Partie.objects.filter(id__in=[ligne.ligne_detail.sous_partie.partie.id for ligne in devis.lignes.all()]).distinct())
            # Convertir en format metadata pour compatibilité
            selected_parties = []
            for partie in parties_to_process:
                sous_parties_meta = []
                sous_parties = SousPartie.objects.filter(partie=partie, id__in=[ligne.ligne_detail.sous_partie.id for ligne in devis.lignes.all()]).distinct()
                for sp in sous_parties:
                    lignes_ids = [l.ligne_detail.id for l in devis.lignes.filter(ligne_detail__sous_partie=sp)]
                    sous_parties_meta.append({
                        'id': sp.id,
                        'description': sp.description,
                        'numero': getattr(sp, 'numero', None),
                        'index_global': getattr(sp, 'index_global', 0),
                        'lignesDetails': lignes_ids
                    })
                selected_parties.append({
                    'id': partie.id,
                    'titre': partie.titre,
                    'numero': getattr(partie, 'numero', None),
                    'index_global': getattr(partie, 'index_global', 0),
                    'sousParties': sous_parties_meta
                })

        # Fonction de tri par index_global ou numéro de partie (si présent)
        def sort_key_by_index(partie):
            # Si on a index_global dans les données, l'utiliser
            if 'index_global' in partie:
                return parse_index(partie.get('index_global'))
            # Sinon, utiliser le numéro
            numero = partie.get('numero')
            if numero and isinstance(numero, (int, str)) and str(numero).isdigit():
                return int(numero)
            return 999  # Mettre les parties sans numéro à la fin

        # Trier les parties par index_global si présent, sinon par numéro
        selected_parties = sorted(selected_parties, key=sort_key_by_index)

        # Construire un mapping des lignes par ligne_detail.id pour accès rapide
        lignes_by_detail = {}
        for ligne in devis.lignes.all().order_by('index_global'):
            ligne_detail_id = ligne.ligne_detail.id
            if ligne_detail_id not in lignes_by_detail:
                lignes_by_detail[ligne_detail_id] = []
            lignes_by_detail[ligne_detail_id].append(ligne)

        # Construire la structure des parties depuis parties_metadata
        for partie_meta in selected_parties:
            sous_parties_data = []
            total_partie = Decimal('0')
            partie_index_global = parse_index(partie_meta.get('index_global'))

            # Récupérer les lignes spéciales pour cette partie
            special_lines_partie = lignes_speciales.get('parties', {}).get(str(partie_meta['id']), [])
            display_lines_partie = lignes_display.get('parties', {}).get(str(partie_meta['id']), [])

            # Trier les sous-parties par index_global si présent, sinon par numéro
            sous_parties_meta = sorted(partie_meta.get('sousParties', []), key=lambda sp: float(sp.get('index_global', 999)) if 'index_global' in sp else (int(sp.get('numero', '999').split('.')[-1]) if sp.get('numero') and '.' in str(sp.get('numero')) else 999))

            # Traiter les sous-parties de cette partie
            for sous_partie_meta in sous_parties_meta:
                lignes_details_data = []
                total_sous_partie = Decimal('0')

                # Récupérer les lignes de détail pour cette sous-partie
                ligne_detail_ids = sous_partie_meta.get('lignesDetails', [])
                
                # Extraire les lignes correspondantes depuis les DevisLigne
                lignes_filtered = []
                for ligne_detail_id in ligne_detail_ids:
                    if ligne_detail_id in lignes_by_detail:
                        lignes_filtered.extend(lignes_by_detail[ligne_detail_id])
                
                # Trier par index_global si présent
                lignes_filtered.sort(key=lambda l: float(l.index_global) if l.index_global else 999)
                
                for ligne in lignes_filtered:
                    try:
                        total_ligne = Decimal(str(ligne.quantite)) * Decimal(str(ligne.prix_unitaire))
                        lignes_details_data.append({
                            'description': ligne.ligne_detail.description,
                            'unite': ligne.ligne_detail.unite,
                            'quantity': ligne.quantite,
                            'custom_price': ligne.prix_unitaire,
                            'total': total_ligne
                        })
                        total_sous_partie += total_ligne
                    except Exception:
                        pass

                if lignes_details_data:
                    # Récupérer les lignes spéciales pour cette sous-partie
                    special_lines_sous_partie = lignes_speciales.get('sousParties', {}).get(str(sous_partie_meta['id']), [])
                    display_lines_sous_partie = lignes_display.get('sousParties', {}).get(str(sous_partie_meta['id']), [])
                    
                    # Trier les lignes spéciales par index_global si présent
                    def sort_special_lines(lines):
                        return sorted(lines, key=lambda l: float(l.get('index_global', 999)) if 'index_global' in l else 999)
                    
                    special_lines_sous_partie = sort_special_lines(special_lines_sous_partie)
                    display_lines_sous_partie = sort_special_lines(display_lines_sous_partie)
                    
                    sous_partie_data = {
                        'description': sous_partie_meta.get('description', ''),
                        'numero': sous_partie_meta.get('numero'),  # ✅ Inclure le numéro
                        'lignes_details': lignes_details_data,
                        'total_sous_partie': total_sous_partie,
                        'special_lines': []
                    }

                    # Calculer et ajouter chaque ligne spéciale
                    for special_line in special_lines_sous_partie:
                        value_type = special_line.get('value_type') or special_line.get('valueType', 'fixed')
                        if value_type == 'percentage':
                            montant = (total_sous_partie * Decimal(str(special_line.get('value', 0)))) / Decimal('100')
                        else:
                            montant = Decimal(str(special_line.get('value', 0) or special_line.get('amount', 0)))

                        line_type = special_line.get('type', 'display')
                        if line_type == 'reduction':
                            total_sous_partie -= montant
                        elif line_type == 'addition':
                            total_sous_partie += montant
                        # 'display' n'affecte pas le total

                        sous_partie_data['special_lines'].append({
                            'description': special_line.get('description', ''),
                            'value': special_line.get('value', 0) or special_line.get('amount', 0),
                            'valueType': value_type,
                            'type': line_type,
                            'montant': montant,
                            'isHighlighted': special_line.get('isHighlighted', False) or (special_line.get('styles', {}).get('backgroundColor') == '#ffff00' or special_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                            'style_attr': build_inline_style(special_line.get('styles'))
                        })
                    
                    # Ajouter les lignes display de la sous-partie
                    for display_line in display_lines_sous_partie:
                        sous_partie_data['special_lines'].append({
                            'description': display_line.get('description', ''),
                            'value': display_line.get('value', 0) or display_line.get('amount', 0),
                            'valueType': display_line.get('value_type') or display_line.get('valueType', 'fixed'),
                            'type': display_line.get('type', 'display'),
                            'montant': Decimal(str(display_line.get('value', 0) or display_line.get('amount', 0))),
                            'isHighlighted': display_line.get('isHighlighted', False) or (display_line.get('styles', {}).get('backgroundColor') == '#ffff00' or display_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                            'style_attr': build_inline_style(display_line.get('styles'))
                        })

                    sous_partie_data['total_sous_partie'] = total_sous_partie
                    sous_parties_data.append(sous_partie_data)
                    total_partie += total_sous_partie

            if sous_parties_data:
                # Trier les lignes spéciales de la partie par index_global
                def sort_special_lines_partie(lines):
                    return sorted(lines, key=lambda l: float(l.get('index_global', 999)) if 'index_global' in l else 999)
                
                special_lines_partie = sort_special_lines_partie(special_lines_partie)
                display_lines_partie = sort_special_lines_partie(display_lines_partie)
                
                partie_data = {
                    'titre': partie_meta.get('titre', ''),
                    'numero': partie_meta.get('numero'),  # ✅ Inclure le numéro
                    'sous_parties': sous_parties_data,
                    'total_partie': total_partie,
                    'special_lines': [],
                    'index_global': partie_index_global
                }

                # Calculer et ajouter les lignes spéciales de la partie
                for special_line in special_lines_partie:
                    value_type = special_line.get('value_type') or special_line.get('valueType', 'fixed')
                    if value_type == 'percentage':
                        montant = (total_partie * Decimal(str(special_line.get('value', 0)))) / Decimal('100')
                    else:
                        montant = Decimal(str(special_line.get('value', 0) or special_line.get('amount', 0)))

                    line_type = special_line.get('type', 'display')
                    if line_type == 'reduction':
                        total_partie -= montant
                    elif line_type == 'addition':
                        total_partie += montant

                    partie_data['special_lines'].append({
                        'description': special_line.get('description', ''),
                        'value': special_line.get('value', 0) or special_line.get('amount', 0),
                        'valueType': value_type,
                        'type': line_type,
                        'montant': montant,
                        'isHighlighted': special_line.get('isHighlighted', False) or (special_line.get('styles', {}).get('backgroundColor') == '#ffff00' or special_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                        'style_attr': build_inline_style(special_line.get('styles'))
                    })
                
                # Ajouter les lignes display de la partie
                for display_line in display_lines_partie:
                    partie_data['special_lines'].append({
                        'description': display_line.get('description', ''),
                        'value': display_line.get('value', 0) or display_line.get('amount', 0),
                        'valueType': display_line.get('value_type') or display_line.get('valueType', 'fixed'),
                        'type': display_line.get('type', 'display'),
                        'montant': Decimal(str(display_line.get('value', 0) or display_line.get('amount', 0))),
                        'isHighlighted': display_line.get('isHighlighted', False) or (display_line.get('styles', {}).get('backgroundColor') == '#ffff00' or display_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                        'style_attr': build_inline_style(display_line.get('styles'))
                    })

                partie_data['total_partie'] = total_partie
                parties_data.append(partie_data)
                total_ht += total_partie

        # Appliquer les lignes spéciales globales (triées par index_global)
        special_lines_global = lignes_speciales.get('global', [])
        special_lines_global = sorted(special_lines_global, key=lambda l: parse_index(l.get('index_global')))
        
        # Convertir les lignes spéciales globales en format cohérent pour le template
        special_lines_global_formatted = []
        for special_line in special_lines_global:
            value_type = special_line.get('value_type') or special_line.get('valueType', 'fixed')
            if value_type == 'percentage':
                montant = (total_ht * Decimal(str(special_line.get('value', 0)))) / Decimal('100')
            else:
                montant = Decimal(str(special_line.get('value', 0) or special_line.get('amount', 0)))

            line_type = special_line.get('type', 'display')
            if line_type == 'reduction':
                total_ht -= montant
            elif line_type == 'addition':
                total_ht += montant

            special_lines_global_formatted.append({
                'description': special_line.get('description', ''),
                'value': special_line.get('value', 0) or special_line.get('amount', 0),
                'valueType': value_type,
                'type': line_type,
                'montant': float(montant),
                'index_global': parse_index(special_line.get('index_global')),
                'isHighlighted': special_line.get('isHighlighted', False) or (special_line.get('styles', {}).get('backgroundColor') == '#ffff00' or special_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                'style_attr': build_inline_style(special_line.get('styles'))
            })
        
        # Ajouter les lignes display globales
        display_lines_global = lignes_display.get('global', [])
        display_lines_global = sorted(display_lines_global, key=lambda l: parse_index(l.get('index_global')))
        
        for display_line in display_lines_global:
            special_lines_global_formatted.append({
                'description': display_line.get('description', ''),
                'value': display_line.get('value', 0) or display_line.get('amount', 0),
                'valueType': display_line.get('value_type') or display_line.get('valueType', 'fixed'),
                'type': display_line.get('type', 'display'),
                'montant': float(Decimal(str(display_line.get('value', 0) or display_line.get('amount', 0)))),
                'index_global': parse_index(display_line.get('index_global')),
                'isHighlighted': display_line.get('isHighlighted', False) or (display_line.get('styles', {}).get('backgroundColor') == '#ffff00' or display_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                'style_attr': build_inline_style(display_line.get('styles'))
            })
        
        special_lines_global = special_lines_global_formatted

        # ✅ Fusionner parties et lignes spéciales globales par index_global
        global_items = []
        for partie in parties_data:
            global_items.append({
                'type': 'partie',
                'index_global': partie.get('index_global', parse_index(None)),
                'data': partie
            })
        for line in special_lines_global:
            global_items.append({
                'type': 'special_line',
                'index_global': line.get('index_global', parse_index(None)),
                'data': line
            })
        global_items = sorted(global_items, key=lambda item: item.get('index_global', 999))

        # Calculer TVA et TTC
        tva = total_ht * (Decimal(str(devis.tva_rate)) / Decimal('100'))
        montant_ttc = total_ht + tva

        # ✅ Créer un objet facture avec contact_societe pour le template
        class FactureForTemplate:
            def __init__(self, facture_obj, contact):
                self.id = facture_obj.id
                self.numero = facture_obj.numero
                self.date_creation = facture_obj.date_creation
                self.date_echeance = facture_obj.date_echeance
                self.date_paiement = facture_obj.date_paiement
                self.state_facture = facture_obj.state_facture
                self.contact_societe = contact
        
        facture_for_template = FactureForTemplate(facture, contact_societe)

        context = {
            'facture': facture_for_template,
            'devis': devis,
            'chantier': chantier,
            'societe': societe,
            'client': client,
            'parties': parties_data,
            'total_ht': total_ht,
            'tva': tva,
            'montant_ttc': montant_ttc,
            'special_lines_global': special_lines_global,
            'global_items': global_items
        }

        return render(request, 'facture_v2.html', context)

    except Exception as e:
        import traceback
        return JsonResponse({'error': f'{str(e)}\n{traceback.format_exc()}'}, status=400)


@api_view(['POST'])
def create_facture_from_devis(request):
    serializer = FactureSerializer(data=request.data)
    if serializer.is_valid():
        devis_id = serializer.validated_data.get('devis_origine').id
        devis = get_object_or_404(Devis, id=devis_id)

        facture = serializer.save()
        return Response(FactureSerializer(facture).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_facture_pdf_from_preview(request):
    """
    Génère un PDF de facture à partir de l'URL de prévisualisation
    """
    try:
        data = json.loads(request.body)
        facture_id = data.get('facture_id')
        
        if not facture_id:
            return JsonResponse({'error': 'ID de la facture manquant'}, status=400)

        # URL de la page de prévisualisation pour une facture sauvegardée
        preview_url = request.build_absolute_uri(f"/api/preview-facture/{facture_id}/")

        # Chemin vers le script Puppeteer
        node_script_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
            'frontend', 'src', 'components', 'generate_pdf.js'
        )

        # Commande pour exécuter Puppeteer avec Node.js
        command = ['node', node_script_path, preview_url]

        # Exécuter Puppeteer avec capture de la sortie
        result = subprocess.run(
            command, 
            check=True,
            capture_output=True,
            text=True
        )

        # Lire le fichier PDF généré
        pdf_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
            'frontend', 'src', 'components', 'devis.pdf'
        )

        if os.path.exists(pdf_path):
            with open(pdf_path, 'rb') as pdf_file:
                response = HttpResponse(pdf_file.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="facture_{facture_id}.pdf"'
            return response
        else:
            return JsonResponse({'error': 'Le fichier PDF n\'a pas été généré.'}, status=500)

    except json.JSONDecodeError as e:
        return JsonResponse({'error': f'Erreur de décodage JSON: {str(e)}'}, status=400)
    except subprocess.CalledProcessError as e:
        return JsonResponse({
            'error': f'Erreur lors de l\'exécution du script: {e.stderr}'
        }, status=500)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
def get_next_facture_number(request):
    """
    Génère le prochain numéro de facture au format "Facture n°XX.YYYY"
    Utilise le système de numérotation partagé avec les situations
    """
    try:
        # Utiliser le service de numérotation partagé
        next_numero = NumeroService.get_next_facture_number()
        
        # Extraire l'année et le numéro de séquence du format "Facture n°XX.YYYY"
        current_year = str(datetime.now().year)
        sequence_match = re.search(r'n°(\d+)\.', next_numero)
        sequence = sequence_match.group(1) if sequence_match else "01"
        
        return Response({
            'numero': next_numero,
            'sequence': sequence,
            'year': current_year
        })
    except Exception as e:
        print(f"Erreur dans get_next_facture_number: {str(e)}")
        import traceback
        traceback.print_exc()
        current_year = str(datetime.now().year)
        return Response({
            'numero': f"Facture n°01.{current_year}",
            'sequence': "01",
            'year': current_year
        })


@api_view(['GET'])
def check_facture_numero(request, numero_facture):
    """
    Vérifie si un numéro de facture existe déjà
    """
    try:
        exists = Facture.objects.filter(numero_facture=numero_facture).exists()
        return Response({'exists': exists})
    except Exception as e:
        return Response(
            {'error': 'Erreur lors de la vérification du numéro de facture'}, 
            status=500
        )

@api_view(['GET'])
def get_chantier_details(request, chantier_id):
    """
    Endpoint pour récupérer toutes les informations détaillées d'un chantier
    """
    try:
        chantier = get_object_or_404(Chantier, id=chantier_id)
        
        # Récupérer les informations détaillées
        details = {
            'id': chantier.id,
            'nom': chantier.chantier_name,
            'statut': chantier.state_chantier,
            'montant_ht': chantier.montant_ht,
            'montant_ttc': chantier.montant_ttc,
            'dates': {
                'debut': chantier.date_debut,
                'fin': chantier.date_fin
            },
            'adresse': {
                'rue': chantier.rue,
                'ville': chantier.ville,
                'code_postal': chantier.code_postal
            },
            
            'cout_main_oeuvre': chantier.cout_main_oeuvre,
            'cout_sous_traitance': chantier.cout_sous_traitance,
            'cout_materiel': chantier.cout_materiel,
            'cout_estime_main_oeuvre': chantier.cout_estime_main_oeuvre,
            'cout_estime_materiel': chantier.cout_estime_materiel,
            'societe': {
                'id': chantier.societe.id if chantier.societe else None,
                'nom': chantier.societe.nom_societe if chantier.societe else None,
                'client': {
                    'nom': f"{chantier.societe.client_name.name} {chantier.societe.client_name.surname}" if chantier.societe and chantier.societe.client_name else None,
                    'email': chantier.societe.client_name.client_mail if chantier.societe and chantier.societe.client_name else None
                } if chantier.societe else None
            }
        }
        
        return Response(details)
        
    except Exception as e:
        return Response({
            'error': str(e),
            'message': 'Erreur lors de la récupération des détails du chantier'
        }, status=500)

@api_view(['GET'])
def check_chantier_name(request):
    chantier_name = request.query_params.get('chantier_name', '')
    exists = Chantier.objects.filter(chantier_name=chantier_name).exists()
    return Response({'exists': exists})

@api_view(['GET'])
def check_client(request):
    email = request.query_params.get('email')
    surname = request.query_params.get('surname')
    
    try:
        # Rechercher un client qui correspond exactement à l'email ET au surname
        client = Client.objects.filter(
            client_mail=email,
            surname=surname
        ).first()
        
        if client:
            return Response({'client': ClientSerializer(client).data})
        return Response({'client': None})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def check_societe(request):
    nom_societe = request.query_params.get('nom_societe')
    code_postal = request.query_params.get('codepostal_societe')
    
    try:
        # Utiliser filter() au lieu de get() pour obtenir tous les résultats correspondants
        societes = Societe.objects.filter(
            nom_societe=nom_societe,
            codepostal_societe=code_postal
        )
        if societes.exists():
            # Retourner la première société trouvée
            return Response({'societe': SocieteSerializer(societes.first()).data})
        return Response({'societe': None})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def calculate_special_lines(request, devis_id):
    try:
        devis = Devis.objects.get(id=devis_id)
        lignes_speciales = devis.lignes_speciales
        
        # Structure pour stocker les résultats
        results = {
            'global': {'lines': [], 'total': Decimal('0.00')},
            'parties': {},
            'sous_parties': {},
            'ligne_details': {}
        }
        
        # Base de calcul (montant HT du devis)
        base_montant = devis.price_ht
        
        # Traiter les lignes globales
        for ligne in lignes_speciales.get('global', []):
            montant = (base_montant * Decimal(str(ligne['value'])) / Decimal('100')) if ligne['valueType'] == 'percentage' else Decimal(str(ligne['value']))
            
            ligne_info = {
                'description': ligne['description'],
                'value': float(ligne['value']),
                'value_type': ligne['valueType'],
                'type': ligne['type'],
                'is_highlighted': ligne['isHighlighted'],
                'montant': float(montant)
            }
            
            results['global']['lines'].append(ligne_info)
            if ligne['type'] == 'reduction':
                results['global']['total'] -= montant
            else:
                results['global']['total'] += montant

        # Traiter les lignes des parties
        for partie_id, lignes in lignes_speciales.get('parties', {}).items():
            if partie_id not in results['parties']:
                results['parties'][partie_id] = {'lines': [], 'total': Decimal('0.00')}
            
            for ligne in lignes:
                montant = (base_montant * Decimal(str(ligne['value'])) / Decimal('100')) if ligne['valueType'] == 'percentage' else Decimal(str(ligne['value']))
                
                ligne_info = {
                    'description': ligne['description'],
                    'value': float(ligne['value']),
                    'value_type': ligne['valueType'],
                    'type': ligne['type'],
                    'is_highlighted': ligne['isHighlighted'],
                    'montant': float(montant)
                }
                
                results['parties'][partie_id]['lines'].append(ligne_info)
                if ligne['type'] == 'reduction':
                    results['parties'][partie_id]['total'] -= montant
                else:
                    results['parties'][partie_id]['total'] += montant

        # Traiter les lignes des sous-parties
        for sous_partie_id, lignes in lignes_speciales.get('sousParties', {}).items():
            if sous_partie_id not in results['sous_parties']:
                results['sous_parties'][sous_partie_id] = {'lines': [], 'total': Decimal('0.00')}
            
            for ligne in lignes:
                montant = (base_montant * Decimal(str(ligne['value'])) / Decimal('100')) if ligne['valueType'] == 'percentage' else Decimal(str(ligne['value']))
                
                ligne_info = {
                    'description': ligne['description'],
                    'value': float(ligne['value']),
                    'value_type': ligne['valueType'],
                    'type': ligne['type'],
                    'is_highlighted': ligne['isHighlighted'],
                    'montant': float(montant)
                }
                
                results['sous_parties'][sous_partie_id]['lines'].append(ligne_info)
                if ligne['type'] == 'reduction':
                    results['sous_parties'][sous_partie_id]['total'] -= montant
                else:
                    results['sous_parties'][sous_partie_id]['total'] += montant

        # Calculer le total général
        total_general = (
            results['global']['total'] +
            sum(data['total'] for data in results['parties'].values()) +
            sum(data['total'] for data in results['sous_parties'].values())
        )

        # Convertir les décimaux en float pour la sérialisation JSON
        results['global']['total'] = float(results['global']['total'])
        for partie_id in results['parties']:
            results['parties'][partie_id]['total'] = float(results['parties'][partie_id]['total'])
        for sous_partie_id in results['sous_parties']:
            results['sous_parties'][sous_partie_id]['total'] = float(results['sous_parties'][sous_partie_id]['total'])

        return Response({
            'results': results,
            'total_general': float(total_general)
        })

    except Devis.DoesNotExist:
        return Response({'error': 'Devis non trouvé'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def get_devis_special_lines(request, devis_id):
    return calculate_special_lines(request, devis_id)

@api_view(['GET'])
def get_devis_factures(request, devis_id):
    try:
        factures = Facture.objects.filter(devis_id=devis_id)
        serializer = FactureSerializer(factures, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
    

@api_view(['PUT'])
def update_facture_status(request, facture_id):
    try:
        facture = Facture.objects.get(id=facture_id)
        facture.state_facture = request.data.get('state_facture')
        facture.save()
        return Response({'status': 'success'})
    except Facture.DoesNotExist:
        return Response({'error': 'Facture non trouvée'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def get_fournisseurs(request):
    # Récupérer uniquement les noms distincts des fournisseurs depuis Stock
    fournisseurs = Stock.objects.values_list('fournisseur__name', flat=True).distinct()
    return Response(list(fournisseurs))

def bon_commande_view(request):
    return render(request, 'bon_commande.html')


class BonCommandeViewSet(viewsets.ModelViewSet):
    queryset = BonCommande.objects.select_related('chantier', 'emetteur', 'contact_agent', 'contact_sous_traitant', 'contact_sous_traitant_contact').all()
    serializer_class = BonCommandeSerializer

    def create(self, request, *args, **kwargs):
        try:
            with transaction.atomic():
                # Création du bon de commande
                bon_commande_data = {
                    'numero': request.data.get('numero'),
                    'fournisseur': request.data.get('fournisseur'),
                    'chantier_id': request.data.get('chantier'),
                    'emetteur_id': request.data.get('emetteur'),
                    'montant_total': request.data.get('montant_total', 0),
                    'statut': request.data.get('statut', 'en_attente'),
                    'date_livraison': request.data.get('date_livraison'),
                    'magasin_retrait': request.data.get('magasin_retrait'),
                    'date_commande': request.data.get('date_commande')
                }
                
                # Ajouter les champs de contact s'ils sont présents
                if request.data.get('contact_type'):
                    bon_commande_data['contact_type'] = request.data.get('contact_type')
                    
                if request.data.get('contact_agent'):
                    bon_commande_data['contact_agent_id'] = request.data.get('contact_agent')
                    
                if request.data.get('contact_sous_traitant'):
                    bon_commande_data['contact_sous_traitant_id'] = request.data.get('contact_sous_traitant')
                    # Si un contact spécifique est fourni (et ce n'est pas le représentant)
                    if request.data.get('contact_sous_traitant_contact') and not request.data.get('is_representant', False):
                        bon_commande_data['contact_sous_traitant_contact_id'] = request.data.get('contact_sous_traitant_contact')
                    
                if request.data.get('date_creation_personnalisee'):
                    bon_commande_data['date_creation_personnalisee'] = request.data.get('date_creation_personnalisee')

                bon_commande = BonCommande.objects.create(**bon_commande_data)

                # Création des lignes
                lignes = request.data.get('lignes', [])
                for ligne in lignes:
                    # On utilise les valeurs personnalisées envoyées par le front (designation, prix_unitaire, quantite)
                    # et on ne les écrase pas par celles du produit de référence
                    LigneBonCommande.objects.create(
                        bon_commande=bon_commande,
                        produit_id=ligne['produit'],
                        designation=ligne['designation'],
                        quantite=ligne['quantite'],
                        prix_unitaire=ligne['prix_unitaire'],
                        total=ligne['total']
                    )

                serializer = self.get_serializer(bon_commande)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
    
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    def list(self, request):
        bons_commande = self.get_queryset()
        data = []
        for bc in bons_commande:
            data.append({
                'id': bc.id,
                'numero': bc.numero,
                'fournisseur': bc.fournisseur,
                'chantier': bc.chantier.id,
                'chantier_name': bc.chantier.chantier_name,
                'emetteur': bc.emetteur.id if bc.emetteur else None,
                'emetteur_name': f"{bc.emetteur.name} {bc.emetteur.surname}" if bc.emetteur else "Non spécifié",
                'montant_total': float(bc.montant_total),
                'date_creation': bc.date_creation,
                'statut': bc.statut,
                'date_livraison': bc.date_livraison,
                'magasin_retrait': bc.magasin_retrait,
                # Ajout des nouveaux champs
                'statut_paiement': bc.statut_paiement,
                'montant_paye': float(bc.montant_paye),
                'date_paiement': bc.date_paiement,
                'reste_a_payer': float(bc.montant_total - bc.montant_paye),
                'date_commande': bc.date_commande,
                # Informations de contact
                'contact_type': bc.contact_type,
                'contact_agent': {
                    'id': bc.contact_agent.id,
                    'name': bc.contact_agent.name,
                    'surname': bc.contact_agent.surname,
                    'phone_Number': bc.contact_agent.phone_Number
                } if bc.contact_agent else None,
                'contact_sous_traitant': {
                    'id': bc.contact_sous_traitant.id,
                    'entreprise': bc.contact_sous_traitant.entreprise,
                    'representant': bc.contact_sous_traitant.representant,
                    'phone_Number': bc.contact_sous_traitant.phone_Number
                } if bc.contact_sous_traitant else None,
                'date_creation_personnalisee': bc.date_creation_personnalisee,
            })
        return Response(data)

@api_view(['GET'])
def get_products_by_fournisseur(request):
    fournisseur_name = request.query_params.get('fournisseur')
    code_range = request.query_params.get('code_range')  # Nouveau paramètre pour le filtre par plage
    
    if not fournisseur_name:
        return Response(
            {'error': 'Fournisseur name is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        products = Stock.objects.filter(fournisseur__name=fournisseur_name)
        
        # Filtre par plage de codes si spécifié
        if code_range:
            if code_range == '0-99':
                products = products.extra(
                    where=["code_produit ~ '^[0-9]+$' AND CAST(code_produit AS INTEGER) BETWEEN 0 AND 99"]
                )
            elif code_range == '100-199':
                products = products.extra(
                    where=["code_produit ~ '^[0-9]+$' AND CAST(code_produit AS INTEGER) BETWEEN 100 AND 199"]
                )
            elif code_range == '200-299':
                products = products.extra(
                    where=["code_produit ~ '^[0-9]+$' AND CAST(code_produit AS INTEGER) BETWEEN 200 AND 299"]
                )
            elif code_range == '300-399':
                products = products.extra(
                    where=["code_produit ~ '^[0-9]+$' AND CAST(code_produit AS INTEGER) BETWEEN 300 AND 399"]
                )
            elif code_range == '400-499':
                products = products.extra(
                    where=["code_produit ~ '^[0-9]+$' AND CAST(code_produit AS INTEGER) BETWEEN 400 AND 499"]
                )
            elif code_range == '500+':
                products = products.extra(
                    where=["code_produit ~ '^[0-9]+$' AND CAST(code_produit AS INTEGER) >= 500"]
                )
            elif code_range == 'non-numeric':
                products = products.extra(
                    where=["NOT (code_produit ~ '^[0-9]+$')"]
                )
        
        # Tri naturel par code produit
        products = products.extra(
            select={
                'code_numeric': """
                    CASE 
                        WHEN code_produit ~ '^[0-9]+$' 
                        THEN CAST(code_produit AS INTEGER)
                        ELSE 999999 
                    END
                """
            }
        ).order_by('code_numeric', 'code_produit')
        
        serializer = StockSerializer(products, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def preview_bon_commande(request):
    try:
        bon_commande_data = json.loads(request.GET.get('bon_commande', '{}'))
        
        # Récupérer les informations détaillées
        fournisseur_id = bon_commande_data['fournisseur']
        fournisseur_name = bon_commande_data.get('fournisseurName', f'Fournisseur #{fournisseur_id}')
        chantier = get_object_or_404(Chantier, id=bon_commande_data['chantier'])
        
        # Récupérer l'émetteur depuis la base de données
        emetteur_id = bon_commande_data['emetteur']
        try:
            agent = get_object_or_404(Emetteur, id=emetteur_id)
        except:
            agent = {'id': emetteur_id, 'name': 'Inconnu', 'surname': ''}

        # Récupérer les informations de contact
        contact_agent = None
        contact_sous_traitant = None
        contact_sous_traitant_contact = None
        contact_type = bon_commande_data.get('contact_type')
        
        if contact_type == 'agent' and bon_commande_data.get('contact_agent'):
            try:
                contact_agent = get_object_or_404(Agent, id=bon_commande_data['contact_agent'])
            except:
                contact_agent = None
                
        elif contact_type == 'sous_traitant' and bon_commande_data.get('contact_sous_traitant'):
            try:
                contact_sous_traitant = get_object_or_404(SousTraitant, id=bon_commande_data['contact_sous_traitant'])
                # Si un contact spécifique est fourni (et ce n'est pas le représentant)
                if bon_commande_data.get('contact_sous_traitant_contact') and not bon_commande_data.get('is_representant', False):
                    try:
                        contact_sous_traitant_contact = get_object_or_404(ContactSousTraitant, id=bon_commande_data['contact_sous_traitant_contact'])
                    except:
                        contact_sous_traitant_contact = None
            except:
                contact_sous_traitant = None
                contact_sous_traitant_contact = None

        # Date de création personnalisée
        date_creation_personnalisee = bon_commande_data.get('date_creation_personnalisee')
        if date_creation_personnalisee:
            try:
                date_creation_personnalisee = datetime.strptime(date_creation_personnalisee, '%Y-%m-%d').date()
            except:
                date_creation_personnalisee = timezone.now().date()
        else:
            date_creation_personnalisee = timezone.now().date()

        # Formatage de la date de commande
        formatted_date_commande = None
        date_commande = bon_commande_data.get('date_commande')
        if date_commande:
            try:
                if isinstance(date_commande, str):
                    # Gérer les formats ISO avec timestamp ou date simple
                    if 'T' in date_commande:
                        date_obj = datetime.fromisoformat(date_commande.replace('Z', '+00:00'))
                    else:
                        date_obj = datetime.strptime(date_commande, '%Y-%m-%d')
                else:
                    date_obj = date_commande
                formatted_date_commande = date_obj.strftime('%d/%m/%Y').upper()
            except (ValueError, TypeError):
                formatted_date_commande = None

        # Formatage de la date de livraison
        formatted_date_livraison = None
        date_livraison = bon_commande_data.get('date_livraison')
        if date_livraison:
            try:
                if isinstance(date_livraison, str):
                    if 'T' in date_livraison:
                        date_obj = datetime.fromisoformat(date_livraison.replace('Z', '+00:00'))
                    else:
                        date_obj = datetime.strptime(date_livraison, '%Y-%m-%d')
                else:
                    date_obj = date_livraison
                formatted_date_livraison = date_obj.strftime('%d/%m/%Y').upper()
            except (ValueError, TypeError):
                formatted_date_livraison = None

        context = {
            'numero': bon_commande_data['numero'],
            'fournisseur': fournisseur_name,
            'chantier': chantier,
            'agent': agent,
            'lignes': bon_commande_data['lignes'],
            'montant_total': bon_commande_data['montant_total'],
            'date': timezone.now(),
            'statut': bon_commande_data.get('statut', 'en_attente'),
            'date_commande': formatted_date_commande,
            'date_livraison': formatted_date_livraison,
            'magasin_retrait': bon_commande_data.get('magasin_retrait'),
            'contact_type': contact_type,
            'contact_agent': contact_agent,
            'contact_sous_traitant': contact_sous_traitant,
            'contact_sous_traitant_contact': contact_sous_traitant_contact,
            'date_creation_personnalisee': date_creation_personnalisee,
        }
        
        return render(request, 'bon_commande.html', context)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def generate_bon_commande_number(request):
    try:
        last_bon = BonCommande.objects.order_by('-numero').first()
        
        if last_bon:
            last_number = int(last_bon.numero.split('-')[1])
            next_number = f"BC-{(last_number + 1):04d}"
        else:
            next_number = "BC-0001"
            
        return Response({'numero': next_number})
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def create_bon_commande(request):
    try:
        data = request.data
        
        # LOG: Données reçues du frontend
        
        # Récupérer l'émetteur depuis la base de données
        try:
            emetteur = Emetteur.objects.get(id=data['emetteur'])
        except Emetteur.DoesNotExist:
            return Response({'error': f'Émetteur avec l\'ID {data["emetteur"]} non trouvé'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Préparer les données pour la création
        bon_commande_data = {
            'numero': data['numero'],
            'fournisseur': data.get('fournisseurName', f"Fournisseur #{data['fournisseur']}"),
            'chantier_id': data['chantier'],
            'montant_total': data['montant_total'],
            'emetteur_id': emetteur.id,  # Utiliser l'ID de l'émetteur
        }
        
        
        
        # Ajouter les champs optionnels s'ils sont présents
        if data.get('date_creation_personnalisee'):
            bon_commande_data['date_creation_personnalisee'] = data['date_creation_personnalisee']
            
        if data.get('contact_type'):
            bon_commande_data['contact_type'] = data['contact_type']
            
        if data.get('contact_agent'):
            bon_commande_data['contact_agent_id'] = data['contact_agent']
            
        if data.get('contact_sous_traitant'):
            bon_commande_data['contact_sous_traitant_id'] = data['contact_sous_traitant']
            
            # Si un contact spécifique est fourni (et ce n'est pas le représentant)
            if data.get('contact_sous_traitant_contact') and not data.get('is_representant', False):
                bon_commande_data['contact_sous_traitant_contact_id'] = data['contact_sous_traitant_contact']
        
        # Créer le bon de commande
        bon_commande = BonCommande.objects.create(**bon_commande_data)

        # Créer les lignes de bon de commande
        for ligne in data['lignes']:
            LigneBonCommande.objects.create(
                bon_commande=bon_commande,
                produit_id=ligne['produit'],
                designation=ligne['designation'],
                quantite=ligne['quantite'],
                prix_unitaire=ligne['prix_unitaire'],
                total=ligne['total']
            )
        
        return Response({'message': 'Bon de commande créé avec succès'}, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([AllowAny])
def preview_saved_bon_commande(request, id):
    try:
        bon_commande = get_object_or_404(
            BonCommande.objects.select_related('contact_agent', 'contact_sous_traitant', 'contact_sous_traitant_contact', 'chantier', 'emetteur'), 
            id=id
        )
        lignes = bon_commande.lignes.all()
        
        # Récupérer les informations détaillées
        chantier = bon_commande.chantier
        
        # Récupérer l'émetteur depuis le nouveau modèle Emetteur
        agent = bon_commande.emetteur if bon_commande.emetteur else None

        # Les objets contact sont automatiquement récupérés via les ForeignKey
        contact_agent = bon_commande.contact_agent
        contact_sous_traitant = bon_commande.contact_sous_traitant
        contact_sous_traitant_contact = bon_commande.contact_sous_traitant_contact

        # Formatage de la date de commande
        formatted_date_commande = None
        if bon_commande.date_commande:
            try:
                if isinstance(bon_commande.date_commande, str):
                    # Gérer les formats ISO avec timestamp ou date simple
                    if 'T' in bon_commande.date_commande:
                        date_obj = datetime.fromisoformat(bon_commande.date_commande.replace('Z', '+00:00'))
                    else:
                        date_obj = datetime.strptime(bon_commande.date_commande, '%Y-%m-%d')
                else:
                    date_obj = bon_commande.date_commande
                formatted_date_commande = date_obj.strftime('%d/%m/%Y').upper()
            except (ValueError, TypeError):
                formatted_date_commande = None

        # Formatage de la date de livraison
        formatted_date_livraison = None
        if bon_commande.date_livraison:
            try:
                if isinstance(bon_commande.date_livraison, str):
                    if 'T' in bon_commande.date_livraison:
                        date_obj = datetime.fromisoformat(bon_commande.date_livraison.replace('Z', '+00:00'))
                    else:
                        date_obj = datetime.strptime(bon_commande.date_livraison, '%Y-%m-%d')
                else:
                    date_obj = bon_commande.date_livraison
                formatted_date_livraison = date_obj.strftime('%d/%m/%Y').upper()
            except (ValueError, TypeError):
                formatted_date_livraison = None

        context = {
            'numero': bon_commande.numero,
            'fournisseur': bon_commande.fournisseur,
            'chantier': chantier,
            'agent': agent,
            'lignes': lignes,
            'montant_total': bon_commande.montant_total,
            'date': bon_commande.date_creation,
            'statut': bon_commande.statut,
            'date_commande': formatted_date_commande,
            'date_livraison': formatted_date_livraison,
            'magasin_retrait': bon_commande.magasin_retrait,
            'contact_type': bon_commande.contact_type,
            'contact_agent': contact_agent,
            'contact_sous_traitant': contact_sous_traitant,
            'contact_sous_traitant_contact': contact_sous_traitant_contact,
            'date_creation_personnalisee': bon_commande.date_creation_personnalisee or bon_commande.date_creation.date(),
        }
        
        return render(request, 'bon_commande.html', context)
        
    except Exception as e:
        print("Error:", str(e))
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def list_bons_commande(request):
    try:
        bons_commande = BonCommande.objects.all()
        data = []
        for bc in bons_commande:
            data.append({
                'id': bc.id,
                'numero': bc.numero,
                'fournisseur': bc.fournisseur,
                'chantier': bc.chantier.id,
                'chantier_name': bc.chantier.chantier_name,
                'agent': bc.agent.id,
                'montant_total': bc.montant_total,
                'date_creation': bc.date_creation,
                'statut': bc.statut,
                'date_livraison': bc.date_livraison,  # Ajout du champ
                'magasin_retrait': bc.magasin_retrait,  # Ajout du champ
                'statut_paiement': bc.statut_paiement,
                'montant_paye': bc.montant_paye,
                'date_paiement': bc.date_paiement,
                'reste_a_payer': bc.reste_a_payer
            })
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
   

@api_view(['GET'])
def get_bon_commande_detail(request, id):
    try:
        bon_commande = get_object_or_404(BonCommande, id=id)
        lignes = []
        for ligne in bon_commande.lignes.all():
            lignes.append({
                'produit': ligne.produit.id,
                'designation': ligne.designation,
                'quantite': ligne.quantite,
                'prix_unitaire': float(ligne.prix_unitaire),
                'total': float(ligne.total)
            })
        
        data = {
            'id': bon_commande.id,
            'numero': bon_commande.numero,
            'fournisseur': bon_commande.fournisseur,
            'chantier': bon_commande.chantier.id,
            'agent': bon_commande.agent.id if bon_commande.agent else None,
            'montant_total': float(bon_commande.montant_total),
            'date_creation': bon_commande.date_creation,
            'lignes': lignes
        }
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT', 'PATCH'])
def update_bon_commande(request, id):
    try:
        bon_commande = get_object_or_404(BonCommande, id=id)
        data = request.data
        
        # Mise à jour du numéro de bon de commande
        if 'numero' in data:
            bon_commande.numero = data['numero']
        
        # Mise à jour du statut de livraison
        if 'statut' in data:
            bon_commande.statut = data['statut']
            if data.get('date_livraison'):
                bon_commande.date_livraison = data['date_livraison']
            if data.get('magasin_retrait'):
                bon_commande.magasin_retrait = data['magasin_retrait']

        # Mise à jour du paiement
        if 'montant_paye' in data:
            montant_paye = Decimal(str(data['montant_paye']))  # Convertir explicitement en string puis en Decimal
            bon_commande.montant_paye = montant_paye
            
            # Mise à jour automatique du statut de paiement
            if montant_paye >= Decimal(str(bon_commande.montant_total)):  # Convertir aussi montant_total en Decimal
                bon_commande.statut_paiement = 'paye'
            elif montant_paye > Decimal('0'):
                bon_commande.statut_paiement = 'paye_partiel'
            else:
                bon_commande.statut_paiement = 'non_paye'

            if data.get('date_paiement'):
                bon_commande.date_paiement = data['date_paiement']
        
        # Mise à jour des lignes (si présentes dans la requête)
        if 'lignes' in data:
            # Mise à jour du montant total
            if 'montant_total' in data:
                bon_commande.montant_total = Decimal(str(data['montant_total']))  # Convertir en Decimal
            
            # Supprimer toutes les anciennes lignes
            bon_commande.lignes.all().delete()
            
            # Créer les nouvelles lignes
            for ligne_data in data['lignes']:
                # Convertir explicitement en Decimal pour éviter les erreurs de type
                quantite = Decimal(str(ligne_data['quantite']))
                prix_unitaire = Decimal(str(ligne_data['prix_unitaire']))
                total = quantite * prix_unitaire
                
                LigneBonCommande.objects.create(
                    bon_commande=bon_commande,
                    produit_id=ligne_data['produit'],
                    designation=ligne_data['designation'],
                    quantite=quantite,
                    prix_unitaire=prix_unitaire,
                    total=total
                )
        
        # Sauvegarde du bon de commande après toutes les modifications
        bon_commande.save()
        
        # Sérialiser la réponse
        serializer = BonCommandeSerializer(bon_commande)
        return Response(serializer.data)
        
    except BonCommande.DoesNotExist:
        return Response(
            {"error": "Bon de commande non trouvé"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET', 'POST'])
def fournisseur_magasins(request):
    if request.method == 'GET':
        fournisseur = request.GET.get('fournisseur', '')
        if fournisseur:
            magasins = FournisseurMagasin.objects.filter(fournisseur=fournisseur)
        else:
            magasins = FournisseurMagasin.objects.all()
        return Response([{'fournisseur': m.fournisseur, 'magasin': m.magasin} for m in magasins])

    elif request.method == 'POST':
        fournisseur = request.data.get('fournisseur')
        magasin = request.data.get('magasin')
        if not fournisseur or not magasin:
            return Response({'error': 'Fournisseur et magasin sont requis'}, status=400)
        
        FournisseurMagasin.objects.get_or_create(
            fournisseur=fournisseur,
            magasin=magasin
        )
        return Response({'status': 'success'})

@api_view(['GET'])
def list_fournisseur_magasins(request):
    try:
        magasins = FournisseurMagasin.objects.all().order_by('fournisseur', '-derniere_utilisation')
        data = [{
            'id': fm.id,
            'fournisseur': fm.fournisseur,
            'magasin': fm.magasin,
            'derniere_utilisation': fm.derniere_utilisation
        } for fm in magasins]
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
def delete_bon_commande(request, id):
    try:
        bon_commande = BonCommande.objects.get(id=id)
        bon_commande.delete()
        return Response({"message": "Bon de commande supprimé avec succès"}, status=status.HTTP_204_NO_CONTENT)
    except BonCommande.DoesNotExist:
        return Response({"error": "Bon de commande non trouvé"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'POST'])  # Ajout de GET dans les méthodes autorisées
def add_prime(request, agent_id):
    if request.method == 'GET':
        try:
            agent = Agent.objects.get(id=agent_id)
            month_year = request.query_params.get('month_year')
            
            if not month_year:
                return Response(
                    {"error": "month_year est requis"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            primes = agent.primes or {}
            return Response(primes.get(month_year, []))
            
        except Agent.DoesNotExist:
            return Response(
                {"error": "Agent non trouvé"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    elif request.method == 'POST':
        try:
            agent = Agent.objects.get(id=agent_id)
            serializer = AgentPrimeSerializer(data=request.data)
            
            if serializer.is_valid():
                month_year = request.data.get('month_year')
                if not month_year:
                    return Response(
                        {"error": "month_year est requis"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                primes = agent.primes or {}
                if month_year not in primes:
                    primes[month_year] = []
                    
                nouvelle_prime = {
                    'description': serializer.validated_data['description'],
                    'montant': float(serializer.validated_data['montant'])
                }
                
                primes[month_year].append(nouvelle_prime)
                agent.primes = primes
                agent.save()
                
                return Response(primes[month_year], status=status.HTTP_201_CREATED)
                
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        except Agent.DoesNotExist:
            return Response(
                {"error": "Agent non trouvé"}, 
                status=status.HTTP_404_NOT_FOUND
            )

@api_view(['DELETE'])
def delete_prime(request, agent_id, prime_id):
    try:
        agent = Agent.objects.get(id=agent_id)
        month_year = request.query_params.get('month_year')
        
        if not month_year:
            return Response(
                {"error": "month_year est requis"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        primes = agent.primes or {}
        if month_year in primes:
            try:
                prime_index = int(prime_id)
                if 0 <= prime_index < len(primes[month_year]):
                    primes[month_year].pop(prime_index)
                    agent.primes = primes
                    agent.save()
                    return Response(status=status.HTTP_204_NO_CONTENT)
            except (ValueError, IndexError):
                pass
                
        return Response(
            {"error": "Prime non trouvée"}, 
            status=status.HTTP_404_NOT_FOUND
        )
        
    except Agent.DoesNotExist:
        return Response(
            {"error": "Agent non trouvé"}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
def get_agent_primes(request, agent_id):
    try:
        agent = Agent.objects.get(id=agent_id)
        month_year = request.query_params.get('month_year')
        
        if not month_year:
            return Response(
                {"error": "month_year est requis"}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        primes = agent.primes or {}
        return Response(primes.get(month_year, []))
        
    except Agent.DoesNotExist:
        return Response(
            {"error": "Agent non trouvé"}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
def get_taux_fixe(request):
    taux_fixe, created = Parametres.objects.get_or_create(
        code='TAUX_FIXE',
        defaults={'valeur': 20.00, 'description': 'Taux fixe par défaut'}
    )
    return Response({'valeur': taux_fixe.valeur})

@api_view(['POST'])
def update_taux_fixe(request):
    try:
        nouveau_taux = request.data.get('taux_fixe')
        if nouveau_taux is None:
            return Response({'error': 'Taux fixe manquant'}, status=400)
        
        # Convertir en Decimal avec 2 décimales
        TWOPLACES = Decimal('0.01')
        nouveau_taux_decimal = Decimal(str(nouveau_taux)).quantize(TWOPLACES)
            
        # Mettre à jour le paramètre global
        taux_fixe, created = Parametres.objects.get_or_create(
            code='TAUX_FIXE',
            defaults={'valeur': nouveau_taux_decimal, 'description': 'Taux fixe par défaut'}
        )
        
        if not created:
            taux_fixe.valeur = nouveau_taux_decimal
            taux_fixe.save()
        
        # Mettre à jour toutes les lignes de détail existantes
        lignes_details = LigneDetail.objects.all()
        lignes_mises_a_jour = []
        
        for ligne in lignes_details:
            # Mettre à jour le taux fixe
            ligne.taux_fixe = nouveau_taux_decimal
            
            # Recalculer le prix avec le nouveau taux fixe
            cout_main_oeuvre = Decimal(str(ligne.cout_main_oeuvre)).quantize(TWOPLACES)
            cout_materiel = Decimal(str(ligne.cout_materiel)).quantize(TWOPLACES)
            marge = Decimal(str(ligne.marge)).quantize(TWOPLACES)
            
            # Calcul du prix avec arrondis intermédiaires
            base = (cout_main_oeuvre + cout_materiel).quantize(TWOPLACES)
            montant_taux_fixe = (base * (nouveau_taux_decimal / Decimal('100'))).quantize(TWOPLACES)
            sous_total = (base + montant_taux_fixe).quantize(TWOPLACES)
            montant_marge = (sous_total * (marge / Decimal('100'))).quantize(TWOPLACES)
            prix = (sous_total + montant_marge).quantize(TWOPLACES)
            
            ligne.prix = prix
            ligne.save()
            
            # Ajouter à la liste des lignes mises à jour
            lignes_mises_a_jour.append({
                'id': ligne.id,
                'description': ligne.description,
                'taux_fixe': float(ligne.taux_fixe),
                'prix': float(ligne.prix),
                'cout_main_oeuvre': float(ligne.cout_main_oeuvre),
                'cout_materiel': float(ligne.cout_materiel),
                'marge': float(ligne.marge)
            })
            
        return Response({
            'valeur': float(taux_fixe.valeur),
            'lignes_mises_a_jour': lignes_mises_a_jour,
            'nombre_lignes_mises_a_jour': len(lignes_mises_a_jour)
        })
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def get_chantier_avenants(request, chantier_id):
    """Récupère tous les avenants d'un chantier avec leurs TS associés"""
    try:
        # Récupérer uniquement les avenants qui ont des TS associés
        avenants = (Avenant.objects
                   .filter(chantier_id=chantier_id)
                   .annotate(ts_count=models.Count('factures_ts'))
                   .filter(ts_count__gt=0)
                   .prefetch_related('factures_ts')
                   .order_by('numero'))
        
        serializer = AvenantSerializer(avenants, many=True)
        
        return Response({
            'success': True,
            'avenants': serializer.data
        })
    except Exception as e:
        return Response(
            {
                'success': False,
                'error': str(e)
            },
            status=status.HTTP_400_BAD_REQUEST
        )
@api_view(['GET'])
def get_next_ts_number(request, chantier_id):
    """Récupère le prochain numéro de TS disponible pour un chantier"""
    max_numero = FactureTS.objects.filter(chantier_id=chantier_id).aggregate(
        Max('numero_ts')
    )['numero_ts__max'] or 0
    return Response({'next_number': f"{max_numero + 1:03d}"})

@api_view(['POST'])
@transaction.atomic
def create_facture_ts(request):
    try:
        devis = Devis.objects.get(id=request.data['devis_id'])
        chantier_id = request.data['chantier_id']
        designation = request.data.get('numero_ts', '')
        
        # Si on doit créer un nouvel avenant
        avenant_id = request.data.get('avenant_id')
        if request.data.get('create_new_avenant'):
            last_avenant = Avenant.objects.filter(chantier_id=chantier_id).order_by('-numero').first()
            new_avenant_number = (last_avenant.numero + 1) if last_avenant else 1
            
            avenant = Avenant.objects.create(
                chantier_id=chantier_id,
                numero=new_avenant_number
            )
            avenant_id = avenant.id

        # Calculer le prochain numéro de TS pour ce chantier
        last_ts = FactureTS.objects.filter(chantier_id=chantier_id).order_by('-numero_ts').first()
        next_ts_number = (last_ts.numero_ts + 1) if last_ts else 1

        # Créer la facture TS
        facture_ts = FactureTS.objects.create(
            devis=devis,
            chantier_id=chantier_id,
            avenant_id=avenant_id,
            numero_ts=next_ts_number,
            designation=designation,
            montant_ht=devis.price_ht,
            montant_ttc=devis.price_ttc,
            tva_rate=devis.tva_rate
        )

        # Créer aussi une Facture standard pour garder la cohérence
        facture_standard = Facture.objects.create(
            numero=f"{devis.numero} / TS{next_ts_number:03d}",
            devis=devis,
            chantier_id=chantier_id,
            type_facture='ts',
            price_ht=devis.price_ht,
            price_ttc=devis.price_ttc,
            designation=designation,
            avenant_id=avenant_id,
            # Transférer les coûts estimés du devis
            cout_estime_main_oeuvre=devis.cout_estime_main_oeuvre,
            cout_estime_materiel=devis.cout_estime_materiel
        )

        return Response({
            "success": True,
            "message": f"Facture TS créée avec succès",
            "facture_ts_id": facture_ts.id,
            "facture_id": facture_standard.id,
            "numero_ts": next_ts_number
        })

    except Devis.DoesNotExist:
        return Response(
            {"error": "Devis non trouvé"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['POST'])
@transaction.atomic
def create_facture_cie(request):
    try:
        devis = Devis.objects.get(id=request.data['devis_id'])
        
        # Vérifier que ce n'est pas un devis de chantier
        if devis.devis_chantier:
            return Response(
                {"error": "Les devis de chantier ne peuvent pas être transformés en facture CIE"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        chantier_id = request.data['chantier_id']
        mois = request.data.get('mois_situation')
        annee = request.data.get('annee_situation')
        designation = request.data.get('numero_ts', '')  # Changé pour correspondre au format TS

        # Vérification des données requises
        if not mois or not annee:
            return Response(
                {"error": "Le mois et l'année de situation sont requis pour une facture CIE"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not (1 <= int(mois) <= 12):
            return Response(
                {"error": "Le mois doit être compris entre 1 et 12"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Construire le numéro de facture CIE
        cie_number = devis.numero  # Utiliser le numéro existant
        
        # Ajouter la désignation si elle existe
        if designation:
            cie_number = f"{cie_number} / {designation}"
            
       

        # ✅ Préparer les données de la facture CIE avec contact_societe depuis le devis
        facture_cie_data = {
            'numero': cie_number,
            'devis': devis,
            'chantier_id': chantier_id,
            'type_facture': 'cie',
            'price_ht': devis.price_ht,
            'price_ttc': devis.price_ttc,
            'designation': designation,
            'mois_situation': mois,
            'annee_situation': annee,
            # Transférer les coûts estimés du devis
            'cout_estime_main_oeuvre': devis.cout_estime_main_oeuvre,
            'cout_estime_materiel': devis.cout_estime_materiel
        }
        
        # ✅ Copier contact_societe depuis le devis si disponible
        if devis.contact_societe:
            facture_cie_data['contact_societe'] = devis.contact_societe
        
        # Créer la facture CIE
        facture_cie = Facture.objects.create(**facture_cie_data)

        return Response({
            "success": True,
            "message": f"Facture CIE créée avec succès",
            "facture_id": facture_cie.id,
            "numero_cie": cie_number
        })

    except Devis.DoesNotExist:
        return Response(
            {"error": "Devis non trouvé"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

class SituationViewSet(viewsets.ModelViewSet):
    queryset = Situation.objects.all()
    serializer_class = SituationSerializer

    def get_queryset(self):
        """Optimise les requêtes avec prefetch_related pour charger les lignes"""
        return Situation.objects.prefetch_related(
            'lignes',
            'lignes__ligne_devis',
            'lignes_supplementaires',
            'lignes_avenant',
            'lignes_speciales'
        ).select_related('devis', 'chantier')

    def create(self, request, *args, **kwargs):
        try:
            data = request.data.copy()
            
            # ✅ Si contact_societe n'est pas fourni, copier celui du devis si disponible
            if 'contact_societe' not in data or not data.get('contact_societe'):
                devis_id = data.get('devis')
                if devis_id:
                    try:
                        devis = Devis.objects.get(id=devis_id)
                        if devis.contact_societe:
                            data['contact_societe'] = devis.contact_societe.id
                    except Devis.DoesNotExist:
                        pass
            
            # Utiliser le SituationCreateSerializer pour la validation et la création
            serializer = SituationCreateSerializer(data=data)
            if not serializer.is_valid():
                print("❌ Erreurs de validation:", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Créer la situation
            print("✅ Validation réussie, création de la situation...")
            situation = serializer.save()
            print(f"✅ Situation créée avec ID: {situation.id}")

            # Créer les lignes de situation
            for ligne_data in data.get('lignes', []):
                    SituationLigne.objects.create(
                        situation=situation,
                    ligne_devis_id=ligne_data['ligne_devis'],
                    description=ligne_data['description'],
                    quantite=Decimal(str(ligne_data['quantite'])),
                    prix_unitaire=Decimal(str(ligne_data['prix_unitaire'])),
                    total_ht=Decimal(str(ligne_data['total_ht'])),
                    pourcentage_actuel=Decimal(str(ligne_data['pourcentage_actuel'])),
                    montant=Decimal(str(ligne_data['montant']))
                )

            # Créer les lignes supplémentaires
            for ligne_data in data.get('lignes_supplementaires', []):
                    SituationLigneSupplementaire.objects.create(
                        situation=situation,
                    description=ligne_data['description'],
                    montant=Decimal(str(ligne_data['montant'])),
                    type=ligne_data.get('type', 'deduction')
                )

            # Créer les lignes spéciales
            for ligne_data in data.get('lignes_speciales', []):
                SituationLigneSpeciale.objects.create(
                    situation=situation,
                    description=ligne_data['description'],
                    montant_ht=Decimal(str(ligne_data.get('value', 0))),
                    value=Decimal(str(ligne_data.get('value', 0))),
                    value_type=ligne_data.get('valueType', 'fixed'),
                    type=ligne_data.get('type', 'reduction'),
                    niveau=ligne_data.get('niveau', 'global'),
                    partie_id=ligne_data.get('partie_id'),
                    sous_partie_id=ligne_data.get('sous_partie_id'),
                    pourcentage_precedent=Decimal(str(ligne_data.get('pourcentage_precedent', 0))),
                    pourcentage_actuel=Decimal(str(ligne_data.get('pourcentage_actuel', 0))),
                    montant=Decimal(str(ligne_data.get('montant', 0)))
                )

            # Créer les lignes d'avenants si présentes
            if 'lignes_avenant' in data:
                for ligne in data['lignes_avenant']:
                    SituationLigneAvenant.objects.create(
                        situation=situation,
                        facture_ts_id=ligne['facture_ts'],
                        avenant_id=ligne['avenant_id'],
                        montant_ht=Decimal(str(ligne.get('montant_ht', '0'))),
                        pourcentage_actuel=Decimal(str(ligne.get('pourcentage_actuel', '0'))),
                        montant=Decimal(str(ligne.get('montant', '0')))
                    )

            # Recharger la situation avec toutes ses relations
            situation = Situation.objects.select_related('devis').prefetch_related(
                'lignes',
                'lignes_supplementaires',
                'lignes_speciales',
                'lignes_avenant'
            ).get(id=situation.id)

            return Response(
                SituationSerializer(situation).data,
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            print("Erreur dans SituationViewSet.create:", str(e))
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class SituationLigneViewSet(viewsets.ModelViewSet):
    queryset = SituationLigne.objects.all()
    serializer_class = SituationLigneSerializer

    def create(self, request, *args, **kwargs):
        try:
            situation_ligne = super().create(request, *args, **kwargs)
            
            # Récupérer la situation
            situation = Situation.objects.get(id=request.data['situation'])
            
            # Mettre à jour les montants avec les valeurs du frontend
            self.update_situation_from_frontend(situation, request.data)
            
            return situation_ligne
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        instance = serializer.save()
        self.update_situation_montants(instance.situation)



@api_view(['GET'])
def get_situations_chantier(request, chantier_id):
    """Récupère toutes les situations d'un chantier"""
    try:
        situations = (Situation.objects
                     .filter(chantier_id=chantier_id)
                     .prefetch_related('lignes', 'lignes__ligne_devis', 'lignes_avenant', 'lignes_supplementaires')
                     .order_by('annee', 'mois'))
        
        serializer = SituationSerializer(situations, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def get_situation_detail(request, situation_id):
    """Récupère le détail d'une situation spécifique"""
    try:
        situation = (Situation.objects
                    .prefetch_related('lignes', 'lignes__ligne_devis', 'lignes_avenant', 'lignes_supplementaires')
                    .get(id=situation_id))
        
        serializer = SituationSerializer(situation)
        data = serializer.data
        data['net_a_payer'] = SituationService.calculer_net_a_payer(situation)
        return Response(data)
    except Situation.DoesNotExist:
        return Response({'error': 'Situation non trouvée'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)



@api_view(['DELETE'])
def delete_situation(request, situation_id):
    """Supprime une situation"""
    try:
        situation = Situation.objects.get(id=situation_id)
        
        # Vérifier si la situation peut être supprimée
        if situation.statut != 'brouillon':
            return Response(
                {'error': 'Seules les situations en brouillon peuvent être supprimées'}, 
                status=400
            )
            
        situation.delete()
        return Response(status=204)
    except Situation.DoesNotExist:
        return Response({'error': 'Situation non trouvée'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)



class SituationService:
    @staticmethod
    def calculer_montant_precedent(chantier, mois, annee):
        situation_precedente = Situation.objects.filter(
            chantier=chantier,
            annee__lt=annee | (Q(annee=annee) & Q(mois__lt=mois))
        ).order_by('-annee', '-mois').first()
        
        return situation_precedente.montant_total if situation_precedente else 0

    @staticmethod
    def calculer_montant_ht_mois(situation):
        total = 0
        # Somme des lignes standard
        total += situation.lignes.aggregate(
            sum=Sum(F('montant'))
        )['sum'] or 0
        
        # Somme des lignes d'avenant
        total += situation.lignes_avenant.aggregate(
            sum=Sum(F('montant'))
        )['sum'] or 0
        
        return total

    @staticmethod
    def calculer_pourcentage_avancement(montant_total, devis_ht):
        if devis_ht:
            return (montant_total / devis_ht) * 100
        return 0

    @staticmethod
    def calculer_net_a_payer(situation):
        montant = situation.montant_ht_mois
        montant -= situation.retenue_garantie
        montant -= situation.montant_prorata
        montant -= situation.retenue_cie
        
        for ligne in situation.lignes_supplementaires.all():
            if ligne.type == 'deduction':
                montant -= ligne.montant
            else:
                montant += ligne.montant
                
        return montant

@api_view(['POST'])
@transaction.atomic
def create_situation(request):
    try:
        data = request.data.copy()
        
        # ✅ Si contact_societe n'est pas fourni, copier celui du devis si disponible
        if 'contact_societe' not in data or not data.get('contact_societe'):
            devis_id = data.get('devis')
            if devis_id:
                try:
                    devis = Devis.objects.get(id=devis_id)
                    if devis.contact_societe:
                        data['contact_societe'] = devis.contact_societe.id
                except Devis.DoesNotExist:
                    pass

        # Utiliser le SituationCreateSerializer au lieu de SituationSerializer
        serializer = SituationCreateSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Créer la situation
        situation = serializer.save()
        
        # Si aucune date de création n'est fournie, utiliser la date actuelle
        if not situation.date_creation:
            from django.utils import timezone
            situation.date_creation = timezone.now()
            situation.save()

        # Créer les lignes de situation
        for ligne_data in data.get('lignes', []):
            SituationLigne.objects.create(
                situation=situation,
                ligne_devis_id=ligne_data['ligne_devis'],
                description=ligne_data['description'],
                quantite=Decimal(str(ligne_data['quantite'])),
                prix_unitaire=Decimal(str(ligne_data['prix_unitaire'])),
                total_ht=Decimal(str(ligne_data['total_ht'])),
                pourcentage_actuel=Decimal(str(ligne_data['pourcentage_actuel'])),
                montant=Decimal(str(ligne_data['montant']))
            )

        # Créer les lignes supplémentaires
        for ligne_data in data.get('lignes_supplementaires', []):
            SituationLigneSupplementaire.objects.create(
                situation=situation,
                description=ligne_data['description'],
                montant=Decimal(str(ligne_data['montant'])),
                type=ligne_data.get('type', 'deduction')
            )

        # Créer les lignes spéciales
        for ligne_data in data.get('lignes_speciales', []):
            SituationLigneSpeciale.objects.create(
                situation=situation,
                description=ligne_data['description'],
                montant_ht=Decimal(str(ligne_data.get('value', 0))),
                value=Decimal(str(ligne_data.get('value', 0))),
                value_type=ligne_data.get('valueType', 'fixed'),
                type=ligne_data.get('type', 'reduction'),
                niveau=ligne_data.get('niveau', 'global'),
                partie_id=ligne_data.get('partie_id'),
                sous_partie_id=ligne_data.get('sous_partie_id'),
                pourcentage_precedent=Decimal(str(ligne_data.get('pourcentage_precedent', 0))),
                pourcentage_actuel=Decimal(str(ligne_data.get('pourcentage_actuel', 0))),
                montant=Decimal(str(ligne_data.get('montant', 0)))
            )

        # Recharger la situation avec toutes ses relations
        situation = Situation.objects.select_related('devis').prefetch_related(
            'lignes',
            'lignes_supplementaires',
            'lignes_speciales'
        ).get(id=situation.id)
        
        # Recalculer le montant_apres_retenues pour s'assurer qu'il est correct
        montant_ht_mois = situation.montant_ht_mois
        retenue_garantie = situation.retenue_garantie
        montant_prorata = situation.montant_prorata
        retenue_cie = situation.retenue_cie
        
        # Calculer le montant après retenues
        montant_apres_retenues = montant_ht_mois - retenue_garantie - montant_prorata - retenue_cie
        
        # Ajouter l'impact des lignes supplémentaires
        for ligne_suppl in situation.lignes_supplementaires.all():
            if ligne_suppl.type == 'deduction':
                montant_apres_retenues -= ligne_suppl.montant
            else:
                montant_apres_retenues += ligne_suppl.montant
        
        # Mettre à jour le montant_apres_retenues en base de données
        situation.montant_apres_retenues = montant_apres_retenues
        situation.save()

        response_data = SituationSerializer(situation).data
        


        return Response(response_data, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET'])
def get_situation_detail(request, situation_id):
    try:
        situation = Situation.objects.get(id=situation_id)
        serializer = SituationSerializer(situation)
        return Response(serializer.data)
    except Situation.DoesNotExist:
        return Response(
            {'error': 'Situation non trouvée'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
def get_situations_chantier(request, chantier_id):
    situations = Situation.objects.filter(chantier_id=chantier_id)
    serializer = SituationSerializer(situations, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
def update_situation(request, pk):
    try:
        situation = Situation.objects.get(pk=pk)
        data = request.data

        # Convertir les IDs en instances
        if 'chantier' in data:
            data['chantier'] = Chantier.objects.get(pk=data['chantier'])
        if 'devis' in data:
            data['devis'] = Devis.objects.get(pk=data['devis'])

        # Supprimer les anciennes lignes SEULEMENT si de nouvelles sont fournies
        if 'lignes' in data:
            situation.lignes.all().delete()
        if 'lignes_supplementaires' in data:
            situation.lignes_supplementaires.all().delete()
        if 'lignes_avenant' in data:
            situation.lignes_avenant.all().delete()
        if 'lignes_speciales' in data:
            situation.lignes_speciales.all().delete()

        # Mise à jour des champs de base
        for field in ['mois', 'annee', 'numero_situation', 'date_creation', 'montant_ht_mois', 'cumul_precedent', 
                     'montant_total_cumul_ht', 'retenue_garantie', 'montant_prorata', 
                     'retenue_cie', 'montant_apres_retenues', 'tva', 'montant_total_ttc', 
                     'pourcentage_avancement', 'taux_prorata']:
            if field in data:
                setattr(situation, field, data[field])
        situation.save()

        # Création des nouvelles lignes
        if 'lignes' in data:
            for ligne in data['lignes']:
                SituationLigne.objects.create(
                    situation=situation,
                    ligne_devis_id=ligne['ligne_devis'],
                    description=ligne.get('description', ''),
                    quantite=Decimal(str(ligne.get('quantite', '0'))),
                    prix_unitaire=Decimal(str(ligne.get('prix_unitaire', '0'))),
                    total_ht=Decimal(str(ligne.get('total_ht', '0'))),
                    pourcentage_actuel=Decimal(str(ligne.get('pourcentage_actuel', '0'))),
                    montant=Decimal(str(ligne.get('montant', '0')))
                )

        # Création des lignes supplémentaires
        if 'lignes_supplementaires' in data:
            for ligne in data['lignes_supplementaires']:
                SituationLigneSupplementaire.objects.create(
                    situation=situation,
                    description=ligne.get('description', ''),
                    montant=Decimal(str(ligne.get('montant', '0'))),
                    type=ligne.get('type', 'deduction')
                )

        # Création des lignes d'avenant
        if 'lignes_avenant' in data:
            for ligne in data['lignes_avenant']:
                SituationLigneAvenant.objects.create(
                    situation=situation,
                    facture_ts_id=ligne['facture_ts'],
                    avenant_id=ligne['avenant_id'],
                    montant_ht=Decimal(str(ligne.get('montant_ht', '0'))),
                    pourcentage_actuel=Decimal(str(ligne.get('pourcentage_actuel', '0'))),
                    montant=Decimal(str(ligne.get('montant', '0')))
                )

        # Création des lignes spéciales
        if 'lignes_speciales' in data:
            for ligne in data['lignes_speciales']:
                # Calculer montant_ht à partir de value et pourcentage_actuel si montant_ht n'est pas fourni
                montant_ht = ligne.get('montant_ht')
                if montant_ht is None:
                    value = Decimal(str(ligne.get('value', '0')))
                    pourcentage_actuel = Decimal(str(ligne.get('pourcentage_actuel', '0')))
                    montant_ht = (value * pourcentage_actuel) / Decimal('100')
                else:
                    montant_ht = Decimal(str(montant_ht))
                
                SituationLigneSpeciale.objects.create(
                    situation=situation,
                    description=ligne.get('description', ''),
                    montant_ht=montant_ht,
                    value=Decimal(str(ligne.get('value', '0'))),
                    value_type=ligne.get('valueType', 'fixed'),
                    type=ligne.get('type', 'addition'),
                    niveau=ligne.get('niveau', 'global'),
                    partie_id=ligne.get('partie_id'),
                    sous_partie_id=ligne.get('sous_partie_id'),
                    pourcentage_actuel=Decimal(str(ligne.get('pourcentage_actuel', '0'))),
                    montant=Decimal(str(ligne.get('montant', '0')))
                )

        # Mise à jour des champs spécifiques
        if 'date_envoi' in data:
            situation.date_envoi = data['date_envoi']
        if 'delai_paiement' in data:
            situation.delai_paiement = data['delai_paiement']
        if 'montant_reel_ht' in data:
            situation.montant_reel_ht = data['montant_reel_ht']
        if 'date_paiement_reel' in data:
            situation.date_paiement_reel = data['date_paiement_reel']
        if 'numero_cp' in data:
            situation.numero_cp = data['numero_cp']
        if 'banque' in data:
            situation.banque_id = data['banque']
            
        # Calculer le montant_total_cumul_ht selon la logique correcte (somme des lignes avec pourcentages actuels)
        montant_total_cumul_ht = Decimal('0.00')
        
        # Somme des lignes standard avec pourcentages actuels
        for ligne in situation.lignes.all():
            montant_ligne = (ligne.total_ht * ligne.pourcentage_actuel) / Decimal('100')
            montant_total_cumul_ht += montant_ligne
        
        # Somme des lignes d'avenant avec pourcentages actuels
        for ligne_avenant in situation.lignes_avenant.all():
            montant_avenant = (ligne_avenant.montant_ht * ligne_avenant.pourcentage_actuel) / Decimal('100')
            montant_total_cumul_ht += montant_avenant
        
        # Somme des lignes spéciales avec pourcentages actuels
        for ligne_speciale in situation.lignes_speciales.all():
            montant_speciale = (ligne_speciale.value * ligne_speciale.pourcentage_actuel) / Decimal('100')
            if ligne_speciale.type == 'reduction':
                montant_total_cumul_ht -= montant_speciale
            else:
                montant_total_cumul_ht += montant_speciale
                
        situation.montant_total_cumul_ht = montant_total_cumul_ht
        
        # Calculer le cumul_precedent à partir de la situation précédente
        situation_precedente = Situation.objects.filter(
            chantier=situation.chantier
        ).filter(
            Q(annee__lt=situation.annee) | (Q(annee=situation.annee) & Q(mois__lt=situation.mois))
        ).order_by('-annee', '-mois').first()
        
        if situation_precedente:
            situation.cumul_precedent = situation_precedente.montant_total_cumul_ht
        else:
            situation.cumul_precedent = Decimal('0.00')
            
        # Calculer le montant_ht_mois (différence entre total cumulé et cumul précédent)
        montant_ht_mois = montant_total_cumul_ht - situation.cumul_precedent
        situation.montant_ht_mois = montant_ht_mois
        
        # Recalculer les montants dérivés basés sur montant_ht_mois
        # Retenue de garantie (5%)
        situation.retenue_garantie = (montant_ht_mois * Decimal('5')) / Decimal('100')
        
        # Prorata (basé sur taux_prorata)
        taux_prorata_decimal = Decimal(str(situation.taux_prorata or '0'))
        situation.montant_prorata = (montant_ht_mois * taux_prorata_decimal) / Decimal('100')
        
        # Retenue CIE (montant fixe, déjà défini)
        retenue_cie_decimal = Decimal(str(situation.retenue_cie or '0'))
        
        # Calculer le montant après retenues
        montant_apres_retenues = montant_ht_mois - situation.retenue_garantie - situation.montant_prorata - retenue_cie_decimal
        
        # Ajouter l'impact des lignes supplémentaires
        for ligne_suppl in situation.lignes_supplementaires.all():
            if ligne_suppl.type == 'deduction':
                montant_apres_retenues -= ligne_suppl.montant
            else:
                montant_apres_retenues += ligne_suppl.montant
                
        situation.montant_apres_retenues = montant_apres_retenues
        
        # Calculer la TVA (20%)
        situation.tva = (montant_apres_retenues * Decimal('20')) / Decimal('100')
        
        # Calculer le montant TTC
        situation.montant_total_ttc = montant_apres_retenues + situation.tva
        
        # Recalculer le montant_precedent à partir de la situation précédente
        situation_precedente = Situation.objects.filter(
            chantier=situation.chantier
        ).filter(
            Q(annee__lt=situation.annee) | (Q(annee=situation.annee) & Q(mois__lt=situation.mois))
        ).order_by('-annee', '-mois').first()
        
        if situation_precedente:
            situation.montant_precedent = situation_precedente.montant_total
        else:
            situation.montant_precedent = Decimal('0.00')
            
        # Recalculer le montant_total
        situation.montant_total = situation.montant_precedent + situation.montant_ht_mois
        
        # Recalculer le pourcentage d'avancement (comme dans le frontend)
        montant_total_travaux_decimal = Decimal(str(situation.montant_total_travaux or '0'))
        if montant_total_travaux_decimal > 0:
            situation.pourcentage_avancement = (montant_total_cumul_ht / montant_total_travaux_decimal) * Decimal('100')
        else:
            situation.pourcentage_avancement = Decimal('0.00')
            
        situation.save()
        
        # Recalculer les montants des situations suivantes
        situations_suivantes = Situation.objects.filter(
            chantier=situation.chantier
        ).filter(
            Q(annee__gt=situation.annee) | (Q(annee=situation.annee) & Q(mois__gt=situation.mois))
        ).order_by('annee', 'mois')
        
        for situation_suivante in situations_suivantes:
            # Recalculer le montant_total_cumul_ht pour chaque situation suivante (somme des lignes avec pourcentages actuels)
            montant_total_cumul_ht_suivante = Decimal('0.00')
            
            # Somme des lignes standard avec pourcentages actuels
            for ligne in situation_suivante.lignes.all():
                montant_ligne = (ligne.total_ht * ligne.pourcentage_actuel) / Decimal('100')
                montant_total_cumul_ht_suivante += montant_ligne
            
            # Somme des lignes d'avenant avec pourcentages actuels
            for ligne_avenant in situation_suivante.lignes_avenant.all():
                montant_avenant = (ligne_avenant.montant_ht * ligne_avenant.pourcentage_actuel) / Decimal('100')
                montant_total_cumul_ht_suivante += montant_avenant
            
            # Somme des lignes spéciales avec pourcentages actuels
            for ligne_speciale in situation_suivante.lignes_speciales.all():
                montant_speciale = (ligne_speciale.value * ligne_speciale.pourcentage_actuel) / Decimal('100')
                if ligne_speciale.type == 'reduction':
                    montant_total_cumul_ht_suivante -= montant_speciale
                else:
                    montant_total_cumul_ht_suivante += montant_speciale
                    
            situation_suivante.montant_total_cumul_ht = montant_total_cumul_ht_suivante
            
            # Recalculer le cumul_precedent pour chaque situation suivante
            situation_precedente_suivante = Situation.objects.filter(
                chantier=situation_suivante.chantier
            ).filter(
                Q(annee__lt=situation_suivante.annee) | (Q(annee=situation_suivante.annee) & Q(mois__lt=situation_suivante.mois))
            ).order_by('-annee', '-mois').first()
            
            if situation_precedente_suivante:
                situation_suivante.cumul_precedent = situation_precedente_suivante.montant_total_cumul_ht
            else:
                situation_suivante.cumul_precedent = Decimal('0.00')
                
            # Recalculer le montant_ht_mois pour chaque situation suivante
            montant_ht_mois_suivante = montant_total_cumul_ht_suivante - situation_suivante.cumul_precedent
            situation_suivante.montant_ht_mois = montant_ht_mois_suivante
            
            # Recalculer les montants dérivés pour chaque situation suivante
            # Retenue de garantie (5%)
            situation_suivante.retenue_garantie = (montant_ht_mois_suivante * Decimal('5')) / Decimal('100')
            
            # Prorata (basé sur taux_prorata)
            taux_prorata_suivante_decimal = Decimal(str(situation_suivante.taux_prorata or '0'))
            situation_suivante.montant_prorata = (montant_ht_mois_suivante * taux_prorata_suivante_decimal) / Decimal('100')
            
            # Retenue CIE (montant fixe, déjà défini)
            retenue_cie_suivante_decimal = Decimal(str(situation_suivante.retenue_cie or '0'))
            
            # Calculer le montant après retenues
            montant_apres_retenues_suivante = montant_ht_mois_suivante - situation_suivante.retenue_garantie - situation_suivante.montant_prorata - retenue_cie_suivante_decimal
            
            # Ajouter l'impact des lignes supplémentaires
            for ligne_suppl in situation_suivante.lignes_supplementaires.all():
                if ligne_suppl.type == 'deduction':
                    montant_apres_retenues_suivante -= ligne_suppl.montant
                else:
                    montant_apres_retenues_suivante += ligne_suppl.montant
                    
            situation_suivante.montant_apres_retenues = montant_apres_retenues_suivante
            
            # Calculer la TVA (20%)
            situation_suivante.tva = (montant_apres_retenues_suivante * Decimal('20')) / Decimal('100')
            
            # Calculer le montant TTC
            situation_suivante.montant_total_ttc = montant_apres_retenues_suivante + situation_suivante.tva
            
            # Recalculer le montant_precedent et montant_total
            if situation_precedente_suivante:
                situation_suivante.montant_precedent = situation_precedente_suivante.montant_total
            else:
                situation_suivante.montant_precedent = Decimal('0.00')
                
            situation_suivante.montant_total = situation_suivante.montant_precedent + situation_suivante.montant_ht_mois
                
            situation_suivante.save()

        # Retourner la situation mise à jour
        situation_complete = Situation.objects.prefetch_related(
            'lignes', 'lignes_supplementaires', 'lignes_avenant', 'lignes_speciales'
        ).get(pk=situation.pk)
        
        return Response(SituationSerializer(situation_complete).data)
        
    except Exception as e:
        print(f"🔧 Erreur dans update_situation: {str(e)}")
        import traceback
        print(f"🔧 Traceback: {traceback.format_exc()}")
        return Response({'error': str(e)}, status=400)

@api_view(['DELETE'])
def delete_situation(request, situation_id):
    """Supprime une situation"""
    try:
        situation = Situation.objects.get(id=situation_id)
        situation.delete()
        return Response({'success': True})
    except Situation.DoesNotExist:
        return Response({'error': 'Situation non trouvée'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

    

@api_view(['GET'])
def get_devis_structure(request, devis_id):
    try:
        devis = Devis.objects.get(id=devis_id)
        lignes_devis = DevisLigne.objects.filter(devis=devis)
        
        # Structure pour organiser les données
        structure = {}
        
        for ligne in lignes_devis:
            ligne_detail = LigneDetail.objects.get(id=ligne.ligne_detail.id)
            sous_partie = ligne_detail.sous_partie
            partie = sous_partie.partie
            
            if partie.id not in structure:
                structure[partie.id] = {
                    'id': partie.id,
                    'titre': partie.titre,  # Utilisation de titre au lieu de nom
                    'sous_parties': {}
                }
                
            if sous_partie.id not in structure[partie.id]['sous_parties']:
                structure[partie.id]['sous_parties'][sous_partie.id] = {
                    'id': sous_partie.id,
                    'description': sous_partie.description,  # Utilisation de description au lieu de nom
                    'lignes': []
                }
                
            structure[partie.id]['sous_parties'][sous_partie.id]['lignes'].append({
                'id': ligne.id,
                'description': ligne_detail.description,
                'quantite': str(ligne.quantite),
                'prix_unitaire': str(ligne.prix_unitaire),
                'total_ht': str(ligne.total_ht),
                'ligne_detail_id': ligne_detail.id
            })
            
        # Fonction de tri naturel pour les parties
        def natural_sort_key(titre):
            import re
            # Extraire le numéro au début du titre (ex: "1-", "11-", "21-")
            match = re.match(r'^(\d+)-', titre)
            if match:
                # Retourner un tuple (numéro, titre) pour un tri correct
                return (int(match.group(1)), titre)
            # Si pas de numéro, retourner (0, titre) pour mettre en premier
            return (0, titre)
        
        # Convertir en liste pour l'API et trier
        result = []
        for partie in structure.values():
            # Trier les sous-parties par ordre naturel
            sous_parties_list = list(partie['sous_parties'].values())
            sous_parties_list.sort(key=lambda sp: natural_sort_key(sp['description']))
            
            # Trier les lignes de détail par ordre naturel
            for sous_partie in sous_parties_list:
                sous_partie['lignes'].sort(key=lambda l: natural_sort_key(l['description']))
            
            partie['sous_parties'] = sous_parties_list
            result.append(partie)
        
        # Trier les parties par ordre naturel
        result.sort(key=lambda p: natural_sort_key(p['titre']))
            
        return Response(result)
        
    except Devis.DoesNotExist:
        return Response({'error': 'Devis non trouvé'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['DELETE'])
def delete_devis(request, devis_id):
    try:
        with transaction.atomic():
            devis = Devis.objects.get(id=devis_id)
            # Supprimer directement le devis sans vérifier les situations
            devis.delete()
            
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Devis.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_chantier_lignes_default(request, chantier_id):
    try:
        lignes = ChantierLigneSupplementaire.objects.filter(chantier_id=chantier_id)
        serializer = ChantierLigneSupplementaireSerializer(lignes, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
def update_chantier_lignes_default(request, chantier_id):
    try:
        chantier = get_object_or_404(Chantier, id=chantier_id)
        
        # Supprimer les anciennes lignes
        ChantierLigneSupplementaire.objects.filter(chantier=chantier).delete()
        
        # Créer les nouvelles lignes
        for ligne in request.data:
            ChantierLigneSupplementaire.objects.create(
                chantier=chantier,
                description=ligne['description'],
                montant=ligne['montant']
            )
        
        return Response({'status': 'success'})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def get_factures_cie(request, chantier_id):
    try:
        mois = int(request.GET.get('mois'))
        annee = int(request.GET.get('annee'))
        
        # Récupérer toutes les factures CIE du mois pour ce chantier
        # Utiliser mois_situation et annee_situation au lieu de date_creation
        factures_cie = Facture.objects.filter(
            chantier_id=chantier_id,
            type_facture='cie',
            mois_situation=mois,
            annee_situation=annee
        )
        
        # Calculer le total
        total_cie = factures_cie.aggregate(
            total=models.Sum('price_ht')
        )['total'] or 0
        
        return Response({
            'total': float(total_cie),
            'factures': [{
                'id': f.id,
                'numero': f.numero,
                'montant_ht': float(f.price_ht),
                'designation': f.designation or '',
                'date_creation': f.date_creation.strftime('%d/%m/%Y') if f.date_creation else ''
            } for f in factures_cie]
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=400)

class NumeroService:
    @staticmethod
    def get_next_facture_number(prefix="FACT"):
        """Génère le prochain numéro de facture unique pour toute l'application (recommence à 01 chaque année)"""
        current_year = str(datetime.now().year)
        current_month = str(datetime.now().month).zfill(2)
        
        # Récupérer toutes les factures ET situations de l'année en cours uniquement
        all_factures = Facture.objects.filter(
            numero__contains=f'.{current_year}'  # Filtre pour le nouveau format: XX.2025
        ).order_by('-id')
        
        all_situations = Situation.objects.filter(
            numero_situation__contains=f'.{current_year} -'  # Format: Facture n°XX.2025 - Situation
        ).order_by('-id')
        
        # Trouver le dernier numéro de séquence utilisé pour l'année en cours
        last_num = 0
        
        # Vérifier toutes les factures de l'année
        for facture in all_factures:
            try:
                # Format attendu: Facture n°08.2025
                if 'Facture n°' in facture.numero and f'.{current_year}' in facture.numero:
                    # Extraire le numéro avant le point
                    numero_part = facture.numero.split('Facture n°')[1].split('.')[0]
                    num = int(numero_part)
                    last_num = max(last_num, num)
            except (IndexError, ValueError):
                pass
        
        # Vérifier toutes les situations de l'année
        for situation in all_situations:
            try:
                # Format attendu: Facture n°08.2025 - Situation n°01
                if 'Facture n°' in situation.numero_situation and f'.{current_year}' in situation.numero_situation:
                    # Extraire le numéro avant le point
                    numero_part = situation.numero_situation.split('Facture n°')[1].split('.')[0]
                    num = int(numero_part)
                    last_num = max(last_num, num)
            except (IndexError, ValueError):
                pass
        
        # Incrémenter pour l'année en cours (recommence à 01 chaque année)
        next_num = last_num + 1
        return f"Facture n°{next_num:02d}.{current_year}"

    @staticmethod
    def get_next_situation_number(chantier_id):
        """Génère le prochain numéro de situation pour un chantier spécifique"""
        # Récupérer la dernière situation du chantier (tri par ID pour éviter les problèmes de tri alphabétique)
        last_situation = Situation.objects.filter(
            chantier_id=chantier_id
        ).order_by('-id').first()
        
        # Déterminer le prochain numéro de situation spécifique au chantier
        next_sit_num = 1
        if last_situation and last_situation.numero_situation:
            try:
                current_sit_num = int(last_situation.numero_situation.split('n°')[1])
                next_sit_num = current_sit_num + 1
            except (IndexError, ValueError):
                next_sit_num = 1
            
        # Générer le numéro de facture de base (unique et incrémental)
        base_numero = NumeroService.get_next_facture_number()
        
        return f"{base_numero} - Situation n°{next_sit_num:02d}"

@api_view(['GET'])
def get_next_numero(request, chantier_id=None):
    """Récupère le prochain numéro de facture ou situation (recommence à 01 chaque année)"""
    try:
        current_year = str(datetime.now().year)
        
        # Récupérer toutes les factures et situations de l'année en cours uniquement
        prefix = request.GET.get('prefix', 'FACT')
        
        all_factures = Facture.objects.filter(
            numero__contains=f'.{current_year}'
        ).order_by('-id')  # Tri par ID pour éviter les problèmes de tri alphabétique
        
        all_situations = Situation.objects.filter(
            numero_situation__contains=f'.{current_year} -'
        ).order_by('-id')  # Tri par ID pour éviter les problèmes de tri alphabétique
        
        # Trouver le dernier numéro de séquence utilisé pour l'année en cours
        last_num = 0
        
        # Vérifier toutes les factures de l'année
        for facture in all_factures:
            try:
                # Format attendu: Facture n°08.2025
                if 'Facture n°' in facture.numero and f'.{current_year}' in facture.numero:
                    # Extraire le numéro avant le point
                    numero_part = facture.numero.split('Facture n°')[1].split('.')[0]
                    num = int(numero_part)
                    last_num = max(last_num, num)
            except (IndexError, ValueError):
                pass
        
        # Vérifier toutes les situations de l'année
        for situation in all_situations:
            try:
                # Format attendu: Facture n°08.2025 - Situation n°01
                if 'Facture n°' in situation.numero_situation and f'.{current_year}' in situation.numero_situation:
                    # Extraire le numéro avant le point
                    numero_part = situation.numero_situation.split('Facture n°')[1].split('.')[0]
                    num = int(numero_part)
                    last_num = max(last_num, num)
            except (IndexError, ValueError):
                pass
        
        # Incrémenter pour obtenir le prochain numéro (recommence à 01 chaque année)
        next_num = last_num + 1
        base_numero = f"Facture n°{next_num:02d}.{current_year}"
            
        if chantier_id:
            # Pour une situation, on ajoute le numéro de situation spécifique au chantier
            # Le numéro de situation continue la numérotation même après un changement d'année
            # On cherche donc toutes les situations du chantier, toutes années confondues
            last_situation = Situation.objects.filter(
                chantier_id=chantier_id,
                numero_situation__contains='Situation n°'
            ).order_by('-id').first()  # Tri par ID au lieu de numero_situation
            
            next_sit_num = 1
            if last_situation and last_situation.numero_situation:
                try:
                    # Format attendu: "Facture n°14.2025 - Situation n°01"
                    # Extraire la partie après "Situation n°"
                    if 'Situation n°' in last_situation.numero_situation:
                        sit_part = last_situation.numero_situation.split('Situation n°')[1].strip()
                        # Prendre seulement les chiffres (au cas où il y aurait d'autres caractères)
                        sit_num_str = ''.join(filter(str.isdigit, sit_part))
                        if sit_num_str:
                            current_sit_num = int(sit_num_str)
                            next_sit_num = current_sit_num + 1
                except (IndexError, ValueError) as e:
                    # En cas d'erreur, on recommence à 1
                    next_sit_num = 1
            
            numero = f"{base_numero} - Situation n°{next_sit_num:02d}"
        else:
            numero = base_numero
        
        return Response({'numero': numero})
    except Exception as e:
        return Response({'error': str(e)}, status=400)


class SituationLigneSupplementaireViewSet(viewsets.ModelViewSet):
    queryset = SituationLigneSupplementaire.objects.all()
    serializer_class = SituationLigneSupplementaireSerializer

    def create(self, request, *args, **kwargs):
        try:
            situation_ligne = super().create(request, *args, **kwargs)
            
            # Récupérer la situation
            situation = Situation.objects.get(id=request.data['situation'])
            
            # Mettre à jour les montants avec les valeurs du frontend
            self.update_situation_from_frontend(situation, request.data)
            
            return situation_ligne
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_update(self, serializer):
        instance = serializer.save()
        self.update_situation_montants(instance.situation)

    def update_situation_montants(self, situation):
        # Même méthode que dans SituationLigneViewSet
        try:
            montant_total_mois = situation.situation_lignes.aggregate(
                total=Sum('montant')
            )['total'] or Decimal('0')
            
            lignes_suppl = situation.situation_lignes_supplementaires.all()
            for ligne_suppl in lignes_suppl:
                montant = Decimal(str(ligne_suppl.montant))
                if ligne_suppl.type == 'deduction':
                    montant_total_mois -= montant
                else:
                    montant_total_mois += montant
            
            montant_precedent = Decimal(str(situation.montant_precedent or '0'))
            price_ht = Decimal(str(situation.devis.price_ht or '0'))
            taux_prorata = Decimal(str(situation.taux_prorata or '0'))
            
            situation.montant_ht_mois = montant_total_mois
            situation.montant_total = montant_precedent + montant_total_mois
            
            if price_ht and price_ht != Decimal('0'):
                situation.pourcentage_avancement = (
                    (situation.montant_total * Decimal('100')) / price_ht
                )
            else:
                situation.pourcentage_avancement = Decimal('0')
            
            situation.retenue_garantie = montant_total_mois * Decimal('0.05')
            situation.montant_prorata = montant_total_mois * (taux_prorata / Decimal('100'))
            
            Situation.objects.filter(id=situation.id).update(
                montant_ht_mois=montant_total_mois,
                montant_total=situation.montant_total,
                pourcentage_avancement=situation.pourcentage_avancement,
                retenue_garantie=situation.retenue_garantie,
                montant_prorata=situation.montant_prorata
            )
        except Exception as e:
            print(f"Erreur dans update_situation_montants: {str(e)}")
            raise

class SituationLigneAvenantViewSet(viewsets.ModelViewSet):
    queryset = SituationLigneAvenant.objects.all()
    serializer_class = SituationLigneAvenantSerializer

    def create(self, request, *args, **kwargs):
        try:
            situation_ligne = super().create(request, *args, **kwargs)
            
            # Récupérer la situation
            situation = Situation.objects.get(id=request.data['situation'])
            
            # Mettre à jour les montants avec les valeurs du frontend
            self.update_situation_from_frontend(situation, request.data)
            
            return situation_ligne
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def update_situation_montants(self, situation):
        try:
            # Recalculer les montants (comme dans SituationLigneViewSet)
            montant_lignes_standard = situation.situation_lignes.aggregate(
                total=Sum('montant')
            )['total'] or Decimal('0')
            
            montant_lignes_avenants = situation.situation_lignes_avenants.aggregate(
                total=Sum('montant')
            )['total'] or Decimal('0')
            
            situation.montant_ht_mois = montant_lignes_standard + montant_lignes_avenants
            
            # Mettre à jour la situation
            situation.save()
            
        except Exception as e:
            print(f"Erreur dans update_situation_montants: {str(e)}")
            raise

# Mixin pour partager la méthode de mise à jour entre les ViewSets
class SituationUpdateMixin:
    @staticmethod
    def update_situation_from_frontend(situation, data):
        # Liste des champs à mettre à jour
        fields = [
            'montant_ht_mois',
            'retenue_garantie',
            'montant_prorata',
            'montant_total_mois_apres_retenue',
            'tva',
            'montant_total',
            'pourcentage_avancement',
            'montant_total_cumul_ht',
            'cumul_mois_precedent'
        ]
        
        # Mettre à jour chaque champ s'il est présent dans les données
        for field in fields:
            if field in data:
                setattr(situation, field, Decimal(str(data[field])))
        
        # Sauvegarder la situation
        situation.save()

# ViewSets avec le mixin
class SituationLigneViewSet(SituationUpdateMixin, viewsets.ModelViewSet):
    queryset = SituationLigne.objects.all()
    serializer_class = SituationLigneSerializer

class SituationLigneSupplementaireViewSet(SituationUpdateMixin, viewsets.ModelViewSet):
    queryset = SituationLigneSupplementaire.objects.all()
    serializer_class = SituationLigneSupplementaireSerializer

class SituationLigneAvenantViewSet(SituationUpdateMixin, viewsets.ModelViewSet):
    queryset = SituationLigneAvenant.objects.all()
    serializer_class = SituationLigneAvenantSerializer

@api_view(['GET'])
def get_situations(request, chantier_id):
    try:
        mois = request.GET.get('mois')
        annee = request.GET.get('annee')
        
        print(f"Recherche des situations - Chantier: {chantier_id}, Mois: {mois}, Année: {annee}")
        
        # Validation des paramètres
        if not all([mois, annee]):
            return Response(
                {"error": "Les paramètres mois et année sont requis"}, 
                status=400
            )

        # Conversion en entiers pour éviter les problèmes de type
        mois = int(mois)
        annee = int(annee)

        # Requête avec prefetch_related pour optimiser les performances
        situations = Situation.objects.filter(
            chantier_id=chantier_id,
            mois=mois,
            annee=annee
        ).prefetch_related(
            'lignes',
            'lignes_supplementaires',
            'lignes_avenant'
        ).order_by('-date_creation')

        print(f"Nombre de situations trouvées: {situations.count()}")
        
        return Response(SituationSerializer(situations, many=True).data)

    except ValueError as e:
        return Response(
            {"error": "Format invalide pour le mois ou l'année"}, 
            status=400
        )
    except Exception as e:
        print(f"Erreur lors de la recherche des situations: {str(e)}")
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
def get_last_situation(request, chantier_id):
    try:
        # Récupère la dernière situation basée sur la date de création
        last_situation = Situation.objects.filter(
            chantier_id=chantier_id
        ).order_by('-date_creation').first()
        
        if last_situation:
            return Response(SituationSerializer(last_situation).data)
        return Response(None)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def get_chantier_situations(request, chantier_id):
    try:
        situations = Situation.objects.filter(
            chantier_id=chantier_id
        ).order_by('numero_situation')
        
        return Response(SituationSerializer(situations, many=True).data)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def get_all_situations_by_year(request):
    """Récupère toutes les situations pour une année donnée avec les informations des chantiers
    et toutes les situations de chaque chantier (nécessaire pour le calcul des cumuls)"""
    try:
        annee = request.GET.get('annee')
        if not annee:
            return Response({'error': 'Le paramètre annee est requis'}, status=400)
        
        annee = int(annee)
        
        # Récupérer toutes les situations de l'année avec les informations du chantier
        # Utilisation de select_related pour éviter les requêtes N+1
        situations_annee = (Situation.objects
                           .filter(annee=annee)
                           .select_related('chantier')
                           .prefetch_related('lignes', 'lignes__ligne_devis', 'lignes_avenant', 'lignes_supplementaires')
                           .order_by('chantier__chantier_name', 'mois', 'numero_situation'))
        
        # Récupérer tous les IDs de chantiers concernés
        chantier_ids = situations_annee.values_list('chantier_id', flat=True).distinct()
        
        # Récupérer TOUTES les situations de ces chantiers (nécessaire pour le calcul des cumuls)
        all_situations_by_chantier = {}
        if chantier_ids:
            all_situations = (Situation.objects
                            .filter(chantier_id__in=chantier_ids)
                            .select_related('chantier')
                            .prefetch_related('lignes', 'lignes__ligne_devis', 'lignes_avenant', 'lignes_supplementaires')
                            .order_by('annee', 'mois', 'numero_situation'))
            
            # Grouper par chantier
            for situation in all_situations:
                chantier_id = situation.chantier_id
                if chantier_id not in all_situations_by_chantier:
                    all_situations_by_chantier[chantier_id] = []
                all_situations_by_chantier[chantier_id].append(situation)
        
        # Sérialiser les situations de l'année
        serializer = SituationSerializer(situations_annee, many=True)
        
        # Enrichir les données avec les informations du chantier et toutes les situations du chantier
        result = []
        for situation_data in serializer.data:
            situation_obj = next((s for s in situations_annee if s.id == situation_data['id']), None)
            if situation_obj and situation_obj.chantier:
                situation_data['chantier_name'] = situation_obj.chantier.chantier_name
                situation_data['chantier_id'] = situation_obj.chantier.id
                
                # Ajouter toutes les situations du chantier (sérialisées) pour le calcul des cumuls
                chantier_id = situation_obj.chantier.id
                if chantier_id in all_situations_by_chantier:
                    all_situations_chantier = all_situations_by_chantier[chantier_id]
                    situation_data['allSituationsChantier'] = SituationSerializer(
                        all_situations_chantier, many=True
                    ).data
                else:
                    situation_data['allSituationsChantier'] = []
            
            result.append(situation_data)
        
        return Response(result)
    except ValueError:
        return Response({'error': 'Format invalide pour l\'année'}, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['GET'])
def get_situations_list(request):
    situations = (Situation.objects
                 .prefetch_related('lignes', 
                                 'lignes_supplementaires',
                                 'lignes_avenant')
                 .all())
    serializer = SituationSerializer(situations, many=True)
    return Response(serializer.data)

def calculer_pourcentage_sous_partie(sous_partie):
    """
    Calcule le pourcentage moyen d'avancement d'une sous-partie
    """
    lignes_devis = DevisLigne.objects.filter(ligne_detail__sous_partie=sous_partie)
    if not lignes_devis.exists():
        return Decimal('0')
    
    total_pourcentage = Decimal('0')
    count = 0
    for ligne in lignes_devis:
        # Utiliser SituationLigne au lieu de situation_lignes
        situation_ligne = SituationLigne.objects.filter(ligne_devis=ligne).last()
        if situation_ligne:
            total_pourcentage += situation_ligne.pourcentage_actuel
            count += 1
    
    return total_pourcentage / count if count > 0 else Decimal('0')

def calculer_pourcentage_partie(partie):
    """
    Calcule le pourcentage moyen d'avancement d'une partie
    """
    sous_parties = SousPartie.objects.filter(partie=partie)
    if not sous_parties.exists():
        return Decimal('0')
    
    total_pourcentage = Decimal('0')
    count = 0
    for sous_partie in sous_parties:
        pourcentage = calculer_pourcentage_sous_partie(sous_partie)
        if pourcentage > 0:
            total_pourcentage += pourcentage
            count += 1
    
    return total_pourcentage / count if count > 0 else Decimal('0')

def calculer_pourcentage_avenant(avenant):
    """Calcule le pourcentage moyen d'avancement d'un avenant"""
    factures_ts = avenant.factures_ts.all()
    if not factures_ts.exists():
        return Decimal('0')
    
    total_pourcentage = sum(
        ts.pourcentage_actuel or Decimal('0')
        for ts in factures_ts
    )
    return total_pourcentage / factures_ts.count()

def calculer_pourcentage_sous_partie_avenant(facture_ts, situation):
    """
    Calcule le pourcentage d'avancement d'une facture TS dans une situation donnée
    """
    ligne_avenant = SituationLigneAvenant.objects.filter(
        situation=situation,
        facture_ts=facture_ts
    ).last()
    
    return ligne_avenant.pourcentage_actuel if ligne_avenant else Decimal('0')

def calculer_pourcentage_avenant(avenant, situation):
    """
    Calcule le pourcentage moyen d'avancement d'un avenant
    """
    lignes_avenant = SituationLigneAvenant.objects.filter(
        situation=situation,
        avenant=avenant
    )
    
    if not lignes_avenant.exists():
        return Decimal('0')
    
    total_pourcentage = sum(
        ligne.pourcentage_actuel
        for ligne in lignes_avenant
    )
    return total_pourcentage / lignes_avenant.count()

def preview_situation(request, situation_id):
    try:
        situation = get_object_or_404(Situation, id=situation_id)
        devis = situation.devis
        
        # Vérifier si le devis utilise le nouveau système
        if is_new_system_devis(devis):
            # Rediriger vers preview_situation_v2 pour le nouveau système
            from django.shortcuts import redirect
            return redirect(f'/api/preview-situation-v2/{situation_id}/')
        chantier = situation.chantier
        societe = chantier.societe
        client = societe.client_name

        # Dictionnaires pour un accès rapide aux données de situation
        situation_lignes_dict = {
            ligne.ligne_devis.id: ligne 
            for ligne in situation.lignes.all()
        }
        
        total_ht = Decimal('0')
        parties_data = []

        # Fonction de tri naturel pour les parties
        def natural_sort_key(titre):
            import re
            # Extraire le numéro au début du titre (ex: "1-", "11-", "21-")
            match = re.match(r'^(\d+)-', titre)
            if match:
                # Retourner un tuple (numéro, titre) pour un tri correct
                return (int(match.group(1)), titre)
            # Si pas de numéro, retourner (0, titre) pour mettre en premier
            return (0, titre)

        # Obtenir toutes les parties uniques du devis et les trier
        parties_to_process = list(Partie.objects.filter(
            id__in=[ligne.ligne_detail.sous_partie.partie.id 
                   for ligne in devis.lignes.all()]
        ).distinct())
        parties_to_process.sort(key=lambda p: natural_sort_key(p.titre))

        # Parcourir les parties
        for partie in parties_to_process:
            sous_parties_data = []
            total_partie = Decimal('0')
            total_avancement_partie = Decimal('0')

            # Récupérer et trier les sous-parties
            sous_parties_to_process = list(SousPartie.objects.filter(
                partie=partie,
                id__in=[ligne.ligne_detail.sous_partie.id 
                       for ligne in devis.lignes.all()]
            ).distinct())
            sous_parties_to_process.sort(key=lambda sp: natural_sort_key(sp.description))

            for sous_partie in sous_parties_to_process:
                lignes_details_data = []
                total_sous_partie = Decimal('0')
                total_avancement_sous_partie = Decimal('0')

                for ligne_devis in devis.lignes.filter(ligne_detail__sous_partie=sous_partie):
                    situation_ligne = situation_lignes_dict.get(ligne_devis.id)
                    pourcentage = situation_ligne.pourcentage_actuel if situation_ligne else Decimal('0')
                    
                    # Utiliser les données stockées en base de données
                    ligne_situation = situation_lignes_dict.get(ligne_devis.id)
                    if ligne_situation:
                        # Utiliser les données de la situation stockées en DB
                        total_ligne = ligne_situation.total_ht
                        montant_situation = ligne_situation.montant
                        pourcentage = ligne_situation.pourcentage_actuel
                    else:
                        # Fallback si la ligne n'existe pas en situation
                        total_ligne = ligne_devis.quantite * ligne_devis.prix_unitaire
                        montant_situation = (total_ligne * pourcentage) / Decimal('100')
                    
                    total_sous_partie += total_ligne
                    total_avancement_sous_partie += montant_situation

                    lignes_details_data.append({
                        'description': ligne_devis.ligne_detail.description,
                        'unite': ligne_devis.ligne_detail.unite,
                        'quantity': ligne_devis.quantite,
                        'custom_price': ligne_devis.prix_unitaire,
                        'total_ht': total_ligne,
                        'pourcentage': pourcentage,
                        'montant_situation': montant_situation
                    })

                if lignes_details_data:
                    pourcentage_sous_partie = (total_avancement_sous_partie / total_sous_partie * 100) if total_sous_partie else Decimal('0')
                    sous_partie_data = {
                        'description': sous_partie.description,
                        'lignes_details': lignes_details_data,
                        'total_sous_partie': total_sous_partie,
                        'pourcentage': pourcentage_sous_partie,
                        'montant_avancement': total_avancement_sous_partie
                    }
                    sous_parties_data.append(sous_partie_data)
                    total_partie += total_sous_partie
                    total_avancement_partie += total_avancement_sous_partie

            if sous_parties_data:
                pourcentage_partie = (total_avancement_partie / total_partie * 100) if total_partie else Decimal('0')
                partie_data = {
                    'titre': partie.titre,
                    'sous_parties': sous_parties_data,
                    'total_partie': total_partie,
                    'pourcentage': pourcentage_partie,
                    'montant_avancement': total_avancement_partie
                }
                parties_data.append(partie_data)
                total_ht += total_partie

        # Gestion des avenants
        avenant_data = []
        current_avenant = None
        current_avenant_lines = []
        total_avenant = Decimal('0')
        pourcentage_avenant = Decimal('0')
        nb_lignes_avenant = 0

        for ligne_avenant in situation.lignes_avenant.all().order_by('facture_ts__avenant__numero'):
            facture_ts = ligne_avenant.facture_ts
            avenant = facture_ts.avenant

            if current_avenant != avenant.numero:
                if current_avenant_lines:
                    # Calculer le pourcentage moyen pour l'avenant précédent
                    avg_pourcentage = pourcentage_avenant / nb_lignes_avenant if nb_lignes_avenant > 0 else Decimal('0')
                    avenant_data.append({
                        'numero': current_avenant,
                        'lignes': current_avenant_lines,
                        'pourcentage_avenant': avg_pourcentage,
                        'total_avenant': total_avenant,
                        'montant_avancement': (total_avenant * avg_pourcentage) / Decimal('100')
                    })
                
                current_avenant = avenant.numero
                current_avenant_lines = []
                total_avenant = Decimal('0')
                pourcentage_avenant = Decimal('0')
                nb_lignes_avenant = 0

            # Utiliser les données stockées en base de données
            montant_avancement_avenant = ligne_avenant.montant  # Utiliser le montant stocké en DB

            current_avenant_lines.append({
                'devis_numero': facture_ts.devis.numero,
                'designation': facture_ts.designation,
                'montant_ht': ligne_avenant.montant_ht,
                'pourcentage_actuel': ligne_avenant.pourcentage_actuel,
                'montant': ligne_avenant.montant  # Utiliser le montant stocké en DB
            })

            total_avenant += ligne_avenant.montant_ht
            pourcentage_avenant += ligne_avenant.pourcentage_actuel
            nb_lignes_avenant += 1

        # Ajouter le dernier avenant
        if current_avenant_lines:
            avg_pourcentage = pourcentage_avenant / nb_lignes_avenant if nb_lignes_avenant > 0 else Decimal('0')
            avenant_data.append({
                'numero': current_avenant,
                'lignes': current_avenant_lines,
                'pourcentage_avenant': avg_pourcentage,
                'total_avenant': total_avenant,
                'montant_avancement': (total_avenant * avg_pourcentage) / Decimal('100')
            })

        # Gestion des lignes supplémentaires
        lignes_supplementaires_data = []
        for ligne in situation.lignes_supplementaires.all():
            lignes_supplementaires_data.append({
                'description': ligne.description,
                'type': ligne.type,
                'montant': ligne.montant,
                'isHighlighted': False
            })

        # Calcul des totaux pour tous les avenants
        total_avenants = Decimal('0')
        total_montant_avancement_avenants = Decimal('0')
        for av in avenant_data:
            total_avenants += av['total_avenant']
            total_montant_avancement_avenants += av['montant_avancement']

        pourcentage_total_avenants = (total_montant_avancement_avenants / total_avenants * 100) if total_avenants else Decimal('0')

        # Calculer la somme des total_partie (sans les lignes spéciales)
        total_ht_sans_lignes_speciales = sum(Decimal(str(partie['total_partie'])) for partie in parties_data)

        # Récupérer les lignes spéciales du devis
        lignes_speciales = devis.lignes_speciales or {}
        lignes_display = devis.lignes_display or {}
        
        # Traiter les lignes spéciales des parties
        for partie_data in parties_data:
            partie_id = None
            # Trouver l'ID de la partie correspondante
            for partie in parties_to_process:
                if partie.titre == partie_data['titre']:
                    partie_id = str(partie.id)
                    break
            
            if partie_id:
                special_lines_partie = lignes_speciales.get('parties', {}).get(partie_id, [])
                display_lines_partie = lignes_display.get('parties', {}).get(partie_id, [])
                partie_data['special_lines'] = []
                
                for special_line in special_lines_partie:
                    # Calcul normal pour les autres types de lignes spéciales
                    montant = Decimal('0')
                    if special_line['valueType'] == "percentage":
                        montant = (partie_data['total_partie'] * Decimal(str(special_line['value']))) / Decimal('100')
                    else:
                        montant = Decimal(str(special_line['value']))
                    
                    if special_line.get('type') == 'reduction':
                        montant = -montant
                    
                    partie_data['special_lines'].append({
                        'description': special_line['description'],
                        'value': special_line['value'],
                        'valueType': special_line['valueType'],
                        'type': special_line.get('type', 'addition'),
                        'montant': montant,
                        'isHighlighted': special_line.get('isHighlighted', False)
                    })
                
                # Ajouter les lignes display de la partie
                for display_line in display_lines_partie:
                    partie_data['special_lines'].append({
                        'description': display_line['description'],
                        'value': display_line['value'],
                        'valueType': display_line['valueType'],
                        'type': display_line['type'],
                        'montant': Decimal(str(display_line['value'])),  # Montant affiché directement
                        'isHighlighted': display_line.get('isHighlighted', False)
                    })
        
        # Traiter les lignes spéciales des sous-parties
        for partie_data in parties_data:
            for sous_partie_data in partie_data['sous_parties']:
                sous_partie_id = None
                # Trouver l'ID de la sous-partie correspondante
                for partie in parties_to_process:
                    for sous_partie in SousPartie.objects.filter(partie=partie):
                        if sous_partie.description == sous_partie_data['description']:
                            sous_partie_id = str(sous_partie.id)
                            break
                    if sous_partie_id:
                        break
                
                if sous_partie_id:
                    special_lines_sous_partie = lignes_speciales.get('sousParties', {}).get(sous_partie_id, [])
                    display_lines_sous_partie = lignes_display.get('sousParties', {}).get(sous_partie_id, [])
                    sous_partie_data['special_lines'] = []
                    
                    for special_line in special_lines_sous_partie:
                        # Calcul normal pour les autres types de lignes spéciales
                        montant = Decimal('0')
                        if special_line['valueType'] == "percentage":
                            montant = (sous_partie_data['total_sous_partie'] * Decimal(str(special_line['value']))) / Decimal('100')
                        else:
                            montant = Decimal(str(special_line['value']))
                        
                        if special_line.get('type') == 'reduction':
                            montant = -montant
                        
                        sous_partie_data['special_lines'].append({
                            'description': special_line['description'],
                            'value': special_line['value'],
                            'valueType': special_line['valueType'],
                            'type': special_line.get('type', 'addition'),
                            'montant': montant,
                            'isHighlighted': special_line.get('isHighlighted', False)
                        })
                    
                    # Ajouter les lignes display de la sous-partie
                    for display_line in display_lines_sous_partie:
                        sous_partie_data['special_lines'].append({
                            'description': display_line['description'],
                            'value': display_line['value'],
                            'valueType': display_line['valueType'],
                            'type': display_line['type'],
                            'montant': Decimal(str(display_line['value'])),  # Montant affiché directement
                            'isHighlighted': display_line.get('isHighlighted', False)
                        })
        
        # Traiter les lignes spéciales globales
        special_lines_global = []
        total_lignes_speciales_globales = Decimal('0')
        if lignes_speciales.get('global'):
            for special_line in lignes_speciales['global']:
                # Calcul normal pour les autres types de lignes spéciales
                montant = Decimal('0')
                if special_line['valueType'] == "percentage":
                    montant = (total_ht_sans_lignes_speciales * Decimal(str(special_line['value']))) / Decimal('100')
                else:
                    montant = Decimal(str(special_line['value']))
                
                if special_line.get('type') == 'reduction':
                    montant = -montant
                    total_lignes_speciales_globales -= abs(montant)
                else:
                    total_lignes_speciales_globales += montant
                
                special_lines_global.append({
                    'description': special_line['description'],
                    'value': special_line['value'],
                    'valueType': special_line['valueType'],
                    'type': special_line.get('type', 'addition'),
                    'montant': montant,
                    'isHighlighted': special_line.get('isHighlighted', False)
                })
        
        # Ajouter les lignes display globales
        if lignes_display.get('global'):
            for display_line in lignes_display['global']:
                montant = Decimal(str(display_line['value']))
                if display_line.get('type') == 'reduction':
                    total_lignes_speciales_globales -= montant
                else:
                    total_lignes_speciales_globales += montant
                
                special_lines_global.append({
                    'description': display_line['description'],
                    'value': display_line['value'],
                    'valueType': display_line['valueType'],
                    'type': display_line['type'],
                    'montant': montant,  # Montant affiché directement
                    'isHighlighted': display_line.get('isHighlighted', False)
                })

        # Calculer le montant total du marché HT avec les lignes spéciales
        total_marche_ht = total_ht_sans_lignes_speciales + total_lignes_speciales_globales

        # Préparer les lignes spéciales de la situation
        lignes_speciales_situation = []
        total_lignes_speciales = Decimal('0')
        for ligne_speciale in situation.lignes_speciales.all():
            lignes_speciales_situation.append({
                'id': ligne_speciale.id,
                'description': ligne_speciale.description,
                'montant_ht': ligne_speciale.montant_ht,
                'value': ligne_speciale.value,
                'value_type': ligne_speciale.value_type,
                'type': ligne_speciale.type,
                'niveau': ligne_speciale.niveau,
                'partie_id': ligne_speciale.partie_id,
                'sous_partie_id': ligne_speciale.sous_partie_id,
                'pourcentage_precedent': ligne_speciale.pourcentage_precedent,
                'pourcentage_actuel': ligne_speciale.pourcentage_actuel,
                'montant': ligne_speciale.montant,
            })
            # Calculer l'impact des lignes spéciales sur le total
            if ligne_speciale.type == 'reduction':
                total_lignes_speciales -= ligne_speciale.montant
            else:  # ajout
                total_lignes_speciales += ligne_speciale.montant

        # Calculer le montant global après lignes spéciales
        total_ht_apres_lignes_speciales = total_ht + total_lignes_speciales

        # Calculer les montants en utilisant les valeurs stockées en DB
        montant_ht_mois = situation.montant_ht_mois
        retenue_garantie = situation.retenue_garantie
        taux_retenue_garantie = situation.taux_retenue_garantie or Decimal('5.00')
        montant_prorata = situation.montant_prorata
        retenue_cie = situation.retenue_cie
        type_retenue_cie = situation.type_retenue_cie or 'deduction'
        
        # Calculer la retenue CIE selon le type (déduction ou ajout)
        retenue_cie_calculee = retenue_cie if type_retenue_cie == 'deduction' else -retenue_cie
        
        # Calculer le montant après retenues en tenant compte des lignes supplémentaires
        montant_apres_retenues = montant_ht_mois - retenue_garantie - montant_prorata - retenue_cie_calculee
        
        # Ajouter l'impact des lignes supplémentaires
        for ligne_suppl in lignes_supplementaires_data:
            if ligne_suppl['type'] == 'deduction':
                montant_apres_retenues -= ligne_suppl['montant']
            else:
                montant_apres_retenues += ligne_suppl['montant']
        
        # Calculer la TVA
        tva = (montant_apres_retenues * Decimal('0.20')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        # Calculer le montant total des travaux HT (comme dans SituationViews.py)
        # = somme des montants d'avancement des parties + lignes spéciales (hors display) + avenants
        
        # Somme de tous les montants d'avancement des parties
        total_montant_avancement_parties = Decimal('0')
        for partie_data in parties_data:
            total_montant_avancement_parties += Decimal(str(partie_data.get('montant_avancement', 0)))
        
        # Calculer les montants d'avancement des lignes spéciales (hors display)
        total_montant_avancement_lignes_speciales = Decimal('0')
        pourcentage_avancement_global = situation.pourcentage_avancement or Decimal('0')
        
        # Lignes spéciales des sous-parties
        for partie_data in parties_data:
            for sous_partie_data in partie_data.get('sous_parties', []):
                for special_line in sous_partie_data.get('special_lines', []):
                    if special_line.get('type') != 'display':
                        montant_ht = Decimal(str(special_line.get('montant', 0)))
                        montant_avancement = (montant_ht * pourcentage_avancement_global) / Decimal('100')
                        
                        if special_line.get('type') == 'reduction':
                            total_montant_avancement_lignes_speciales -= montant_avancement
                        elif special_line.get('type') in ['addition', 'ajout']:
                            total_montant_avancement_lignes_speciales += montant_avancement
        
        # Lignes spéciales des parties
        for partie_data in parties_data:
            for special_line in partie_data.get('special_lines', []):
                if special_line.get('type') != 'display':
                    montant_ht = Decimal(str(special_line.get('montant', 0)))
                    montant_avancement = (montant_ht * pourcentage_avancement_global) / Decimal('100')
                    
                    if special_line.get('type') == 'reduction':
                        total_montant_avancement_lignes_speciales -= montant_avancement
                    elif special_line.get('type') in ['addition', 'ajout']:
                        total_montant_avancement_lignes_speciales += montant_avancement
        
        # Lignes spéciales globales du devis
        for special_line in special_lines_global:
            if special_line.get('type') != 'display':
                montant_ht = Decimal(str(special_line.get('montant', 0)))
                montant_avancement = (montant_ht * pourcentage_avancement_global) / Decimal('100')
                
                if special_line.get('type') == 'reduction':
                    total_montant_avancement_lignes_speciales -= montant_avancement
                elif special_line.get('type') in ['addition', 'ajout']:
                    total_montant_avancement_lignes_speciales += montant_avancement
        
        # Lignes spéciales de la situation (le champ 'montant' est déjà le montant d'avancement)
        for ligne_speciale in situation.lignes_speciales.all():
            if ligne_speciale.type != 'display':
                montant_avancement = Decimal(str(ligne_speciale.montant))
                if ligne_speciale.type == 'reduction':
                    total_montant_avancement_lignes_speciales -= montant_avancement
                elif ligne_speciale.type in ['addition', 'ajout']:
                    total_montant_avancement_lignes_speciales += montant_avancement
        
        # Montant total des travaux HT calculé dynamiquement
        montant_total_travaux_ht = total_montant_avancement_parties + total_montant_avancement_lignes_speciales + total_montant_avancement_avenants

        context = {
            'chantier': {
                'nom': chantier.chantier_name,
                'ville': chantier.ville,
                'rue': chantier.rue,
            },
            'societe': {
                'nom': societe.nom_societe,
                'ville': societe.ville_societe,
                'rue': societe.rue_societe,
                'codepostal_societe': societe.codepostal_societe,
            },
            'client': {
                'civilite': client.civilite if hasattr(client, 'civilite') else '',
                'nom': client.name,
                'prenom': client.surname,
                'client_mail': client.client_mail,
                'phone_Number': client.phone_Number,
                'poste': client.poste if hasattr(client, 'poste') else '',
            },
            'devis': {
                'numero': devis.numero,
                'nature_travaux': devis.nature_travaux,
            },
            'situation': {
                'id': situation.id,
                'numero': situation.numero,
                'mois': situation.mois,
                'annee': situation.annee,
                'numero_situation': situation.numero_situation,
                'montant_ht_mois': montant_ht_mois,
                'montant_precedent': situation.montant_precedent,
                'montant_total': situation.montant_total,
                'pourcentage_avancement': situation.pourcentage_avancement,
                'retenue_garantie': retenue_garantie,
                'taux_retenue_garantie': taux_retenue_garantie,
                'montant_prorata': montant_prorata,
                'taux_prorata': situation.taux_prorata,
                'retenue_cie': retenue_cie,
                'type_retenue_cie': type_retenue_cie,
                'date_creation': situation.date_creation,
                'montant_total_devis': situation.montant_total_devis,
                'montant_total_travaux': montant_total_travaux_ht,
                'total_avancement': situation.total_avancement,
                # Ajout des champs manquants
                'cumul_precedent': situation.cumul_precedent,
                'montant_apres_retenues': montant_apres_retenues,
                'montant_total_cumul_ht': situation.montant_total_cumul_ht,
                'tva': tva,
                'statut': situation.statut,
                'date_validation': situation.date_validation,
                'lignes_speciales': lignes_speciales_situation,
            },
            'parties': parties_data,
            'lignes_avenant': avenant_data,
            'lignes_supplementaires': lignes_supplementaires_data,
            'special_lines_global': special_lines_global,
            'total_ht': str(total_ht_apres_lignes_speciales),
            'tva': str(tva),
            'montant_ttc': str(montant_apres_retenues + tva),
            'total_avenants': total_avenants,
            'pourcentage_total_avenants': pourcentage_total_avenants,
            'montant_total_avenants': total_montant_avancement_avenants,
            'total_marche_ht': total_marche_ht,  # Ajouter cette nouvelle variable au context
        }

        return render(request, 'preview_situation.html', context)


    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def generate_situation_pdf(request):
    try:
        data = json.loads(request.body)
        situation_id = data.get('situation_id')

        if not situation_id:
            return JsonResponse({'error': 'ID de la situation manquant'}, status=400)

        preview_url = request.build_absolute_uri(f"/api/preview-situation/{situation_id}/")

        # Utiliser des chemins relatifs qui fonctionnent en production
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        node_script_path = os.path.join(base_dir, 'frontend', 'src', 'components', 'generate_pdf.js')
        pdf_path = os.path.join(base_dir, 'frontend', 'src', 'components', 'situation.pdf')

        # Vérifications préliminaires
        if not os.path.exists(node_script_path):
            error_msg = f'Script Node.js introuvable: {node_script_path}'
            print(f"ERREUR: {error_msg}")
            return JsonResponse({'error': error_msg}, status=500)
        
        # Vérifier si Node.js est disponible avec plusieurs chemins
        node_paths = ['node', '/usr/bin/node', '/usr/local/bin/node', '/opt/nodejs/bin/node']
        node_found = False
        node_path = 'node'
        
        for path in node_paths:
            try:
                result = subprocess.run([path, '--version'], check=True, capture_output=True, text=True)
                print(f"✅ Node.js trouvé: {path} - Version: {result.stdout.strip()}")
                node_found = True
                node_path = path
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        if not node_found:
            error_msg = 'Node.js n\'est pas installé ou n\'est pas accessible'
            print(f"ERREUR: {error_msg}")
            return JsonResponse({'error': error_msg}, status=500)
        
        command = [node_path, node_script_path, preview_url, pdf_path]
        print(f"Commande exécutée: {' '.join(command)}")
        
        try:
            # Exécuter avec capture de sortie pour debug
            result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=60)
            print(f"Sortie standard: {result.stdout}")
            print(f"Sortie d'erreur: {result.stderr}")
            
            if not os.path.exists(pdf_path):
                error_msg = f'Le fichier PDF n\'a pas été généré: {pdf_path}'
                print(f"ERREUR: {error_msg}")
                return JsonResponse({'error': error_msg}, status=500)
            
            with open(pdf_path, 'rb') as pdf_file:
                response = HttpResponse(pdf_file.read(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="situation_{situation_id}.pdf"'
                return response
                
        except subprocess.TimeoutExpired:
            error_msg = 'Timeout lors de la génération du PDF (60 secondes)'
            print(f"ERREUR: {error_msg}")
            return JsonResponse({'error': error_msg}, status=500)
        except subprocess.CalledProcessError as e:
            error_msg = f'Erreur lors de la génération du PDF: {str(e)}\nSortie: {e.stdout}\nErreur: {e.stderr}'
            print(f"ERREUR: {error_msg}")
            return JsonResponse({'error': error_msg}, status=500)
        except Exception as e:
            error_msg = f'Erreur inattendue: {str(e)}'
            print(f"ERREUR: {error_msg}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return JsonResponse({'error': error_msg}, status=500)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

class AgencyExpenseViewSet(viewsets.ModelViewSet):
    queryset = AgencyExpense.objects.all()
    serializer_class = AgencyExpenseSerializer

    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        if not month or not year:
            return Response({"error": "Month and year are required"}, status=status.HTTP_400_BAD_REQUEST)

        target_date = date(int(year), int(month), 1)

        # Filtrer les dépenses
        expenses = self.queryset.filter(
            models.Q(
                type='fixed', 
                date__lte=target_date,  # La dépense doit avoir commencé avant ou pendant ce mois
                end_date__isnull=True
            ) |
            models.Q(
                type='fixed', 
                date__lte=target_date,  # La dépense doit avoir commencé avant ou pendant ce mois
                end_date__gte=target_date
            ) |
            models.Q(
                type='punctual',
                date__month=month,
                date__year=year
            )
        )

        # Récupérer les overrides pour le mois/année
        for expense in expenses:
            override = AgencyExpenseOverride.objects.filter(
                expense=expense,
                month=month,
                year=year
            ).first()
            if override:
                expense.current_override = {
                    'description': override.description,
                    'amount': override.amount
                }

        # Calculer les totaux en tenant compte des overrides
        total = 0
        totals_by_category = {}
        
        for expense in expenses:
            amount = expense.current_override['amount'] if hasattr(expense, 'current_override') else expense.amount
            category = expense.category
            
            if category not in totals_by_category:
                totals_by_category[category] = 0
            totals_by_category[category] += amount
            total += amount

        return Response({
            'expenses': self.serializer_class(expenses, many=True, context={'request': request}).data,
            'totals_by_category': [{'category': k, 'total': v} for k, v in totals_by_category.items()],
            'total': total
        })

    @action(detail=False, methods=['get'])
    def yearly_summary(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        agg = AgencyExpenseAggregate.objects.filter(year=year).order_by('month')
        monthly = [
            {
                'month': x.month,
                'total_amount': float(x.total_amount),
                'totals_by_category': x.totals_by_category,
                'updated_at': x.updated_at,
            }
            for x in agg
        ]
        total_year = float(sum([x.total_amount for x in agg]) if agg else 0)
        return Response({'year': year, 'monthly': monthly, 'total_year': total_year})

    @action(detail=False, methods=['post'])
    def recompute_month(self, request):
        month = int(request.data.get('month'))
        year = int(request.data.get('year'))
        obj = compute_agency_expense_aggregate_for_month(year, month)
        return Response({'year': obj.year, 'month': obj.month, 'total_amount': float(obj.total_amount), 'totals_by_category': obj.totals_by_category})

    @action(detail=True, methods=['post'])
    def monthly_override(self, request, pk=None):
        expense = self.get_object()
        month = request.data.get('month')
        year = request.data.get('year')
        
        override, created = AgencyExpenseOverride.objects.update_or_create(
            expense=expense,
            month=month,
            year=year,
            defaults={
                'description': request.data.get('description'),
                'amount': request.data.get('amount')
            }
        )
        
        return Response(status=status.HTTP_200_OK)
    
    
    def perform_destroy(self, instance):
        """
        Surcharge pour gérer la suppression d'une AgencyExpense avec sous-traitant
        La suppression sera automatiquement reflétée dans le TableauSousTraitant
        """
        instance.delete()

class AgencyExpenseMonthViewSet(viewsets.ModelViewSet):
    queryset = AgencyExpenseMonth.objects.all()
    serializer_class = AgencyExpenseMonthSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        category = self.request.query_params.get('category')
        
        if month:
            queryset = queryset.filter(month=int(month))
        if year:
            queryset = queryset.filter(year=int(year))
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset.order_by('year', 'month', 'description')

    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        """Résumé mensuel des dépenses"""
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        if not month or not year:
            return Response({"error": "Month and year are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        expenses = self.queryset.filter(month=int(month), year=int(year))
        
        total = sum(float(e.amount) for e in expenses)
        totals_by_category = {}
        
        for expense in expenses:
            cat = expense.category
            if cat not in totals_by_category:
                totals_by_category[cat] = 0
            totals_by_category[cat] += float(expense.amount)
        
        return Response({
            'expenses': self.serializer_class(expenses, many=True).data,
            'totals_by_category': [{'category': k, 'total': v} for k, v in totals_by_category.items()],
            'total': total
        })

class DashboardViewSet(viewsets.ViewSet):
    def list(self, request):
        # Récupérer les paramètres de filtrage
        year = request.query_params.get('year', datetime.now().year)
        month = request.query_params.get('month')
        chantier_id = request.query_params.get('chantier_id')

        # Filtrer les chantiers
        chantiers_query = Chantier.objects.all()
        if chantier_id:
            chantiers_query = chantiers_query.filter(id=chantier_id)

        # Récupérer les statistiques des chantiers
        chantiers_stats = self.get_chantiers_stats(chantiers_query, year, month)

        # Récupérer les statistiques globales
        global_stats = self.get_global_stats(chantiers_query)

        # Récupérer les statistiques temporelles
        stats_temporelles = self.get_stats_temporelles(chantiers_query, year, month)

        return Response({
            'global_stats': global_stats,
            'chantiers': chantiers_stats,
            'stats_temporelles': stats_temporelles
        })

    @action(detail=False, methods=['get'])
    def resume(self, request):
        # Récupérer les paramètres de filtrage
        year = request.query_params.get('year', timezone.now().year)
        
        # Récupérer tous les chantiers
        chantiers = Chantier.objects.all()
        
        # Calculer les statistiques globales
        global_stats = self.get_global_stats(chantiers)
        payment_stats = self.get_global_payment_stats(chantiers, year)
        
        # Préparer les données détaillées pour chaque chantier
        chantiers_data = []
        for chantier in chantiers:
            chantier_data = {
                'id': chantier.id,
                'nom': chantier.chantier_name,
                'state_chantier': chantier.state_chantier,
                'dates': {
                    'debut': chantier.date_debut,
                    'fin': chantier.date_fin
                },
                'adresse': {
                    'rue': chantier.rue,
                    'ville': chantier.ville,
                    'code_postal': chantier.code_postal
                },
                'montants': {
                    'ttc': float(chantier.montant_ttc or 0),
                    'ht': float(chantier.montant_ht or 0)
                },
                'rentabilite': self.get_rentabilite_stats(chantier),
                'ressources': self.get_ressources_stats(chantier, year),
                'paiements': self.get_paiements_stats(chantier, year)
            }
            chantiers_data.append(chantier_data)
        
        return Response({
            'global_stats': {
                **global_stats,
                'paiements': payment_stats
            },
            'chantiers': chantiers_data
        })

    def get_global_payment_stats(self, chantiers_query, year):
        """Calcule les statistiques globales de paiement"""
        factures_en_attente = Facture.objects.filter(
            chantier__in=chantiers_query,
            date_creation__year=year,
            state_facture__in=['En attente', 'Attente paiement']
        )
        factures_retardees = Facture.objects.filter(
            chantier__in=chantiers_query,
            date_creation__year=year,
            state_facture__in=['En attente', 'Attente paiement'],
            date_echeance__lt=timezone.now()
        )
        
        total_en_attente = factures_en_attente.aggregate(total=Sum('price_ttc'))['total'] or 0
        total_retardees = factures_retardees.aggregate(total=Sum('price_ttc'))['total'] or 0
        
        # Ajouter des logs pour le débogage
        print(f"Factures en attente: {factures_en_attente.count()}, Total: {total_en_attente}")
        print(f"Factures en retard: {factures_retardees.count()}, Total: {total_retardees}")
        
        return {
            'total_en_attente': total_en_attente,
            'total_retardees': total_retardees,
            'nombre_en_attente': factures_en_attente.count(),
            'nombre_retardees': factures_retardees.count()
        }

    def get_rentabilite_stats(self, chantier):
        try:
            # Coûts réels
            cout_materiel = float(chantier.cout_materiel or 0)
            cout_main_oeuvre = float(chantier.cout_main_oeuvre or 0)
            cout_sous_traitance = float(chantier.cout_sous_traitance or 0)
            montant_ht = float(chantier.montant_ht or 0)
            
            # Coûts estimés
            cout_estime_materiel = float(chantier.cout_estime_materiel or 0)
            cout_estime_main_oeuvre = float(chantier.cout_estime_main_oeuvre or 0)
            marge_estimee = float(chantier.marge_estimee or 0)
            
            # Calculer les marges
            cout_total_reel = cout_materiel + cout_main_oeuvre + cout_sous_traitance
            marge_brute = montant_ht - cout_total_reel
            
            # Calculer les taux
            taux_marge_brute = (marge_brute / montant_ht * 100) if montant_ht > 0 else 0
            taux_marge_estimee = (marge_estimee / montant_ht * 100) if montant_ht > 0 else 0
            
            # Calculer les écarts
            ecart_materiel = cout_estime_materiel - cout_materiel
            ecart_main_oeuvre = cout_estime_main_oeuvre - cout_main_oeuvre
            
            return {
                'marge_brute': marge_brute,
                'marge_estimee': marge_estimee,
                'taux_marge_brute': taux_marge_brute,
                'taux_marge_estimee': taux_marge_estimee,
                'ecart_materiel': ecart_materiel,
                'ecart_main_oeuvre': ecart_main_oeuvre,
                'cout_total_reel': cout_total_reel,
                'cout_total_estime': cout_estime_materiel + cout_estime_main_oeuvre,
                'cout_materiel': cout_materiel,
                'cout_main_oeuvre': cout_main_oeuvre,
                'cout_sous_traitance': cout_sous_traitance,
                'cout_estime_materiel': cout_estime_materiel,
                'cout_estime_main_oeuvre': cout_estime_main_oeuvre
            }
        except Exception as e:
            print(f"Erreur dans get_rentabilite_stats: {str(e)}")
            return {
                'marge_brute': 0,
                'marge_estimee': 0,
                'taux_marge_brute': 0,
                'taux_marge_estimee': 0,
                'ecart_materiel': 0,
                'ecart_main_oeuvre': 0,
                'cout_total_reel': 0,
                'cout_total_estime': 0,
                'cout_materiel': 0,
                'cout_main_oeuvre': 0,
                'cout_sous_traitance': 0,
                'cout_estime_materiel': 0,
                'cout_estime_main_oeuvre': 0
            }

    def get_ressources_stats(self, chantier, year):
        # Calculer les statistiques de ressources
        try:
            # Récupérer les événements du chantier pour l'année
            events = Event.objects.filter(
                chantier=chantier,
                start_date__year=year
            )

            # Calculer le taux d'occupation mensuel
            taux_occupation_mensuel = {}
            for month in range(1, 13):
                events_mois = events.filter(start_date__month=month)
                if events_mois.exists():
                    # Calculer le taux d'occupation pour ce mois
                    total_heures = sum(float(e.hours_modified or 0) for e in events_mois)
                    jours_ouvres = len(set(e.start_date for e in events_mois))
                    taux_occupation = (total_heures / (jours_ouvres * 8)) * 100 if jours_ouvres > 0 else 0
                    taux_occupation_mensuel[month] = taux_occupation
                else:
                    taux_occupation_mensuel[month] = 0

            # Calculer le taux d'occupation global
            total_heures_annuel = sum(float(e.hours_modified or 0) for e in events)
            jours_ouvres_annuel = len(set(e.start_date for e in events))
            taux_occupation_global = (total_heures_annuel / (jours_ouvres_annuel * 8)) * 100 if jours_ouvres_annuel > 0 else 0

            return {
                'taux_occupation_mensuel': taux_occupation_mensuel,
                'taux_occupation_global': taux_occupation_global,
                'total_heures': total_heures_annuel,
                'jours_ouvres': jours_ouvres_annuel
            }
        except Exception as e:
            print(f"Erreur dans get_ressources_stats: {str(e)}")
            return {
                'taux_occupation_mensuel': {i: 0 for i in range(1, 13)},
                'taux_occupation_global': 0,
                'total_heures': 0,
                'jours_ouvres': 0
            }

    def get_paiements_stats(self, chantier, year):
        try:
            # Récupérer les factures du chantier pour l'année
            factures = Facture.objects.filter(
                chantier=chantier,
                date_creation__year=year
            )
            
            # Calculer les statistiques de paiement
            # Prendre en compte à la fois 'En attente' et 'Attente paiement'
            factures_en_attente = factures.filter(
                models.Q(state_facture='En attente') | 
                models.Q(state_facture='Attente paiement')
            )
            
            # Factures en retard (avec date d'échéance dépassée)
            factures_retardees = factures_en_attente.filter(
                date_echeance__lt=timezone.now()
            )
            
            # Calculer les totaux
            total_en_attente = factures_en_attente.aggregate(total=Sum('price_ttc'))['total'] or 0
            total_retardees = factures_retardees.aggregate(total=Sum('price_ttc'))['total'] or 0
            
            # Calculer le pourcentage de trésorerie bloquée
            total_ca = float(chantier.montant_ttc or 0)
            pourcentage_tresorerie_bloquee = (total_retardees / total_ca * 100) if total_ca > 0 else 0
            
            # Calculer les créances par âge
            creances_age = {
                'moins_30_jours': 0,
                '30_60_jours': 0,
                '60_90_jours': 0,
                'plus_90_jours': 0
            }
            
            for facture in factures_en_attente:
                montant = float(facture.price_ttc or 0)
                jours_retard = (timezone.now().date() - facture.date_creation.date()).days
                
                if jours_retard <= 30:
                    creances_age['moins_30_jours'] += montant
                elif jours_retard <= 60:
                    creances_age['30_60_jours'] += montant
                elif jours_retard <= 90:
                    creances_age['60_90_jours'] += montant
                else:
                    creances_age['plus_90_jours'] += montant
            
            # Ajouter des logs pour le débogage
            print(f"Factures pour le chantier {chantier.chantier_name}: {factures.count()}")
            print(f"Factures en attente: {factures_en_attente.count()}, Total: {total_en_attente}")
            print(f"Factures en retard: {factures_retardees.count()}, Total: {total_retardees}")
            
            return {
                'total_en_attente': total_en_attente,
                'total_retardees': total_retardees,
                'nombre_en_attente': factures_en_attente.count(),
                'nombre_retardees': factures_retardees.count(),
                'pourcentage_tresorerie_bloquee': pourcentage_tresorerie_bloquee,
                'creances_age': creances_age
            }
        except Exception as e:
            print(f"Erreur dans get_paiements_stats: {str(e)}")
            return {
                'total_en_attente': 0,
                'total_retardees': 0,
                'nombre_en_attente': 0,
                'nombre_retardees': 0,
                'pourcentage_tresorerie_bloquee': 0,
                'creances_age': {
                    'moins_30_jours': 0,
                    '30_60_jours': 0,
                    '60_90_jours': 0,
                    'plus_90_jours': 0
                }
            }

    def get_chantiers_stats(self, chantiers_query, year, month):
        chantiers_stats = {}
        
        for chantier in chantiers_query:
            # Calculer les coûts mensuels pour ce chantier
            bons_commande = BonCommande.objects.filter(
                chantier=chantier,
                date_creation__year=year,
                date_creation__month=month
            )
            
            cout_materiel_mensuel = float(bons_commande.aggregate(total=Sum('montant_total'))['total'] or 0)
            cout_estime = float(chantier.cout_estime_materiel or 0)
            cout_reel = float(chantier.cout_materiel or 0)
            
            chantiers_stats[str(chantier.id)] = {
                'info': {
                    'nom': chantier.chantier_name
                },
                'stats_globales': {
                    'montant_ht': float(chantier.montant_ht or 0),
                    'cout_materiel': cout_reel,
                    'cout_estime_materiel': cout_estime,
                    'marge_fourniture': cout_estime - cout_reel,
                    'cout_sous_traitance': 0
                },
                'stats_mensuelles': {
                    str(year): {
                        str(month): {
                            'cout_materiel': cout_materiel_mensuel,
                            'cout_main_oeuvre': float(chantier.cout_main_oeuvre or 0),
                            'marge_fourniture': cout_estime - cout_materiel_mensuel,
                            'cout_sous_traitance': 0
                        }
                    }
                }
            }
        
        return chantiers_stats

    def get_global_stats(self, chantiers_query):
        try:
            # Calculer les totaux pour tous les chantiers
            total_montant_ttc = sum(float(c.montant_ttc or 0) for c in chantiers_query)
            total_montant_ht = sum(float(c.montant_ht or 0) for c in chantiers_query)
            total_cout_materiel = sum(float(c.cout_materiel or 0) for c in chantiers_query)
            total_cout_main_oeuvre = sum(float(c.cout_main_oeuvre or 0) for c in chantiers_query)
            total_cout_sous_traitance = sum(float(c.cout_sous_traitance or 0) for c in chantiers_query)
            total_cout_estime_materiel = sum(float(c.cout_estime_materiel or 0) for c in chantiers_query)
            total_cout_estime_main_oeuvre = sum(float(c.cout_estime_main_oeuvre or 0) for c in chantiers_query)
            
            # Calculer les marges
            marge_brute = total_montant_ht - (total_cout_materiel + total_cout_main_oeuvre + total_cout_sous_traitance)
            marge_estimee = total_montant_ht - (total_cout_estime_materiel + total_cout_estime_main_oeuvre)
            
            # Calculer les pourcentages
            taux_marge_brute = (marge_brute / total_montant_ht * 100) if total_montant_ht > 0 else 0
            taux_marge_estimee = (marge_estimee / total_montant_ht * 100) if total_montant_ht > 0 else 0
            
            # Compter les chantiers en cours
            nombre_chantiers_en_cours = chantiers_query.filter(state_chantier='En Cours').count()
            
            return {
                'total_montant_ttc': total_montant_ttc,
                'total_montant_ht': total_montant_ht,
                'total_montant_estime_ht': total_montant_ht,
                'total_cout_materiel': total_cout_materiel,
                'total_cout_main_oeuvre': total_cout_main_oeuvre,
                'total_cout_sous_traitance': total_cout_sous_traitance,
                'total_cout_estime_materiel': total_cout_estime_materiel,
                'total_cout_estime_main_oeuvre': total_cout_estime_main_oeuvre,
                'marge_brute': marge_brute,
                'marge_estimee': marge_estimee,
                'taux_marge_brute': taux_marge_brute,
                'taux_marge_estimee': taux_marge_estimee,
                'nombre_chantiers': chantiers_query.count(),
                'nombre_chantiers_en_cours': nombre_chantiers_en_cours
            }
        except Exception as e:
            print(f"Erreur dans get_global_stats: {str(e)}")
            return {
                'total_montant_ttc': 0,
                'total_montant_ht': 0,
                'total_montant_estime_ht': 0,
                'total_cout_materiel': 0,
                'total_cout_main_oeuvre': 0,
                'total_cout_sous_traitance': 0,
                'total_cout_estime_materiel': 0,
                'total_cout_estime_main_oeuvre': 0,
                'marge_brute': 0,
                'marge_estimee': 0,
                'taux_marge_brute': 0,
                'taux_marge_estimee': 0,
                'nombre_chantiers': 0,
                'nombre_chantiers_en_cours': 0
            }

    def get_stats_temporelles(self, chantiers_query, year, month):
        """
        Génère des statistiques temporelles pour les chantiers.
        Utilise les paramètres year et month pour définir la période.
        """
        stats = {}
        
        # Récupérer les paramètres de période
        period_start = self.request.query_params.get('period_start')
        period_end = self.request.query_params.get('period_end')
        
        # Si aucune période n'est spécifiée, utiliser les 6 derniers mois par défaut
        if not period_start or not period_end:
            current_date = datetime(int(year), int(month), 1)
            start_date = (current_date - timedelta(days=5*30)).replace(day=1)  # ~5 mois avant
            end_date = current_date
        else:
            # Convertir les dates de la requête
            try:
                start_date = datetime.strptime(period_start, '%Y-%m-%d')
                end_date = datetime.strptime(period_end, '%Y-%m-%d')
            except ValueError:
                # En cas d'erreur de format, utiliser les 6 derniers mois
                current_date = datetime(int(year), int(month), 1)
                start_date = (current_date - timedelta(days=5*30)).replace(day=1)
                end_date = current_date
        
        # Générer la liste des mois dans la période
        months = []
        current = start_date.replace(day=1)
        
        while current <= end_date:
            months.append({
                'year': current.year,
                'month': current.month,
                'label': current.strftime('%b %Y')  # Format: Jan 2023
            })
            # Passer au mois suivant
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
        
        # Initialiser la structure de données
        for period in months:
            year_key = str(period['year'])
            month_key = str(period['month'])
            
            if year_key not in stats:
                stats[year_key] = {}
            
            stats[year_key][month_key] = {
                'label': period['label'],
                'cout_materiel': 0,
                'cout_main_oeuvre': 0,
                'marge_fourniture': 0,
                'cout_sous_traitance': 0
            }
        
        # Calculer les statistiques pour chaque période
        for period in months:
            year_key = str(period['year'])
            month_key = str(period['month'])
            
            # Calculer les coûts pour cette période
            bons_commande = BonCommande.objects.filter(
                chantier__in=chantiers_query,
                date_creation__year=period['year'],
                date_creation__month=period['month']
            )
            
            # Coût matériel pour cette période
            cout_materiel = float(bons_commande.aggregate(total=Sum('montant_total'))['total'] or 0)
            
            # Coût main d'œuvre pour cette période
            cout_main_oeuvre = float(chantiers_query.filter(
                date_debut__lte=datetime(period['year'], period['month'], 28),
                date_fin__gte=datetime(period['year'], period['month'], 1)
            ).aggregate(total=Sum('cout_main_oeuvre'))['total'] or 0)
            
            # Coût estimé matériel pour cette période
            cout_estime = float(chantiers_query.filter(
                date_debut__lte=datetime(period['year'], period['month'], 28),
                date_fin__gte=datetime(period['year'], period['month'], 1)
            ).aggregate(total=Sum('cout_estime_materiel'))['total'] or 0)
            
            # Coût sous-traitance pour cette période
            cout_sous_traitance = float(chantiers_query.filter(
                date_debut__lte=datetime(period['year'], period['month'], 28),
                date_fin__gte=datetime(period['year'], period['month'], 1)
            ).aggregate(total=Sum('cout_sous_traitance'))['total'] or 0)
            
            # Mettre à jour les statistiques
            stats[year_key][month_key]['cout_materiel'] = cout_materiel
            stats[year_key][month_key]['cout_main_oeuvre'] = cout_main_oeuvre
            stats[year_key][month_key]['marge_fourniture'] = cout_estime - cout_materiel
            stats[year_key][month_key]['cout_sous_traitance'] = cout_sous_traitance
        
        return stats

@api_view(['GET'])
def get_chantier_bons_commande(request, chantier_id):
    try:
        bons_commande = BonCommande.objects.filter(chantier_id=chantier_id)
        serializer = BonCommandeSerializer(bons_commande, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_chantier_stats(request):
    try:
        chantier_id = request.GET.get('chantier_id')
        
        if chantier_id:
            # Stats pour un chantier spécifique
            chantier = Chantier.objects.get(id=chantier_id)
            
            # Calcul de la marge sur fourniture
            cout_materiel = chantier.cout_materiel or 0
            cout_estime_materiel = chantier.cout_estime_materiel or 0
            marge_fourniture = cout_estime_materiel - cout_materiel
            
            return Response({
                'total_ht': chantier.montant_ht,
                'marge_fourniture': marge_fourniture,
                'marge_sous_traitance': chantier.marge_sous_traitance or 0,
                'marge_main_oeuvre': chantier.marge_main_oeuvre or 0,
                'chantiers_en_cours': 1
            })
        else:
            # Stats pour tous les chantiers
            chantiers = Chantier.objects.all()
            
            # Calcul de la marge totale sur fourniture
            marge_fourniture_totale = sum(
                (c.cout_estime_materiel or 0) - (c.cout_materiel or 0)
                for c in chantiers
            )
            
            return Response({
                'total_ht': chantiers.aggregate(Sum('montant_ht'))['montant_ht__sum'] or 0,
                'marge_fourniture': marge_fourniture_totale,
                'marge_sous_traitance': chantiers.aggregate(Sum('marge_sous_traitance'))['marge_sous_traitance__sum'] or 0,
                'marge_main_oeuvre': chantiers.aggregate(Sum('marge_main_oeuvre'))['marge_main_oeuvre__sum'] or 0,
                'chantiers_en_cours': chantiers.count()
            })
            
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class SousTraitantViewSet(viewsets.ModelViewSet):
    queryset = SousTraitant.objects.all()
    serializer_class = SousTraitantSerializer

    def get_queryset(self):
        queryset = SousTraitant.objects.prefetch_related('contacts').all()
        chantier_id = self.request.query_params.get('chantier')
        
        if chantier_id:
            # Récupérer tous les sous-traitants qui ont des contrats avec ce chantier
            sous_traitants_avec_contrats = SousTraitant.objects.prefetch_related('contacts').filter(
                contrats__chantier_id=chantier_id
            ).distinct()
            
            # Récupérer tous les sous-traitants existants
            tous_sous_traitants = SousTraitant.objects.prefetch_related('contacts').all()
            
            # Combiner les deux listes sans doublons
            queryset = (sous_traitants_avec_contrats | tous_sous_traitants).distinct()
        
        return queryset

    @action(detail=False, methods=['get'])
    def by_chantier(self, request):
        chantier_id = request.query_params.get('chantier_id')
        if not chantier_id:
            return Response(
                {'error': 'chantier_id est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Récupérer tous les sous-traitants
        sous_traitants = SousTraitant.objects.all()
        serializer = self.get_serializer(sous_traitants, many=True)
        return Response(serializer.data)

class ContactSousTraitantViewSet(viewsets.ModelViewSet):
    queryset = ContactSousTraitant.objects.all()
    serializer_class = ContactSousTraitantSerializer
    
    def get_queryset(self):
        queryset = ContactSousTraitant.objects.all()
        sous_traitant_id = self.request.query_params.get('sous_traitant')
        if sous_traitant_id:
            queryset = queryset.filter(sous_traitant_id=sous_traitant_id)
        return queryset

class ContactSocieteViewSet(viewsets.ModelViewSet):
    queryset = ContactSociete.objects.all()
    serializer_class = ContactSocieteSerializer
    
    def get_queryset(self):
        queryset = ContactSociete.objects.all()
        societe_id = self.request.query_params.get('societe')
        if societe_id:
            queryset = queryset.filter(societe_id=societe_id)
        return queryset

class ContratSousTraitanceViewSet(viewsets.ModelViewSet):
    queryset = ContratSousTraitance.objects.all()
    serializer_class = ContratSousTraitanceSerializer

    def get_queryset(self):
        queryset = ContratSousTraitance.objects.all()
        chantier_id = self.request.query_params.get('chantier_id')
        sous_traitant_id = self.request.query_params.get('sous_traitant')
        
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        if sous_traitant_id:
            queryset = queryset.filter(sous_traitant_id=sous_traitant_id)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Si aucune date de création n'est fournie, utiliser la date actuelle
            if not serializer.validated_data.get('date_creation'):
                serializer.validated_data['date_creation'] = timezone.now().date()
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'post'])
    def avenants(self, request, pk=None):
        contrat = self.get_object()
        if request.method == 'POST':
            # Calculer le prochain numéro d'avenant
            dernier_avenant = AvenantSousTraitance.objects.filter(contrat=contrat).order_by('-numero').first()
            numero = 1 if not dernier_avenant else dernier_avenant.numero + 1
            
            # Ajouter le numéro aux données
            data = request.data.copy()
            data['numero'] = numero
            
            serializer = AvenantSousTraitanceSerializer(data=data)
            if serializer.is_valid():
                # Si aucune date de création n'est fournie, utiliser la date actuelle
                if not serializer.validated_data.get('date_creation'):
                    serializer.validated_data['date_creation'] = timezone.now().date()
                serializer.save(contrat=contrat)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        avenants = AvenantSousTraitance.objects.filter(contrat=contrat)
        serializer = AvenantSousTraitanceSerializer(avenants, many=True)
        return Response(serializer.data)

class AvenantSousTraitanceViewSet(viewsets.ModelViewSet):
    queryset = AvenantSousTraitance.objects.all()
    serializer_class = AvenantSousTraitanceSerializer

    def get_queryset(self):
        queryset = AvenantSousTraitance.objects.all()
        contrat_id = self.request.query_params.get('contrat_id')
        if contrat_id:
            queryset = queryset.filter(contrat_id=contrat_id)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Si aucune date de création n'est fournie, utiliser la date actuelle
            if not serializer.validated_data.get('date_creation'):
                serializer.validated_data['date_creation'] = timezone.now().date()
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def preview_contrat(request, contrat_id):
    try:
        contrat = ContratSousTraitance.objects.get(id=contrat_id)
        
        # Sélectionner le bon template selon le type de contrat
        if contrat.type_contrat == 'BTP':
            template_name = 'sous_traitance/contrat_btp.html'
        else:
            template_name = 'sous_traitance/contrat_nettoyage.html'
        
        return render(request, template_name, {'contrat': contrat})
    except ContratSousTraitance.DoesNotExist:
        return HttpResponse("Contrat non trouvé", status=404)

def preview_avenant(request, avenant_id):
    try:
        avenant = AvenantSousTraitance.objects.select_related('contrat').get(id=avenant_id)
        
        # Récupérer uniquement les avenants antérieurs à celui en cours
        avenants_precedents = AvenantSousTraitance.objects.filter(
            contrat=avenant.contrat,
            numero__lt=avenant.numero
        ).order_by('numero')
        
        if avenant.contrat.type_contrat == 'BTP':
            template_name = 'sous_traitance/avenant_btp.html'
        else:
            template_name = 'sous_traitance/avenant_nettoyage.html'
            
        return render(request, template_name, {
            'avenant': avenant,
            'avenants_precedents': avenants_precedents
        })
    except AvenantSousTraitance.DoesNotExist:
        return JsonResponse({'error': 'Avenant non trouvé'}, status=404)

@api_view(['GET'])
def get_taux_facturation_data(request, chantier_id):
    """
    Récupère les données nécessaires pour l'affichage du taux de facturation
    """
    try:
        chantier = Chantier.objects.get(id=chantier_id)
        situations = Situation.objects.filter(chantier=chantier).order_by('-annee', '-mois')

        montant_total = 0
        montant_non_envoye = 0
        montant_en_attente = 0
        montant_retard = 0
        montant_paye = 0

        situations_data = []
        today = date.today()

        for situation in situations:
            montant = float(situation.montant_apres_retenues or 0)
            montant_total += montant

            # Calcul de la catégorie
            if not situation.date_envoi:
                categorie = 'non_envoye'
                montant_non_envoye += montant
            elif situation.date_paiement_reel:
                categorie = 'paye'
                montant_paye += montant
            elif situation.date_envoi and situation.delai_paiement:
                date_limite = situation.date_envoi + timedelta(days=situation.delai_paiement)
                if today > date_limite:
                    categorie = 'retard'
                    montant_retard += montant
                else:
                    categorie = 'en_attente'
                    montant_en_attente += montant
            else:
                categorie = 'en_attente'
                montant_en_attente += montant

            situation_data = {
                'id': situation.id,
                'numero_situation': situation.numero_situation,
                'mois': situation.mois,
                'annee': situation.annee,
                'montant_apres_retenues': montant,
                'date_envoi': situation.date_envoi,
                'delai_paiement': situation.delai_paiement,
                'date_paiement_reel': situation.date_paiement_reel,
                'statut': situation.statut,
                'categorie': categorie,
            }
            situations_data.append(situation_data)

        pourcentages = {
            'non_envoye': (montant_non_envoye / montant_total * 100) if montant_total > 0 else 0,
            'en_attente': (montant_en_attente / montant_total * 100) if montant_total > 0 else 0,
            'retard': (montant_retard / montant_total * 100) if montant_total > 0 else 0,
            'paye': (montant_paye / montant_total * 100) if montant_total > 0 else 0,
        }

        return Response({
            'montant_total': montant_total,
            'montants': {
                'non_envoye': montant_non_envoye,
                'en_attente': montant_en_attente,
                'retard': montant_retard,
                'paye': montant_paye,
            },
            'pourcentages': pourcentages,
            'situations': situations_data
        })

    except Chantier.DoesNotExist:
        return Response({'error': 'Chantier non trouvé'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def labor_costs_monthly_summary(request):
    """
    Endpoint : /api/labor_costs/monthly_summary/?month=YYYY-MM
    Retourne pour chaque chantier :
      - le total des heures (par type)
      - le total du montant (par type)
      - le détail par agent (heures, montant, par type)
      - le détail des jours majorés
    pour le mois donné (tous agents confondus).
    """
    month_str = request.GET.get('month')  # format attendu : 'YYYY-MM'
    if not month_str:
        return Response({'error': 'Paramètre month requis (format YYYY-MM)'}, status=400)
    try:
        year, month = map(int, month_str.split('-'))
    except Exception:
        return Response({'error': 'Format de mois invalide. Utilisez YYYY-MM.'}, status=400)

    from calendar import monthrange
    import datetime
    first_day = datetime.date(year, month, 1)
    last_day = datetime.date(year, month, monthrange(year, month)[1])
    # Collecter les semaines avec leur année ISO pour gérer les semaines qui chevauchent les années
    week_year_pairs = set()
    d = first_day
    while d <= last_day:
        iso_week = d.isocalendar()[1]
        iso_year = d.isocalendar()[0]  # Année ISO
        week_year_pairs.add((iso_year, iso_week))
        d += datetime.timedelta(days=1)

    # Fonction utilitaire pour obtenir la date réelle d'un LaborCost (lundi de la semaine)
    def get_date_from_week(year, week, day_name):
        days_of_week = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        day_index = days_of_week.index(day_name)
        lundi = datetime.datetime.strptime(f'{year}-W{int(week):02d}-1', "%G-W%V-%u")
        return (lundi + datetime.timedelta(days=day_index)).date()

    # Construire une requête Q pour filtrer par (year, week) dans les paires collectées
    from django.db.models import Q
    q_objects = Q()
    for iso_year, iso_week in week_year_pairs:
        q_objects |= Q(year=iso_year, week=iso_week)
    
    labor_costs = (LaborCost.objects
        .filter(q_objects)
        .select_related('chantier', 'agent'))

    chantier_map = {}
    for lc in labor_costs:
        chantier_id = lc.chantier.id
        chantier_nom = lc.chantier.chantier_name
        if chantier_id not in chantier_map:
            chantier_map[chantier_id] = {
                'chantier_id': chantier_id,
                'chantier_nom': chantier_nom,
                'total_heures_normal': 0,
                'total_heures_samedi': 0,
                'total_heures_dimanche': 0,
                'total_heures_ferie': 0,
                'total_montant_normal': 0,
                'total_montant_samedi': 0,
                'total_montant_dimanche': 0,
                'total_montant_ferie': 0,
                'details': [],
                'jours_majoration': []
            }
        # On va filtrer les jours majorés et les totaux par date réelle
        # On suppose que lc.details_majoration est une liste de dicts avec 'date' (YYYY-MM-DD)
        filtered_majorations = []
        for j in (lc.details_majoration or []):
            try:
                date_j = datetime.datetime.strptime(j['date'], "%Y-%m-%d").date()
                if date_j.year == year and date_j.month == month:
                    filtered_majorations.append(j)
            except Exception:
                continue
        # On filtre aussi les heures/monants par type en ne prenant que les majorations du mois
        heures_normal = 0
        heures_samedi = 0
        heures_dimanche = 0
        heures_ferie = 0
        montant_normal = 0
        montant_samedi = 0
        montant_dimanche = 0
        montant_ferie = 0
        # Utiliser le bon taux selon le type d'agent
        if lc.agent.type_paiement == 'journalier':
            taux_horaire = (lc.agent.taux_journalier or 0) / 8  # Convertir taux journalier en taux horaire
        else:
            taux_horaire = lc.agent.taux_Horaire or 0
        for j in filtered_majorations:
            if j['type'] == 'samedi':
                heures_samedi += j.get('hours', 0)
                montant_samedi += j.get('hours', 0) * taux_horaire * 1.25
            elif j['type'] == 'dimanche':
                heures_dimanche += j.get('hours', 0)
                montant_dimanche += j.get('hours', 0) * taux_horaire * 1.5
            elif j['type'] == 'ferie':
                heures_ferie += j.get('hours', 0)
                montant_ferie += j.get('hours', 0) * taux_horaire * 1.5
            else:
                heures_normal += j.get('hours', 0)
                montant_normal += j.get('hours', 0) * taux_horaire
        # Si pas de détails, on prend tout (cas legacy)
        if not filtered_majorations:
            # On doit calculer la date réelle du créneau pour chaque type d'heure
            # On suppose que lc.week, lc.year, lc.agent existent
            # On ne peut pas savoir le jour exact, donc on répartit tout en normal
            lundi = datetime.datetime.strptime(f'{lc.year}-W{int(lc.week):02d}-1', "%G-W%V-%u").date()
            if lundi.year == year and lundi.month == month:
                heures_normal += float(lc.hours_normal)
                montant_normal += float(lc.cost_normal)
                heures_samedi += float(lc.hours_samedi)
                montant_samedi += float(lc.cost_samedi)
                heures_dimanche += float(lc.hours_dimanche)
                montant_dimanche += float(lc.cost_dimanche)
                heures_ferie += float(lc.hours_ferie)
                montant_ferie += float(lc.cost_ferie)
        chantier_map[chantier_id]['total_heures_normal'] += heures_normal
        chantier_map[chantier_id]['total_heures_samedi'] += heures_samedi
        chantier_map[chantier_id]['total_heures_dimanche'] += heures_dimanche
        chantier_map[chantier_id]['total_heures_ferie'] += heures_ferie
        chantier_map[chantier_id]['total_montant_normal'] += montant_normal
        chantier_map[chantier_id]['total_montant_samedi'] += montant_samedi
        chantier_map[chantier_id]['total_montant_dimanche'] += montant_dimanche
        chantier_map[chantier_id]['total_montant_ferie'] += montant_ferie
        chantier_map[chantier_id]['details'].append({
            'agent_id': lc.agent.id,
            'agent_nom': f"{lc.agent.name} {lc.agent.surname}",
            'agent_type_paiement': lc.agent.type_paiement,
            'heures_normal': heures_normal,
            'heures_samedi': heures_samedi,
            'heures_dimanche': heures_dimanche,
            'heures_ferie': heures_ferie,
            'montant_normal': montant_normal,
            'montant_samedi': montant_samedi,
            'montant_dimanche': montant_dimanche,
            'montant_ferie': montant_ferie,
            'jours_majoration': filtered_majorations
        })
        chantier_map[chantier_id]['jours_majoration'].extend(filtered_majorations)
    return Response(list(chantier_map.values()), status=200)



def planning_hebdo_pdf(request):
    week = int(request.GET.get('week'))
    year = int(request.GET.get('year'))
    preview_url = request.build_absolute_uri(f"/api/preview-planning-hebdo/?week={week}&year={year}")
    
    # Utiliser des chemins relatifs qui fonctionnent en production
    import os
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    node_script_path = os.path.join(base_dir, 'frontend', 'src', 'components', 'generate_pdf.js')
    pdf_path = os.path.join(base_dir, 'frontend', 'src', 'components', 'planning_hebdo.pdf')
    
    # Vérifications préliminaires
    if not os.path.exists(node_script_path):
        error_msg = f'Script Node.js introuvable: {node_script_path}'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)
    
    # Vérifier si Node.js est disponible avec plusieurs chemins
    node_paths = ['node', '/usr/bin/node', '/usr/local/bin/node', '/opt/nodejs/bin/node']
    node_found = False
    node_path = 'node'
    
    for path in node_paths:
        try:
            result = subprocess.run([path, '--version'], check=True, capture_output=True, text=True)
            print(f"✅ Node.js trouvé: {path} - Version: {result.stdout.strip()}")
            node_found = True
            node_path = path
            break
        except (subprocess.CalledProcessError, FileNotFoundError):
            continue
    
    if not node_found:
        error_msg = 'Node.js n\'est pas installé ou n\'est pas accessible'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)
    
    command = [node_path, node_script_path, preview_url, pdf_path]
    print(f"Commande exécutée: {' '.join(command)}")
    
    try:
        # Exécuter avec capture de sortie pour debug
        result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=60)
        print(f"Sortie standard: {result.stdout}")
        print(f"Sortie d'erreur: {result.stderr}")
        
        if not os.path.exists(pdf_path):
            error_msg = f'Le fichier PDF n\'a pas été généré: {pdf_path}'
            print(f"ERREUR: {error_msg}")
            return JsonResponse({'error': error_msg}, status=500)
        
        with open(pdf_path, 'rb') as pdf_file:
            response = HttpResponse(pdf_file.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="planning_hebdo_agents_semaine_{week}_{year}.pdf"'
            return response
    
    except subprocess.TimeoutExpired:
        error_msg = 'Timeout lors de la génération du PDF (60 secondes)'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)
    except subprocess.CalledProcessError as e:
        error_msg = f'Erreur lors de la génération du PDF: {str(e)}\nSortie: {e.stdout}\nErreur: {e.stderr}'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)
    except Exception as e:
        error_msg = f'Erreur inattendue: {str(e)}'
        print(f"ERREUR: {error_msg}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return JsonResponse({'error': error_msg}, status=500)

def get_color_palette(n):
    base_colors = [
        "#FFB347", "#77DD77", "#AEC6CF", "#FF6961", "#F49AC2",
        "#B39EB5", "#FFD1DC", "#CFCFC4", "#B19CD9", "#03C03C",
        "#779ECB", "#966FD6", "#FDFD96", "#CB99C9", "#C23B22"
    ]
    random.shuffle(base_colors)
    return base_colors * (n // len(base_colors) + 1)

def get_color_for_chantier(chantier_name, palette):
    # Utilise un hash du nom pour choisir une couleur de la palette, toujours la même
    return palette[hash(chantier_name) % len(palette)]

def generate_pastel_palette(n):
    # Génère n couleurs pastel en HSL
    palette = []
    for i in range(n):
        hue = int(360 * i / n)
        color = f"hsl({hue}, 70%, 80%)"
        palette.append(color)
    return palette

def get_color_for_chantier(chantier_name, palette):
    return palette[hash(chantier_name) % len(palette)]

def preview_planning_hebdo(request):
    week = int(request.GET.get('week'))
    year = int(request.GET.get('year'))
    
    # Récupérer la liste des agents sélectionnés
    agent_ids = request.GET.get('agent_ids')
    
    if agent_ids:
        # Parser la liste des IDs (format: "1,2,3")
        try:
            agent_ids_list = [int(id.strip()) for id in agent_ids.split(',') if id.strip().isdigit()]
            agents = Agent.objects.filter(id__in=agent_ids_list)
        except (ValueError, TypeError) as e:
            # En cas d'erreur, utiliser tous les agents
            agents = Agent.objects.all()
    else:
        # Si aucun agent spécifié, utiliser tous les agents (comportement par défaut)
        agents = Agent.objects.all()
    
    days_of_week = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

    planning_data = {}
    chantier_names = set()
    agent_hours_map = {}  # Map pour stocker les heures par agent
    
    for agent in agents:
        # Adapter les heures selon le type d'agent
        if agent.type_paiement == 'journalier':
            hours = ["Matin", "Après-midi"]
        else:
            hours = [f"{h}:00" for h in range(6, 23)]  # 6h à 22h
        
        agent_hours_map[agent.id] = hours
        planning_data[agent.id] = {hour: {day: "" for day in days_of_week} for hour in hours}
        
        schedules = Schedule.objects.filter(agent=agent, week=week, year=year)
        for s in schedules:
            if agent.type_paiement == 'journalier':
                # Pour les agents journaliers, s.hour est déjà "Matin" ou "Après-midi"
                hour = s.hour
            else:
                # Pour les agents horaires, formater l'heure
                try:
                    hour = str(int(s.hour.split(':')[0])) + ":00"
                except Exception:
                    hour = s.hour
            
            day = s.day.capitalize()
            chantier_name = s.chantier.chantier_name if s.chantier else ""
            if chantier_name:
                chantier_names.add(chantier_name)
            if hour in planning_data[agent.id] and day in planning_data[agent.id][hour]:
                planning_data[agent.id][hour][day] = chantier_name

    chantier_names = sorted(list(chantier_names))
    palette = generate_pastel_palette(100)  # 100 couleurs pastel
    chantier_colors = {name: get_color_for_chantier(name, palette) for name in chantier_names}

    # Préparation des rowspans pour fusionner les cellules
    planning_rowspan = {agent.id: {day: [] for day in days_of_week} for agent in agents}
    for agent in agents:
        agent_hours = agent_hours_map[agent.id]  # Récupérer les heures spécifiques à cet agent
        for day in days_of_week:
            prev_chantier = None
            start_hour = None
            span = 0
            for hour in agent_hours:
                chantier = planning_data[agent.id][hour][day]
                if chantier == prev_chantier:
                    span += 1
                else:
                    if prev_chantier and prev_chantier != '':
                        planning_rowspan[agent.id][day].append((prev_chantier, start_hour, span))
                    prev_chantier = chantier
                    start_hour = hour
                    span = 1
            if prev_chantier and prev_chantier != '':
                planning_rowspan[agent.id][day].append((prev_chantier, start_hour, span))

    # Calculer les dates de la semaine pour l'affichage
    from datetime import datetime, timedelta
    
    # Calculer le premier jour de la semaine ISO
    jan4 = datetime(year, 1, 4)
    jan4_weekday = jan4.weekday()  # 0 = lundi, 6 = dimanche
    week1_start = jan4 - timedelta(days=jan4_weekday)
    
    # Calculer le début de la semaine demandée
    week_start = week1_start + timedelta(weeks=week-1)
    
    # Calculer les 7 jours de la semaine
    week_dates = []
    for i in range(7):
        week_dates.append(week_start + timedelta(days=i))
    
    # Créer les en-têtes avec dates
    days_with_dates = []
    for i, day in enumerate(days_of_week):
        date = week_dates[i]
        days_with_dates.append({
            'name': day,
            'short_name': day[0],  # Première lettre
            'date': date.strftime('%d/%m'),
            'full_date': date
        })

    return render(request, 'DocumentAgent/planning_hebdo_agents.html', {
        'week': week,
        'year': year,
        'agents': agents,
        'days_of_week': days_of_week,
        'days_with_dates': days_with_dates,
        'week_dates': week_dates,
        'agent_hours_map': agent_hours_map,
        'planning_data': planning_data,
        'chantier_colors': chantier_colors,
        'planning_rowspan': planning_rowspan,
    })

@api_view(['POST'])
def recalculate_labor_costs(request):
    """
    Recalcule les coûts de main d'œuvre pour une période donnée.
    Expects: { "week": 23, "year": 2024 } ou { "month": 5, "year": 2024 }
    """
    week = request.data.get('week')
    year = request.data.get('year')
    agent_id = request.data.get('agent_id')
    chantier_id = request.data.get('chantier_id')

    # Filtrer les schedules concernés
    schedules = Schedule.objects.all()
    if week:
        schedules = schedules.filter(week=week)
    if year:
        schedules = schedules.filter(year=year)
    if agent_id:
        schedules = schedules.filter(agent_id=agent_id)
    if chantier_id:
        schedules = schedules.filter(chantier_id=chantier_id)

    # Regrouper par agent/chantier/semaine/année
    data = {}
    for s in schedules:
        key = (s.agent_id, s.chantier_id, s.week, s.year)
        data.setdefault(key, 0)
        
        agent = Agent.objects.get(id=s.agent_id)
        if agent.type_paiement == 'journalier':
            # Pour les agents journaliers : Matin ou Après-midi = 0.5 jour
            data[key] += 0.5  # 0.5 jour par créneau (matin ou après-midi)
        else:
            # Pour les agents horaires : 1 heure par créneau
            data[key] += 1  # 1h par créneau

    # Mettre à jour les LaborCost
    for (agent_id, chantier_id, week, year), hours_or_days in data.items():
        agent = Agent.objects.get(id=agent_id)
        chantier = Chantier.objects.get(id=chantier_id)
        if agent.type_paiement == 'journalier':
            # Pour les agents journaliers : hours_or_days représente des jours
            # 0.5 jour = taux_journalier ÷ 2, 1 jour = taux_journalier
            cost = (hours_or_days * (agent.taux_journalier or 0))
            # Convertir les jours en heures pour l'affichage (8h par jour par exemple)
            hours_for_display = hours_or_days * 8
        else:
            # Pour les agents horaires : hours_or_days représente des heures
            cost = hours_or_days * (agent.taux_Horaire or 0)
            hours_for_display = hours_or_days
        
        LaborCost.objects.update_or_create(
            agent=agent, chantier=chantier, week=week, year=year,
            defaults={
                'hours_normal': hours_for_display,
                'hours_samedi': 0,
                'hours_dimanche': 0,
                'hours_ferie': 0,
                'cost_normal': cost,
                'cost_samedi': 0,
                'cost_dimanche': 0,
                'cost_ferie': 0,
                'details_majoration': [],
            }
        )
    return Response({"status": "ok"})

class PaiementSousTraitantViewSet(viewsets.ModelViewSet):
    queryset = PaiementSousTraitant.objects.all()
    serializer_class = PaiementSousTraitantSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        chantier_id = self.request.query_params.get('chantier')
        sous_traitant_id = self.request.query_params.get('sous_traitant')
        contrat_id = self.request.query_params.get('contrat')
        avenant_id = self.request.query_params.get('avenant')
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        if sous_traitant_id:
            queryset = queryset.filter(sous_traitant_id=sous_traitant_id)
        if contrat_id:
            queryset = queryset.filter(contrat_id=contrat_id)
        if avenant_id:
            queryset = queryset.filter(avenant_id=avenant_id)
        return queryset

class PaiementGlobalSousTraitantViewSet(viewsets.ModelViewSet):
    queryset = PaiementGlobalSousTraitant.objects.all()
    serializer_class = PaiementGlobalSousTraitantSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        chantier_id = self.request.query_params.get('chantier')
        sous_traitant_id = self.request.query_params.get('sous_traitant')
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        if sous_traitant_id:
            queryset = queryset.filter(sous_traitant_id=sous_traitant_id)
        return queryset

    def create(self, request, *args, **kwargs):
        """Création avec validation du montant total"""
        chantier_id = request.data.get('chantier')
        sous_traitant_id = request.data.get('sous_traitant')
        montant_paye = float(request.data.get('montant_paye_ht', 0))
        
        if chantier_id and sous_traitant_id:
            chantier = Chantier.objects.get(id=chantier_id)
            montant_total = chantier.montant_total_sous_traitance
            montant_deja_paye = chantier.montant_total_paye_sous_traitance
            
            if montant_deja_paye + montant_paye > montant_total:
                return Response({
                    'error': f'Le montant payé ({montant_deja_paye + montant_paye}€) dépasse le montant total ({montant_total}€)'
                }, status=400)
        
        return super().create(request, *args, **kwargs)

class FactureSousTraitantViewSet(viewsets.ModelViewSet):
    queryset = FactureSousTraitant.objects.all()
    serializer_class = FactureSousTraitantSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        chantier_id = self.request.query_params.get('chantier')
        sous_traitant_id = self.request.query_params.get('sous_traitant')
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        if sous_traitant_id:
            queryset = queryset.filter(sous_traitant_id=sous_traitant_id)
        return queryset.prefetch_related('paiements')

    def create(self, request, *args, **kwargs):
        """Création d'une facture avec auto-génération du numéro si nécessaire"""
        chantier_id = request.data.get('chantier')
        sous_traitant_id = request.data.get('sous_traitant')
        mois = request.data.get('mois')
        annee = request.data.get('annee')
        numero_facture = request.data.get('numero_facture')
        
        # Auto-génération du numéro de facture si pas fourni
        if not numero_facture and chantier_id and sous_traitant_id and mois and annee:
            existing_factures = FactureSousTraitant.objects.filter(
                chantier_id=chantier_id,
                sous_traitant_id=sous_traitant_id,
                mois=mois,
                annee=annee
            ).count()
            numero_facture = str(existing_factures + 1)
            request.data['numero_facture'] = numero_facture
        
        return super().create(request, *args, **kwargs)

class PaiementFactureSousTraitantViewSet(viewsets.ModelViewSet):
    queryset = PaiementFactureSousTraitant.objects.all()
    serializer_class = PaiementFactureSousTraitantSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        facture_id = self.request.query_params.get('facture')
        if facture_id:
            queryset = queryset.filter(facture_id=facture_id)
        return queryset


class SuiviPaiementSousTraitantMensuelViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les suivis de paiements sous-traitants mensuels
    Ces données sont spécifiques au tableau sous-traitant et indépendantes des autres sources
    """
    queryset = SuiviPaiementSousTraitantMensuel.objects.all()
    serializer_class = SuiviPaiementSousTraitantMensuelSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtres
        chantier_id = self.request.query_params.get('chantier')
        mois = self.request.query_params.get('mois')
        annee = self.request.query_params.get('annee')
        sous_traitant = self.request.query_params.get('sous_traitant')
        
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        if mois:
            queryset = queryset.filter(mois=mois)
        if annee:
            queryset = queryset.filter(annee=annee)
        if sous_traitant:
            queryset = queryset.filter(sous_traitant__icontains=sous_traitant)
        
        return queryset.prefetch_related('factures_suivi').select_related('chantier')
    
    @action(detail=False, methods=['post'])
    def update_or_create_suivi(self, request):
        """
        Crée ou met à jour un suivi de paiement
        Paramètres attendus : mois, annee, sous_traitant, chantier_id (optionnel), et autres champs
        """
        mois = request.data.get('mois')
        annee = request.data.get('annee')
        sous_traitant = request.data.get('sous_traitant')
        chantier_id = request.data.get('chantier_id')
        
        if not all([mois, annee, sous_traitant]):
            return Response(
                {'error': 'mois, annee et sous_traitant sont requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filtrer les champs à mettre à jour
        update_fields = {}
        for field in ['montant_paye_ht', 'date_paiement_reel', 'date_envoi_facture', 'delai_paiement']:
            if field in request.data:
                update_fields[field] = request.data[field]
        
        # Créer ou mettre à jour
        suivi, created = SuiviPaiementSousTraitantMensuel.objects.update_or_create(
            mois=mois,
            annee=annee,
            sous_traitant=sous_traitant,
            chantier_id=chantier_id if chantier_id else None,
            defaults=update_fields
        )
        
        serializer = self.get_serializer(suivi)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class FactureSuiviSousTraitantViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les factures saisies dans le tableau sous-traitant
    """
    queryset = FactureSuiviSousTraitant.objects.all()
    serializer_class = FactureSuiviSousTraitantSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = super().get_queryset()
        suivi_paiement_id = self.request.query_params.get('suivi_paiement')
        
        if suivi_paiement_id:
            queryset = queryset.filter(suivi_paiement_id=suivi_paiement_id)
        
        return queryset.select_related('suivi_paiement')


class RecapFinancierChantierAPIView(APIView):
    permission_classes = []

    def get(self, request, chantier_id):
        from datetime import datetime, date, timedelta
        import calendar
        import holidays
        from api.models import Schedule
        mois = request.GET.get('mois')
        annee = request.GET.get('annee')
        chantier = Chantier.objects.get(pk=chantier_id)

        # Définir la période
        if mois and annee:
            periode = f"{str(mois).zfill(2)}/{annee}"
            date_debut = date(int(annee), int(mois), 1)
            if int(mois) == 12:
                date_fin = date(int(annee)+1, 1, 1) - timedelta(days=1)
            else:
                date_fin = date(int(annee), int(mois)+1, 1) - timedelta(days=1)
        else:
            periode = "Global"
            date_debut = None
            date_fin = None

        # --- Récupération et filtrage des documents ---
        # 1. Bon de Commande (Matériel)
        bc_qs = BonCommande.objects.filter(chantier=chantier)
        if date_debut and date_fin:
            bc_qs = bc_qs.filter(date_paiement__range=(date_debut, date_fin))
        bc_payes = bc_qs.filter(statut_paiement='paye')
        bc_reste = bc_qs.exclude(statut_paiement='paye')

        # 2. Situation (Entrées) - filtrage sur la date d'envoi (pas la date de paiement réelle)
        situations = Situation.objects.filter(chantier=chantier)
        situations_in_periode = []
        for s in situations:
            # Filtrer toujours sur la date d'envoi, pas sur la date de paiement réelle
            # Les situations doivent être comptabilisées dans le mois de leur date d'envoi
            date_filtre = s.date_envoi
            
            # Filtrage par période si spécifiée
            if date_debut and date_fin:
                if date_filtre:
                    # Filtrer sur la date d'envoi
                    if not (date_debut <= date_filtre <= date_fin):
                        continue
                else:
                    # Si pas de date d'envoi, exclure de la période
                    continue
            
            # Calculer la date de paiement estimée pour l'affichage
            if s.date_envoi and s.delai_paiement is not None:
                try:
                    s._date_paiement_estimee = s.date_envoi + timedelta(days=s.delai_paiement)
                except Exception:
                    s._date_paiement_estimee = None
            else:
                s._date_paiement_estimee = None
            
            # Calculer le retard
            if s.date_paiement_reel and s._date_paiement_estimee:
                s._retard = (s.date_paiement_reel - s._date_paiement_estimee).days
            else:
                s._retard = None
            
            situations_in_periode.append(s)

        situation_payees = [s for s in situations_in_periode if s.date_paiement_reel]
        situation_reste = [s for s in situations_in_periode if not s.date_paiement_reel]

        # 3. Facture (Entrées)
        facture_qs = Facture.objects.filter(chantier=chantier, type_facture='classique')
        if date_debut and date_fin:
            facture_qs = facture_qs.filter(date_paiement__range=(date_debut, date_fin))
        facture_payees = facture_qs.filter(date_paiement__isnull=False)
        facture_reste = facture_qs.filter(date_paiement__isnull=True)

        # 4. Factures Sous-Traitant (Sorties) - NOUVEAU SYSTÈME
        # Récupérer toutes les factures du chantier avec leurs paiements
        factures_qs = FactureSousTraitant.objects.filter(chantier=chantier).prefetch_related('paiements', 'sous_traitant')
        
        # Collecter les paiements effectués dans la période
        paiements_periode = []
        factures_reste_periode = []
        
        for facture in factures_qs:
            # Paiements effectués dans la période
            # Filtrer par date de réception de la facture (pas la date de paiement réelle)
            for paiement in facture.paiements.all():
                # Filtrer par date de réception de la facture
                if not date_debut or not date_fin or (date_debut <= facture.date_reception <= date_fin):
                    paiements_periode.append(paiement)
            
            # Factures avec échéance dans la période et pas entièrement payées
            if not facture.est_soldee and facture.date_paiement_prevue:
                if not date_debut or not date_fin or (date_debut <= facture.date_paiement_prevue <= date_fin):
                    factures_reste_periode.append(facture)

        # 5. Main d'œuvre (Sorties) - NOUVELLE LOGIQUE AVEC SCHEDULE
        # Gestion des jours fériés pour toutes les années concernées
        years_to_check = []
        if annee:
            years_to_check = [int(annee)]
        else:
            # Mode global : récupérer toutes les années des schedules
            years_to_check = list(Schedule.objects.filter(chantier=chantier).values_list('year', flat=True).distinct())
        

        
        fr_holidays = set()
        for year in years_to_check:
            fr_holidays.update(holidays.country_holidays('FR', years=[year]))
        
        schedule_qs = Schedule.objects.filter(chantier=chantier)
        
        if date_debut and date_fin and annee:
            # On filtre sur la date réelle du créneau
            weeks = set()
            d = date_debut
            while d <= date_fin:
                weeks.add(d.isocalendar()[1])
                d += timedelta(days=1)
            schedule_qs = schedule_qs.filter(year=int(annee), week__in=list(weeks))
        
        # Agrégation par agent
        agent_map = {}
        processed_count = 0
        for s in schedule_qs.select_related('agent'):
            # Calcul de la date réelle du créneau
            days_of_week = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
            day_index = days_of_week.index(s.day)
            lundi = datetime.strptime(f'{s.year}-W{int(s.week):02d}-1', "%G-W%V-%u")
            date_creneau = (lundi + timedelta(days=day_index)).date()
            

            
            # Filtrage par période si spécifiée
            if date_debut and date_fin:
                if not (date_debut <= date_creneau <= date_fin):
                    continue
            
            agent_id = s.agent.id
            agent_nom = f"{s.agent.name} {s.agent.surname}"
            
            # Gestion des agents journaliers vs horaires
            is_journalier = s.agent.type_paiement == 'journalier'
            if is_journalier:
                taux_horaire = (s.agent.taux_journalier or 0) / 8  # Convertir en taux horaire
                heures_increment = 4  # Matin/Après-midi = 4h chacun
            else:
                taux_horaire = s.agent.taux_Horaire or 0
                heures_increment = 1  # 1h par créneau
                
            processed_count += 1
            
            if agent_id not in agent_map:
                agent_map[agent_id] = {
                    'id': agent_id,  # Utiliser l'ID de l'agent comme ID unique
                    'agent': agent_nom,
                    'mois': f"{str(mois).zfill(2)}/{annee}" if mois and annee else "Global",
                    'heures': 0,
                    'montant': 0,
                    'date': f"{annee}-{str(mois).zfill(2)}-01" if mois and annee else None,
                    'statut': 'à payer',  # Par défaut, la main d'œuvre est à payer
                    'type_paiement': s.agent.type_paiement,  # Ajouter le type d'agent
                }
            
            # Déterminer le type de jour et calculer le montant
            if is_journalier:
                # Pour les agents journaliers : toujours taux normal, peu importe le jour
                agent_map[agent_id]['heures'] += heures_increment
                agent_map[agent_id]['montant'] += taux_horaire * heures_increment
            else:
                # Pour les agents horaires : appliquer les majorations
                if date_creneau in fr_holidays:
                    agent_map[agent_id]['heures'] += heures_increment
                    agent_map[agent_id]['montant'] += taux_horaire * heures_increment * 1.5
                elif s.day == "Samedi":
                        agent_map[agent_id]['heures'] += heures_increment
                        agent_map[agent_id]['montant'] += taux_horaire * heures_increment * 1.25
                elif s.day == "Dimanche":
                        agent_map[agent_id]['heures'] += heures_increment
                        agent_map[agent_id]['montant'] += taux_horaire * heures_increment * 1.5
                else:
                        agent_map[agent_id]['heures'] += heures_increment
                        agent_map[agent_id]['montant'] += taux_horaire * heures_increment
            

        
        # Convertir les heures en jours pour les agents journaliers (pour l'affichage)
        for agent_data in agent_map.values():
            if agent_data['type_paiement'] == 'journalier':
                # Convertir 8h = 1j pour l'affichage
                jours = agent_data['heures'] / 8
                if jours == int(jours):  # Si c'est un nombre entier de jours
                    agent_data['heures_affichage'] = f"{int(jours)}j"
                else:  # Si c'est une fraction de jour
                    agent_data['heures_affichage'] = f"{jours:.1f}j"
            else:
                # Pour les agents horaires, garder l'affichage en heures
                agent_data['heures_affichage'] = f"{int(agent_data['heures'])}h"
        
        # Calculer le total de la main d'œuvre (heures travaillées)
        main_oeuvre_total = sum(a['montant'] for a in agent_map.values())
        
        # Ajouter les primes du chantier au total de la main d'œuvre
        primes_chantier = AgentPrime.objects.filter(
            chantier=chantier,
            type_affectation='chantier'
        )
        
        # Si période définie, filtrer les primes par mois/année
        if mois and annee:
            primes_chantier = primes_chantier.filter(mois=int(mois), annee=int(annee))
        
        # Ajouter le montant total des primes au total main d'œuvre
        total_primes = sum(float(p.montant) for p in primes_chantier)
        main_oeuvre_total += total_primes
        
        main_oeuvre_documents = list(agent_map.values())
        main_oeuvre = {
            'total': main_oeuvre_total,
            'documents': main_oeuvre_documents
        }
        


        # --- Construction des listes de documents ---
        def bc_to_doc(bc):
            montant = float(bc.reste_a_payer) if getattr(bc, 'statut_paiement', None) == 'paye_partiel' and hasattr(bc, 'reste_a_payer') else float(bc.montant_total)
            return {
                "id": bc.id,
                "numero": bc.numero,
                "date": bc.date_paiement,
                "montant": montant,
                "statut": bc.statut_paiement,
                "fournisseur": bc.fournisseur if hasattr(bc, 'fournisseur') else None,
            }

        def situation_to_doc(sit):
            montant = float(sit.montant_reel_ht) if sit.date_paiement_reel and sit.montant_reel_ht else float(sit.montant_apres_retenues)
            doc = {
                "id": sit.id,
                "numero": sit.numero_situation,
                "date": sit.date_envoi,
                "montant": montant,
                "statut": "payé" if sit.date_paiement_reel else "à encaisser",
                "date_paiement_estimee": getattr(sit, '_date_paiement_estimee', None),
                "retard": getattr(sit, '_retard', None),
            }
            return doc

        def facture_to_doc(fac):
            return {
                "id": fac.id,
                "numero": fac.numero,
                "date": fac.date_paiement,
                "montant": float(fac.price_ht),
                "statut": "payé" if fac.date_paiement else "à encaisser",
            }

        def paiement_facture_to_doc(paiement):
            """Transforme un paiement de facture en document pour les dépenses payées"""
            return {
                "id": paiement.id,
                "numero": f"{getattr(paiement.facture.sous_traitant, 'entreprise', str(paiement.facture.sous_traitant))}-{paiement.facture.numero_facture}",
                "date": paiement.facture.date_reception,  # Utiliser la date de réception de la facture
                "montant": float(paiement.montant_paye),
                "statut": "payé",
                "sous_traitant": getattr(paiement.facture.sous_traitant, 'entreprise', None),
                "facture_numero": paiement.facture.numero_facture,
            }

        def facture_reste_to_doc(facture):
            """Transforme une facture non soldée en document pour les dépenses restantes"""
            montant_restant = float(facture.montant_facture_ht) - float(facture.montant_total_paye)
            
            # Calculer les jours de retard par rapport à la date prévue
            jours_retard = 0
            if facture.date_paiement_prevue:
                from datetime import date
                aujourd_hui = date.today()
                diff = (aujourd_hui - facture.date_paiement_prevue).days
                jours_retard = diff  # Positif = retard, Négatif = avance
            
            return {
                "id": facture.id,
                "numero": f"{getattr(facture.sous_traitant, 'entreprise', str(facture.sous_traitant))}-{facture.numero_facture}",
                "date": facture.date_paiement_prevue,
                "montant": montant_restant,
                "statut": "à payer",
                "sous_traitant": getattr(facture.sous_traitant, 'entreprise', None),
                "facture_numero": facture.numero_facture,
                "retard": jours_retard,  # Jours de retard/avance
            }



        # --- Agrégation des totaux et des listes ---
        # Remplacement de la logique matériel par PaiementFournisseurMateriel
        paiements_materiel = PaiementFournisseurMateriel.objects.filter(chantier=chantier)
        if date_debut and date_fin and mois and annee:
            paiements_materiel = paiements_materiel.filter(mois=int(mois), annee=int(annee))
        
        def paiement_materiel_to_doc(pm):
            return {
                "id": pm.id,
                "numero": None,
                "date": pm.date_saisie.date() if hasattr(pm.date_saisie, 'date') else pm.date_saisie,
                "montant": float(pm.montant),  # Montant payé (non modifiable)
                "montant_a_payer": float(pm.montant_a_payer) if pm.montant_a_payer else 0,  # Montant à payer (modifiable)
                "statut": "payé",  # On considère que tout paiement saisi est payé
                "fournisseur": pm.fournisseur,
            }
        
        # Utiliser montant_a_payer pour le total car c'est ce que l'utilisateur saisit comme dépense
        # Si montant_a_payer n'existe pas, utiliser montant comme fallback
        total_materiel = float(sum(
            (pm.montant_a_payer if pm.montant_a_payer else pm.montant) 
            for pm in paiements_materiel
        ))
        documents_materiel = [paiement_materiel_to_doc(pm) for pm in paiements_materiel]

        sorties = {
            "paye": {
                "materiel": {
                    "total": total_materiel,
                    "documents": documents_materiel
                },
                "main_oeuvre": main_oeuvre,
                "sous_traitant": {
                    "total": float(sum(paiement.montant_paye for paiement in paiements_periode)),
                    "documents": [paiement_facture_to_doc(paiement) for paiement in paiements_periode]
                }
            },
            "reste_a_payer": {
                "materiel": {
                    "total": 0.0,
                    "documents": []
                },
                "main_oeuvre": { 'total': 0, 'documents': [] },
                "sous_traitant": {
                    "total": float(sum(float(facture.montant_facture_ht) - float(facture.montant_total_paye) for facture in factures_reste_periode)),
                    "documents": [facture_reste_to_doc(facture) for facture in factures_reste_periode]
                }
            }
        }

        entrees = {
            "paye": {
                "situation": {
                    "total": float(sum(
                        float(s.montant_reel_ht) if s.date_paiement_reel and s.montant_reel_ht else float(s.montant_apres_retenues)
                        for s in situation_payees
                    )),
                    "documents": [situation_to_doc(sit) for sit in situation_payees]
                },
                "facture": {
                    "total": float(facture_payees.aggregate(s=Sum('price_ht'))['s'] or 0),
                    "documents": [facture_to_doc(fac) for fac in facture_payees]
                }
            },
            "reste_a_encaisser": {
                "situation": {
                    "total": float(sum(s.montant_apres_retenues for s in situation_reste)),
                    "documents": [situation_to_doc(sit) for sit in situation_reste]
                },
                "facture": {
                    "total": float(facture_reste.aggregate(s=Sum('price_ht'))['s'] or 0),
                    "documents": [facture_to_doc(fac) for fac in facture_reste]
                }
            }
        }

        montant_ht = chantier.montant_ht or 0
        taux_fixe = chantier.taux_fixe or 0
        montant_taux_fixe = montant_ht * taux_fixe / 100

        data = {
            "periode": periode,
            "sorties": sorties,
            "entrees": entrees,
            "montant_ht": montant_ht,
            "taux_fixe": taux_fixe,
            "montant_taux_fixe": montant_taux_fixe,
        }

        serializer = RecapFinancierSerializer(data)
        return Response(serializer.data)

class PaiementFournisseurMaterielAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, chantier_id):
        mois = request.GET.get('mois')
        annee = request.GET.get('annee')
        paiements = PaiementFournisseurMateriel.objects.filter(chantier_id=chantier_id)
        if mois:
            paiements = paiements.filter(mois=mois)
        if annee:
            paiements = paiements.filter(annee=annee)
        serializer = PaiementFournisseurMaterielSerializer(paiements, many=True)
        return Response(serializer.data)

    def post(self, request, chantier_id):
        # On attend une liste d'objets ou un objet unique
        data = request.data
        if isinstance(data, dict):
            data = [data]
        results = []
        for paiement_data in data:
            paiement_data['chantier'] = chantier_id
            
            # Récupérer les valeurs existantes si l'objet existe déjà
            try:
                existing = PaiementFournisseurMateriel.objects.get(
                    chantier_id=chantier_id,
                    fournisseur=paiement_data['fournisseur'],
                    mois=paiement_data['mois'],
                    annee=paiement_data['annee']
                )
                montant_paye_existant = existing.montant
                date_paiement_existante = existing.date_paiement
                date_envoi_existante = existing.date_envoi
            except PaiementFournisseurMateriel.DoesNotExist:
                montant_paye_existant = 0
                date_paiement_existante = None
                date_envoi_existante = None
            
            # Récupérer le nouveau montant payé
            nouveau_montant = paiement_data.get('montant', montant_paye_existant)
            
            # Récupérer la date de paiement si fournie
            date_paiement_str = paiement_data.get('date_paiement')
            date_paiement = None
            if date_paiement_str:
                from datetime import datetime
                try:
                    date_paiement = datetime.strptime(date_paiement_str, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    date_paiement = date_paiement_existante
            elif date_paiement_existante is not None:
                # Conserver la date existante si aucune nouvelle date n'est fournie
                date_paiement = date_paiement_existante
            # Si date_paiement_existante est None et aucune date n'est fournie, date_paiement reste None
            
            # Récupérer la date d'envoi si fournie
            date_envoi_str = paiement_data.get('date_envoi')
            date_envoi = None
            if date_envoi_str:
                from datetime import datetime
                try:
                    date_envoi = datetime.strptime(date_envoi_str, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    # En cas d'erreur de parsing, conserver la date existante si elle existe
                    date_envoi = date_envoi_existante if date_envoi_existante is not None else None
            elif 'date_envoi' in paiement_data and paiement_data.get('date_envoi') is None:
                # Si date_envoi est explicitement None dans les données, mettre à None
                date_envoi = None
            elif date_envoi_existante is not None:
                # Conserver la date existante si aucune nouvelle date n'est fournie
                date_envoi = date_envoi_existante
            # Si date_envoi_existante est None et aucune date n'est fournie, date_envoi reste None
            
            # Calculer date_paiement_prevue (date_envoi + 45 jours)
            date_paiement_prevue = None
            if date_envoi:
                from datetime import timedelta
                date_paiement_prevue = date_envoi + timedelta(days=45)
            
            defaults = {
                # Montant payé (modifiable par l'utilisateur)
                'montant': nouveau_montant,
                # Les montants saisis par l'utilisateur sont toujours les montants à payer
                'montant_a_payer': paiement_data.get('montant_a_payer', 0),
                # Date de paiement
                'date_paiement': date_paiement,
                # Date d'envoi
                'date_envoi': date_envoi,
                # Date de paiement prévue (calculée automatiquement)
                'date_paiement_prevue': date_paiement_prevue
            }
            
            obj, created = PaiementFournisseurMateriel.objects.update_or_create(
                chantier_id=chantier_id,
                fournisseur=paiement_data['fournisseur'],
                mois=paiement_data['mois'],
                annee=paiement_data['annee'],
                defaults=defaults
            )
            
            # Créer une entrée d'historique si la date de paiement a changé (après création)
            if not created and date_paiement_existante is not None and date_paiement != date_paiement_existante:
                from api.models import HistoriqueModificationPaiementFournisseur
                HistoriqueModificationPaiementFournisseur.objects.create(
                    paiement=obj,
                    date_paiement_avant=date_paiement_existante,
                    date_paiement_apres=date_paiement
                )
            
            # Gérer les factures si fournies
            if 'factures' in paiement_data and isinstance(paiement_data['factures'], list):
                # Supprimer les anciennes factures
                FactureFournisseurMateriel.objects.filter(paiement=obj).delete()
                # Créer les nouvelles factures
                for facture_data in paiement_data['factures']:
                    # Support des deux formats : string (ancien) ou objet (nouveau)
                    if isinstance(facture_data, dict):
                        num_facture = facture_data.get('numero_facture', '').strip()
                        montant_facture = facture_data.get('montant_facture', 0) or 0
                        payee = facture_data.get('payee', False)
                        date_paiement_facture = facture_data.get('date_paiement_facture', None)
                    else:
                        num_facture = str(facture_data).strip()
                        montant_facture = 0
                        payee = False
                        date_paiement_facture = None
                    
                    if num_facture:  # Ignorer les factures vides
                        FactureFournisseurMateriel.objects.create(
                            paiement=obj,
                            numero_facture=num_facture,
                            montant_facture=montant_facture,
                            payee=payee,
                            date_paiement_facture=date_paiement_facture
                        )
            
            results.append(obj)
        serializer = PaiementFournisseurMaterielSerializer(results, many=True)
        return Response(serializer.data)

def _get_tableau_fournisseur_data(chantier_id=None):
    """
    Fonction utilitaire pour récupérer les données du tableau fournisseur
    Si chantier_id est fourni, retourne pour ce chantier uniquement
    Sinon, retourne pour tous les chantiers
    Groupé par mois, puis par fournisseur, puis par chantier
    Utilise les montants saisis par l'utilisateur (montant_a_payer et montant)
    """
    from collections import defaultdict
    from decimal import Decimal
    
    # Récupérer tous les paiements matériel
    if chantier_id:
        paiements = PaiementFournisseurMateriel.objects.filter(chantier_id=chantier_id)
    else:
        paiements = PaiementFournisseurMateriel.objects.all()
    
    # Structure pour stocker les données : {mois_annee: {fournisseur: {chantier_id: {a_payer, paye, ecart, chantier_name, factures, date_paiement, date_envoi, date_paiement_prevue, ecart_paiement_reel, date_modification, historique_modifications}}}}
    data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {
        'a_payer': Decimal('0'),
        'paye': Decimal('0'),
        'ecart': Decimal('0'),
        'chantier_name': '',
        'factures': [],
        'date_paiement': None,
        'date_envoi': None,
        'date_paiement_prevue': None,
        'ecart_paiement_reel': None,
        'date_modification': None,
        'historique_modifications': []
    })))
    
    # Traiter les paiements pour calculer les montants à payer et payés
    for paiement in paiements.select_related('chantier').prefetch_related('factures', 'historique_modifications'):
        # Format: MM/YY (ex: 12/25 pour décembre 2025)
        annee_2_digits = str(paiement.annee)[-2:]
        key = f"{paiement.mois:02d}/{annee_2_digits}"
        
        # Montant à payer : utiliser montant_a_payer si défini, sinon 0
        montant_a_payer = Decimal(str(paiement.montant_a_payer)) if paiement.montant_a_payer else Decimal('0')
        
        # Montant payé : utiliser le champ montant
        montant_paye = Decimal(str(paiement.montant)) if paiement.montant else Decimal('0')
        
        chantier_name = paiement.chantier.chantier_name if paiement.chantier else f"Chantier {paiement.chantier_id}"
        
        # Récupérer les factures pour ce paiement (avec numéro, montant, payee, date_paiement_facture)
        factures_list = [
            {
                'id': f.id,
                'numero_facture': f.numero_facture,
                'montant_facture': float(f.montant_facture) if f.montant_facture else 0.0,
                'payee': f.payee if f.payee else False,
                'date_paiement_facture': f.date_paiement_facture.isoformat() if f.date_paiement_facture else None
            }
            for f in paiement.factures.all()
        ]
        
        data[key][paiement.fournisseur][paiement.chantier_id]['a_payer'] += montant_a_payer
        data[key][paiement.fournisseur][paiement.chantier_id]['paye'] += montant_paye
        data[key][paiement.fournisseur][paiement.chantier_id]['chantier_name'] = chantier_name
        # Stocker les factures (liste d'objets avec id, numero_facture, montant_facture)
        if 'factures' not in data[key][paiement.fournisseur][paiement.chantier_id]:
            data[key][paiement.fournisseur][paiement.chantier_id]['factures'] = []
        data[key][paiement.fournisseur][paiement.chantier_id]['factures'] = factures_list
        # Stocker la date de paiement et l'historique
        data[key][paiement.fournisseur][paiement.chantier_id]['date_paiement'] = paiement.date_paiement.isoformat() if paiement.date_paiement else None
        data[key][paiement.fournisseur][paiement.chantier_id]['date_envoi'] = paiement.date_envoi.isoformat() if paiement.date_envoi else None
        data[key][paiement.fournisseur][paiement.chantier_id]['date_paiement_prevue'] = paiement.date_paiement_prevue.isoformat() if paiement.date_paiement_prevue else None
        data[key][paiement.fournisseur][paiement.chantier_id]['date_modification'] = paiement.date_modification.isoformat() if paiement.date_modification else None
        # Calculer l'écart paiement réel (en jours)
        ecart_paiement_reel = None
        if paiement.date_paiement_prevue and paiement.date_paiement:
            ecart_paiement_reel = (paiement.date_paiement - paiement.date_paiement_prevue).days
        data[key][paiement.fournisseur][paiement.chantier_id]['ecart_paiement_reel'] = ecart_paiement_reel
        # Récupérer l'historique des modifications de date de paiement
        historique_list = [
            {
                'id': h.id,
                'date_modification': h.date_modification.isoformat() if h.date_modification else None,
                'date_paiement_avant': h.date_paiement_avant.isoformat() if h.date_paiement_avant else None,
                'date_paiement_apres': h.date_paiement_apres.isoformat() if h.date_paiement_apres else None,
            }
            for h in paiement.historique_modifications.all()[:10]  # Limiter à 10 dernières
        ]
        data[key][paiement.fournisseur][paiement.chantier_id]['historique_modifications'] = historique_list
    
    # Calculer les écarts et préparer la réponse
    result = []
    for mois_key, fournisseurs_data in data.items():
        for fournisseur, chantiers_data in fournisseurs_data.items():
            for chantier_id_val, valeurs in chantiers_data.items():
                valeurs['ecart'] = valeurs['a_payer'] - valeurs['paye']
                # Les factures sont déjà des listes d'objets, pas besoin de dédupliquer
                result.append({
                    'mois': mois_key,
                    'fournisseur': fournisseur,
                    'chantier_id': chantier_id_val,
                    'chantier_name': valeurs['chantier_name'],
                    'a_payer': float(valeurs['a_payer']),
                    'a_payer_ttc': float(valeurs['a_payer'] * Decimal('1.20')),  # TTC = HT + 20%
                    'paye': float(valeurs['paye']),
                    'ecart': float(valeurs['ecart']),
                    'factures': valeurs.get('factures', []),
                    'date_paiement': valeurs.get('date_paiement'),
                    'date_envoi': valeurs.get('date_envoi'),
                    'date_paiement_prevue': valeurs.get('date_paiement_prevue'),
                    'ecart_paiement_reel': valeurs.get('ecart_paiement_reel'),
                    'date_modification': valeurs.get('date_modification'),
                    'historique_modifications': valeurs.get('historique_modifications', []),
                })
    
    return result

@api_view(['GET'])
@permission_classes([AllowAny])
def tableau_fournisseur(request, chantier_id):
    """
    Retourne les données pour le tableau récapitulatif des paiements fournisseur
    pour un chantier spécifique
    Groupé par mois, puis par fournisseur, puis par chantier
    Utilise les montants saisis par l'utilisateur (montant_a_payer et montant)
    """
    result = _get_tableau_fournisseur_data(chantier_id=chantier_id)
    return Response(result)

@api_view(['GET'])
@permission_classes([AllowAny])
def tableau_fournisseur_global(request):
    """
    Retourne les données pour le tableau récapitulatif des paiements fournisseur
    pour TOUS les chantiers
    Groupé par mois, puis par fournisseur, puis par chantier
    """
    result = _get_tableau_fournisseur_data(chantier_id=None)
    return Response(result)

def _get_tableau_sous_traitant_data(chantier_id=None):
    """
    Fonction utilitaire pour récupérer les données du tableau sous-traitant
    Si chantier_id est fourni, retourne pour ce chantier uniquement
    Sinon, retourne pour tous les chantiers
    Groupé par mois, puis par sous-traitant, puis par chantier
    Sources de données :
    1. FactureSousTraitant - Factures des sous-traitants
    2. LaborCost - Agents journaliers (traités comme sous-traitants)
    3. AgencyExpenseMonth - Dépenses de sous-traitance depuis les frais de structure
    4. PaiementSousTraitant - Paiements historiques
    5. SuiviPaiementSousTraitantMensuel - Données de suivi saisies manuellement (PRIORITÉ)
    """
    from collections import defaultdict
    from decimal import Decimal
    from datetime import datetime, timedelta, date
    
    # Structure pour stocker les données : {mois_annee: {sous_traitant: {chantier_id: {a_payer, paye, ecart, chantier_name, factures, date_paiement, date_envoi, date_paiement_prevue, ecart_paiement_reel, delai_paiement, source_type}}}}
    data = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {
        'a_payer': Decimal('0'),
        'paye': Decimal('0'),
        'ecart': Decimal('0'),
        'chantier_name': '',
        'factures': [],
        'date_paiement': None,
        'date_envoi': None,
        'date_paiement_prevue': None,
        'ecart_paiement_reel': None,
        'delai_paiement': 45,
        'source_type': None  # 'facture_sous_traitant' ou 'agent_journalier'
    })))
    
    # 1. Récupérer les factures des sous-traitants (FactureSousTraitant)
    if chantier_id:
        factures = FactureSousTraitant.objects.filter(chantier_id=chantier_id)
    else:
        factures = FactureSousTraitant.objects.all()
    
    factures = factures.select_related('chantier', 'sous_traitant').prefetch_related(
        Prefetch('paiements', queryset=PaiementFactureSousTraitant.objects.all().order_by('-date_paiement_reel'))
    )
    
    for facture in factures:
        # Format: MM/YY (ex: 12/25 pour décembre 2025)
        annee_2_digits = str(facture.annee)[-2:]
        key = f"{facture.mois:02d}/{annee_2_digits}"
        
        # Nom du sous-traitant (entreprise)
        sous_traitant_nom = facture.sous_traitant.entreprise if hasattr(facture.sous_traitant, 'entreprise') else str(facture.sous_traitant)
        chantier_name = facture.chantier.chantier_name if facture.chantier else f"Chantier {facture.chantier_id}"
        
        # Montant à payer = montant de la facture HT
        montant_a_payer = Decimal(str(facture.montant_facture_ht)) if facture.montant_facture_ht else Decimal('0')
        
        # Montant payé = somme des paiements de cette facture
        montant_total_paye = facture.montant_total_paye
        montant_paye = Decimal(str(montant_total_paye)) if montant_total_paye else Decimal('0')
        
        # Récupérer les factures avec leur statut de paiement
        # Récupérer la date de paiement depuis PaiementFactureSousTraitant (le dernier paiement)
        date_paiement_facture = None
        # Accéder directement aux paiements préchargés
        paiements_facture = list(facture.paiements.all())
        
        if paiements_facture:
            # Trier par date_paiement_reel décroissante pour obtenir le dernier paiement
            dernier_paiement = max(paiements_facture, key=lambda p: p.date_paiement_reel if p.date_paiement_reel else date.min)
            
            if dernier_paiement and dernier_paiement.date_paiement_reel:
                date_paiement_facture = dernier_paiement.date_paiement_reel.isoformat()
        
        factures_list = [
            {
                'id': facture.id,
                'numero_facture': facture.numero_facture,
                'montant_facture': float(facture.montant_facture_ht) if facture.montant_facture_ht else 0.0,
                'payee': facture.est_soldee,
                'date_paiement_facture': date_paiement_facture
            }
        ]
        
        # Récupérer le paiement associé (PaiementSousTraitant) pour les dates
        # Chercher un paiement correspondant au mois/année/sous-traitant/chantier
        paiement = PaiementSousTraitant.objects.filter(
            sous_traitant=facture.sous_traitant,
            chantier=facture.chantier,
            mois=facture.mois,
            annee=facture.annee
        ).first()
        
        date_paiement = None
        date_envoi = None
        date_paiement_prevue = None
        ecart_paiement_reel = None
        delai_paiement = facture.delai_paiement if facture.delai_paiement else 45
        
        if paiement:
            date_paiement = paiement.date_paiement_reel.isoformat() if paiement.date_paiement_reel else None
            date_envoi = paiement.date_envoi_facture.isoformat() if paiement.date_envoi_facture else None
            # Calculer date_paiement_prevue à partir de date_envoi_facture + delai_paiement
            if paiement.date_envoi_facture and paiement.delai_paiement:
                date_paiement_prevue = (paiement.date_envoi_facture + timedelta(days=paiement.delai_paiement)).isoformat()
            else:
                date_paiement_prevue = None
        else:
            # Utiliser les dates de la facture si pas de paiement
            date_envoi = facture.date_reception.isoformat() if facture.date_reception else None
            date_paiement_prevue = facture.date_paiement_prevue.isoformat() if facture.date_paiement_prevue else None
        
        # PRIORITÉ : Utiliser la date depuis les paiements de factures (PaiementFactureSousTraitant) si elle existe
        # Car c'est la date réelle de paiement de la facture
        if date_paiement_facture:
            date_paiement = date_paiement_facture
        
        # Calculer l'écart paiement réel avec la date de paiement définie
        if date_paiement_prevue and date_paiement:
            try:
                date_prevue = datetime.fromisoformat(date_paiement_prevue.replace('Z', '+00:00')).date() if isinstance(date_paiement_prevue, str) else date_paiement_prevue
                date_reel = datetime.fromisoformat(date_paiement.replace('Z', '+00:00')).date() if isinstance(date_paiement, str) else date_paiement
                ecart_paiement_reel = (date_reel - date_prevue).days
            except:
                ecart_paiement_reel = None
        
        # Agrégation par mois/sous-traitant/chantier
        data[key][sous_traitant_nom][facture.chantier_id]['a_payer'] += montant_a_payer
        data[key][sous_traitant_nom][facture.chantier_id]['paye'] += montant_paye
        data[key][sous_traitant_nom][facture.chantier_id]['chantier_name'] = chantier_name
        data[key][sous_traitant_nom][facture.chantier_id]['delai_paiement'] = delai_paiement
        data[key][sous_traitant_nom][facture.chantier_id]['source_type'] = 'facture_sous_traitant'
        
        # Ajouter les factures (éviter les doublons)
        if 'factures' not in data[key][sous_traitant_nom][facture.chantier_id] or not data[key][sous_traitant_nom][facture.chantier_id]['factures']:
            data[key][sous_traitant_nom][facture.chantier_id]['factures'] = []
        
        # Vérifier si cette facture n'est pas déjà dans la liste
        facture_exists = any(f.get('id') == facture.id for f in data[key][sous_traitant_nom][facture.chantier_id]['factures'])
        if not facture_exists:
            data[key][sous_traitant_nom][facture.chantier_id]['factures'].extend(factures_list)
        
        # Mettre à jour les dates si elles ne sont pas déjà définies ou si elles sont plus récentes
        # Comparer les dates en format ISO pour s'assurer que la plus récente est utilisée
        current_date_paiement = data[key][sous_traitant_nom][facture.chantier_id]['date_paiement']
        if not current_date_paiement:
            data[key][sous_traitant_nom][facture.chantier_id]['date_paiement'] = date_paiement
        elif date_paiement:
            # Comparer les dates pour garder la plus récente
            try:
                current_date = datetime.fromisoformat(current_date_paiement.replace('Z', '+00:00')).date() if isinstance(current_date_paiement, str) else current_date_paiement
                new_date = datetime.fromisoformat(date_paiement.replace('Z', '+00:00')).date() if isinstance(date_paiement, str) else date_paiement
                if new_date > current_date:
                    data[key][sous_traitant_nom][facture.chantier_id]['date_paiement'] = date_paiement
            except Exception as e:
                # Si la comparaison échoue, utiliser la nouvelle date si elle existe
                if date_paiement > current_date_paiement:
                    data[key][sous_traitant_nom][facture.chantier_id]['date_paiement'] = date_paiement
        if not data[key][sous_traitant_nom][facture.chantier_id]['date_envoi'] or (date_envoi and date_envoi > data[key][sous_traitant_nom][facture.chantier_id]['date_envoi']):
            data[key][sous_traitant_nom][facture.chantier_id]['date_envoi'] = date_envoi
        if not data[key][sous_traitant_nom][facture.chantier_id]['date_paiement_prevue'] or (date_paiement_prevue and date_paiement_prevue > data[key][sous_traitant_nom][facture.chantier_id]['date_paiement_prevue']):
            data[key][sous_traitant_nom][facture.chantier_id]['date_paiement_prevue'] = date_paiement_prevue
        if ecart_paiement_reel is not None:
            data[key][sous_traitant_nom][facture.chantier_id]['ecart_paiement_reel'] = ecart_paiement_reel
    
    # 2. Récupérer les agents journaliers (LaborCost) - traités comme sous-traitants
    if chantier_id:
        labor_costs = LaborCost.objects.filter(chantier_id=chantier_id)
    else:
        labor_costs = LaborCost.objects.all()
    
    # Filtrer uniquement les agents journaliers
    labor_costs = labor_costs.filter(agent__type_paiement='journalier').select_related('agent', 'chantier')
    
    for lc in labor_costs:
        # Convertir semaine ISO → mois/année
        # Calculer la date du lundi de la semaine ISO
        try:
            lundi = datetime.strptime(f'{lc.year}-W{int(lc.week):02d}-1', "%G-W%V-%u")
            mois = lundi.month
            annee = lundi.year
        except:
            # Fallback: utiliser l'année de la semaine
            mois = 1
            annee = lc.year
        
        # Format: MM/YY
        annee_2_digits = str(annee)[-2:]
        key = f"{mois:02d}/{annee_2_digits}"
        
        # Nom de l'agent comme sous-traitant
        agent_nom = f"{lc.agent.name} {lc.agent.surname}".strip() if lc.agent else f"Agent {lc.agent_id}"
        chantier_name = lc.chantier.chantier_name if lc.chantier else f"Chantier {lc.chantier_id}"
        
        # Montant à payer = coût total (somme de tous les coûts)
        total_cost = (
            Decimal(str(lc.cost_normal or 0)) +
            Decimal(str(lc.cost_samedi or 0)) +
            Decimal(str(lc.cost_dimanche or 0)) +
            Decimal(str(lc.cost_ferie or 0)) +
            Decimal(str(lc.cost_overtime or 0))
        )
        
        # Montant payé = 0 par défaut (pas de paiement pour les agents journaliers dans ce tableau)
        montant_paye = Decimal('0')
        
        # Agrégation par mois/agent/chantier
        data[key][agent_nom][lc.chantier_id]['a_payer'] += total_cost
        data[key][agent_nom][lc.chantier_id]['paye'] += montant_paye
        data[key][agent_nom][lc.chantier_id]['chantier_name'] = chantier_name
        data[key][agent_nom][lc.chantier_id]['source_type'] = 'agent_journalier'
        if not data[key][agent_nom][lc.chantier_id]['factures']:
            data[key][agent_nom][lc.chantier_id]['factures'] = []
    
    # 3. Récupérer les AgencyExpenseMonth avec catégorie "Sous-traitant"
    if chantier_id:
        agency_expenses_month = AgencyExpenseMonth.objects.filter(
            category='Sous-traitant',
            chantier_id=chantier_id
        )
    else:
        agency_expenses_month = AgencyExpenseMonth.objects.filter(category='Sous-traitant')
    
    agency_expenses_month = agency_expenses_month.select_related('chantier', 'sous_traitant')
    
    for expense_month in agency_expenses_month:
        # Format: MM/YY
        annee_2_digits = str(expense_month.year)[-2:]
        key = f"{expense_month.month:02d}/{annee_2_digits}"
        
        # Utiliser la description comme nom de "sous-traitant" dans le tableau
        sous_traitant_nom = expense_month.description
        chantier_id_val = 0  # Toujours 0 pour AgencyExpenseMonth (pas de chantier spécifique)
        chantier_name = "Agence"
        
        montant = Decimal(str(expense_month.amount))
        
        # Agrégation par mois/description/chantier
        data[key][sous_traitant_nom][chantier_id_val]['a_payer'] += montant
        # ✅ NE PAS définir automatiquement 'paye' pour AgencyExpenseMonth
        # Le montant payé doit provenir du système de suivi (SuiviPaiementSousTraitantMensuel)
        # data[key][sous_traitant_nom][chantier_id_val]['paye'] += montant  # SUPPRIMÉ
        data[key][sous_traitant_nom][chantier_id_val]['chantier_name'] = chantier_name
        data[key][sous_traitant_nom][chantier_id_val]['source_type'] = 'agency_expense'
        data[key][sous_traitant_nom][chantier_id_val]['agency_expense_id'] = expense_month.id  # ID pour modification
        
        # Récupérer les factures depuis AgencyExpenseMonth
        if not data[key][sous_traitant_nom][chantier_id_val]['factures']:
            data[key][sous_traitant_nom][chantier_id_val]['factures'] = []
        # Ajouter les factures stockées dans AgencyExpenseMonth
        if expense_month.factures and isinstance(expense_month.factures, list):
            data[key][sous_traitant_nom][chantier_id_val]['factures'].extend(expense_month.factures)
        
        # Dates : utiliser les nouveaux champs en priorité, sinon fallback sur l'ancien
        # Date de réception (envoi) : date_reception_facture OU date_paiement (ancien champ mal nommé)
        date_reception = (expense_month.date_reception_facture or expense_month.date_paiement).isoformat() if (expense_month.date_reception_facture or expense_month.date_paiement) else None
        data[key][sous_traitant_nom][chantier_id_val]['date_envoi'] = date_reception
        
        # Date de paiement réel
        date_paiement_reel = expense_month.date_paiement_reel.isoformat() if expense_month.date_paiement_reel else None
        data[key][sous_traitant_nom][chantier_id_val]['date_paiement'] = date_paiement_reel
        
        # Délai de paiement
        delai = expense_month.delai_paiement if hasattr(expense_month, 'delai_paiement') and expense_month.delai_paiement else 45
        data[key][sous_traitant_nom][chantier_id_val]['delai_paiement'] = delai
        
        # Calculer date_paiement_prevue si on a la date de réception
        if date_reception and delai:
            try:
                from datetime import datetime, timedelta
                date_reception_obj = datetime.fromisoformat(date_reception).date()
                date_prevue = date_reception_obj + timedelta(days=delai)
                data[key][sous_traitant_nom][chantier_id_val]['date_paiement_prevue'] = date_prevue.isoformat()
                
                # Calculer l'écart si on a aussi la date de paiement réel
                if date_paiement_reel:
                    date_reel_obj = datetime.fromisoformat(date_paiement_reel).date()
                    ecart_jours = (date_reel_obj - date_prevue).days
                    data[key][sous_traitant_nom][chantier_id_val]['ecart_paiement_reel'] = ecart_jours
            except Exception as e:
                pass
    
    # 4. Récupérer les paiements (PaiementSousTraitant) pour mettre à jour les montants payés et dates
    if chantier_id:
        paiements = PaiementSousTraitant.objects.filter(chantier_id=chantier_id)
    else:
        paiements = PaiementSousTraitant.objects.all()
    
    paiements = paiements.select_related('chantier', 'sous_traitant')
    
    for paiement in paiements:
        # Utiliser mois/annee si disponibles, sinon extraire de date_paiement
        if paiement.mois and paiement.annee:
            annee_2_digits = str(paiement.annee)[-2:]
            key = f"{paiement.mois:02d}/{annee_2_digits}"
        elif paiement.date_paiement:
            key = f"{paiement.date_paiement.month:02d}/{str(paiement.date_paiement.year)[-2:]}"
        else:
            continue
        
        sous_traitant_nom = paiement.sous_traitant.entreprise if hasattr(paiement.sous_traitant, 'entreprise') else str(paiement.sous_traitant)
        chantier_name = paiement.chantier.chantier_name if paiement.chantier else f"Chantier {paiement.chantier_id}"
        
        # Montant payé
        montant_paye = Decimal(str(paiement.montant_paye_ht)) if paiement.montant_paye_ht else Decimal('0')
        
        # Mettre à jour les montants payés et dates
        if key in data and sous_traitant_nom in data[key] and paiement.chantier_id in data[key][sous_traitant_nom]:
            data[key][sous_traitant_nom][paiement.chantier_id]['paye'] = montant_paye
            # Ne pas écraser date_paiement si elle vient déjà des paiements de factures (PaiementFactureSousTraitant)
            # La date des paiements de factures a la priorité car c'est la date réelle de paiement
            current_date_paiement = data[key][sous_traitant_nom][paiement.chantier_id]['date_paiement']
            if not current_date_paiement:  # Seulement si pas déjà définie depuis les factures
                data[key][sous_traitant_nom][paiement.chantier_id]['date_paiement'] = paiement.date_paiement_reel.isoformat() if paiement.date_paiement_reel else None
            data[key][sous_traitant_nom][paiement.chantier_id]['date_envoi'] = paiement.date_envoi_facture.isoformat() if paiement.date_envoi_facture else None
            data[key][sous_traitant_nom][paiement.chantier_id]['delai_paiement'] = paiement.delai_paiement if paiement.delai_paiement else 45
            
            # Calculer date_paiement_prevue si date_envoi et delai_paiement sont disponibles
            if data[key][sous_traitant_nom][paiement.chantier_id]['date_envoi'] and data[key][sous_traitant_nom][paiement.chantier_id]['delai_paiement']:
                try:
                    date_envoi_obj = datetime.fromisoformat(data[key][sous_traitant_nom][paiement.chantier_id]['date_envoi'].replace('Z', '+00:00')).date() if isinstance(data[key][sous_traitant_nom][paiement.chantier_id]['date_envoi'], str) else data[key][sous_traitant_nom][paiement.chantier_id]['date_envoi']
                    delai = data[key][sous_traitant_nom][paiement.chantier_id]['delai_paiement']
                    date_prevue = date_envoi_obj + timedelta(days=delai)
                    data[key][sous_traitant_nom][paiement.chantier_id]['date_paiement_prevue'] = date_prevue.isoformat()
                    
                    # Calculer l'écart paiement réel
                    if data[key][sous_traitant_nom][paiement.chantier_id]['date_paiement']:
                        date_paiement_obj = datetime.fromisoformat(data[key][sous_traitant_nom][paiement.chantier_id]['date_paiement'].replace('Z', '+00:00')).date() if isinstance(data[key][sous_traitant_nom][paiement.chantier_id]['date_paiement'], str) else data[key][sous_traitant_nom][paiement.chantier_id]['date_paiement']
                        ecart_paiement_reel = (date_paiement_obj - date_prevue).days
                        data[key][sous_traitant_nom][paiement.chantier_id]['ecart_paiement_reel'] = ecart_paiement_reel
                except:
                    pass
    
    # 5. Récupérer les suivis de paiements mensuels (SuiviPaiementSousTraitantMensuel)
    # Ces données ont la PRIORITÉ car elles sont saisies manuellement dans le tableau
    if chantier_id:
        suivis = SuiviPaiementSousTraitantMensuel.objects.filter(chantier_id=chantier_id)
    else:
        suivis = SuiviPaiementSousTraitantMensuel.objects.all()
    
    suivis = suivis.prefetch_related('factures_suivi').select_related('chantier')
    
    for suivi in suivis:
        # Format: MM/YY
        annee_2_digits = str(suivi.annee)[-2:]
        key = f"{suivi.mois:02d}/{annee_2_digits}"
        sous_traitant_nom = suivi.sous_traitant
        chantier_id_val = suivi.chantier_id if suivi.chantier else 0
        
        # Si cette entrée n'existe pas encore dans data, la créer
        if key not in data or sous_traitant_nom not in data[key] or chantier_id_val not in data[key][sous_traitant_nom]:
            # Créer une nouvelle entrée si elle n'existe pas (cas où le suivi est créé avant les autres sources)
            if chantier_id_val != 0 and suivi.chantier:
                chantier_name = suivi.chantier.chantier_name
            else:
                chantier_name = "Agence" if chantier_id_val == 0 else f"Chantier {chantier_id_val}"
            
            data[key][sous_traitant_nom][chantier_id_val] = {
                'a_payer': Decimal('0'),
                'paye': Decimal('0'),
                'ecart': Decimal('0'),
                'chantier_name': chantier_name,
                'factures': [],
                'date_paiement': None,
                'date_envoi': None,
                'date_paiement_prevue': None,
                'ecart_paiement_reel': None,
                'delai_paiement': 45,
                'source_type': None
            }
        
        # Mettre à jour avec les données du suivi (PRIORITÉ sur les autres sources)
        if suivi.montant_paye_ht is not None:
            data[key][sous_traitant_nom][chantier_id_val]['paye'] = Decimal(str(suivi.montant_paye_ht))
        
        if suivi.date_paiement_reel:
            data[key][sous_traitant_nom][chantier_id_val]['date_paiement'] = suivi.date_paiement_reel.isoformat()
        
        if suivi.date_envoi_facture:
            data[key][sous_traitant_nom][chantier_id_val]['date_envoi'] = suivi.date_envoi_facture.isoformat()
        
        if suivi.date_paiement_prevue:
            data[key][sous_traitant_nom][chantier_id_val]['date_paiement_prevue'] = suivi.date_paiement_prevue.isoformat()
        
        if suivi.delai_paiement:
            data[key][sous_traitant_nom][chantier_id_val]['delai_paiement'] = suivi.delai_paiement
        
        # Calculer l'écart de paiement réel
        ecart_jours = suivi.ecart_paiement_jours
        if ecart_jours is not None:
            data[key][sous_traitant_nom][chantier_id_val]['ecart_paiement_reel'] = ecart_jours
        
        # Ajouter les factures de suivi (fusionner avec les factures existantes)
        factures_suivi = []
        for f in suivi.factures_suivi.all():
            factures_suivi.append({
                'id': f'suivi_{f.id}',  # Préfixe pour différencier des factures FactureSousTraitant
                'numero_facture': f.numero_facture,
                'montant_facture': float(f.montant_facture_ht),
                'payee': f.payee,
                'date_paiement_facture': f.date_paiement_facture.isoformat() if f.date_paiement_facture else None
            })
        
        # Fusionner les factures (éviter les doublons par numéro de facture)
        existing_factures = data[key][sous_traitant_nom][chantier_id_val].get('factures', [])
        existing_numeros = {f.get('numero_facture') for f in existing_factures if f.get('numero_facture')}
        
        for facture_suivi in factures_suivi:
            # Ajouter seulement si le numéro n'existe pas déjà
            if facture_suivi['numero_facture'] not in existing_numeros:
                existing_factures.append(facture_suivi)
                existing_numeros.add(facture_suivi['numero_facture'])
        
        data[key][sous_traitant_nom][chantier_id_val]['factures'] = existing_factures
        
        # Ajouter l'ID du suivi pour permettre les mises à jour depuis le frontend
        data[key][sous_traitant_nom][chantier_id_val]['suivi_paiement_id'] = suivi.id
    
    # Calculer les écarts et préparer la réponse
    result = []
    for mois_key, sous_traitants_data in data.items():
        for sous_traitant, chantiers_data in sous_traitants_data.items():
            for chantier_id_val, valeurs in chantiers_data.items():
                valeurs['ecart'] = valeurs['a_payer'] - valeurs['paye']
                result.append({
                    'mois': mois_key,
                    'sous_traitant': sous_traitant,
                    'chantier_id': chantier_id_val,
                    'chantier_name': valeurs['chantier_name'],
                    'a_payer': float(valeurs['a_payer']),
                    'paye': float(valeurs['paye']),
                    'ecart': float(valeurs['ecart']),
                    'factures': valeurs.get('factures', []),
                    'date_paiement': valeurs.get('date_paiement'),
                    'date_envoi': valeurs.get('date_envoi'),
                    'date_paiement_prevue': valeurs.get('date_paiement_prevue'),
                    'ecart_paiement_reel': valeurs.get('ecart_paiement_reel'),
                    'delai_paiement': valeurs.get('delai_paiement', 45),
                    'source_type': valeurs.get('source_type', 'facture_sous_traitant'),  # Par défaut facture_sous_traitant
                    'agency_expense_id': valeurs.get('agency_expense_id'),  # ID pour modification des AgencyExpenseMonth
                    'suivi_paiement_id': valeurs.get('suivi_paiement_id'),  # ID du suivi de paiement pour mise à jour
                })
    
    return result

@api_view(['GET'])
@permission_classes([AllowAny])
def tableau_sous_traitant_global(request):
    """
    Retourne les données pour le tableau récapitulatif des paiements sous-traitant
    pour TOUS les chantiers
    Groupé par mois, puis par sous-traitant, puis par chantier
    Sources de données :
    1. FactureSousTraitant - Factures des sous-traitants
    2. LaborCost - Agents journaliers (traités comme sous-traitants)
    3. AgencyExpenseMonth - Dépenses de sous-traitance depuis les frais de structure
    4. PaiementSousTraitant - Paiements historiques
    5. SuiviPaiementSousTraitantMensuel - Données de suivi saisies manuellement (PRIORITÉ)
    """
    result = _get_tableau_sous_traitant_data(chantier_id=None)
    return Response(result)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_historique_modification_paiement_fournisseur(request, historique_id):
    """
    Supprime une entrée d'historique de modification de paiement fournisseur
    """
    try:
        from api.models import HistoriqueModificationPaiementFournisseur
        historique = HistoriqueModificationPaiementFournisseur.objects.get(id=historique_id)
        historique.delete()
        return Response({"message": "Historique supprimé avec succès"}, status=status.HTTP_204_NO_CONTENT)
    except HistoriqueModificationPaiementFournisseur.DoesNotExist:
        return Response({"error": "Historique non trouvé"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def fournisseurs(request):
    fournisseurs = Fournisseur.objects.all().values('id', 'name', 'Fournisseur_mail', 'description_fournisseur')
    return Response(list(fournisseurs))

class BanqueViewSet(viewsets.ModelViewSet):
    queryset = Banque.objects.all()
    serializer_class = BanqueSerializer

class FournisseurViewSet(viewsets.ModelViewSet):
    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer

# --- Correction 1 : Fonction utilitaire pour obtenir la date exacte d'un créneau (ISO) ---
def get_date_from_week(year, week, day_name):
    # day_name: "Lundi", "Mardi", ...
    from datetime import datetime, timedelta
    days_of_week = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    day_index = days_of_week.index(day_name)
    # ISO: lundi=1, dimanche=7
    lundi = datetime.strptime(f'{year}-W{int(week):02d}-1', "%G-W%V-%u")
    return lundi + timedelta(days=day_index)

# --- Correction 2 : Endpoint pour recalculer tous les LaborCost d'un mois ---
from rest_framework.decorators import api_view
@api_view(['POST'])
def recalculate_labor_costs_month(request):
    """
    Recalcule tous les LaborCost pour un mois/année donné (tous agents, toutes semaines du mois).
    Expects: { "year": 2024, "month": 7 }
    """
    year = int(request.data.get('year'))
    month = int(request.data.get('month'))
    from calendar import monthrange
    import datetime
    first_day = datetime.date(year, month, 1)
    last_day = datetime.date(year, month, monthrange(year, month)[1])
    # Collecter les semaines avec leur année ISO pour gérer les semaines qui chevauchent les années
    week_year_pairs = set()
    d = first_day
    while d <= last_day:
        iso_week = d.isocalendar()[1]
        iso_year = d.isocalendar()[0]  # Année ISO
        week_year_pairs.add((iso_year, iso_week))
        d += datetime.timedelta(days=1)
    # Pour chaque agent, chaque semaine du mois, recalculer
    # Note: Les agents journaliers sont inclus ici car ils ont besoin de LaborCost pour les récaps chantiers
    agents = Agent.objects.all()
    for agent in agents:
        for iso_year, week in week_year_pairs:
            # On peut réutiliser la logique de recalculate_labor_costs
            # Utiliser l'année ISO réelle de la semaine, pas l'année du mois
            schedules = Schedule.objects.filter(agent=agent, year=iso_year, week=week)
            # Regrouper par chantier
            chantier_hours = {}
            for s in schedules:
                if s.chantier_id:
                    chantier_hours.setdefault(s.chantier_id, 0)
                    if agent.type_paiement == 'journalier':
                        # Pour les agents journaliers : Matin ou Après-midi = 0.5 jour
                        chantier_hours[s.chantier_id] += 0.5
                    else:
                        # Pour les agents horaires : 1 heure par créneau
                        chantier_hours[s.chantier_id] += 1
                        
            for chantier_id, hours_or_days in chantier_hours.items():
                chantier = Chantier.objects.get(id=chantier_id)
                
                if agent.type_paiement == 'journalier':
                    # Pour les agents journaliers
                    # 0.5 jour = taux_journalier ÷ 2, 1 jour = taux_journalier
                    cost = (hours_or_days * (agent.taux_journalier or 0))
                    hours_for_display = hours_or_days * 8  # 8h par jour
                else:
                    # Pour les agents horaires
                    cost = hours_or_days * (agent.taux_Horaire or 0)
                    hours_for_display = hours_or_days
                
                LaborCost.objects.update_or_create(
                    agent=agent, chantier=chantier, week=week, year=iso_year,
                    defaults={
                        'hours_normal': hours_for_display,  # Pour simplifier, tout en normal ici
                        'hours_samedi': 0,
                        'hours_dimanche': 0,
                        'hours_ferie': 0,
                        'cost_normal': cost,
                        'cost_samedi': 0,
                        'cost_dimanche': 0,
                        'cost_ferie': 0,
                        'details_majoration': [],
                    }
                )
    return Response({"status": "ok"})

@api_view(['GET'])
def schedule_monthly_summary(request):
    """
    Endpoint : /api/schedule/monthly_summary/?month=YYYY-MM&agent_id=...&chantier_id=...
    Résumé absolu à partir de Schedule (planning réel).
    Filtrage possible par agent ou chantier.
    """
    from calendar import monthrange
    from datetime import date, timedelta as td
    month_str = request.GET.get('month')  # format attendu : 'YYYY-MM'
    agent_id_filter = request.GET.get('agent_id')
    chantier_id_filter = request.GET.get('chantier_id')
    if not month_str:
        return Response({'error': 'Paramètre month requis (format YYYY-MM)'}, status=400)
    try:
        year, month = map(int, month_str.split('-'))
    except Exception:
        return Response({'error': 'Format de mois invalide. Utilisez YYYY-MM.'}, status=400)

    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])
    fr_holidays = holidays.country_holidays('FR', years=[year])

    # Fonction utilitaire pour obtenir la date réelle d'un Schedule
    def get_date_from_week(year, week, day_name):
        days_of_week = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        day_index = days_of_week.index(day_name)
        from datetime import datetime as dt
        lundi = dt.strptime(f'{year}-W{int(week):02d}-1', "%G-W%V-%u")
        return (lundi + td(days=day_index)).date()

    # Récupérer tous les Schedule du mois (toutes semaines qui touchent le mois)
    # Important : collecter les semaines avec leur année ISO pour gérer les semaines qui chevauchent les années
    week_year_pairs = set()
    d = first_day
    while d <= last_day:
        iso_week = d.isocalendar()[1]
        iso_year = d.isocalendar()[0]  # Année ISO
        week_year_pairs.add((iso_year, iso_week))
        d += td(days=1)

    # Construire une requête Q pour filtrer par (year, week) dans les paires collectées
    from django.db.models import Q
    q_objects = Q()
    for iso_year, iso_week in week_year_pairs:
        q_objects |= Q(year=iso_year, week=iso_week)
    
    schedules = Schedule.objects.filter(q_objects).select_related('agent', 'chantier')
    if agent_id_filter:
        schedules = schedules.filter(agent_id=agent_id_filter)
    if chantier_id_filter:
        schedules = schedules.filter(chantier_id=chantier_id_filter)

    # Agrégation par agent et chantier
    result = {}
    for s in schedules:
        if not s.chantier:
            continue  # On ignore les créneaux sans chantier assigné
        date_creneau = get_date_from_week(s.year, s.week, s.day)
        if date_creneau.year != year or date_creneau.month != month:
            continue  # On ne garde que les créneaux du mois demandé

        agent_id = s.agent.id
        chantier_id = s.chantier.id
        
        # Gestion des agents journaliers vs horaires
        is_journalier = s.agent.type_paiement == 'journalier'
        if is_journalier:
            # Pour les agents journaliers : 0.5 jour = 4h équivalent
            heures_increment = 4
            taux_horaire = (s.agent.taux_journalier or 0) / 8  # Convertir en taux horaire
        else:
            # Pour les agents horaires : 1 créneau = 1h
            heures_increment = 1
            taux_horaire = s.agent.taux_Horaire or 0

        key = (agent_id, chantier_id)
        if key not in result:
            result[key] = {
                'agent_id': agent_id,
                'agent_nom': f"{s.agent.name} {s.agent.surname}",
                'chantier_id': chantier_id,
                'chantier_nom': s.chantier.chantier_name,
                'type_paiement': s.agent.type_paiement,  # Ajout du type d'agent
                'heures_normal': 0,
                'heures_samedi': 0,
                'heures_dimanche': 0,
                'heures_ferie': 0,
                'heures_overtime': 0,
                'montant_normal': 0,
                'montant_samedi': 0,
                'montant_dimanche': 0,
                'montant_ferie': 0,
                'montant_overtime': 0,
                'jours_majoration': []
            }

        # Vérifier si cette case a des heures supplémentaires
        has_overtime = s.overtime_hours and s.overtime_hours > 0

        # Déterminer le type de jour
        if is_journalier:
            # Pour les agents journaliers : toujours taux normal, peu importe le jour
            # SAUF si il y a des heures supplémentaires -> alors pas d'heures normales
            if not has_overtime:
                result[key]['heures_normal'] += heures_increment
                result[key]['montant_normal'] += taux_horaire * heures_increment
        else:
            # Pour les agents horaires : appliquer les majorations
            # SAUF si il y a des heures supplémentaires -> alors pas d'heures normales/majorées
            if not has_overtime:
                if date_creneau in fr_holidays:
                    result[key]['heures_ferie'] += heures_increment
                    result[key]['montant_ferie'] += taux_horaire * heures_increment * 1.5
                    result[key]['jours_majoration'].append({
                        'date': date_creneau.strftime("%Y-%m-%d"),
                        'type': 'ferie',
                        'hours': heures_increment,
                        'taux': 1.5
                    })
                elif s.day == "Samedi":
                    result[key]['heures_samedi'] += heures_increment
                    result[key]['montant_samedi'] += taux_horaire * heures_increment * 1.25
                    result[key]['jours_majoration'].append({
                        'date': date_creneau.strftime("%Y-%m-%d"),
                        'type': 'samedi',
                        'hours': heures_increment,
                        'taux': 1.25
                    })
                elif s.day == "Dimanche":
                    result[key]['heures_dimanche'] += heures_increment
                    result[key]['montant_dimanche'] += taux_horaire * heures_increment * 1.5
                    result[key]['jours_majoration'].append({
                        'date': date_creneau.strftime("%Y-%m-%d"),
                        'type': 'dimanche',
                        'hours': heures_increment,
                        'taux': 1.5
                    })
                else:
                    result[key]['heures_normal'] += heures_increment
                    result[key]['montant_normal'] += taux_horaire * heures_increment
                        
        # Ajouter les heures supplémentaires (toujours à +25%, indépendamment du jour)
        if has_overtime:
            overtime_hours = float(s.overtime_hours)
            result[key]['heures_overtime'] += overtime_hours
            result[key]['montant_overtime'] += taux_horaire * overtime_hours * 1.25  # +25%
            
            # Créer une entrée spécifique pour les heures supplémentaires
            if not is_journalier:  # Pas de majoration spéciale pour les journaliers
                result[key]['jours_majoration'].append({
                    'date': date_creneau.strftime("%Y-%m-%d"),
                    'type': 'overtime',
                    'hours': 0,  # Pas d'heures normales majorées
                    'overtime_hours': overtime_hours,
                    'taux': 1.25
                })

    # Regrouper par chantier pour l'affichage
    chantier_map = {}
    for (agent_id, chantier_id), data in result.items():
        if chantier_id not in chantier_map:
            chantier_map[chantier_id] = {
                'chantier_id': chantier_id,
                'chantier_nom': data['chantier_nom'],
                'details': [],
                'total_heures_normal': 0,
                'total_heures_samedi': 0,
                'total_heures_dimanche': 0,
                'total_heures_ferie': 0,
                'total_heures_overtime': 0,
                'total_montant_normal': 0,
                'total_montant_samedi': 0,
                'total_montant_dimanche': 0,
                'total_montant_ferie': 0,
                'total_montant_overtime': 0,
                'jours_majoration': []
            }
        chantier_map[chantier_id]['details'].append(data)
        chantier_map[chantier_id]['total_heures_normal'] += data['heures_normal']
        chantier_map[chantier_id]['total_heures_samedi'] += data['heures_samedi']
        chantier_map[chantier_id]['total_heures_dimanche'] += data['heures_dimanche']
        chantier_map[chantier_id]['total_heures_ferie'] += data['heures_ferie']
        chantier_map[chantier_id]['total_heures_overtime'] += data['heures_overtime']
        chantier_map[chantier_id]['total_montant_normal'] += data['montant_normal']
        chantier_map[chantier_id]['total_montant_samedi'] += data['montant_samedi']
        chantier_map[chantier_id]['total_montant_dimanche'] += data['montant_dimanche']
        chantier_map[chantier_id]['total_montant_ferie'] += data['montant_ferie']
        chantier_map[chantier_id]['total_montant_overtime'] += data['montant_overtime']
        chantier_map[chantier_id]['jours_majoration'].extend(data['jours_majoration'])

    return Response(list(chantier_map.values()), status=200)

def preview_monthly_agents_report(request):
    """
    Vue pour prévisualiser le rapport mensuel des agents
    Utilise exactement les mêmes données que LaborCostsSummary.js
    """
    from calendar import monthrange
    from datetime import date, timedelta as td
    import holidays
    import logging
    
    logger = logging.getLogger(__name__)
    
    month = int(request.GET.get('month'))
    year = int(request.GET.get('year'))
    
    # print(f"🔍 DEBUG PREVIEW PDF - Mois: {month}/{year}")
    # print(f"🔍 URL appelée: {request.get_full_path()}")
    
    # Calculer les dates de début et fin du mois
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    # UTILISER EXACTEMENT LA MÊME API QUE LaborCostsSummary.js
    # pour garantir la cohérence des données
    month_str = f"{year}-{month:02d}"
    
    # APPEL DIRECT DE LA LOGIQUE MÉTIER (sans passer par l'authentification REST)
    # Reproduire exactement la logique de schedule_monthly_summary
    
    try:
        from datetime import datetime
        # Récupération des labor costs pour le mois spécifié
        # IMPORTANT: Exclure les agents journaliers pour cohérence avec le filtrage des agents
        labor_costs_candidates = LaborCost.objects.filter(
            year=year, 
            week__gte=start_date.isocalendar()[1],
            week__lte=end_date.isocalendar()[1]
        ).exclude(agent__type_paiement='journalier').select_related('agent', 'chantier')
        
        # FILTRAGE SUPPLÉMENTAIRE : Ne garder que les LaborCost qui ont au moins un jour dans le mois
        labor_costs = []
        for lc in labor_costs_candidates:
            # Vérifier si cette semaine a des jours dans le mois demandé
            week_has_days_in_month = False
            
            # Tester tous les jours de la semaine
            for day_name in ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']:
                try:
                    date_jour = get_date_from_week(lc.year, lc.week, day_name)
                    if date_jour.year == year and date_jour.month == month:
                        week_has_days_in_month = True
                        break
                except:
                    continue
            
            if week_has_days_in_month:
                # Vérifier si la semaine chevauche plusieurs mois (problème potentiel)
                days_in_current_month = 0
                days_in_other_months = 0
                
                for day_name in ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']:
                    try:
                        date_jour = get_date_from_week(lc.year, lc.week, day_name)
                        if date_jour.year == year and date_jour.month == month:
                            days_in_current_month += 1
                        else:
                            days_in_other_months += 1
                    except:
                        continue
                
                labor_costs.append(lc)
        
        # Grouper par chantier
        chantiers_data = {}
        
        for lc in labor_costs:
            chantier_id = lc.chantier_id
            if chantier_id not in chantiers_data:
                chantiers_data[chantier_id] = {
                    'chantier_id': chantier_id,
                    'chantier_nom': lc.chantier.chantier_name if lc.chantier else f'Chantier {chantier_id}',
                    'total_hours': 0,
                    'total_cost': 0,
                    'details': []
                }
            
            # Calculer les totaux pour cet agent/chantier
            total_hours = (
                (lc.hours_normal or 0) +
                (lc.hours_samedi or 0) +
                (lc.hours_dimanche or 0) +
                (lc.hours_ferie or 0) +
                (lc.hours_overtime or 0)
            )
            
            total_cost = (
                (lc.cost_normal or 0) +
                (lc.cost_samedi or 0) +
                (lc.cost_dimanche or 0) +
                (lc.cost_ferie or 0) +
                (lc.cost_overtime or 0)
            )
            
            # APPROCHE HYBRIDE : Combiner les deux sources de données
            # 1. LaborCost.details_majoration pour les jours majorés normaux (weekend, fériés)
            # 2. Schedule.overtime_hours pour les heures supplémentaires
            jours_majoration = []
            
            # PARTIE 1: Récupérer les jours majorés depuis LaborCost.details_majoration avec regroupement
            labor_cost_majorations = {}  # Pour regrouper par date + type
            
            if lc.details_majoration:
                for detail in lc.details_majoration:
                    # Normaliser le format de date vers DD/MM/YYYY pour cohérence avec LaborCostsSummary.js
                    date_str = detail.get('date', '')
                    normalized_date = date_str
                    
                    # Convertir YYYY-MM-DD vers DD/MM/YYYY si nécessaire
                    if date_str and '-' in date_str and len(date_str) == 10:
                        try:
                            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                            normalized_date = date_obj.strftime('%d/%m/%Y')
                        except:
                            pass  # Garder la date originale si la conversion échoue
                    
                    # Ignorer les heures supplémentaires de details_majoration (seront traitées par Schedule)
                    detail_type = detail.get('type', '').lower()
                    if detail_type not in ['heures sup', 'overtime']:
                        # Clé pour regroupement : date + type
                        key = f"{normalized_date}_{detail_type}"
                        
                        if key not in labor_cost_majorations:
                            # Normaliser le taux au format +XX%
                            taux_raw = detail.get('taux', '')
                            if isinstance(taux_raw, (int, float)):
                                if taux_raw == 1.25:
                                    taux_display = '+25%'
                                elif taux_raw == 1.5:
                                    taux_display = '+50%'
                                else:
                                    taux_display = f'+{int((taux_raw - 1) * 100)}%'
                            else:
                                taux_display = str(taux_raw)
                            
                            labor_cost_majorations[key] = {
                                'date': normalized_date,
                                'type': detail.get('type', ''),
                                'hours': 0,
                                'overtime_hours': detail.get('overtime_hours', 0),
                                'taux': taux_display
                            }
                        
                        # Sommer les heures pour cette date/type
                        labor_cost_majorations[key]['hours'] += detail.get('hours', 0)
                
                # Ajouter les données regroupées
                for grouped_data in labor_cost_majorations.values():
                    jours_majoration.append(grouped_data)
            
            # PARTIE 2: Ajouter les heures supplémentaires depuis Schedule
            # Récupérer tous les créneaux Schedule pour cet agent/chantier/semaine
            schedules_for_lc = Schedule.objects.filter(
                agent_id=lc.agent_id,
                chantier_id=lc.chantier_id,
                year=year,
                week=lc.week
            )
            
            for schedule in schedules_for_lc:
                date_creneau = get_date_from_week(schedule.year, schedule.week, schedule.day)
                if date_creneau.year != year or date_creneau.month != month:
                    continue
                
                # Vérifier si cette case a des heures supplémentaires
                has_overtime = schedule.overtime_hours and schedule.overtime_hours > 0
                is_journalier = schedule.agent.type_paiement == 'journalier'
                
                if has_overtime and not is_journalier:
                    # EXACTEMENT comme dans schedule_monthly_summary lignes 8371-8377
                    jours_majoration.append({
                        'date': date_creneau.strftime("%d/%m/%Y"),  # Format DD/MM/YYYY
                        'jour': schedule.day,
                        'type': 'Heures sup',
                        'hours': 0,  # Pas d'heures normales majorées
                        'overtime_hours': float(schedule.overtime_hours),
                        'taux': '+25%'
                    })
            
            chantiers_data[chantier_id]['details'].append({
                'agent_id': lc.agent_id,
                'agent_nom': f"{lc.agent.name} {lc.agent.surname}" if lc.agent else f'Agent {lc.agent_id}',
                'chantier_nom': lc.chantier.chantier_name if lc.chantier else f'Chantier {chantier_id}',
                'heures_normal': float(lc.hours_normal or 0),
                'heures_samedi': float(lc.hours_samedi or 0),
                'heures_dimanche': float(lc.hours_dimanche or 0),
                'heures_ferie': float(lc.hours_ferie or 0),
                'heures_overtime': float(lc.hours_overtime or 0),
                'montant_normal': float(lc.cost_normal or 0),
                'montant_samedi': float(lc.cost_samedi or 0),
                'montant_dimanche': float(lc.cost_dimanche or 0),
                'montant_ferie': float(lc.cost_ferie or 0),
                'montant_overtime': float(lc.cost_overtime or 0),
                'jours_majoration': jours_majoration
            })
            
            chantiers_data[chantier_id]['total_hours'] += total_hours
            chantiers_data[chantier_id]['total_cost'] += total_cost
        
        # Convertir en liste
        schedule_data = list(chantiers_data.values())
        
    except Exception as e:
        schedule_data = []
    
    # Skip le calcul manuel - utiliser directement les données de l'API
    # Données récupérées directement de l'API - plus de calcul manuel
    
    # Récupérer tous les agents SAUF les agents journaliers (exclus des rapports mensuels)
    # Appliquer la logique temporelle : agent actif OU désactivé après le début du mois
    month_start_date = start_date
    agents = Agent.objects.exclude(type_paiement='journalier').filter(
        Q(is_active=True) | 
        Q(date_desactivation__gt=month_start_date)
    )
    
    # Récupérer les événements du mois
    events = Event.objects.filter(
        start_date__gte=start_date,
        start_date__lte=end_date
    ).order_by('start_date')
    
    # Agrégation par agent (même logique que LaborCostsSummary.js)
    agent_map = {}
    
    # Traiter les données construites directement (même logique que LaborCostsSummary.js)
    for chantier_data in schedule_data:
        for detail in chantier_data['details']:
            agent_id = detail['agent_id']
            
            if agent_id not in agent_map:
                agent_map[agent_id] = {
                    'agent_id': agent_id,
                    'agent_nom': detail['agent_nom'],
                    'heures_normal': 0,
                    'heures_samedi': 0,
                    'heures_dimanche': 0,
                    'heures_ferie': 0,
                    'heures_overtime': 0,
                    'montant_normal': 0,
                    'montant_samedi': 0,
                    'montant_dimanche': 0,
                    'montant_ferie': 0,
                    'montant_overtime': 0,
                    'jours_majoration': [],
                    'chantiers': set()
                }
            
            agent_map[agent_id]['heures_normal'] += detail['heures_normal']
            agent_map[agent_id]['heures_samedi'] += detail['heures_samedi']
            agent_map[agent_id]['heures_dimanche'] += detail['heures_dimanche']
            agent_map[agent_id]['heures_ferie'] += detail['heures_ferie']
            agent_map[agent_id]['heures_overtime'] += detail.get('heures_overtime', 0)
            agent_map[agent_id]['montant_normal'] += detail['montant_normal']
            agent_map[agent_id]['montant_samedi'] += detail['montant_samedi']
            agent_map[agent_id]['montant_dimanche'] += detail['montant_dimanche']
            agent_map[agent_id]['montant_ferie'] += detail['montant_ferie']
            agent_map[agent_id]['montant_overtime'] += detail.get('montant_overtime', 0)
            agent_map[agent_id]['jours_majoration'].extend(detail['jours_majoration'])
            agent_map[agent_id]['chantiers'].add(detail['chantier_nom'])
    
    agents_data = []
    
    # print(f"🔍 TRAITEMENT DE {agents.count()} AGENTS (agents non-journaliers)")
    
    for agent in agents:
        # print(f"🔍 === TRAITEMENT AGENT: {agent.name} {agent.surname} ===")
        
        agent_data = agent_map.get(agent.id, {
            'heures_normal': 0,
            'heures_samedi': 0,
            'heures_dimanche': 0,
            'heures_ferie': 0,
            'heures_overtime': 0,
            'montant_normal': 0,
            'montant_samedi': 0,
            'montant_dimanche': 0,
            'montant_ferie': 0,
            'montant_overtime': 0,
            'jours_majoration': [],
            'chantiers': set()
        })
        
        # Agent data loaded successfully
        
        # Regrouper les jours majorés par date et type
        overtime_grouped = {}
        for jour in agent_data['jours_majoration']:
            key = (jour['date'], jour['type'])
            if key not in overtime_grouped:
                overtime_grouped[key] = {
                    'date': jour['date'],
                    'type': jour['type'],
                    'hours': 0,
                    'taux': jour['taux']
                }
            overtime_grouped[key]['hours'] += jour['hours']
        
        # Convertir en liste et trier par date
        overtime_details = []
        for key, value in overtime_grouped.items():
            # S'assurer que la date est bien un objet date pour le template
            try:
                if isinstance(value['date'], str):
                    value['date'] = date.fromisoformat(value['date'])
                overtime_details.append(value)
            except:
                pass
        
        overtime_details.sort(key=lambda x: x['date'])
        
        # Récupérer les événements pour cet agent
        agent_events = events.filter(agent=agent)
        
        # Regrouper les événements consécutifs
        events_data = []
        if agent_events:
            current_event = None
            for event in agent_events:
                if current_event is None:
                    current_event = {
                        'start_date': event.start_date,
                        'end_date': event.end_date,
                        'type': event.event_type,
                        'subtype': event.subtype or '',
                        'hours_modified': event.hours_modified,
                        'description': f"{event.event_type} - {event.subtype or 'N/A'}"
                    }
                elif (event.event_type == current_event['type'] and 
                      event.subtype == current_event['subtype'] and
                      event.start_date == current_event['end_date'] + timedelta(days=1)):
                    # Événement consécutif, étendre la période
                    current_event['end_date'] = event.end_date
                else:
                    # Nouvel événement, sauvegarder le précédent
                    events_data.append(current_event)
                    current_event = {
                        'start_date': event.start_date,
                        'end_date': event.end_date,
                        'type': event.event_type,
                        'subtype': event.subtype or '',
                        'hours_modified': event.hours_modified,
                        'description': f"{event.event_type} - {event.subtype or 'N/A'}"
                    }
            
            # Ajouter le dernier événement
            if current_event:
                events_data.append(current_event)
        
        # Calculer les totaux
        total_normal_hours = agent_data['heures_normal']
        total_samedi_hours = agent_data['heures_samedi']
        total_dimanche_hours = agent_data['heures_dimanche']
        total_ferie_hours = agent_data['heures_ferie']
        total_overtime_hours = agent_data['heures_overtime']
        total_hours = total_normal_hours + total_samedi_hours + total_dimanche_hours + total_ferie_hours + total_overtime_hours
        
        # UTILISER LES MÊMES DONNÉES QUE LaborCostsSummary.js
        # Les details_majoration viennent de schedule_data (via schedule_monthly_summary)
        details_majoration = []
        
        # Convertir les jours_majoration de l'agent pour le template PDF
        for i, jour in enumerate(agent_data['jours_majoration']):
            try:
                # Conversion de date pour le template
                date_str = jour['date']
                if isinstance(date_str, str):
                    # Essayer plusieurs formats
                    try:
                        if '/' in date_str:
                            parts = date_str.split('/')
                            if len(parts) == 3:
                                detail_date = date(int(parts[2]), int(parts[1]), int(parts[0]))
                        else:
                            detail_date = date.fromisoformat(date_str)
                    except Exception as e:
                        continue
                else:
                    detail_date = date_str
                
                # Vérifier que c'est le bon mois
                if detail_date.year == year and detail_date.month == month:
                    details_majoration.append({
                        'date': jour['date'],
                        'jour': jour.get('jour', ''),
                        'type': jour.get('type', ''),
                        'hours': jour.get('hours', 0),
                        'overtime_hours': jour.get('overtime_hours', 0),
                        'taux': jour.get('taux', '')
                    })
            except Exception as e:
                continue
        
        # Trier par date
        def parse_date_for_sort(date_str):
            if isinstance(date_str, date):
                return date_str
            if '/' in str(date_str):
                parts = str(date_str).split('/')
                if len(parts) == 3:
                    return date(int(parts[2]), int(parts[1]), int(parts[0]))
            try:
                return date.fromisoformat(str(date_str))
            except:
                return date.min
        
        details_majoration.sort(key=lambda x: parse_date_for_sort(x['date']))
        
        # Récupérer les primes de l'agent pour ce mois
        primes = AgentPrime.objects.filter(
            agent=agent,
            mois=month,
            annee=year
        ).select_related('chantier')
        
        primes_data = []
        total_primes = 0
        
        for prime in primes:
            primes_data.append({
                'description': prime.description,
                'montant': float(prime.montant),
                'type_affectation': prime.type_affectation,
                'chantier_nom': prime.chantier.chantier_name if prime.chantier else None
            })
            total_primes += float(prime.montant)
        
        # Préparer les données pour le template
        agents_data.append({
            'agent': agent,
            'monthly_hours': {
                'normal_hours': total_normal_hours,
                'samedi_hours': total_samedi_hours,
                'dimanche_hours': total_dimanche_hours,
                'ferie_hours': total_ferie_hours,
                'overtime_hours': total_overtime_hours,
                'total_hours': total_hours
            },
            'overtime_details': overtime_details,
            'details_majoration': details_majoration,
            'events': events_data,
            'primes': primes_data,
            'total_primes': total_primes
        })
    
    # Préparer le contexte pour le template
    month_names = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    
    context = {
        'month_name': month_names[month - 1],
        'year': year,
        'start_date': start_date,
        'end_date': end_date,
        'agents_data': agents_data
    }
    
    
    return render(request, 'DocumentAgent/monthly_agents_report.html', context)


def generate_monthly_agents_pdf(request):
    """
    Vue pour générer le PDF du rapport mensuel des agents
    """
    month = int(request.GET.get('month'))
    year = int(request.GET.get('year'))
    
    # URL de prévisualisation
    preview_url = request.build_absolute_uri(f"/api/preview-monthly-agents-report/?month={month}&year={year}")
    
    # Utiliser des chemins relatifs qui fonctionnent en production
    import os
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    node_script_path = os.path.join(base_dir, 'frontend', 'src', 'components', 'generate_monthly_agents_pdf.js')
    pdf_path = os.path.join(base_dir, 'frontend', 'src', 'components', 'monthly_agents_report.pdf')
    
    # Vérifications préliminaires
    if not os.path.exists(node_script_path):
        error_msg = f'Script Node.js introuvable: {node_script_path}'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)
    
    # Vérifier si Node.js est disponible avec plusieurs chemins
    node_paths = ['node', '/usr/bin/node', '/usr/local/bin/node', '/opt/nodejs/bin/node']
    node_found = False
    node_path = 'node'
    
    for path in node_paths:
        try:
            result = subprocess.run([path, '--version'], check=True, capture_output=True, text=True)
            print(f"✅ Node.js trouvé: {path} - Version: {result.stdout.strip()}")
            node_found = True
            node_path = path
            break
        except (subprocess.CalledProcessError, FileNotFoundError):
            continue
    
    if not node_found:
        error_msg = 'Node.js n\'est pas installé ou n\'est pas accessible'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)
    
    command = [node_path, node_script_path, preview_url, pdf_path]
    print(f"Commande exécutée: {' '.join(command)}")
    
    try:
        # Exécuter avec capture de sortie pour debug
        result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=60)
        print(f"Sortie standard: {result.stdout}")
        print(f"Sortie d'erreur: {result.stderr}")
        
        if not os.path.exists(pdf_path):
            error_msg = f'Le fichier PDF n\'a pas été généré: {pdf_path}'
            print(f"ERREUR: {error_msg}")
            return JsonResponse({'error': error_msg}, status=500)
        
        with open(pdf_path, 'rb') as pdf_file:
            response = HttpResponse(pdf_file.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="rapport_mensuel_agents_{month}_{year}.pdf"'
            return response
            
    except subprocess.TimeoutExpired:
        error_msg = 'Timeout lors de la génération du PDF (60 secondes)'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)
    except subprocess.CalledProcessError as e:
        error_msg = f'Erreur lors de la génération du PDF: {str(e)}\nSortie: {e.stdout}\nErreur: {e.stderr}'
        print(f"ERREUR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=500)
    except Exception as e:
        error_msg = f'Erreur inattendue: {str(e)}'
        print(f"ERREUR: {error_msg}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return JsonResponse({'error': error_msg}, status=500)


class AppelOffresViewSet(viewsets.ModelViewSet):
    queryset = AppelOffres.objects.all()
    serializer_class = AppelOffresSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appel_offres = self.perform_create(serializer)
        
        # Note: La création de la structure de dossiers est gérée automatiquement
        # par le signal Django dans signals.py (create_appel_offres_folders)
        # Pas besoin de le faire ici pour éviter les doublons
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def get_queryset(self):
        """Filtrer selon les paramètres"""
        queryset = AppelOffres.objects.all()
        
        # Filtre par statut
        statut = self.request.query_params.get('statut', None)
        if statut:
            queryset = queryset.filter(statut=statut)
        
        return queryset.order_by('-date_debut')
    
    @action(detail=True, methods=['post'])
    def transformer_en_chantier(self, request, pk=None):
        """Transforme un appel d'offres validé en chantier"""
        try:
            appel_offres = self.get_object()
            
            if appel_offres.statut != 'valide':
                return Response({
                    'error': 'Seuls les appels d\'offres validés peuvent être transformés en chantier'
                }, status=400)
            
            # ✅ Vérifier si l'appel d'offres a déjà été transformé en chantier
            # Utiliser le champ chantier_transformé qui persiste même après rechargement
            if appel_offres.chantier_transformé:
                return Response({
                    'error': f'Cet appel d\'offres a déjà été transformé en chantier : {appel_offres.chantier_transformé.chantier_name}',
                    'chantier_id': appel_offres.chantier_transformé.id,
                    'chantier_name': appel_offres.chantier_transformé.chantier_name,
                    'deja_transforme': True
                }, status=400)
            
            chantier = appel_offres.transformer_en_chantier()
            
            # Mettre à jour le devis pour qu'il pointe vers le nouveau chantier
            devis = appel_offres.devis.first()
            if devis:
                devis.chantier = chantier
                devis.appel_offres = None
                devis.save()
            
            # Récupérer les informations pour la copie (sans génération de PDF)
            try:
                # Récupérer le nom de la société depuis l'appel d'offres
                societe_name = "Société par défaut"
                if appel_offres.societe:
                    societe_name = appel_offres.societe.nom_societe
                elif hasattr(appel_offres, 'devis') and appel_offres.devis.first():
                    devis = appel_offres.devis.first()
                    if devis.societe:
                        societe_name = devis.societe.nom
                
                # Utiliser le nom de l'appel d'offres et du chantier
                appel_offres_name = appel_offres.chantier_name
                chantier_name = chantier.chantier_name
                
            except Exception as e:
                pass
            
            # Copier automatiquement les dossiers du drive vers le nouveau chemin
            try:
                drive_automation.copy_appel_offres_to_chantier(
                    societe_name=societe_name,
                    appel_offres_name=appel_offres_name,
                    chantier_name=chantier_name
                )
            except Exception:
                pass
            
            return Response({
                'message': 'Appel d\'offres transformé en chantier avec succès',
                'chantier_id': chantier.id,
                'chantier_name': chantier.chantier_name
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    @action(detail=True, methods=['post'])
    def mettre_a_jour_statut(self, request, pk=None):
        """Met à jour le statut d'un appel d'offres"""
        try:
            appel_offres = self.get_object()
            nouveau_statut = request.data.get('statut')
            raison_refus = request.data.get('raison_refus', '')
            
            if nouveau_statut not in dict(AppelOffres.STATUT_CHOICES):
                return Response({'error': 'Statut invalide'}, status=400)
            
            appel_offres.statut = nouveau_statut
            
            if nouveau_statut == 'refuse':
                appel_offres.raison_refus = raison_refus
            elif nouveau_statut == 'valide':
                appel_offres.date_validation = timezone.now().date()
            
            appel_offres.save()
            
            return Response({'message': 'Statut mis à jour avec succès'})
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['delete'])
    def supprimer_appel_offres(self, request, pk=None):
        """Supprime un appel d'offres, ses devis associés et ses dossiers dans le drive"""
        try:
            appel_offres = self.get_object()
            
            # Récupérer les devis associés pour information
            devis_associes = appel_offres.devis.all()
            nombre_devis = devis_associes.count()
            
            # Supprimer les dossiers du drive
            try:
                societe_name = "Société par défaut"
                if appel_offres.societe:
                    societe_name = appel_offres.societe.nom_societe
                
                # Supprimer la structure de dossiers dans le drive
                drive_automation.delete_appel_offres_structure(
                    societe_name=societe_name,
                    appel_offres_name=appel_offres.chantier_name
                )
            except Exception as e:
                print(f"Erreur lors de la suppression des dossiers du drive: {str(e)}")
                # Continuer la suppression même si les dossiers n'ont pas pu être supprimés
            
            # Supprimer les devis associés en premier (pour éviter les contraintes de clé étrangère)
            for devis in devis_associes:
                print(f"🗑️ Suppression du devis {devis.id} - {devis.numero}")
                devis.delete()
            
            # Supprimer l'appel d'offres
            appel_offres.delete()
            
            # Message de confirmation avec le nombre de devis supprimés
            message = f'Appel d\'offres supprimé avec succès'
            if nombre_devis > 0:
                message += f' ({nombre_devis} devis associé(s) supprimé(s))'
            
            return Response({'message': message})
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)





class DriveViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les documents du drive
    """
    serializer_class = DocumentSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Filtrer les documents selon l'utilisateur et les paramètres"""
        queryset = Document.objects.filter(is_deleted=False)
        
        # Filtrer par propriétaire (l'utilisateur connecté) - temporairement désactivé pour le développement
        # queryset = queryset.filter(owner=self.request.user)
        
        # Filtres optionnels
        societe_id = self.request.query_params.get('societe_id')
        if societe_id:
            queryset = queryset.filter(societe_id=societe_id)
        
        chantier_id = self.request.query_params.get('chantier_id')
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(filename__icontains=search) |
                Q(societe__nom_societe__icontains=search) |
                Q(chantier__chantier_name__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def presign_upload(self, request):
        """
        Génère une URL présignée pour upload direct vers S3
        """
        serializer = DocumentUploadSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Récupérer les objets
            societe = None
            chantier = None
            
            if serializer.validated_data.get('societe_id'):
                societe = Societe.objects.get(id=serializer.validated_data['societe_id'])
            
            if serializer.validated_data.get('chantier_id'):
                chantier = Chantier.objects.get(id=serializer.validated_data['chantier_id'])
            
            # Générer la clé S3
            key = build_document_key(
                societe=societe,
                chantier=chantier,
                category=serializer.validated_data['category'],
                filename=serializer.validated_data['filename']
            )
            
            # Générer l'URL présignée POST
            presigned_data = generate_presigned_post(key)
            
            return Response({
                'upload_url': presigned_data['url'],
                'fields': presigned_data['fields'],
                'key': key,
                'societe_id': societe.id if societe else None,
                'chantier_id': chantier.id if chantier else None,
                'category': serializer.validated_data['category'],
                'filename': serializer.validated_data['filename']
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def confirm_upload(self, request):
        """
        Confirme l'upload d'un fichier et crée l'entrée en base
        """
        try:
            # Récupérer les données de l'upload
            key = request.data.get('key')
            filename = request.data.get('filename')
            content_type = request.data.get('content_type')
            size = request.data.get('size')
            societe_id = request.data.get('societe_id')
            chantier_id = request.data.get('chantier_id')
            category = request.data.get('category')
            
            if not all([key, filename, content_type, size]):
                return Response({'error': 'Données manquantes'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Créer l'entrée Document
            document_data = {
                's3_key': key,
                'filename': filename,
                'content_type': content_type,
                'size': int(size),
                'category': category,
                # Temporairement désactivé pour le développement
                # 'owner': request.user,
                # 'created_by': request.user
            }
            
            if societe_id:
                document_data['societe_id'] = societe_id
            
            if chantier_id:
                document_data['chantier_id'] = chantier_id
            
            document = Document.objects.create(**document_data)
            
            # Retourner le document sérialisé
            serializer = DocumentSerializer(document, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Génère une URL présignée pour télécharger un document
        """
        try:
            document = self.get_object()
            download_url = generate_presigned_url('get_object', document.s3_key, expires_in=3600)
            
            return Response({
                'download_url': download_url,
                'filename': document.filename
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def list_folders(self, request):
        """
        Liste les dossiers et fichiers selon l'arborescence
        """
        try:
            societe_id = request.query_params.get('societe_id')
            chantier_id = request.query_params.get('chantier_id')
            category = request.query_params.get('category')
            
            # Construire le préfixe S3
            prefix = ""
            if societe_id:
                societe = Societe.objects.get(id=societe_id)
                societe_part = f"{societe.id}_{slugify(societe.nom_societe)}"
                prefix = f"companies/{societe_part}/"
                
                if chantier_id:
                    chantier = Chantier.objects.get(id=chantier_id)
                    chantier_part = f"{chantier.id}_{slugify(chantier.chantier_name)}"
                    prefix += f"chantiers/{chantier_part}/"
                    
                    if category:
                        prefix += f"{slugify(category)}/"
            
            # Lister les documents depuis la base
            queryset = self.get_queryset()
            
            if societe_id:
                queryset = queryset.filter(societe_id=societe_id)
            
            if chantier_id:
                queryset = queryset.filter(chantier_id=chantier_id)
            
            if category:
                queryset = queryset.filter(category=category)
            
            # Pagination
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            
            paginator = Paginator(queryset, page_size)
            documents_page = paginator.get_page(page)
            
            # Sérialiser les résultats
            documents_serializer = DocumentSerializer(
                documents_page.object_list, 
                many=True, 
                context={'request': request}
            )
            
            # Construire la réponse
            response_data = {
                'documents': documents_serializer.data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_pages': paginator.num_pages,
                    'total_count': paginator.count,
                    'has_next': documents_page.has_next(),
                    'has_previous': documents_page.has_previous()
                }
            }
            
            return Response(response_data)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, *args, **kwargs):
        """
        Supprime un document (soft delete)
        """
        try:
            document = self.get_object()
            
            # Soft delete
            document.is_deleted = True
            document.save()
            
            # Optionnel : supprimer aussi de S3
            # from .utils import get_s3_client
            # s3_client = get_s3_client()
            # s3_client.delete_object(Bucket=os.getenv('S3_BUCKET_NAME'), Key=document.s3_key)
            
            return Response({'message': 'Document supprimé avec succès'})
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def create_folder(self, request):
        """
        Crée un dossier personnalisé dans S3
        """
        try:
            folder_name = request.data.get('folder_name')
            societe_id = request.data.get('societe_id')
            chantier_id = request.data.get('chantier_id')
            category = request.data.get('category')
            level = request.data.get('level', 'category')  # root, societe, chantier, category

            if not folder_name:
                return Response({'error': 'Nom de dossier requis'}, status=status.HTTP_400_BAD_REQUEST)

            # Construire le chemin du dossier selon le niveau
            folder_path = ""
            
            if level == 'root':
                folder_path = f"custom_folders/{custom_slugify(folder_name)}"
            elif level == 'societe':
                societe = Societe.objects.get(id=societe_id)
                societe_part = f"{societe.id}_{custom_slugify(societe.nom_societe)}"
                folder_path = f"companies/{societe_part}/custom_folders/{custom_slugify(folder_name)}"
            elif level == 'chantier':
                societe = Societe.objects.get(id=societe_id)
                chantier = Chantier.objects.get(id=chantier_id)
                societe_part = f"{societe.id}_{custom_slugify(societe.nom_societe)}"
                chantier_part = f"{chantier.id}_{custom_slugify(chantier.chantier_name)}"
                folder_path = f"companies/{societe_part}/chantiers/{chantier_part}/custom_folders/{custom_slugify(folder_name)}"
            elif level == 'category':
                societe = Societe.objects.get(id=societe_id)
                chantier = Chantier.objects.get(id=chantier_id)
                societe_part = f"{societe.id}_{custom_slugify(societe.nom_societe)}"
                chantier_part = f"{chantier.id}_{custom_slugify(chantier.chantier_name)}"
                category_part = custom_slugify(category)
                folder_path = f"companies/{societe_part}/chantiers/{chantier_part}/{category_part}/custom_folders/{custom_slugify(folder_name)}"

            # Créer le dossier dans S3
            from .utils import create_s3_folder
            success = create_s3_folder(folder_path)

            if success:
                return Response({
                    'message': 'Dossier créé avec succès',
                    'folder_path': folder_path,
                    'folder_name': folder_name
                })
            else:
                return Response({'error': 'Erreur lors de la création du dossier'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def list_custom_folders(self, request):
        """
        Liste les dossiers personnalisés selon le niveau
        """
        try:
            societe_id = request.query_params.get('societe_id')
            chantier_id = request.query_params.get('chantier_id')
            category = request.query_params.get('category')
            level = request.query_params.get('level', 'category')

            # Construire le préfixe selon le niveau
            prefix = ""
            
            if level == 'root':
                prefix = "custom_folders/"
            elif level == 'societe':
                societe = Societe.objects.get(id=societe_id)
                societe_part = f"{societe.id}_{custom_slugify(societe.nom_societe)}"
                prefix = f"companies/{societe_part}/custom_folders/"
            elif level == 'chantier':
                societe = Societe.objects.get(id=societe_id)
                chantier = Chantier.objects.get(id=chantier_id)
                societe_part = f"{societe.id}_{custom_slugify(societe.nom_societe)}"
                chantier_part = f"{chantier.id}_{custom_slugify(chantier.chantier_name)}"
                prefix = f"companies/{societe_part}/chantiers/{chantier_part}/custom_folders/"
            elif level == 'category':
                societe = Societe.objects.get(id=societe_id)
                chantier = Chantier.objects.get(id=chantier_id)
                societe_part = f"{societe.id}_{custom_slugify(societe.nom_societe)}"
                chantier_part = f"{chantier.id}_{custom_slugify(chantier.chantier_name)}"
                category_part = custom_slugify(category)
                prefix = f"companies/{societe_part}/chantiers/{chantier_part}/{category_part}/custom_folders/"

            # Lister les dossiers dans S3
            from .utils import list_s3_folders
            folders = list_s3_folders(prefix)

            return Response({
                'folders': folders,
                'level': level
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['delete'])
    def delete_folder(self, request):
        """
        Supprime un dossier personnalisé et son contenu
        """
        try:
            folder_path = request.data.get('folder_path')
            
            if not folder_path:
                return Response({'error': 'Chemin du dossier requis'}, status=status.HTTP_400_BAD_REQUEST)

            # Supprimer le dossier dans S3
            from .utils import delete_s3_folder
            success = delete_s3_folder(folder_path)

            if success:
                return Response({'message': 'Dossier supprimé avec succès'})
            else:
                return Response({'error': 'Erreur lors de la suppression du dossier'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token_view(request):
    """
    Vue pour générer et retourner un token CSRF
    """
    from django.middleware.csrf import get_token
    get_token(request)
    return Response({'detail': 'CSRF token generated'})

@api_view(['GET'])
def get_sous_traitants(request):
    """
    Récupère la liste des sous-traitants
    """
    try:
        sous_traitants = SousTraitant.objects.all()
        data = []
        for st in sous_traitants:
            data.append({
                'id': st.id,
                'entreprise': st.entreprise,
                'representant': st.representant,
                'phone_Number': st.phone_Number,
                'email': st.email,
            })
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_emetteurs(request):
    """
    Récupère la liste des émetteurs actifs
    """
    try:
        emetteurs = Emetteur.objects.filter(is_active=True)
        serializer = EmetteurSerializer(emetteurs, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def app_version_view(request):
    """
    Endpoint pour récupérer la version de l'application
    """
    import os
    import json
    from pathlib import Path
    
    # Chemin vers le fichier de version de déploiement
    project_root = Path(__file__).parent.parent
    version_file = project_root / 'deploy_version.json'
    
    # Si le fichier de version existe, l'utiliser
    if version_file.exists():
        try:
            with open(version_file, 'r', encoding='utf-8') as f:
                version_data = json.load(f)
            
            return Response({
                'version': version_data['version'],
                'deploy_date': version_data['deploy_date'],
                'deploy_timestamp': version_data['deploy_timestamp'],
                'source': 'deploy_version.json',
                'files_updated': version_data['files_updated']
            })
        except Exception as e:
            # En cas d'erreur, utiliser la version par défaut
            pass
    
    # Fallback : version basée sur la date de modification de manage.py
    main_file = project_root / 'manage.py'
    fallback_version = str(int(os.path.getmtime(main_file))) if main_file.exists() else '1.0.0'
    
    return Response({
        'version': fallback_version,
        'timestamp': int(os.path.getmtime(main_file)) if main_file.exists() else None,
        'source': 'fallback_timestamp',
        'files_updated': ['manage.py']
    })


@api_view(['POST'])
def force_version_update(request):
    """
    Force la mise à jour de la version (pour les déploiements)
    """
    import os
    from pathlib import Path
    
    try:
        # Toucher le fichier manage.py pour forcer un changement de version
        manage_py = Path(__file__).parent.parent / 'manage.py'
        if manage_py.exists():
            # Modifier la date de modification
            current_time = os.time()
            os.utime(manage_py, (current_time, current_time))
            
            return Response({
                'success': True,
                'message': 'Version forcée à jour',
                'new_timestamp': current_time
            })
        else:
            return Response({
                'error': 'Fichier manage.py non trouvé'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({
            'error': f'Erreur lors de la mise à jour de version: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def calculer_couts_devis(devis_id):
    """
    Calcule et sauvegarde les coûts totaux d'un devis
    Gère les deux systèmes : DevisLigne (modèle) et lignes (JSON)
    """
    from decimal import Decimal
    
    try:
        devis = Devis.objects.get(id=devis_id)
        cout_main_oeuvre_total = Decimal('0')
        cout_materiel_total = Decimal('0')
        
        # Vérifier si le devis a des lignes DevisLigne
        lignes = DevisLigne.objects.filter(devis=devis)
        
        if lignes.exists():
            print(f"🔍 Devis {devis_id} utilise le système DevisLigne avec {lignes.count()} lignes")
            
            for ligne in lignes:
                try:
                    # Récupérer ligne_detail (même si is_deleted=True)
                    ligne_detail = LigneDetail._base_manager.get(id=ligne.ligne_detail_id)
                    
                    quantite = Decimal(str(ligne.quantite or 0))
                    cout_mo = Decimal(str(ligne_detail.cout_main_oeuvre or 0))
                    cout_mat = Decimal(str(ligne_detail.cout_materiel or 0))
                    
                    cout_main_oeuvre_total += cout_mo * quantite
                    cout_materiel_total += cout_mat * quantite
                    
                    print(f"  Ligne {ligne.id}: {quantite} x (MO:{cout_mo} + Mat:{cout_mat}) = MO:{cout_mo * quantite}, Mat:{cout_mat * quantite}")
                    
                except Exception as e:
                    print(f"Erreur ligne {ligne.id}: {e}")
                    continue
        else:
            # Système JSON pour les devis normaux
            print(f"🔍 Devis {devis_id} utilise le système JSON")
            if devis.lignes and isinstance(devis.lignes, list):
                for ligne_data in devis.lignes:
                    try:
                        ligne_detail_id = ligne_data.get('ligne_detail')
                        quantite = Decimal(str(ligne_data.get('quantite', 0)))
                        
                        if ligne_detail_id:
                            ligne_detail = LigneDetail._base_manager.get(id=ligne_detail_id)
                            cout_mo = Decimal(str(ligne_detail.cout_main_oeuvre or 0))
                            cout_mat = Decimal(str(ligne_detail.cout_materiel or 0))
                            
                            cout_main_oeuvre_total += cout_mo * quantite
                            cout_materiel_total += cout_mat * quantite
                            
                            print(f"  Ligne JSON: {quantite} x (MO:{cout_mo} + Mat:{cout_mat}) = MO:{cout_mo * quantite}, Mat:{cout_mat * quantite}")
                            
                    except Exception as e:
                        print(f"Erreur ligne JSON: {e}")
                        continue
            else:
                print(f"🔍 Devis {devis_id} n'a pas de lignes JSON")
        
        # Sauvegarder dans le devis
        devis.cout_estime_main_oeuvre = cout_main_oeuvre_total
        devis.cout_estime_materiel = cout_materiel_total
        devis.save(update_fields=['cout_estime_main_oeuvre', 'cout_estime_materiel'])
        
        print(f"✅ Coûts calculés pour devis {devis_id}: MO={cout_main_oeuvre_total}, Mat={cout_materiel_total}")
        
        return {
            'cout_estime_main_oeuvre': float(cout_main_oeuvre_total),
            'cout_estime_materiel': float(cout_materiel_total)
        }
        
    except Exception as e:
        print(f"❌ Erreur calcul coûts devis {devis_id}: {e}")
        return None


def calculer_couts_facture(facture_id):
    """
    Calcule et sauvegarde les coûts totaux d'une facture
    Utilise les lignes du devis associé si pas de FactureLigne
    """
    from decimal import Decimal
    
    try:
        facture = Facture.objects.get(id=facture_id)
        cout_main_oeuvre_total = Decimal('0')
        cout_materiel_total = Decimal('0')
        
        # Essayer d'abord avec les FactureLigne
        lignes_facture = FactureLigne.objects.filter(facture=facture)
        
        if lignes_facture.exists():
            print(f"🔍 Facture {facture_id} utilise le système FactureLigne avec {lignes_facture.count()} lignes")
            
            for ligne in lignes_facture:
                try:
                    ligne_detail = LigneDetail._base_manager.get(id=ligne.ligne_detail_id)
                    
                    quantite = Decimal(str(ligne.quantite or 0))
                    cout_mo = Decimal(str(ligne_detail.cout_main_oeuvre or 0))
                    cout_mat = Decimal(str(ligne_detail.cout_materiel or 0))
                    
                    cout_main_oeuvre_total += cout_mo * quantite
                    cout_materiel_total += cout_mat * quantite
                    
                    print(f"  Ligne {ligne.id}: {quantite} x (MO:{cout_mo} + Mat:{cout_mat}) = MO:{cout_mo * quantite}, Mat:{cout_mat * quantite}")
                    
                except Exception as e:
                    print(f"Erreur ligne {ligne.id}: {e}")
                    continue
        else:
            # Utiliser les lignes du devis associé
            print(f"🔍 Facture {facture_id} utilise les lignes du devis {facture.devis.id}")
            
            if facture.devis:
                # Vérifier si le devis a des lignes DevisLigne
                lignes_devis = DevisLigne.objects.filter(devis=facture.devis)
                
                if lignes_devis.exists():
                    print(f"🔍 Devis {facture.devis.id} utilise le système DevisLigne avec {lignes_devis.count()} lignes")
                    
                    for ligne in lignes_devis:
                        try:
                            ligne_detail = LigneDetail._base_manager.get(id=ligne.ligne_detail_id)
                            
                            quantite = Decimal(str(ligne.quantite or 0))
                            cout_mo = Decimal(str(ligne_detail.cout_main_oeuvre or 0))
                            cout_mat = Decimal(str(ligne_detail.cout_materiel or 0))
                            
                            cout_main_oeuvre_total += cout_mo * quantite
                            cout_materiel_total += cout_mat * quantite
                            
                            print(f"  Ligne {ligne.id}: {quantite} x (MO:{cout_mo} + Mat:{cout_mat}) = MO:{cout_mo * quantite}, Mat:{cout_mat * quantite}")
                            
                        except Exception as e:
                            print(f"Erreur ligne {ligne.id}: {e}")
                            continue
                else:
                    # Système JSON pour les devis normaux
                    print(f"🔍 Devis {facture.devis.id} utilise le système JSON")
                    if facture.devis.lignes and isinstance(facture.devis.lignes, list):
                        for ligne_data in facture.devis.lignes:
                            try:
                                ligne_detail_id = ligne_data.get('ligne_detail')
                                quantite = Decimal(str(ligne_data.get('quantite', 0)))
                                
                                if ligne_detail_id:
                                    ligne_detail = LigneDetail._base_manager.get(id=ligne_detail_id)
                                    cout_mo = Decimal(str(ligne_detail.cout_main_oeuvre or 0))
                                    cout_mat = Decimal(str(ligne_detail.cout_materiel or 0))
                                    
                                    cout_main_oeuvre_total += cout_mo * quantite
                                    cout_materiel_total += cout_mat * quantite
                                    
                                    print(f"  Ligne JSON: {quantite} x (MO:{cout_mo} + Mat:{cout_mat}) = MO:{cout_mo * quantite}, Mat:{cout_mat * quantite}")
                                    
                            except Exception as e:
                                print(f"Erreur ligne JSON: {e}")
                                continue
                    else:
                        print(f"🔍 Devis {facture.devis.id} n'a pas de lignes JSON")
        
        # Sauvegarder dans la facture
        facture.cout_estime_main_oeuvre = cout_main_oeuvre_total
        facture.cout_estime_materiel = cout_materiel_total
        facture.save(update_fields=['cout_estime_main_oeuvre', 'cout_estime_materiel'])
        
        print(f"✅ Coûts calculés pour facture {facture_id}: MO={cout_main_oeuvre_total}, Mat={cout_materiel_total}")
        
        return {
            'cout_estime_main_oeuvre': float(cout_main_oeuvre_total),
            'cout_estime_materiel': float(cout_materiel_total)
        }
        
    except Exception as e:
        print(f"❌ Erreur calcul coûts facture {facture_id}: {e}")
        return None


def recalculer_couts_estimes_chantier(chantier_id):
    """
    Recalcule les coûts totaux du chantier en sommant
    les coûts du devis de chantier + toutes les factures
    """
    from decimal import Decimal
    
    try:
        chantier = Chantier.objects.get(id=chantier_id)
        
        cout_main_oeuvre_total = Decimal('0')
        cout_materiel_total = Decimal('0')
        
        # 1. Coûts du devis de chantier
        try:
            devis_chantier = Devis.objects.get(chantier=chantier, devis_chantier=True)
            cout_main_oeuvre_total += Decimal(str(devis_chantier.cout_estime_main_oeuvre or 0))
            cout_materiel_total += Decimal(str(devis_chantier.cout_estime_materiel or 0))
        except Devis.DoesNotExist:
            pass
        
        # 2. Coûts de toutes les factures
        factures = Facture.objects.filter(chantier=chantier)
        for facture in factures:
            cout_main_oeuvre_total += Decimal(str(facture.cout_estime_main_oeuvre or 0))
            cout_materiel_total += Decimal(str(facture.cout_estime_materiel or 0))
        
        # 3. Sauvegarder dans le chantier
        chantier.cout_estime_main_oeuvre = cout_main_oeuvre_total
        chantier.cout_estime_materiel = cout_materiel_total
        chantier.save(update_fields=['cout_estime_main_oeuvre', 'cout_estime_materiel'])
        
        return {
            'cout_estime_main_oeuvre': float(cout_main_oeuvre_total),
            'cout_estime_materiel': float(cout_materiel_total)
        }
        
    except Exception as e:
        print(f"Erreur recalcul chantier {chantier_id}: {e}")
        return None


@api_view(['POST'])
@permission_classes([AllowAny])
def recalculer_couts_estimes(request, chantier_id):
    """
    Recalcule les coûts estimés (main d'œuvre et matériel) d'un chantier
    basé sur le devis de chantier associé.
    """
    try:
        from decimal import Decimal
        
        # Récupérer le chantier
        try:
            chantier = Chantier.objects.get(id=chantier_id)
        except Chantier.DoesNotExist:
            return Response({
                'error': 'Chantier non trouvé'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Récupérer le devis de chantier associé
        try:
            devis_chantier = Devis.objects.get(
                chantier=chantier,
                devis_chantier=True
            )
        except Devis.DoesNotExist:
            return Response({
                'error': 'Aucun devis de chantier trouvé pour ce chantier'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Récupérer les lignes du devis
        lignes_devis = DevisLigne.objects.filter(devis=devis_chantier)
        
        # Initialiser les totaux
        cout_main_oeuvre_total = Decimal('0')
        cout_materiel_total = Decimal('0')
        
        # Calculer les coûts à partir des lignes du devis
        for ligne in lignes_devis:
            try:
                # Récupérer les détails de la ligne directement, y compris si elle est supprimée
                # Utiliser une requête qui ignore les filtres du manager par défaut
                ligne_detail = None
                try:
                    # Essayer d'abord l'accès normal
                    ligne_detail = ligne.ligne_detail
                except:
                    # Si échec, utiliser une requête directe sans filtre
                    try:
                        # Utiliser _base_manager pour contourner les filtres du manager par défaut
                        ligne_detail = LigneDetail._base_manager.get(id=ligne.ligne_detail_id)
                    except LigneDetail.DoesNotExist:
                        print(f"Ligne de détail {ligne.ligne_detail_id} introuvable pour la ligne {ligne.id}")
                        continue
                
                quantite = Decimal(str(ligne.quantite or 0))
                
                # Calculer les coûts pour cette ligne
                cout_main_oeuvre_ligne = Decimal(str(ligne_detail.cout_main_oeuvre or 0)) * quantite
                cout_materiel_ligne = Decimal(str(ligne_detail.cout_materiel or 0)) * quantite
                
                cout_main_oeuvre_total += cout_main_oeuvre_ligne
                cout_materiel_total += cout_materiel_ligne
                
            except Exception as e:
                print(f"Erreur lors du calcul de la ligne {ligne.id}: {e}")
                continue
        
        # Mettre à jour le chantier avec les nouveaux coûts estimés
        chantier.cout_estime_main_oeuvre = cout_main_oeuvre_total
        chantier.cout_estime_materiel = cout_materiel_total
        
        # Calculer la marge estimée (prix total - coûts totaux)
        prix_total_devis = Decimal(str(devis_chantier.price_ht or 0))
        couts_totaux = cout_main_oeuvre_total + cout_materiel_total
        marge_estimee = prix_total_devis - couts_totaux
        chantier.marge_estimee = marge_estimee
        
        chantier.save()
        
        return Response({
            'success': True,
            'message': 'Coûts estimés recalculés avec succès',
            'cout_estime_main_oeuvre': float(cout_main_oeuvre_total),
            'cout_estime_materiel': float(cout_materiel_total),
            'marge_estimee': float(marge_estimee),
            'lignes_traitees': len(lignes_devis)
        })
        
    except Exception as e:
        return Response({
            'error': f'Erreur lors du recalcul des coûts estimés: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def recalculer_couts_facture(request, facture_id):
    """
    Force le recalcul des coûts estimés d'une facture
    """
    try:
        facture = Facture.objects.get(id=facture_id)
        
        # Recalculer les coûts de la facture
        result = calculer_couts_facture(facture_id)
        
        if result:
            return Response({
                'success': True,
                'message': 'Coûts estimés de la facture recalculés avec succès',
                'cout_estime_main_oeuvre': float(result['cout_estime_main_oeuvre']),
                'cout_estime_materiel': float(result['cout_estime_materiel'])
            })
        else:
            return Response({
                'success': False,
                'message': 'Erreur lors du recalcul des coûts de la facture'
            }, status=500)
            
    except Facture.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Facture non trouvée'
        }, status=404)
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Erreur: {str(e)}'
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_decomposition_couts(request, chantier_id):
    """
    Retourne la décomposition des coûts du chantier
    """
    from decimal import Decimal
    
    try:
        chantier = Chantier.objects.get(id=chantier_id)
        
        decomposition = {
            'devis': {
                'cout_main_oeuvre': 0,
                'cout_materiel': 0
            },
            'factures': {
                'cout_main_oeuvre': 0,
                'cout_materiel': 0,
                'nombre_factures': 0,
                'detail': []
            },
            'total': {
                'cout_main_oeuvre': 0,
                'cout_materiel': 0,
                'cout_total': 0
            }
        }
        
        # 1. Devis de chantier
        try:
            devis = Devis.objects.get(chantier=chantier, devis_chantier=True)
            decomposition['devis'] = {
                'cout_main_oeuvre': float(devis.cout_estime_main_oeuvre or 0),
                'cout_materiel': float(devis.cout_estime_materiel or 0)
            }
        except Devis.DoesNotExist:
            pass
        
        # 2. Factures
        factures = Facture.objects.filter(chantier=chantier)
        decomposition['factures']['nombre_factures'] = factures.count()
        
        for facture in factures:
            cout_mo = float(facture.cout_estime_main_oeuvre or 0)
            cout_mat = float(facture.cout_estime_materiel or 0)
            
            decomposition['factures']['cout_main_oeuvre'] += cout_mo
            decomposition['factures']['cout_materiel'] += cout_mat
            
            decomposition['factures']['detail'].append({
                'numero': facture.numero,
                'type': facture.type_facture,
                'cout_main_oeuvre': cout_mo,
                'cout_materiel': cout_mat
            })
        
        # 3. Totaux
        decomposition['total']['cout_main_oeuvre'] = (
            decomposition['devis']['cout_main_oeuvre'] + 
            decomposition['factures']['cout_main_oeuvre']
        )
        decomposition['total']['cout_materiel'] = (
            decomposition['devis']['cout_materiel'] + 
            decomposition['factures']['cout_materiel']
        )
        decomposition['total']['cout_total'] = (
            decomposition['total']['cout_main_oeuvre'] + 
            decomposition['total']['cout_materiel']
        )
        
        return Response(decomposition)
        
    except Chantier.DoesNotExist:
        return Response({
            'error': 'Chantier non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        return Response({
            'error': f'Erreur lors de la récupération de la décomposition: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ===== ENDPOINTS POUR L'ÉVÉNEMENT "ÉCOLE" =====

@api_view(['POST'])
@permission_classes([AllowAny])
def create_ecole_event(request):
    """
    Crée un événement "École" et assigne automatiquement les créneaux
    """
    try:
        data = request.data
        agent_id = data.get('agent_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if not all([agent_id, start_date, end_date]):
            return Response({
                'error': 'agent_id, start_date et end_date sont requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Convertir les dates
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # Créer les assignations automatiques (qui crée aussi l'événement)
        assignments_created = create_ecole_assignments(agent_id, start_date, end_date)
        
        # Créer les dépenses pour chaque mois concerné
        current_date = start_date
        while current_date <= end_date:
            month = current_date.month
            year = current_date.year
            create_ecole_expense_for_agent(agent_id, month, year)
            
            # Passer au mois suivant
            if current_date.month == 12:
                current_date = date(current_date.year + 1, 1, 1)
            else:
                current_date = date(current_date.year, current_date.month + 1, 1)
        
        return Response({
            'success': True,
            'assignments_created': assignments_created,
            'message': f'Événement école créé avec {assignments_created} assignations'
        })
        
    except Exception as e:
        return Response({
            'error': f'Erreur lors de la création de l\'événement école: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_ecole_event(request, event_id):
    """
    Supprime un événement "École" et ses assignations
    """
    try:
        event = Event.objects.get(id=event_id, event_type='ecole')
        
        # Supprimer les assignations d'école
        assignments_deleted = delete_ecole_assignments(
            event.agent_id, 
            event.start_date, 
            event.end_date
        )
        
        # Recalculer les dépenses pour chaque mois concerné
        current_date = event.start_date
        while current_date <= event.end_date:
            month = current_date.month
            year = current_date.year
            create_ecole_expense_for_agent(event.agent_id, month, year)
            
            # Passer au mois suivant
            if current_date.month == 12:
                current_date = date(current_date.year + 1, 1, 1)
            else:
                current_date = date(current_date.year, current_date.month + 1, 1)
        
        # Supprimer l'événement
        event.delete()
        
        return Response({
            'success': True,
            'assignments_deleted': assignments_deleted,
            'message': f'Événement école supprimé avec {assignments_deleted} assignations'
        })
        
    except Event.DoesNotExist:
        return Response({
            'error': 'Événement école non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
        
    except Exception as e:
        return Response({
            'error': f'Erreur lors de la suppression de l\'événement école: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_ecole_hours(request, agent_id):
    """
    Récupère les heures d'école pour un agent sur une période
    """
    try:
        month = request.GET.get('month')
        year = request.GET.get('year')
        
        if not month or not year:
            return Response({
                'error': 'month et year sont requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        ecole_hours = calculate_ecole_hours_for_agent(agent_id, int(month), int(year))
        
        return Response({
            'agent_id': agent_id,
            'month': int(month),
            'year': int(year),
            'ecole_hours': ecole_hours
        })
        
    except Exception as e:
        return Response({
            'error': f'Erreur lors du calcul des heures d\'école: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def recalculate_ecole_expenses(request):
    """
    Recalcule toutes les dépenses d'école pour un mois donné
    """
    try:
        data = request.data
        month = data.get('month')
        year = data.get('year')
        
        if not month or not year:
            return Response({
                'error': 'month et year sont requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        recalculate_all_ecole_expenses_for_month(int(month), int(year))
        
        return Response({
            'success': True,
            'message': f'Dépenses école recalculées pour {month}/{year}'
        })
        
    except Exception as e:
        return Response({
            'error': f'Erreur lors du recalcul des dépenses école: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def recalculer_couts_devis(request, devis_id):
    """
    Force le recalcul des coûts d'un devis spécifique
    """
    try:
        result = calculer_couts_devis(devis_id)
        if result:
            return Response({
                'success': True,
                'devis_id': devis_id,
                'cout_estime_main_oeuvre': result['cout_estime_main_oeuvre'],
                'cout_estime_materiel': result['cout_estime_materiel']
            })
        else:
            return Response({'error': 'Erreur lors du calcul'}, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

# ===== VIEWSET POUR LES PRIMES AGENTS =====

class AgentPrimeViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les primes des agents
    
    Endpoints disponibles:
    - GET    /api/agent-primes/                    # Liste avec filtres
    - POST   /api/agent-primes/                    # Créer
    - GET    /api/agent-primes/{id}/               # Détail
    - PUT    /api/agent-primes/{id}/               # Modifier
    - PATCH  /api/agent-primes/{id}/               # Modifier partiellement
    - DELETE /api/agent-primes/{id}/               # Supprimer
    """
    queryset = AgentPrime.objects.all()
    serializer_class = AgentPrimeSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Filtrer selon les paramètres de requête"""
        queryset = AgentPrime.objects.select_related('agent', 'chantier', 'created_by')
        
        # Filtre par mois
        mois = self.request.query_params.get('mois')
        if mois:
            queryset = queryset.filter(mois=int(mois))
        
        # Filtre par année
        annee = self.request.query_params.get('annee')
        if annee:
            queryset = queryset.filter(annee=int(annee))
        
        # Filtre par agent
        agent_id = self.request.query_params.get('agent_id')
        if agent_id:
            queryset = queryset.filter(agent_id=int(agent_id))
        
        # Filtre par chantier
        chantier_id = self.request.query_params.get('chantier_id')
        if chantier_id:
            queryset = queryset.filter(chantier_id=int(chantier_id))
        
        # Filtre par type d'affectation
        type_affectation = self.request.query_params.get('type_affectation')
        if type_affectation:
            queryset = queryset.filter(type_affectation=type_affectation)
        
        return queryset.order_by('-annee', '-mois', 'agent__name')
    
    def perform_create(self, serializer):
        """Sauvegarder avec l'utilisateur connecté"""
        serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)
    
    def destroy(self, request, *args, **kwargs):
        """Surcharge pour log la suppression"""
        instance = self.get_object()
        print(f"🗑️  Suppression de la prime: {instance}")
        return super().destroy(request, *args, **kwargs)


# ===== VIEWSET POUR LES COULEURS =====

class ColorViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les couleurs personnalisées des utilisateurs
    
    Endpoints disponibles:
    - GET    /api/colors/                    # Liste des couleurs de l'utilisateur
    - POST   /api/colors/                    # Créer une nouvelle couleur
    - GET    /api/colors/{id}/               # Détail d'une couleur
    - PUT    /api/colors/{id}/               # Modifier une couleur
    - DELETE /api/colors/{id}/               # Supprimer une couleur
    """
    serializer_class = ColorSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Retourner uniquement les couleurs de l'utilisateur connecté"""
        if self.request.user.is_authenticated:
            return Color.objects.filter(user=self.request.user)
        return Color.objects.none()
    
    def perform_create(self, serializer):
        """Assigner automatiquement l'utilisateur lors de la création"""
        serializer.save(user=self.request.user)


@api_view(['GET', 'POST'])
def colors_list(request):
    """
    Endpoint pour lister et créer des couleurs
    GET : Liste toutes les couleurs de l'utilisateur
    POST : Crée une nouvelle couleur
    """
    if request.method == 'GET':
        if not request.user.is_authenticated:
            return Response({'error': 'Non authentifié'}, status=401)
        colors = Color.objects.filter(user=request.user)
        serializer = ColorSerializer(colors, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        if not request.user.is_authenticated:
            return Response({'error': 'Non authentifié'}, status=401)
        serializer = ColorSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['POST'])
def increment_color_usage(request, color_id):
    """
    Endpoint pour incrémenter le compteur d'utilisation d'une couleur
    """
    if not request.user.is_authenticated:
        return Response({'error': 'Non authentifié'}, status=401)
    
    try:
        color = Color.objects.get(id=color_id, user=request.user)
        color.usage_count += 1
        color.save()
        return Response({'status': 'ok', 'usage_count': color.usage_count})
    except Color.DoesNotExist:
        return Response({'error': 'Couleur non trouvée'}, status=404)


# ========================================
# ENDPOINTS SYSTÈME UNIFIÉ
# Index Global et Drag & Drop
# ========================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_devis_order(request, devis_id):
    """
    Met à jour l'ordre (index_global) de tous les éléments d'un devis
    
    POST /api/devis/<devis_id>/update-order/
    Body: {
        "items": [
            {"type": "partie", "id": 1, "index_global": 1},
            {"type": "sous_partie", "id": 10, "index_global": 2},
            ...
        ]
    }
    """
    try:
        devis = Devis.objects.get(id=devis_id)
        items = request.data.get('items', [])
        
        if not items:
            return Response({'error': 'Aucun élément à mettre à jour'}, status=400)
        
        # Mettre à jour index_global pour chaque type
        updated_count = 0
        for item in items:
            item_type = item.get('type')
            item_id = item.get('id')
            index_global = item.get('index_global')
            
            if not all([item_type, item_id is not None, index_global is not None]):
                continue
            
            if item_type == 'partie':
                count = Partie.objects.filter(id=item_id, devis=devis).update(index_global=index_global)
                updated_count += count
            elif item_type == 'sous_partie':
                count = SousPartie.objects.filter(id=item_id, devis=devis).update(index_global=index_global)
                updated_count += count
            elif item_type == 'ligne_detail':
                count = LigneDetail.objects.filter(id=item_id, devis=devis).update(index_global=index_global)
                updated_count += count
            elif item_type == 'ligne_speciale':
                count = LigneSpeciale.objects.filter(id=item_id, devis=devis).update(index_global=index_global)
                updated_count += count
        
        # Recalculer les numéros (optionnel - peut être fait côté client)
        from .utils import recalculate_all_numeros
        
        return Response({
            'status': 'success',
            'updated_count': updated_count,
            'message': f'{updated_count} élément(s) mis à jour'
        }, status=200)
    
    except Devis.DoesNotExist:
        return Response({'error': 'Devis non trouvé'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_ligne_speciale(request, devis_id):
    """
    Créer une nouvelle ligne spéciale
    
    POST /api/devis/<devis_id>/ligne-speciale/create/
    Body: {
        "description": "Remise de 10%",
        "type_speciale": "reduction",
        "value_type": "percentage",
        "value": 10,
        "base_calculation": {"amount": 1000, "scope": "total"},
        "styles": {
            "fontWeight": "bold",
            "color": "#d32f2f",
            "backgroundColor": "#ffebee"
        }
    }
    """
    try:
        devis = Devis.objects.get(id=devis_id)
        
        # Trouver le prochain index_global
        from django.db.models import Max
        max_index = LigneSpeciale.objects.filter(devis=devis).aggregate(
            Max('index_global')
        )['index_global__max'] or 0
        
        # Créer la ligne spéciale
        ligne_speciale = LigneSpeciale.objects.create(
            devis=devis,
            index_global=max_index + 1,
            description=request.data.get('description', ''),
            type_speciale=request.data.get('type_speciale', 'display'),
            value_type=request.data.get('value_type', 'fixed'),
            value=request.data.get('value', 0),
            base_calculation=request.data.get('base_calculation'),
            styles=request.data.get('styles', {})
        )
        
        return Response({
            'id': ligne_speciale.id,
            'index_global': ligne_speciale.index_global,
            'status': 'created',
            'message': 'Ligne spéciale créée avec succès'
        }, status=201)
    
    except Devis.DoesNotExist:
        return Response({'error': 'Devis non trouvé'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_ligne_speciale(request, devis_id, ligne_id):
    """
    Mettre à jour une ligne spéciale existante
    
    PUT /api/devis/<devis_id>/ligne-speciale/<ligne_id>/update/
    """
    try:
        devis = Devis.objects.get(id=devis_id)
        ligne_speciale = LigneSpeciale.objects.get(id=ligne_id, devis=devis)
        
        # Mettre à jour les champs
        if 'description' in request.data:
            ligne_speciale.description = request.data['description']
        if 'type_speciale' in request.data:
            ligne_speciale.type_speciale = request.data['type_speciale']
        if 'value_type' in request.data:
            ligne_speciale.value_type = request.data['value_type']
        if 'value' in request.data:
            ligne_speciale.value = request.data['value']
        if 'base_calculation' in request.data:
            ligne_speciale.base_calculation = request.data['base_calculation']
        if 'styles' in request.data:
            ligne_speciale.styles = request.data['styles']
        if 'index_global' in request.data:
            ligne_speciale.index_global = request.data['index_global']
        
        ligne_speciale.save()
        
        return Response({
            'id': ligne_speciale.id,
            'status': 'updated',
            'message': 'Ligne spéciale mise à jour'
        }, status=200)
    
    except Devis.DoesNotExist:
        return Response({'error': 'Devis non trouvé'}, status=404)
    except LigneSpeciale.DoesNotExist:
        return Response({'error': 'Ligne spéciale non trouvée'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_ligne_speciale(request, devis_id, ligne_id):
    """
    Supprimer une ligne spéciale
    
    DELETE /api/devis/<devis_id>/ligne-speciale/<ligne_id>/delete/
    """
    try:
        devis = Devis.objects.get(id=devis_id)
        ligne_speciale = LigneSpeciale.objects.get(id=ligne_id, devis=devis)
        
        ligne_speciale.delete()
        
        return Response({
            'status': 'deleted',
            'message': 'Ligne spéciale supprimée'
        }, status=200)
    
    except Devis.DoesNotExist:
        return Response({'error': 'Devis non trouvé'}, status=404)
    except LigneSpeciale.DoesNotExist:
        return Response({'error': 'Ligne spéciale non trouvée'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

