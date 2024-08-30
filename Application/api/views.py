from rest_framework import viewsets
from .serializers import ChantierSerializer, SocieteSerializer, DevisSerializer
from .models import Chantier, Devis, Facture, Quitus, DevisItem, Societe
from .forms import DevisForm
from django.http import JsonResponse, HttpResponse
from django.db.models import Avg, Count, Min, Sum
from .forms import DevisForm, DevisItemForm
from django.shortcuts import render, redirect, get_object_or_404
from django.template.loader import render_to_string
import pdfkit


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
    nombre_devis = Chantier.objects.filter(nombre_devis__isnull=False).count()
    nombre_facture = Chantier.objects.filter(nombre_facture__isnull=False).count()
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
        'nombre_devis': nombre_devis,
        'nombre_facture': nombre_facture,
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

# Contexte des données à inclure dans le PDF
def render_pdf_view(request, devis_id):
    devis = get_object_or_404(Devis, id=devis_id)
    items = devis.items.all()
    montant_global_ht = devis.items.aggregate(total_ht=Sum('total_ht'))['total_ht'] or 0 
    context = {
        'devis': devis,
        'items': items,
        'montant_global_ht': montant_global_ht,
    }
    html = render_to_string('devis_pdf_template.html', context)

    path_wkhtmltopdf = r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe'
    config = pdfkit.configuration(wkhtmltopdf=path_wkhtmltopdf)

    options = {
        'enable-local-file-access': '',  # Pour permettre l'accès aux fichiers locaux
    }

    pdf = pdfkit.from_string(html, False, configuration=config, options=options)
    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = 'inline; filename="output.pdf"'

    return response