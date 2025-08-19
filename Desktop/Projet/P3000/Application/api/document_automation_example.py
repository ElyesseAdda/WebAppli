"""
Exemple d'utilisation de l'automatisation des documents
Ce fichier montre comment intégrer l'automatisation dans vos vues Django
"""

from .document_automation import document_automation
from .models import Societe, Chantier,Facture,Situation,Devis


def exemple_creation_devis(chantier, devis_data):
    """
    Exemple de création d'un devis avec sauvegarde automatique dans le drive
    """
    # Créer le devis
    devis = Devis.objects.create(
        chantier=chantier,
        numero_devis=devis_data['numero'],
        montant=devis_data['montant'],
        # ... autres champs
    )
    
    # Générer le PDF du devis (votre logique existante)
    pdf_path = generate_devis_pdf(devis)
    
    # Sauvegarder automatiquement dans le drive
    filename = f"Devis_{devis.numero_devis}_{chantier.nom}.pdf"
    success = document_automation.save_devis_to_drive(devis, pdf_path, filename)
    
    if success:
        print(f"Devis sauvegardé dans le drive: {filename}")
    else:
        print("Erreur lors de la sauvegarde du devis")


def exemple_creation_facture(chantier, facture_data):
    """
    Exemple de création d'une facture avec sauvegarde automatique
    """
    # Créer la facture
    facture = Facture.objects.create(
        chantier=chantier,
        numero_facture=facture_data['numero'],
        montant=facture_data['montant'],
        # ... autres champs
    )
    
    # Générer le PDF de la facture
    pdf_path = generate_facture_pdf(facture)
    
    # Sauvegarder automatiquement dans le drive
    filename = f"Facture_{facture.numero_facture}_{chantier.nom}.pdf"
    success = document_automation.save_facture_to_drive(facture, pdf_path, filename)
    
    if success:
        print(f"Facture sauvegardée dans le drive: {filename}")
    else:
        print("Erreur lors de la sauvegarde de la facture")


def exemple_creation_situation(chantier, situation_data):
    """
    Exemple de création d'une situation avec sauvegarde automatique
    """
    # Créer la situation
    situation = Situation.objects.create(
        chantier=chantier,
        numero_situation=situation_data['numero'],
        # ... autres champs
    )
    
    # Générer le PDF de la situation
    pdf_path = generate_situation_pdf(situation)
    
    # Sauvegarder automatiquement dans le drive
    filename = f"Situation_{situation.numero_situation}_{chantier.nom}.pdf"
    success = document_automation.save_situation_to_drive(situation, pdf_path, filename)
    
    if success:
        print(f"Situation sauvegardée dans le drive: {filename}")
    else:
        print("Erreur lors de la sauvegarde de la situation")


def exemple_sauvegarde_automatique(document, pdf_path, filename):
    """
    Exemple de sauvegarde automatique avec détection du type
    """
    # L'automatisation détecte automatiquement le type de document
    success = document_automation.save_document_auto(document, pdf_path, filename)
    
    if success:
        print(f"Document sauvegardé automatiquement: {filename}")
    else:
        print("Erreur lors de la sauvegarde automatique")


# Exemple d'intégration dans une vue Django
def exemple_vue_devis(request, chantier_id):
    """
    Exemple d'intégration dans une vue Django
    """
    from django.http import JsonResponse
    
    try:
        chantier = Chantier.objects.get(id=chantier_id)
        
        # Créer le devis
        devis_data = {
            'numero': request.POST.get('numero'),
            'montant': request.POST.get('montant'),
            # ... autres données
        }
        
        devis = Devis.objects.create(
            chantier=chantier,
            **devis_data
        )
        
        # Générer le PDF
        pdf_path = generate_devis_pdf(devis)
        
        # Sauvegarder dans le drive
        filename = f"Devis_{devis.numero_devis}_{chantier.nom}.pdf"
        success = document_automation.save_devis_to_drive(devis, pdf_path, filename)
        
        if success:
            return JsonResponse({
                'success': True,
                'message': 'Devis créé et sauvegardé dans le drive',
                'devis_id': devis.id
            })
        else:
            return JsonResponse({
                'success': False,
                'message': 'Devis créé mais erreur lors de la sauvegarde dans le drive'
            })
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Erreur: {str(e)}'
        })


# Fonctions utilitaires (à adapter selon votre logique existante)
def generate_devis_pdf(devis):
    """Génère le PDF d'un devis"""
    # Votre logique existante de génération de PDF
    pass

def generate_facture_pdf(facture):
    """Génère le PDF d'une facture"""
    # Votre logique existante de génération de PDF
    pass

def generate_situation_pdf(situation):
    """Génère le PDF d'une situation"""
    # Votre logique existante de génération de PDF
    pass
