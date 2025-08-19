"""
Exemple de détection des types de devis
Montre comment l'automatisation détecte les devis chantier vs devis TS
"""

from .document_automation import document_automation
from .models import Devis, Chantier, Societe


def exemple_detection_devis():
    """
    Exemple de détection des types de devis
    """
    
    # Créer une société et un chantier pour l'exemple
    societe = Societe.objects.create(nom="Société Test")
    chantier = Chantier.objects.create(
        nom="Chantier Test",
        societe=societe
    )
    
    # Exemple 1: Devis chantier (devis_chantier = True)
    devis_chantier = Devis.objects.create(
        chantier=chantier,
        numero_devis="DEV-001",
        devis_chantier=True,  # ← C'est un devis de chantier
        montant=50000
    )
    
    # Exemple 2: Devis TS (devis_chantier = False)
    devis_ts = Devis.objects.create(
        chantier=chantier,
        numero_devis="DEV-002",
        devis_chantier=False,  # ← C'est un devis TS
        montant=15000
    )
    
    # Simuler la sauvegarde dans le drive
    print("=== Exemple de détection des devis ===")
    
    # Devis chantier → Dossier "Devis"
    if devis_chantier.devis_chantier:
        print(f"✅ Devis {devis_chantier.numero_devis}: devis_chantier=True")
        print("   → Sera sauvegardé dans: Chantiers/Societe-Test/Chantier-Test/Devis/")
    else:
        print(f"❌ Devis {devis_chantier.numero_devis}: devis_chantier=False")
        print("   → Sera sauvegardé dans: Chantiers/Societe-Test/Chantier-Test/Devis TS/")
    
    # Devis TS → Dossier "Devis TS"
    if devis_ts.devis_chantier:
        print(f"❌ Devis {devis_ts.numero_devis}: devis_chantier=True")
        print("   → Sera sauvegardé dans: Chantiers/Societe-Test/Chantier-Test/Devis/")
    else:
        print(f"✅ Devis {devis_ts.numero_devis}: devis_chantier=False")
        print("   → Sera sauvegardé dans: Chantiers/Societe-Test/Chantier-Test/Devis TS/")
    
    print("\n=== Logique de détection ===")
    print("if devis.devis_chantier == True:")
    print("    → Dossier: Chantiers/[Société]/[Chantier]/Devis/")
    print("else:")
    print("    → Dossier: Chantiers/[Société]/[Chantier]/Devis TS/")
    
    # Nettoyer les objets de test
    devis_chantier.delete()
    devis_ts.delete()
    chantier.delete()
    societe.delete()


def exemple_utilisation_reelle():
    """
    Exemple d'utilisation réelle dans une vue Django
    """
    
    def creer_et_sauvegarder_devis(chantier, numero_devis, montant, est_devis_chantier=True):
        """
        Crée un devis et le sauvegarde automatiquement dans le bon dossier
        """
        # Créer le devis
        devis = Devis.objects.create(
            chantier=chantier,
            numero_devis=numero_devis,
            montant=montant,
            devis_chantier=est_devis_chantier  # ← Clé de la détection
        )
        
        # Générer le PDF (votre logique existante)
        pdf_path = f"/tmp/devis_{numero_devis}.pdf"  # Exemple
        
        # Sauvegarder dans le drive
        filename = f"Devis_{numero_devis}_{chantier.nom}.pdf"
        success = document_automation.save_devis_to_drive(devis, pdf_path, filename)
        
        if success:
            if est_devis_chantier:
                print(f"✅ Devis chantier sauvegardé: {filename}")
            else:
                print(f"✅ Devis TS sauvegardé: {filename}")
        else:
            print(f"❌ Erreur lors de la sauvegarde: {filename}")
        
        return devis
    
    # Exemple d'utilisation
    print("\n=== Exemple d'utilisation réelle ===")
    
    # Créer un chantier
    societe = Societe.objects.create(nom="Entreprise ABC")
    chantier = Chantier.objects.create(nom="Rénovation Maison", societe=societe)
    
    # Créer un devis chantier
    devis_initial = creer_et_sauvegarder_devis(
        chantier=chantier,
        numero_devis="DEV-2024-001",
        montant=75000,
        est_devis_chantier=True  # ← Devis chantier
    )
    
    # Créer un devis TS
    devis_ts = creer_et_sauvegarder_devis(
        chantier=chantier,
        numero_devis="DEV-2024-002",
        montant=12000,
        est_devis_chantier=False  # ← Devis TS
    )
    
    # Nettoyer
    devis_initial.delete()
    devis_ts.delete()
    chantier.delete()
    societe.delete()


if __name__ == "__main__":
    # Exécuter les exemples
    exemple_detection_devis()
    exemple_utilisation_reelle()
