from rest_framework import viewsets
from .serializers import ChantierSerializer, SocieteSerializer, DevisSerializer, PartieSerializer, SousPartieSerializer, LigneDetailSerializer, ClientSerializer
from .models import Chantier, Devis, Facture, Quitus, DevisItem, Societe, Partie, SousPartie, LigneDetail, Client
from django.http import JsonResponse, HttpResponse
from django.db.models import Avg, Count, Min, Sum
from .forms import DevisForm, DevisItemForm
from django.shortcuts import render, redirect, get_object_or_404
from django.template.loader import render_to_string
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

def generate_pdf_view(request):
    try:
        # Chemin vers le fichier generate_pdf.js
        script_path = os.path.join('C:/Users/Boume/Desktop/Projet-React/P3000/WebAppli/Application/frontend/src/components/generate_pdf.js')
        
        # Exécuter le script Node.js qui lance Puppeteer
        subprocess.run(['node', script_path], check=True)
        
        return JsonResponse({'status': 'PDF généré avec succès'})
    except subprocess.CalledProcessError as e:
        return JsonResponse({'error': 'Erreur lors de la génération du PDF'}, status=500)
    
    

def preview_devis(request):
    devis_data_encoded = request.GET.get('devis')

    if devis_data_encoded:
        try:
            devis_data = json.loads(devis_data_encoded)

            # Récupérer le chantier associé
            chantier = get_object_or_404(Chantier, id=devis_data['chantier'])

            # Récupérer la société associée au chantier
            societe = chantier.societe

            # Récupérer le client associé à la société
            client = societe.client_name  # Ceci fait maintenant référence à un objet Client

            # Récupérer les parties, sous-parties et lignes de détail
            parties_data = []
            total_ht = 0

            for partie_id in devis_data['parties']:
                partie = get_object_or_404(Partie, id=partie_id)
                sous_parties_data = []

                # Obtenir seulement les sous-parties sélectionnées
                sous_parties_ids = devis_data.get('sous_parties', [])
                sous_parties = SousPartie.objects.filter(partie=partie, id__in=sous_parties_ids)

                for sous_partie in sous_parties:
                    lignes_details_data = []

                    # Pour chaque sous-partie, récupérer les lignes de détail associées
                    for ligne in LigneDetail.objects.filter(sous_partie=sous_partie):
                        # Chercher la ligne de détail correspondante dans les données reçues
                        ligne_detail = next(
                            (ld for ld in devis_data['lignes_details'] if ld['id'] == ligne.id), None
                        )

                        if ligne_detail:
                            quantity = float(ligne_detail.get('quantity', 1))  # Par défaut à 1
                            custom_price = float(ligne_detail.get('custom_price', ligne.prix))

                            # Calcul du total pour la ligne
                            total_ligne = custom_price * quantity
                            total_ht += total_ligne

                            lignes_details_data.append({
                                'description': ligne.description,
                                'unite': ligne.unite,
                                'quantity': quantity,
                                'custom_price': custom_price,
                                'total': total_ligne,
                            })

                    if lignes_details_data:  # Ne pas ajouter de sous-partie sans lignes
                        sous_parties_data.append({
                            'description': sous_partie.description,
                            'lignes_details': lignes_details_data,
                        })

                if sous_parties_data:  # Ne pas ajouter de partie sans sous-parties
                    parties_data.append({
                        'titre': partie.titre,
                        'sous_parties': sous_parties_data,
                    })

            # Passer les données au template
            context = {
                'chantier': chantier,
                'societe': societe,
                'client': client,
                'parties': parties_data,
                'total_ht': total_ht,
            }

            return render(request, 'preview_devis.html', context)

        except json.JSONDecodeError as e:
            return JsonResponse({'error': f'Erreur de décodage JSON: {str(e)}'}, status=400)
    else:
        return JsonResponse({'error': 'Aucune donnée de devis trouvée'}, status=400)


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