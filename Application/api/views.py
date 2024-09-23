from rest_framework import viewsets
from .serializers import ChantierSerializer, SocieteSerializer, DevisSerializer, PartieSerializer, SousPartieSerializer, LigneDetailSerializer, ClientSerializer, StockSerializer, AgentSerializer, PresenceSerializer, StockCreateSerializer
from .models import Chantier, Devis, Facture, Quitus, DevisItem, Societe, Partie, SousPartie, LigneDetail, Client, Stock, Agent, Presence
from django.http import JsonResponse, HttpResponse
from django.db.models import Avg, Count, Min, Sum
from .forms import DevisForm, DevisItemForm
from django.shortcuts import render, redirect, get_object_or_404
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
import subprocess
import os
import json


# Create your views here.
class ChantierViewSet(viewsets.ModelViewSet):
    queryset = Chantier.objects.all()
    serializer_class = ChantierSerializer

class SocieteViewSet(viewsets.ModelViewSet):
    queryset = Societe.objects.all()
    serializer_class = SocieteSerializer

class DevisViewSet(viewsets.ModelViewSet):
    queryset = Devis.objects.all()
    serializer_class = DevisSerializer


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

            # Récupérer le chantier associé
            chantier = get_object_or_404(Chantier, id=devis_data['chantier'])
            societe = chantier.societe
            client = societe.client_name  # Ceci fait maintenant référence à un objet Client

            parties_data = []
            total_ht = 0

            for partie_id in devis_data['parties']:
                partie = get_object_or_404(Partie, id=partie_id)
                sous_parties_data = []
                sous_parties_ids = devis_data.get('sous_parties', [])
                sous_parties = SousPartie.objects.filter(partie=partie, id__in=sous_parties_ids)

                for sous_partie in sous_parties:
                    lignes_details_data = []

                    for ligne in LigneDetail.objects.filter(sous_partie=sous_partie):
                        ligne_detail = next(
                            (ld for ld in devis_data['lignes_details'] if ld['id'] == ligne.id), None
                        )

                        if ligne_detail:
                            quantity = float(ligne_detail.get('quantity', 1))
                            custom_price = float(ligne_detail.get('custom_price', ligne.prix))

                            total_ligne = custom_price * quantity
                            total_ht += total_ligne

                            lignes_details_data.append({
                                'description': ligne.description,
                                'unite': ligne.unite,
                                'quantity': quantity,
                                'custom_price': custom_price,
                                'total': total_ligne,
                            })

                    if lignes_details_data:
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

class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer

class AgentViewSet(viewsets.ModelViewSet):
    queryset = Agent.objects.all()
    serializer_class = AgentSerializer

class PresenceViewSet(viewsets.ModelViewSet):
    queryset = Presence.objects.all()
    serializer_class = PresenceSerializer

from rest_framework import viewsets
from rest_framework.response import Response
from .models import Stock
from .serializers import StockSerializer
from django.utils import timezone

class StockEntryViewSet(viewsets.ViewSet):
    """
    Vue pour gérer les entrées de stock.
    """
    def list(self, request):
        # Filtrer les stocks ayant des entrées
        stock_entries = Stock.objects.filter(quantite_entree__gt=0)
        serializer = StockSerializer(stock_entries, many=True)
        return Response(serializer.data)

class StockOutViewSet(viewsets.ViewSet):
    """
    Vue pour gérer les sorties de stock.
    """
    def list(self, request):
        # Filtrer les stocks ayant des sorties
        stock_out = Stock.objects.filter(quantite_sortie__gt=0)
        serializer = StockSerializer(stock_out, many=True)
        return Response(serializer.data)
