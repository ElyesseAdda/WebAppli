"""
Module d'automatisation pour la sauvegarde des documents
Gère la sauvegarde automatique des documents dans les bons dossiers du drive
"""

from typing import Optional
from .drive_automation import drive_automation
from .utils import custom_slugify


class DocumentAutomation:
    """
    Classe pour automatiser la sauvegarde des documents
    """
    
    def __init__(self):
        self.drive_automation = drive_automation
    
    def save_devis_to_drive(self, devis, file_path: str, filename: str) -> bool:
        """
        Sauvegarde un devis dans le bon dossier du drive
        """
        try:
            if devis.chantier:
                # Devis de chantier existant
                societe_name = devis.chantier.societe.nom if devis.chantier.societe else "Société par défaut"
                chantier_name = devis.chantier.nom
                
                # Déterminer le type de devis selon l'attribut devis_chantier
                if hasattr(devis, 'devis_chantier') and devis.devis_chantier:
                    # Devis initial du chantier
                    target_folder = f"Chantiers/{custom_slugify(societe_name)}/{custom_slugify(chantier_name)}/Devis"
                else:
                    # Devis TS (travaux supplémentaires)
                    target_folder = f"Chantiers/{custom_slugify(societe_name)}/{custom_slugify(chantier_name)}/Devis TS"
                    
            elif devis.appel_offres:
                # Devis d'appel d'offres
                societe_name = "Société par défaut"  # À adapter selon votre logique
                appel_offres_name = devis.appel_offres.nom
                target_folder = f"Appels d'offres/{custom_slugify(societe_name)}/{custom_slugify(appel_offres_name)}/Devis"
            else:
                return False
            
            return self.drive_automation.save_document_to_folder(file_path, target_folder, filename)
            
        except Exception as e:
            print(f"Erreur lors de la sauvegarde du devis: {str(e)}")
            return False
    
    def save_facture_to_drive(self, facture, file_path: str, filename: str) -> bool:
        """
        Sauvegarde une facture dans le bon dossier du drive
        """
        try:
            if facture.chantier:
                societe_name = facture.chantier.societe.nom if facture.chantier.societe else "Société par défaut"
                chantier_name = facture.chantier.nom
                target_folder = f"Chantiers/{custom_slugify(societe_name)}/{custom_slugify(chantier_name)}/Facture"
                
                return self.drive_automation.save_document_to_folder(file_path, target_folder, filename)
            
            return False
            
        except Exception as e:
            print(f"Erreur lors de la sauvegarde de la facture: {str(e)}")
            return False
    
    def save_situation_to_drive(self, situation, file_path: str, filename: str) -> bool:
        """
        Sauvegarde une situation dans le bon dossier du drive
        """
        try:
            if situation.chantier:
                societe_name = situation.chantier.societe.nom if situation.chantier.societe else "Société par défaut"
                chantier_name = situation.chantier.nom
                target_folder = f"Chantiers/{custom_slugify(societe_name)}/{custom_slugify(chantier_name)}/Situation"
                
                return self.drive_automation.save_document_to_folder(file_path, target_folder, filename)
            
            return False
            
        except Exception as e:
            print(f"Erreur lors de la sauvegarde de la situation: {str(e)}")
            return False
    
    def save_bon_commande_to_drive(self, bon_commande, file_path: str, filename: str) -> bool:
        """
        Sauvegarde un bon de commande dans le bon dossier du drive
        """
        try:
            if bon_commande.chantier:
                societe_name = bon_commande.chantier.societe.nom if bon_commande.chantier.societe else "Société par défaut"
                chantier_name = bon_commande.chantier.nom
                target_folder = f"Chantiers/{custom_slugify(societe_name)}/{custom_slugify(chantier_name)}/Bons de commande"
                
                return self.drive_automation.save_document_to_folder(file_path, target_folder, filename)
            
            return False
            
        except Exception as e:
            print(f"Erreur lors de la sauvegarde du bon de commande: {str(e)}")
            return False
    
    def save_avenant_to_drive(self, avenant, file_path: str, filename: str) -> bool:
        """
        Sauvegarde un avenant dans le bon dossier du drive
        """
        try:
            if avenant.chantier:
                societe_name = avenant.chantier.societe.nom if avenant.chantier.societe else "Société par défaut"
                chantier_name = avenant.chantier.nom
                target_folder = f"Chantiers/{custom_slugify(societe_name)}/{custom_slugify(chantier_name)}/Avenant"
                
                return self.drive_automation.save_document_to_folder(file_path, target_folder, filename)
            
            return False
            
        except Exception as e:
            print(f"Erreur lors de la sauvegarde de l'avenant: {str(e)}")
            return False
    
    def save_sous_traitant_to_drive(self, contrat, file_path: str, filename: str) -> bool:
        """
        Sauvegarde un contrat sous-traitant dans le bon dossier du drive
        """
        try:
            if contrat.chantier:
                societe_name = contrat.chantier.societe.nom if contrat.chantier.societe else "Société par défaut"
                chantier_name = contrat.chantier.nom
                target_folder = f"Chantiers/{custom_slugify(societe_name)}/{custom_slugify(chantier_name)}/Sous Traitant"
                
                return self.drive_automation.save_document_to_folder(file_path, target_folder, filename)
            
            return False
            
        except Exception as e:
            print(f"Erreur lors de la sauvegarde du contrat sous-traitant: {str(e)}")
            return False
    
    def save_document_auto(self, document, file_path: str, filename: str, document_type: str = None) -> bool:
        """
        Sauvegarde automatiquement un document dans le bon dossier selon son type
        """
        try:
            if not document:
                return False
            
            # Déterminer le type de document si non fourni
            if not document_type:
                document_type = self._detect_document_type(document)
            
            # Sauvegarder selon le type
            if document_type == 'devis':
                return self.save_devis_to_drive(document, file_path, filename)
            elif document_type == 'facture':
                return self.save_facture_to_drive(document, file_path, filename)
            elif document_type == 'situation':
                return self.save_situation_to_drive(document, file_path, filename)
            elif document_type == 'bon_commande':
                return self.save_bon_commande_to_drive(document, file_path, filename)
            elif document_type == 'avenant':
                return self.save_avenant_to_drive(document, file_path, filename)
            elif document_type == 'sous_traitant':
                return self.save_sous_traitant_to_drive(document, file_path, filename)
            else:
                print(f"Type de document non reconnu: {document_type}")
                return False
                
        except Exception as e:
            print(f"Erreur lors de la sauvegarde automatique: {str(e)}")
            return False
    
    def _detect_document_type(self, document) -> str:
        """
        Détecte automatiquement le type de document
        """
        try:
            # Vérifier le type de l'objet
            if hasattr(document, '_meta') and document._meta.model_name:
                model_name = document._meta.model_name.lower()
                
                if 'devis' in model_name:
                    return 'devis'
                elif 'facture' in model_name:
                    return 'facture'
                elif 'situation' in model_name:
                    return 'situation'
                elif 'boncommande' in model_name or 'bon_commande' in model_name:
                    return 'bon_commande'
                elif 'avenant' in model_name:
                    return 'avenant'
                elif 'soustraitant' in model_name or 'sous_traitant' in model_name:
                    return 'sous_traitant'
            
            # Vérifier les attributs spécifiques
            if hasattr(document, 'chantier') and document.chantier:
                if hasattr(document, 'numero_facture'):
                    return 'facture'
                elif hasattr(document, 'numero_situation'):
                    return 'situation'
                elif hasattr(document, 'numero_devis'):
                    return 'devis'
            
            return 'unknown'
            
        except Exception as e:
            print(f"Erreur lors de la détection du type de document: {str(e)}")
            return 'unknown'


# Instance globale
document_automation = DocumentAutomation()
