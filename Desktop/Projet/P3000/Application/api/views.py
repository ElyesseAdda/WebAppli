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
from .serializers import ChantierSerializer, SocieteSerializer, DevisSerializer, PartieSerializer, SousPartieSerializer, LigneDetailSerializer, ClientSerializer, StockSerializer, AgentSerializer, PresenceSerializer, StockMovementSerializer, StockHistorySerializer, EventSerializer, ScheduleSerializer, LaborCostSerializer
from .models import Chantier, Devis, Facture, Quitus, Societe, Partie, SousPartie, LigneDetail, Client, Stock, Agent, Presence, StockMovement, StockHistory, Event, MonthlyHours, MonthlyPresence, Schedule, LaborCost, DevisLigne
import logging
from django.db import transaction
from rest_framework.permissions import IsAdminUser, AllowAny
from calendar import day_name
import locale
import traceback
from django.views.decorators.csrf import ensure_csrf_cookie

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
    queryset = Devis.objects.all()
    serializer_class = DevisSerializer
    
    def get_queryset(self):
        queryset = Devis.objects.all()
        # Ajout de filtres optionnels
        chantier_id = self.request.query_params.get('chantier', None)
        if chantier_id:
            queryset = queryset.filter(chantier_id=chantier_id)
        return queryset


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

                print("=== Données Temporaires ===")
                print("Client:", client)
                print("Société:", societe)
                print("Chantier:", chantier)
                print("Données complètes:", temp_data)
                print("========================")

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

            parties_data = []
            total_ht = 0

            for partie_id in devis_data['parties']:
                partie = get_object_or_404(Partie, id=partie_id)
                sous_parties_data = []
                sous_parties_ids = devis_data.get('sous_parties', [])
                sous_parties = SousPartie.objects.filter(partie=partie, id__in=sous_parties_ids)

                for sous_partie in sous_parties:
                    lignes_details_data = []
                    
                    # Filtrer les lignes de détail envoyées pour cette sous-partie
                    lignes_from_request = [
                        ligne for ligne in devis_data['lignes_details']
                        if LigneDetail.objects.get(id=ligne['id']).sous_partie_id == sous_partie.id
                        and float(ligne['quantity']) > 0  # Ne garder que les lignes avec quantité > 0
                    ]

                    for ligne_detail in lignes_from_request:
                        ligne_db = get_object_or_404(LigneDetail, id=ligne_detail['id'])
                        quantity = float(ligne_detail['quantity'])
                        custom_price = float(ligne_detail['custom_price'])

                        total_ligne = custom_price * quantity
                        total_ht += total_ligne

                        lignes_details_data.append({
                            'description': ligne_db.description,
                            'unite': ligne_db.unite,
                            'quantity': quantity,
                            'custom_price': custom_price,
                            'total': total_ligne,
                        })

                    if lignes_details_data:  # N'ajouter la sous-partie que si elle a des lignes
                        sous_parties_data.append({
                            'description': sous_partie.description,
                            'lignes_details': lignes_details_data,
                            'total_sous_partie': sum(l['total'] for l in lignes_details_data)
                        })

                if sous_parties_data:
                    partie_total = sum(sp['total_sous_partie'] for sp in sous_parties_data)
                    parties_data.append({
                        'titre': partie.titre,
                        'sous_parties': sous_parties_data,
                        'total_partie': partie_total
                    })

            # Calculer la TVA (20%) et le montant TTC
            tva = total_ht * 0.20
            montant_ttc = total_ht + tva

            context = {
                'chantier': chantier,
                'societe': societe,
                'client': client,
                'parties': parties_data,
                'total_ht': total_ht,
                'tva': tva,
                'montant_ttc': montant_ttc
            }

            return render(request, 'preview_devis.html', context)

        except json.JSONDecodeError as e:
            return JsonResponse({'error': f'Erreur de décodage JSON: {str(e)}'}, status=400)
    else:
        return JsonResponse({'error': 'Aucune donnée de devis trouvée'}, status=400)

def generate_pdf_from_preview(request):
    devis_data_encoded = request.GET.get('devis')
    print("Requête reçue pour générer le PDF")

    if devis_data_encoded:
        try:
            # URL de la page de prévisualisation
            preview_url = request.build_absolute_uri(f"/api/preview-devis/?devis={devis_data_encoded}")
            print("URL de prévisualisation:", preview_url)

            # Chemin vers le script Puppeteer
            node_script_path = r'C:\Users\dell xps 9550\Desktop\Projet\P3000\Application\frontend\src\components\generate_pdf.js'
            print("Chemin du script Node.js:", node_script_path)

            # Commande pour exécuter Puppeteer avec Node.js
            command = ['node', node_script_path, preview_url]
            print("Exécution de Puppeteer:", command)

            # Exécuter Puppeteer
            result = subprocess.run(command, check=True)
            print("Puppeteer exécuté avec succès")

            # Lire le fichier PDF généré
            pdf_path = r'C:\Users\dell xps 9550\Desktop\Projet\P3000\Application\frontend\src\components\devis.pdf'
            print("Chemin du fichier PDF:", pdf_path)

            if os.path.exists(pdf_path):
                print("Le PDF existe, préparation de la réponse HTTP.")
                with open(pdf_path, 'rb') as pdf_file:
                    response = HttpResponse(pdf_file.read(), content_type='application/pdf')
                    response['Content-Disposition'] = 'attachment; filename="devis.pdf"'
                    return response
            else:
                print("Le fichier PDF n'a pas été généré.")
                return JsonResponse({'error': 'Le fichier PDF n\'a pas été généré.'}, status=500)

        except subprocess.CalledProcessError as e:
            print("Erreur lors de l'exécution de Puppeteer:", e)
            return JsonResponse({'error': str(e)}, status=500)

    print("Aucune donnée de devis trouvée.")
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

        print(f"monthly_hours calculées: {monthly_hours}")

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
            print(f"Erreur dans get_days_worked_in_month: {e}")
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

        print(f"Quantité: {quantite}, Chantier ID: {chantier_id}, Agent ID: {agent_id}")  # Log des données reçues

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
        print(f"Produit: {produit}, Quantité: {quantite}, Type Opération: {type_operation}, Chantier: {chantier}, Agent: {agent}")

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
            print("Données reçues complètes:", data)
            print("Type de costs:", type(data.get('costs')))
            print("Contenu de costs:", data.get('costs'))
            
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
                print("Traitement de l'entrée:", cost_entry)  # Debug
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
            print("Erreur:", str(e))  # Debug
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
            montant_ttc=devis.price_ht * 1.2,  # Exemple de calcul TVA
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
            print("Données reçues:", request.data)  # Log des données reçues
            
            devis_data = {
                'numero': request.data['numero'],
                'chantier_id': request.data['chantier'],
                'price_ht': request.data['price_ht'],
                'description': request.data.get('description', ''),
                'status': 'En attente'
            }
            
            print("Données du devis:", devis_data)
            devis = Devis.objects.create(**devis_data)
            
            # Récupérer le client via le chantier
            chantier = Chantier.objects.get(id=request.data['chantier'])
            if chantier.societe and chantier.societe.client_name:
                devis.client.add(chantier.societe.client_name)
            
            # Traitement des lignes de détail
            for partie_data in request.data.get('parties', []):
                for sous_partie in partie_data.get('sous_parties', []):
                    for ligne in sous_partie.get('lignes_details', []):
                        if float(ligne['quantity']) > 0:
                            DevisLigne.objects.create(
                                devis=devis,
                                ligne_detail_id=ligne['id'],
                                quantite=ligne['quantity'],
                                prix_unitaire=ligne['custom_price']
                            )
            
            return Response({
                'id': devis.id,
                'numero': devis.numero,
                'message': 'Devis créé avec succès'
            }, status=201)
            
    except Exception as e:
        print(f"Erreur détaillée: {str(e)}")
        return Response({
            'error': 'Erreur lors de la création du devis',
            'details': str(e)
        }, status=400)

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
                'status': devis.status
            }
            data.append(devis_data)
            
        return Response(data)
    except Exception as e:
        print(f"Erreur détaillée dans list_devis: {str(e)}")
        return Response({'error': str(e)}, status=400)




















