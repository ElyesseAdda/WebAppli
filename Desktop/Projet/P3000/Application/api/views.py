from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action, api_view, permission_classes
from django.http import JsonResponse, HttpResponse
from django.db.models import Avg, Count, Min, Sum
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
from .serializers import ChantierSerializer, SocieteSerializer, DevisSerializer, PartieSerializer, SousPartieSerializer, LigneDetailSerializer, ClientSerializer, StockSerializer, AgentSerializer, PresenceSerializer, StockMovementSerializer, StockHistorySerializer, EventSerializer, ScheduleSerializer, LaborCostSerializer, FactureSerializer, ChantierDetailSerializer
from .models import Chantier, Devis, Facture, Quitus, Societe, Partie, SousPartie, LigneDetail, Client, Stock, Agent, Presence, StockMovement, StockHistory, Event, MonthlyHours, MonthlyPresence, Schedule, LaborCost, DevisLigne,  FactureLigne, FacturePartie, FactureSousPartie, FactureLigneDetail
import logging
from django.db import transaction
from rest_framework.permissions import IsAdminUser, AllowAny
from calendar import day_name
import locale
import traceback
from django.views.decorators.csrf import ensure_csrf_cookie
from decimal import Decimal
from django.db.models import Q

logger = logging.getLogger(__name__)


# Create your views here.
class ChantierViewSet(viewsets.ModelViewSet):
    queryset = Chantier.objects.all()
    serializer_class = ChantierSerializer



class SocieteViewSet(viewsets.ModelViewSet):
    queryset = Societe.objects.all()
    serializer_class = SocieteSerializer
    permission_classes = [AllowAny]

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
    
class FactureViewSet(viewsets.ModelViewSet):
    queryset = Facture.objects.all()
    serializer_class = FactureSerializer


def dashboard_data(request):
    state_chantier = Chantier.objects.filter(state_chantier='En Cours').count()
    cout_materiel = Chantier.objects.aggregate(Sum('cout_materiel'))['cout_materiel__sum']
    cout_main_oeuvre = Chantier.objects.aggregate(Sum('cout_main_oeuvre'))['cout_main_oeuvre__sum']
    cout_sous_traitance = Chantier.objects.aggregate(Sum('cout_sous_traitance'))['cout_sous_traitance__sum']
    chiffre_affaire = Chantier.objects.aggregate(Sum('chiffre_affaire'))['chiffre_affaire__sum']
   
    devis_terminer = Devis.objects.filter(state='Terminé').count()
    facture_terminer = Facture.objects.filter(state_facture='Terminé').count()
    
    devis_en_cour = Devis.objects.filter(state='En Cours').count()
    facture_en_cour = Facture.objects.filter(state_facture='En Cours').count()
    
    devis_facturé = Devis.objects.filter(state='Facturé').count()
    facture_facturé = Facture.objects.filter(state_facture='Facturé').count()
   
    total_devis_terminer = Devis.objects.filter(state='Terminé').aggregate(total=Sum('amount_facturé'))['total'] or 0
    total_devis_facturé = Devis.objects.filter(state='Facturé').aggregate(total=Sum('amount_facturé'))['total'] or 0
    
    total_facture_terminer = Facture.objects.filter(state_facture='Terminé').aggregate(total=Sum('amount_facturé'))['total'] or 0
    total_facture_facturé = Facture.objects.filter(state_facture='Facturé').aggregate(total=Sum('amount_facturé'))['total'] or 0
    
    total_devis_combined = total_devis_facturé + total_devis_terminer

    total_facture_combined = total_facture_facturé + total_facture_terminer

    data = {
        'chantier_en_cours': state_chantier,
        'cout_materiel': cout_materiel,
        'cout_main_oeuvre': cout_main_oeuvre,
        'cout_sous_traitance': cout_sous_traitance,
        'chiffre_affaire': chiffre_affaire,
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
            
            for partie_id in devis_data['parties']:
                partie = get_object_or_404(Partie, id=partie_id)
                sous_parties_data = []
                total_partie = 0
                
                # Récupérer les lignes spéciales pour cette partie
                special_lines_partie = devis_data.get('specialLines', {}).get('parties', {}).get(str(partie_id), [])
                
                for sous_partie in SousPartie.objects.filter(partie=partie, id__in=devis_data.get('sous_parties', [])):
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
    devis_data_encoded = request.GET.get('devis')

    if devis_data_encoded:
        try:
            # URL de la page de prévisualisation
            preview_url = request.build_absolute_uri(f"/api/preview-devis/?devis={devis_data_encoded}")

            # Chemin vers le script Puppeteer
            node_script_path = r'C:\Users\dell xps 9550\Desktop\Projet\P3000\Application\frontend\src\components\generate_pdf.js'

            # Commande pour exécuter Puppeteer avec Node.js
            command = ['node', node_script_path, preview_url]

            # Exécuter Puppeteer
            result = subprocess.run(command, check=True)

            # Lire le fichier PDF généré
            pdf_path = r'C:\Users\dell xps 9550\Desktop\Projet\P3000\Application\frontend\src\components\devis.pdf'

            if os.path.exists(pdf_path):
                with open(pdf_path, 'rb') as pdf_file:
                    response = HttpResponse(pdf_file.read(), content_type='application/pdf')
                    response['Content-Disposition'] = 'attachment; filename="devis.pdf"'
                    return response
            else:
                return JsonResponse({'error': 'Le fichier PDF n\'a pas été généré.'}, status=500)

        except subprocess.CalledProcessError as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Aucune donnée de devis trouvée'}, status=400)


def check_nom_devis_existe(request):
    nom_devis = request.GET.get('nom_devis', None)
    
    if nom_devis:
        exists = Devis.objects.filter(nom_devis=nom_devis).exists()
        return JsonResponse({'exists': exists})
    return JsonResponse({'error': 'Nom de devis non fourni'}, status=400)


class PartieViewSet(viewsets.ModelViewSet):
    queryset = Partie.objects.all()
    serializer_class = PartieSerializer

class SousPartieViewSet(viewsets.ModelViewSet):
    queryset = SousPartie.objects.all()
    serializer_class = SousPartieSerializer

class LigneDetailViewSet(viewsets.ModelViewSet):
    queryset = LigneDetail.objects.all()
    serializer_class = LigneDetailSerializer

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [AllowAny]

class AgentViewSet(viewsets.ModelViewSet):
    queryset = Agent.objects.all()
    serializer_class = AgentSerializer

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
        
        jours_travail = agent.jours_travail.split(', ')
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
            
            jours_travail = agent.jours_travail.split(',') if agent.jours_travail else []
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
        current_date = start_date
        while current_date <= end_date:
            events = Event.objects.filter(
                agent_id=agent_id,
                start_date=current_date
            )
            if events.exists():
                logger.info(f'Found events for agent {agent_id} on {current_date}. Deleting...')
                events.delete()
            current_date += timedelta(days=1)

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
            queryset = queryset.filter(agent_id=agent_id)  # Filtrer par agent_id
        return queryset

class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer

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
    last_stock = Stock.objects.order_by('-code_produit').first()  # Récupérer le dernier code produit
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

                # Validation des données
                if not all([agent_id, week, year, day, hour_str, chantier_id]):
                    logger.error(f"Champ manquant dans la mise à jour à l'index {index}.")
                    return Response({'error': 'Tous les champs sont requis pour chaque mise à jour.'}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    # Convertir l'heure au format TimeField
                    hour = datetime.strptime(hour_str, '%H:%M').time()
                except ValueError:
                    logger.error(f"Format d'heure invalide pour '{hour_str}' à l'index {index}.")
                    return Response({'error': f'Format d\'heure invalide pour {hour_str}.'}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    agent = Agent.objects.get(id=agent_id)
                except Agent.DoesNotExist:
                    logger.error(f"Agent avec id {agent_id} n'existe pas à l'index {index}.")
                    return Response({'error': f'Agent avec id {agent_id} n\'existe pas.'}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    chantier = Chantier.objects.get(id=chantier_id)
                except Chantier.DoesNotExist:
                    logger.error(f"Chantier avec id {chantier_id} n'existe pas à l'index {index}.")
                    return Response({'error': f'Chantier avec id {chantier_id} n\'existe pas.'}, status=status.HTTP_400_BAD_REQUEST)

                # Récupérer ou créer l'objet Schedule
                schedule, created = Schedule.objects.get_or_create(
                    agent=agent,
                    week=week,
                    year=year,
                    day=day,
                    hour=hour,
                    defaults={'chantier': chantier}
                )

                if not created:
                    # Mettre à jour le chantier si le Schedule existe déjà
                    schedule.chantier = chantier
                    schedule.save()
                    logger.debug(f"Chantier mis à jour pour Schedule id {schedule.id}.")

        logger.info("Chantiers assignés avec succès.")
        return Response({'message': 'Chantiers assignés avec succès.'}, status=status.HTTP_200_OK)

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
        # Vérifier l'existence des agents
        if not Agent.objects.filter(id=source_agent_id).exists():
            return Response({'error': 'Agent source invalide.'}, status=400)
        if not Agent.objects.filter(id=target_agent_id).exists():
            return Response({'error': 'Agent cible invalide.'}, status=400)

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

                # Convertir l'heure en format approprié en utilisant datetime.strptime
                try:
                    # Supposons que le format attendu est 'H:M' ou 'HH:MM'
                    hour = datetime.strptime(hour_str, '%H:%M').time()
                except ValueError:
                    logger.error(f"Format d'heure invalide à l'index {index}: {hour_str}")
                    return Response({'error': f'Format d\'heure invalide à l\'index {index}.'}, status=status.HTTP_400_BAD_REQUEST)

                # Récupérer l'objet Schedule correspondant
                try:
                    schedule = Schedule.objects.get(
                        agent=agent,
                        week=week,
                        year=year,
                        day=day,
                        hour=hour
                    )
                    schedule.delete()
                    logger.debug(f"Schedule supprimé: {schedule}")
                except Schedule.DoesNotExist:
                    logger.warning(f"Schedule inexistant à l'index {index}: {deletion}")
                    # Vous pouvez choisir de continuer ou de retourner une erreur
                    continue

        logger.info("Horaires supprimés avec succès.")
        return Response({'message': 'Horaires supprimés avec succès.'}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception("Erreur imprévue lors de la suppression des horaires.")
        return Response({'error': 'Une erreur imprévue est survenue.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def save_labor_costs(request):
    with transaction.atomic():
        try:
            data = request.data
           
            agent_id = data.get('agent_id')
            week = data.get('week')
            year = data.get('year')
            costs = data.get('costs', [])

            if not costs or not isinstance(costs, list) or len(costs) == 0:
                return Response({
                    'error': 'costs manquant ou vide',
                    'received_costs': costs,
                    'received_data': data
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                agent = Agent.objects.get(id=agent_id)
            except Agent.DoesNotExist:
                return Response({'error': f'Agent {agent_id} non trouvé'}, status=status.HTTP_404_NOT_FOUND)

            labor_costs = []
            for cost_entry in costs:
                try:
                    chantier = Chantier.objects.get(chantier_name=cost_entry['chantier_name'])
                except Chantier.DoesNotExist:
                    return Response(
                        {'error': f'Chantier {cost_entry["chantier_name"]} non trouvé'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                except KeyError:
                    return Response(
                        {'error': 'Format de coût invalide, chantier_name manquant'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

                try:
                    labor_costs.append(LaborCost(
                        agent=agent,
                        chantier=chantier,
                        week=week,
                        year=year,
                        hours=cost_entry['hours'],
                        cost=cost_entry['hours'] * agent.taux_Horaire
                    ))
                except KeyError:
                    return Response(
                        {'error': 'Format de coût invalide, hours manquant'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Suppression des anciennes entrées
            LaborCost.objects.filter(
                agent=agent,
                week=week,
                year=year
            ).delete()

            # Création des nouvelles entrées
            created_costs = LaborCost.objects.bulk_create(labor_costs)

            return Response({
                'message': 'Coûts sauvegardés avec succès',
                'count': len(created_costs)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
            
            results[chantier_name]['total_hours'] += float(cost.hours)
            results[chantier_name]['total_cost'] += float(cost.cost)
            results[chantier_name]['details'].append({
                'agent_name': cost.agent.name,
                'hours': float(cost.hours),
                'cost': float(cost.cost)
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
            total_hours=Sum('hours'),
            total_cost=Sum('cost')
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
            code_postal=devis.client.first().societe.codepostal_societe
        )
        
        return Response({'message': 'Chantier créé avec succès', 'id': chantier.id})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@api_view(['POST'])
def create_devis(request):
    try:
        with transaction.atomic():
            # Création du devis de base
            devis_data = {
                'numero': request.data['numero'],
                'chantier_id': request.data['chantier'],
                'price_ht': Decimal(str(request.data['price_ht'])),
                'price_ttc': Decimal(str(request.data['price_ttc'])),
                'tva_rate': Decimal(str(request.data.get('tva_rate', '20.00'))),
                'nature_travaux': request.data.get('nature_travaux', ''),
                'description': request.data.get('description', ''),
                'status': 'En attente',
                'lignes_speciales': request.data.get('lignes_speciales', {})
            }
            
            devis = Devis.objects.create(**devis_data)
            
            # Associer le client
            if request.data.get('client'):
                devis.client.set(request.data['client'])
            
            # Création des lignes de devis
            for ligne in request.data.get('lignes', []):
                DevisLigne.objects.create(
                    devis=devis,
                    ligne_detail_id=ligne['ligne'],
                    quantite=Decimal(str(ligne['quantity'])),
                    prix_unitaire=Decimal(str(ligne['custom_price']))
                )
            
            return Response({'id': devis.id}, status=201)
            
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
        current_year = datetime.now().year % 100  # Obtenir les 2 derniers chiffres
        last_devis = Devis.objects.filter(
            numero__regex=f'^DEV-\\d{{3}}-{current_year}$'
        ).order_by('-numero').first()
        
        if last_devis:
            last_number = int(last_devis.numero.split('-')[1])
            next_number = f"{(last_number + 1):03d}"
        else:
            next_number = "001"
            
        return Response({'next_number': next_number})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

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

@api_view(['GET'])
def preview_saved_devis(request, devis_id):
    try:
        devis = get_object_or_404(Devis, id=devis_id)
        chantier = devis.chantier
        societe = chantier.societe
        client = societe.client_name

        total_ht = 0
        parties_data = []

        # Récupérer les lignes spéciales du devis
        lignes_speciales = devis.lignes_speciales or {}

        for partie in Partie.objects.filter(id__in=[ligne.ligne_detail.sous_partie.partie.id for ligne in devis.lignes.all()]).distinct():
            sous_parties_data = []
            total_partie = 0

            # Récupérer les lignes spéciales pour cette partie
            special_lines_partie = lignes_speciales.get('parties', {}).get(str(partie.id), [])

            for sous_partie in SousPartie.objects.filter(partie=partie, id__in=[ligne.ligne_detail.sous_partie.id for ligne in devis.lignes.all()]).distinct():
                lignes_details_data = []
                total_sous_partie = 0

                # Calculer le total des lignes de détail
                for ligne in devis.lignes.filter(ligne_detail__sous_partie=sous_partie):
                    total_ligne = ligne.quantite * ligne.prix_unitaire
                    lignes_details_data.append({
                        'description': ligne.ligne_detail.description,
                        'unite': ligne.ligne_detail.unite,
                        'quantity': ligne.quantite,
                        'custom_price': ligne.prix_unitaire,
                        'total': total_ligne
                    })
                    total_sous_partie += total_ligne

                if lignes_details_data:
                    # Récupérer les lignes spéciales pour cette sous-partie
                    special_lines_sous_partie = lignes_speciales.get('sousParties', {}).get(str(sous_partie.id), [])
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

        # Calculer TVA et TTC
        tva = total_ht * (devis.tva_rate / Decimal('100'))
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
        
        if new_status not in ["En attente", "Validé", "Refusé"]:
            return Response(
                {"error": "Statut invalide"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        devis.status = new_status
        devis.save()
        
        return Response({
            "id": devis.id,
            "status": devis.status,
            "message": "Statut mis à jour avec succès"
        })
        
    except Devis.DoesNotExist:
        return Response(
            {"error": "Devis non trouvé"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def create_facture(request):
    try:
        devis_id = request.data.get('devis_id')
       
        
        devis = Devis.objects.get(id=devis_id)
        
        
        # Calculer le price_ttc
        price_ht = devis.price_ht
        tva_rate = devis.tva_rate
        price_ttc = price_ht * (1 + tva_rate / 100)
       
        
        # Vérifier les données reçues
        
        # Créer la facture
        facture = Facture.objects.create(
            numero_facture=request.data.get('numero_facture'),
            date_echeance=request.data.get('date_echeance'),
            mode_paiement=request.data.get('mode_paiement'),
            adresse_facturation=request.data.get('adresse_facturation'),
            price_ht=devis.price_ht,
            price_ttc=devis.price_ttc,
            tva_rate=devis.tva_rate,
            chantier=devis.chantier,
            devis_origine=devis
        )
        

        # Copier les lignes du devis
        devis_lignes = DevisLigne.objects.filter(devis=devis)
        for devis_ligne in devis_lignes:
            FactureLigne.objects.create(
                facture=facture,
                ligne_detail=devis_ligne.ligne_detail,
                quantite=devis_ligne.quantite,
                prix_unitaire=devis_ligne.prix_unitaire,
                total_ht=devis_ligne.total_ht
            )

        return Response({
            'id': facture.id,
            'lignes': [
                {
                    'ligne_detail': ligne.ligne_detail_id,
                    'quantite': str(ligne.quantite),
                    'prix_unitaire': str(ligne.prix_unitaire),
                    'total_ht': float(ligne.total_ht)
                }
                for ligne in facture.lignes_details.all()
            ]
        })

    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def preview_facture(request, facture_id):
    try:
        facture = Facture.objects.select_related(
            'chantier',
            'chantier__societe',
            'chantier__societe__client_name'
        ).get(id=facture_id)
        
        # Récupérer les lignes de détail de la facture
        lignes_details = FactureLigne.objects.filter(facture=facture).select_related(
            'ligne_detail', 
            'ligne_detail__sous_partie', 
            'ligne_detail__sous_partie__partie'
        )
        
        # Organiser les données par partie et sous-partie
        parties_data = []
        total_ht = Decimal('0')
        
        # Regrouper les lignes par partie et sous-partie
        parties_dict = {}
        for ligne in lignes_details:
            partie = ligne.ligne_detail.sous_partie.partie
            sous_partie = ligne.ligne_detail.sous_partie
            
            if partie.id not in parties_dict:
                parties_dict[partie.id] = {
                    'titre': partie.titre,
                    'sous_parties': {},
                    'total_partie': Decimal('0')
                }
            
            if sous_partie.id not in parties_dict[partie.id]['sous_parties']:
                parties_dict[partie.id]['sous_parties'][sous_partie.id] = {
                    'description': sous_partie.description,
                    'lignes_details': [],
                    'total_sous_partie': Decimal('0')
                }
            
            total_ligne = ligne.quantite * ligne.prix_unitaire
            parties_dict[partie.id]['sous_parties'][sous_partie.id]['lignes_details'].append({
                'id': ligne.ligne_detail.id,
                'description': ligne.ligne_detail.description,
                'unite': ligne.ligne_detail.unite,
                'quantity': float(ligne.quantite),
                'custom_price': float(ligne.prix_unitaire),
                'total': float(total_ligne)
            })
            parties_dict[partie.id]['sous_parties'][sous_partie.id]['total_sous_partie'] += total_ligne
            parties_dict[partie.id]['total_partie'] += total_ligne

        # Récupérer les lignes spéciales
        lignes_speciales = facture.lignes_speciales or {}

        # Traiter les lignes spéciales et construire la structure finale
        for partie_id, partie_data in parties_dict.items():
            sous_parties_data = []
            
            for sous_partie_id, sous_partie_data in partie_data['sous_parties'].items():
                # Traiter les lignes spéciales de la sous-partie
                special_lines = lignes_speciales.get('sousParties', {}).get(str(sous_partie_id), [])
                for special_line in special_lines:
                    montant = special_line['value']
                    if special_line['valueType'] == 'percentage':
                        montant = (sous_partie_data['total_sous_partie'] * Decimal(str(special_line['value']))) / Decimal('100')
                    else:
                        montant = Decimal(str(special_line['value']))
                    
                    if special_line['type'] == 'reduction':
                        sous_partie_data['total_sous_partie'] -= montant
                    else:
                        sous_partie_data['total_sous_partie'] += montant
                    
                    special_line['montant'] = float(montant)
                
                sous_partie_data['special_lines'] = special_lines
                sous_parties_data.append(sous_partie_data)
            
            # Traiter les lignes spéciales de la partie
            special_lines_partie = lignes_speciales.get('parties', {}).get(str(partie_id), [])
            for special_line in special_lines_partie:
                montant = special_line['value']
                if special_line['valueType'] == 'percentage':
                    montant = (partie_data['total_partie'] * Decimal(str(special_line['value']))) / Decimal('100')
                else:
                    montant = Decimal(str(special_line['value']))
                
                if special_line['type'] == 'reduction':
                    partie_data['total_partie'] -= montant
                else:
                    partie_data['total_partie'] += montant
                
                special_line['montant'] = float(montant)
            
            parties_data.append({
                'titre': partie_data['titre'],
                'sous_parties': sous_parties_data,
                'total_partie': float(partie_data['total_partie']),
                'special_lines': special_lines_partie
            })
            total_ht += partie_data['total_partie']

        # Traiter les lignes spéciales globales
        special_lines_global = lignes_speciales.get('global', [])
        for special_line in special_lines_global:
            montant = special_line['value']
            if special_line['valueType'] == 'percentage':
                montant = (total_ht * Decimal(str(special_line['value']))) / Decimal('100')
            else:
                montant = Decimal(str(special_line['value']))
            
            if special_line['type'] == 'reduction':
                total_ht -= montant
            else:
                total_ht += montant
            
            special_line['montant'] = float(montant)

        # Calculer TVA et TTC
        tva = total_ht * (facture.tva_rate / Decimal('100'))
        total_ttc = total_ht + tva

        context = {
            'facture': facture,
            'parties': parties_data,
            'total_ht': float(total_ht),
            'tva': float(tva),
            'total_ttc': float(total_ttc),
            'special_lines_global': special_lines_global
        }

        return render(request, 'preview_facture.html', context)

    except Exception as e:
        print(f"Erreur lors de la prévisualisation de la facture: {str(e)}")
        return JsonResponse({'error': str(e)}, status=400)

@api_view(['POST'])
def create_facture_from_devis(request):
    serializer = FactureSerializer(data=request.data)
    if serializer.is_valid():
        devis_id = serializer.validated_data.get('devis_origine').id
        devis = get_object_or_404(Devis, id=devis_id)

        facture = serializer.save()
        return Response(FactureSerializer(facture).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        
        # Calculer les statistiques
        # stats = {
        #     'nombre_devis': chantier.nombre_devis,
        #     'nombre_factures': chantier.nombre_facture,
        #     'cout_main_oeuvre_total': chantier.cout_main_oeuvre_total,
        #     'montant_total_ttc': chantier.montant_ttc or 0,
        #     'montant_total_ht': chantier.montant_ht or 0,
        #     'marge_brute': (chantier.montant_ht or 0) - (
        #         (chantier.cout_materiel or 0) + 
        #         (chantier.cout_main_oeuvre or 0) + 
        #         (chantier.cout_sous_traitance or 0)
        #     )
        # }
        
        # Récupérer les informations détaillées
        details = {
            'id': chantier.id,
            'nom': chantier.chantier_name,
            'statut': chantier.state_chantier,
            'dates': {
                'debut': chantier.date_debut,
                'fin': chantier.date_fin
            },
            'adresse': {
                'rue': chantier.rue,
                'ville': chantier.ville,
                'code_postal': chantier.code_postal
            },
            'couts': {
                'materiel': chantier.cout_materiel,
                'main_oeuvre': chantier.cout_main_oeuvre,
                'sous_traitance': chantier.cout_sous_traitance
            },
            'societe': {
                'id': chantier.societe.id if chantier.societe else None,
                'nom': chantier.societe.nom_societe if chantier.societe else None,
                'client': {
                    'nom': f"{chantier.societe.client_name.name} {chantier.societe.client_name.surname}" if chantier.societe and chantier.societe.client_name else None,
                    'email': chantier.societe.client_name.client_mail if chantier.societe and chantier.societe.client_name else None
                } if chantier.societe else None
            },
            # 'statistiques': stats
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
















