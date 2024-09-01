from rest_framework import viewsets
from .serializers import ChantierSerializer, SocieteSerializer, DevisSerializer, PartieSerializer, SousPartieSerializer, LigneDetailSerializer
from .models import Chantier, Devis, Facture, Quitus, DevisItem, Societe, Partie, SousPartie, LigneDetail
from .forms import DevisForm
from django.http import JsonResponse, HttpResponse
from django.db.models import Avg, Count, Min, Sum
from .forms import DevisForm, DevisItemForm
from django.shortcuts import render, redirect, get_object_or_404
from django.template.loader import render_to_string
import subprocess


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

def create_devis(request):
    if request.method == 'POST':
        devis_form = DevisForm(request.POST)
        if devis_form.is_valid():
            devis = devis_form.save()
            for sous_partie_id in request.POST.getlist('sous_partie'):
                quantite = request.POST.get(f'quantite_{sous_partie_id}')
                DevisItem.objects.create(
                    devis=devis,
                    sous_partie_id=sous_partie_id,
                    quantite=quantite
                )
            return redirect('devis_detail', devis_id=devis.id)
    else:
        devis_form = DevisForm()
        devis_item_form = DevisItemForm()
    
    return render(request, 'create_devis.html', {
        'devis_form': devis_form,
        'devis_item_form': devis_item_form,
    })

def download_devis_pdf(request, chantier_id):
    # Récupérer les données du chantier
    chantier = Chantier.objects.get(id=chantier_id)
    
    # Générer l'HTML pour le devis
    html_string = render_to_string('devis.html', {'chantier': chantier})
    with open('devis_temp.html', 'w') as f:
        f.write(html_string)
    
    # Exécuter le script Puppeteer pour générer le PDF
    subprocess.run(['node', 'generate_pdf.js'])

    # Lire le PDF généré
    with open('devis.pdf', 'rb') as pdf_file:
        response = HttpResponse(pdf_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="devis_{chantier.nom}.pdf"'
        return response

class PartieViewSet(viewsets.ModelViewSet):
    queryset = Partie.objects.all()
    serializer_class = PartieSerializer

class SousPartieViewSet(viewsets.ModelViewSet):
    queryset = SousPartie.objects.all()
    serializer_class = SousPartieSerializer

class LigneDetailViewSet(viewsets.ModelViewSet):
    queryset = LigneDetail.objects.all()
    serializer_class = LigneDetailSerializer