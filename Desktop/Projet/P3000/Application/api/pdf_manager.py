"""
Module de gestion des PDFs pour le Drive AWS S3
Gère la génération, le stockage et l'organisation des PDFs
"""

import os
import subprocess
import tempfile
from datetime import datetime
from typing import Dict, Optional, Tuple
from django.conf import settings
from django.http import JsonResponse
from .utils import (
    get_s3_client, 
    get_s3_bucket_name, 
    upload_file_to_s3,
    create_s3_folder_recursive,
    custom_slugify
)
from .drive_automation import drive_automation


class PDFManager:
    """
    Gestionnaire de PDFs pour le Drive AWS S3
    """
    
    def __init__(self):
        # Corriger le chemin de base pour pointer vers le répertoire racine de l'application
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.node_scripts_dir = os.path.join(self.base_dir, 'frontend', 'src', 'components')
        self.temp_dir = tempfile.gettempdir()
        
        # Mapping des types de documents vers les dossiers S3
        self.document_type_folders = {
            'planning_hebdo': 'Planning',
            'planning_mensuel': 'Planning',
            'rapport_agents': 'Documents_Execution',
            'devis_travaux': 'Devis',
            'devis_marche': 'Devis_Marche',
            'situation': 'Situation',
            'facture': 'Facture',
            'avenant': 'Avenant',
            'rapport_chantier': 'Documents_Execution'
        }
    
    def generate_pdf_filename(self, document_type: str, **kwargs) -> str:
        """
        Génère un nom de fichier automatique pour le PDF
        
        Args:
            document_type: Type de document (planning_hebdo, rapport_agents, etc.)
            **kwargs: Paramètres spécifiques (week, year, month, chantier_name, etc.)
        
        Returns:
            str: Nom de fichier généré
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if document_type == 'planning_hebdo':
            week = kwargs.get('week', 'XX')
            year = kwargs.get('year', 'XXXX')
            return f"planning_semaine_{week}_{year}_{timestamp}.pdf"
        
        elif document_type == 'planning_mensuel':
            month = kwargs.get('month', 'XX')
            year = kwargs.get('year', 'XXXX')
            # Utiliser les noms de mois en français
            mois_francais = {
                1: 'janvier', 2: 'fevrier', 3: 'mars', 4: 'avril',
                5: 'mai', 6: 'juin', 7: 'juillet', 8: 'aout',
                9: 'septembre', 10: 'octobre', 11: 'novembre', 12: 'decembre'
            }
            month_name = mois_francais.get(month, f'mois_{month}')
            return f"planning_{month_name}_{year}_{timestamp}.pdf"
        
        elif document_type == 'rapport_agents':
            month = kwargs.get('month', 'XX')
            year = kwargs.get('year', 'XXXX')
            # Utiliser les noms de mois en français
            mois_francais = {
                1: 'janvier', 2: 'fevrier', 3: 'mars', 4: 'avril',
                5: 'mai', 6: 'juin', 7: 'juillet', 8: 'aout',
                9: 'septembre', 10: 'octobre', 11: 'novembre', 12: 'decembre'
            }
            month_name = mois_francais.get(month, f'mois_{month}')
            return f"rapport_agents_{month_name}_{year}_{timestamp}.pdf"
        
        elif document_type == 'devis_travaux':
            chantier_name = kwargs.get('chantier_name', 'chantier')
            chantier_id = kwargs.get('chantier_id', 'XXX')
            return f"devis_travaux_{chantier_id}_{custom_slugify(chantier_name)}_{timestamp}.pdf"
        
        elif document_type == 'devis_marche':
            appel_offres_name = kwargs.get('appel_offres_name', 'appel_offres')
            appel_offres_id = kwargs.get('appel_offres_id', 'XXX')
            return f"devis_marche_{appel_offres_id}_{custom_slugify(appel_offres_name)}_{timestamp}.pdf"
        
        elif document_type == 'situation':
            chantier_name = kwargs.get('chantier_name', 'chantier')
            chantier_id = kwargs.get('chantier_id', 'XXX')
            situation_num = kwargs.get('situation_num', '001')
            return f"situation_{situation_num}_{chantier_id}_{custom_slugify(chantier_name)}_{timestamp}.pdf"
        
        elif document_type == 'facture':
            chantier_name = kwargs.get('chantier_name', 'chantier')
            chantier_id = kwargs.get('chantier_id', 'XXX')
            facture_num = kwargs.get('facture_num', '001')
            return f"facture_{facture_num}_{chantier_id}_{custom_slugify(chantier_name)}_{timestamp}.pdf"
        
        else:
            # Nom générique
            return f"{document_type}_{timestamp}.pdf"
    
    def get_s3_folder_path(self, document_type: str, societe_name: str, **kwargs) -> str:
        """
        Détermine le chemin S3 où stocker le PDF
        
        Args:
            document_type: Type de document
            societe_name: Nom de la société
            **kwargs: Paramètres supplémentaires (chantier_name, appel_offres_name, etc.)
        
        Returns:
            str: Chemin S3 complet
        """
        societe_slug = custom_slugify(societe_name)
        
        # Déterminer le dossier racine et le sous-dossier
        if document_type in ['devis_travaux', 'devis_marche']:
            # Pour les devis, vérifier s'il s'agit d'un chantier ou d'un appel d'offres
            if 'chantier_name' in kwargs:
                # C'est un chantier
                chantier_name = kwargs['chantier_name']
                chantier_slug = custom_slugify(chantier_name)
                subfolder = self.document_type_folders.get(document_type, 'Devis')
                return f"Sociétés/{societe_slug}/{chantier_slug}/{subfolder}"
            else:
                # C'est un appel d'offres
                appel_offres_name = kwargs['appel_offres_name']
                appel_offres_id = kwargs['appel_offres_id']
                appel_offres_slug = f"{appel_offres_id:03d}_{custom_slugify(appel_offres_name)}"
                subfolder = self.document_type_folders.get(document_type, 'Devis')
                return f"Appels_Offres/{societe_slug}/{appel_offres_slug}/{subfolder}"
        
        elif document_type in ['planning_hebdo', 'planning_mensuel', 'rapport_agents']:
            # Ces documents sont liés à un chantier
            chantier_name = kwargs.get('chantier_name')
            if chantier_name:
                chantier_slug = custom_slugify(chantier_name)
                subfolder = self.document_type_folders.get(document_type, 'Documents_Execution')
                return f"Sociétés/{societe_slug}/{chantier_slug}/{subfolder}"
            else:
                # Pas de chantier spécifique, stocker dans un dossier général
                return f"Documents_Generaux/{societe_slug}/{self.document_type_folders.get(document_type, 'Documents')}"
        
        elif document_type in ['situation', 'facture', 'avenant']:
            # Ces documents sont toujours liés à un chantier
            chantier_name = kwargs['chantier_name']
            chantier_slug = custom_slugify(chantier_name)
            subfolder = self.document_type_folders.get(document_type, 'Documents_Execution')
            return f"Sociétés/{societe_slug}/{chantier_slug}/{subfolder}"
        
        else:
            # Type de document non reconnu, stocker dans un dossier général
            return f"Documents_Generaux/{societe_slug}/Autres"
    
    def check_dependencies(self) -> Tuple[bool, str]:
        """
        Vérifie que toutes les dépendances sont installées
        
        Returns:
            Tuple[bool, str]: (succès, message d'erreur)
        """
        # Vérifier Node.js
        try:
            subprocess.run(['node', '--version'], check=True, capture_output=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False, "Node.js n'est pas installé ou n'est pas accessible"
        
        # Vérifier Puppeteer
        puppeteer_path = os.path.join(self.base_dir, 'frontend', 'node_modules', 'puppeteer')
        if not os.path.exists(puppeteer_path):
            return False, "Puppeteer n'est pas installé. Veuillez exécuter: cd frontend && npm install puppeteer"
        
        # Vérifier les scripts Node.js
        required_scripts = ['generate_pdf.js', 'generate_monthly_agents_pdf.js']
        for script in required_scripts:
            script_path = os.path.join(self.node_scripts_dir, script)
            if not os.path.exists(script_path):
                return False, f"Script Node.js introuvable: {script}"
        
        return True, ""
    
    def generate_andStore_pdf(self, 
                             document_type: str, 
                             preview_url: str, 
                             societe_name: str,
                             **kwargs) -> Tuple[bool, str, str]:
        """
        Génère un PDF et le stocke dans AWS S3
        
        Args:
            document_type: Type de document
            preview_url: URL de prévisualisation HTML
            societe_name: Nom de la société
            **kwargs: Paramètres spécifiques au type de document
        
        Returns:
            Tuple[bool, str, str]: (succès, message, chemin_s3)
        """
        try:
            # 1. Vérifier les dépendances
            deps_ok, error_msg = self.check_dependencies()
            if not deps_ok:
                return False, error_msg, ""
            
            # 2. Déterminer le script Node.js à utiliser
            if document_type in ['planning_hebdo', 'planning_mensuel']:
                script_name = 'generate_pdf.js'
                output_filename = 'planning_temp.pdf'
            elif document_type == 'rapport_agents':
                script_name = 'generate_monthly_agents_pdf.js'
                output_filename = 'rapport_agents_temp.pdf'
            else:
                # Utiliser le script par défaut
                script_name = 'generate_pdf.js'
                output_filename = f"{document_type}_temp.pdf"
            
            script_path = os.path.join(self.node_scripts_dir, script_name)
            temp_pdf_path = os.path.join(self.temp_dir, output_filename)
            
            # 3. Générer le PDF avec Puppeteer
            print(f"🎯 Génération du PDF {document_type} avec Puppeteer...")
            command = ['node', script_path, preview_url, temp_pdf_path]
            
            result = subprocess.run(
                command, 
                check=True, 
                capture_output=True, 
                text=True, 
                timeout=60
            )
            
            if not os.path.exists(temp_pdf_path):
                return False, "Le fichier PDF n'a pas été généré par Puppeteer", ""
            
            print(f"✅ PDF généré avec succès: {temp_pdf_path}")
            
            # 4. Déterminer le nom et l'emplacement S3
            filename = self.generate_pdf_filename(document_type, **kwargs)
            s3_folder_path = self.get_s3_folder_path(document_type, societe_name, **kwargs)
            
            # 5. Créer le dossier S3 s'il n'existe pas
            print(f"📁 Création du dossier S3: {s3_folder_path}")
            create_s3_folder_recursive(s3_folder_path)
            
            # 6. Uploader le PDF dans S3
            s3_file_path = f"{s3_folder_path}/{filename}"
            print(f"🚀 Upload du PDF vers S3: {s3_file_path}")
            
            success = upload_file_to_s3(temp_pdf_path, s3_file_path)
            if not success:
                return False, "Échec de l'upload du PDF vers AWS S3", ""
            
            # 7. Nettoyer le fichier temporaire
            try:
                os.remove(temp_pdf_path)
                print(f"🧹 Fichier temporaire supprimé: {temp_pdf_path}")
            except:
                pass
            
            print(f"🎉 PDF stocké avec succès dans S3: {s3_file_path}")
            return True, "PDF généré et stocké avec succès", s3_file_path
            
        except subprocess.TimeoutExpired:
            return False, "Timeout lors de la génération du PDF (60 secondes)", ""
        except subprocess.CalledProcessError as e:
            return False, f"Erreur lors de la génération du PDF: {str(e)}", ""
        except Exception as e:
            return False, f"Erreur inattendue: {str(e)}", ""

    def download_pdf_from_s3(self, s3_path: str) -> Tuple[bool, str, bytes]:
        """
        Télécharge un PDF depuis AWS S3
        
        Args:
            s3_path: Chemin S3 du fichier
            
        Returns:
            Tuple[bool, str, bytes]: (succès, message, contenu_du_pdf)
        """
        try:
            # Assuming is_s3_available() is defined elsewhere or will be added.
            # For now, we'll assume it's available for demonstration purposes.
            # In a real scenario, you'd check if S3 is configured and accessible.
            # For this example, we'll just proceed if it's not explicitly unavailable.
            # If S3 is not configured, this will raise an error.
            # If S3 is configured, we proceed with the download.
            
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            
            print(f"📥 Téléchargement depuis S3: {s3_path}")
            
            # Télécharger le fichier depuis S3
            response = s3_client.get_object(Bucket=bucket_name, Key=s3_path)
            pdf_content = response['Body'].read()
            
            print(f"✅ PDF téléchargé avec succès: {len(pdf_content)} octets")
            return True, "PDF téléchargé avec succès", pdf_content
            
        except Exception as e:
            error_msg = f"Erreur lors du téléchargement depuis S3: {str(e)}"
            print(f"❌ {error_msg}")
            return False, error_msg, b""


# Instance globale
pdf_manager = PDFManager()
