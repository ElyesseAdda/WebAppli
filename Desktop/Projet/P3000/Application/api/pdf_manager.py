"""
Module de gestion des PDFs pour le Drive AWS S3
Gère la génération, le stockage et l'organisation des PDFs
"""

import os
import subprocess
import tempfile
import re
from datetime import datetime
from typing import Dict, Optional, Tuple
from django.conf import settings
from django.http import JsonResponse
from .utils import (
    get_s3_client, 
    get_s3_bucket_name, 
    upload_file_to_s3,
    upload_file_to_s3_robust,
    create_s3_folder_recursive,
    custom_slugify,
    normalize_drive_segment
)
from .views_drive.manager import normalize_filename, denormalize_filename
from .drive_automation import drive_automation


def clean_filename_for_s3(filename):
    """
    Nettoie un nom de fichier pour S3 en préservant le nom original.
    Remplace uniquement les caractères interdits dans les noms de fichiers.
    Remplace les espaces par des underscores pour la compatibilité AWS S3.
    """
    if not filename:
        return ""
    
    # Caractères interdits dans les noms de fichiers Windows/Unix/S3
    # Remplace : / \ : * ? " < > |
    forbidden_chars = r'[/\\:*?"<>|]'
    
    # Remplacer les caractères interdits par des underscores
    cleaned = re.sub(forbidden_chars, '_', filename)
    
    # Remplacer les espaces par des underscores (AWS S3 préfère les underscores)
    cleaned = re.sub(r'\s+', '_', cleaned)
    
    # Supprimer les underscores multiples
    cleaned = re.sub(r'_+', '_', cleaned)
    
    # Supprimer les underscores en début et fin
    cleaned = cleaned.strip('_')
    
    return cleaned


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
            'planning_hebdo': 'PlanningHebdo',
            'planning_mensuel': 'PlanningHebdo',
            'rapport_agents': 'Rapport_mensuel',
            'devis_travaux': 'DEVIS',
            'devis_marche': 'DEVIS_MARCHE',
            'situation': 'SITUATION',
            'bon_commande': 'BON_COMMANDE',
            'facture': 'FACTURE',
            'avenant': 'Avenant',
            'rapport_chantier': 'Documents_Execution',
            'contrat_sous_traitance': 'SOUS_TRAITANT',
            'avenant_sous_traitance': 'SOUS_TRAITANT',
            'certificat_paiement': 'SOUS_TRAITANT',
            'rapport_intervention': 'RAPPORT_INTERVENTION',
        }

    def _build_historique_destination_path(self, source_path: str) -> str:
        """
        Construit un chemin d'archive uniforme dans Historique.

        Format unifié:
        Historique/{base_name}__{source_hint}__YYYYMMDD_HHMMSS{extension}
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        clean_path = source_path.strip('/')

        file_name = clean_path.split('/')[-1] if clean_path else 'document.pdf'
        dot_index = file_name.rfind('.')
        if dot_index > 0:
            base_name = file_name[:dot_index]
            extension = file_name[dot_index:]
        else:
            base_name = file_name
            extension = ''

        source_hint = clean_path.replace('/', '__') if clean_path else 'racine'
        return f"Historique/{base_name}__{source_hint}__{timestamp}{extension}"
    
    def generate_pdf_filename(self, document_type: str, **kwargs) -> str:
        """
        Génère un nom de fichier automatique pour le PDF
        
        Args:
            document_type: Type de document (planning_hebdo, rapport_agents, etc.)
            **kwargs: Paramètres spécifiques (week, year, month, chantier_name, etc.)
                - custom_filename: Nom de fichier personnalisé (optionnel). Si fourni, ce nom sera utilisé directement.
        
        Returns:
            str: Nom de fichier généré
        """
        # Si un nom de fichier personnalisé est fourni, l'utiliser directement
        if 'custom_filename' in kwargs and kwargs['custom_filename']:
            custom_name = kwargs['custom_filename'].strip()
            # Remplacer les + (espaces encodés dans l'URL) par des espaces
            # au cas où ils ne seraient pas décodés automatiquement
            custom_name = custom_name.replace('+', ' ')
            # S'assurer que le nom se termine par .pdf
            if not custom_name.lower().endswith('.pdf'):
                custom_name += '.pdf'
            # Normaliser le nom pour encoder "/" en "∕" (séparer le nom et l'extension)
            parts = custom_name.rsplit('.', 1)
            if len(parts) == 2:
                name_without_ext = parts[0]
                extension = parts[1]
                normalized_name = normalize_filename(name_without_ext)
                clean_name = f"{normalized_name}.{extension}"
            else:
                clean_name = normalize_filename(custom_name)
            # print(f"📝 Nom de fichier personnalisé nettoyé: '{custom_name}' -> '{clean_name}'")
            return clean_name
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if document_type == 'planning_hebdo':
            week = kwargs.get('week', 'XX')
            year = kwargs.get('year', 'XXXX')
            # Nouveau format : PH S{week} {year}
            year_short = str(year)[-2:] if len(str(year)) >= 2 else str(year)
            filename = f"PH S{week} {year_short}.pdf"
            return filename
        
        elif document_type == 'planning_mensuel':
            month = kwargs.get('month', 'XX')
            year = kwargs.get('year', 'XXXX')
            # Nouveau format : PH {mois} {année}
            mois_francais = {
                1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
                5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
                9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
            }
            month_name = mois_francais.get(month, f'Mois_{month}')
            year_short = str(year)[-2:] if len(str(year)) >= 2 else str(year)
            return f"PH {month_name} {year_short}.pdf"
        
        elif document_type == 'rapport_agents':
            month = kwargs.get('month', 'XX')
            year = kwargs.get('year', 'XXXX')
            # Format cohérent avec le frontend : RapportComptable_{mois}_{année}
            mois_francais = {
                1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
                5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
                9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
            }
            month_name = mois_francais.get(month, f'Mois_{month}')
            year_short = str(year)[-2:] if len(str(year)) >= 2 else str(year)
            return f"RapportComptable_{month_name}_{year_short}.pdf"
        
        elif document_type == 'devis_travaux':
            # Utiliser le numéro du devis depuis la DB (sans timestamp ni ID)
            devis_numero = kwargs.get('devis_numero', 'devis_travaux')
            # Normaliser le nom pour encoder "/" en "∕"
            normalized_name = normalize_filename(devis_numero)
            return f"{normalized_name}.pdf"
        
        elif document_type == 'devis_marche':
            # Utiliser le numéro du devis depuis la DB (sans timestamp ni ID)
            devis_numero = kwargs.get('numero', kwargs.get('devis_name', 'devis_marche'))
            # Normaliser le nom pour encoder "/" en "∕"
            normalized_name = normalize_filename(devis_numero)
            return f"{normalized_name}.pdf"
        
        elif document_type == 'contrat_sous_traitance':
            # Format: Contrat_NomSousTraitant_NomChantier.pdf
            sous_traitant_name = kwargs.get('sous_traitant_name', 'SousTraitant')
            chantier_name = kwargs.get('chantier_name', 'Chantier')
            # Normaliser les noms pour encoder "/" en "∕"
            sous_traitant_slug = normalize_filename(sous_traitant_name)
            chantier_slug = normalize_filename(chantier_name)
            filename = f"Contrat_{sous_traitant_slug}_{chantier_slug}.pdf"
            # print(f"🔍 DEBUG generate_pdf_filename - Contrat ST: '{filename}'")
            return filename
        
        elif document_type == 'avenant_sous_traitance':
            # Format: Avenant_NumeroAvenant_NomSousTraitant_NomChantier.pdf
            avenant_numero = kwargs.get('avenant_numero', '1')
            sous_traitant_name = kwargs.get('sous_traitant_name', 'SousTraitant')
            chantier_name = kwargs.get('chantier_name', 'Chantier')
            # Normaliser les noms pour encoder "/" en "∕"
            sous_traitant_slug = normalize_filename(sous_traitant_name)
            chantier_slug = normalize_filename(chantier_name)
            # Normaliser le numéro d'avenant pour encoder "/" en "∕"
            normalized_avenant_numero = normalize_filename(avenant_numero)
            filename = f"Avenant_{normalized_avenant_numero}_{sous_traitant_slug}_{chantier_slug}.pdf"
            # print(f"🔍 DEBUG generate_pdf_filename - Avenant ST: '{filename}'")
            return filename
        
        elif document_type == 'certificat_paiement':
            # Format: Certificat de paiement n°01 - SousTraitant - Chantier 01-26.pdf
            numero_certificat = str(kwargs.get('numero_certificat', '1')).zfill(2)
            sous_traitant_name = normalize_filename(kwargs.get('sous_traitant_name', 'SousTraitant'))
            chantier_name = normalize_filename(kwargs.get('chantier_name', 'Chantier'))
            mois = str(kwargs.get('mois', '01')).zfill(2)
            annee = str(kwargs.get('annee', '2026'))[-2:]
            filename = f"Certificat de paiement n°{numero_certificat} - {sous_traitant_name} - {chantier_name} {mois}-{annee}.pdf"
            return filename
        
        elif document_type == 'situation':
            # Utiliser le numero_situation depuis la DB (sans timestamp ni ID)
            numero_situation = kwargs.get('numero_situation', 'situation')
            # Normaliser le nom pour encoder "/" en "∕"
            normalized_name = normalize_filename(numero_situation)
            return f"{normalized_name}.pdf"
        
        elif document_type == 'bon_commande':
            # Utiliser le numero_bon_commande depuis la DB (sans timestamp ni ID)
            numero_bon_commande = kwargs.get('numero_bon_commande', 'bon_commande')
            # Normaliser le nom pour encoder "/" en "∕"
            normalized_name = normalize_filename(numero_bon_commande)
            return f"{normalized_name}.pdf"
        
        elif document_type == 'facture':
            # Utiliser le numéro de la facture depuis la DB (sans timestamp ni ID)
            numero = kwargs.get('numero', 'Facture n°01.2025')
            # Normaliser le nom pour encoder "/" en "∕"
            normalized_name = normalize_filename(numero)
            return f"{normalized_name}.pdf"
        
        else:
            # Nom générique
            return f"{document_type}_{timestamp}.pdf"
    
    def get_s3_folder_path(self, document_type: str, societe_name: str, **kwargs) -> str:
        """
        Détermine le chemin S3 où stocker le PDF
        
        Args:
            document_type: Type de document
            societe_name: Nom de la société
            **kwargs: Paramètres supplémentaires (chantier_name, appel_offres_name, custom_path, chantier_id, appel_offres_id, etc.)
                - custom_path: Chemin personnalisé dans le drive (optionnel). Si fourni, ce chemin sera utilisé directement.
                - chantier_id: ID du chantier (optionnel). Si fourni, utilise le drive_path du chantier.
                - appel_offres_id: ID de l'appel d'offres (optionnel). Si fourni, utilise le drive_path de l'appel d'offres.
        
        Returns:
            str: Chemin S3 complet (sans le nom du fichier)
        """
        # Si un chemin personnalisé est fourni, l'utiliser directement
        if 'custom_path' in kwargs and kwargs['custom_path']:
            custom_path = kwargs['custom_path'].strip()
            # Nettoyer le chemin (supprimer les slashes en début/fin)
            custom_path = custom_path.strip('/')
            # Mode "chemin complet" : on utilise custom_path tel quel sans ajouter
            # de sous-dossier type. Utile pour les rapports d'intervention (Vigik+
            # ou rapport classique) dont le dossier cible est déjà connu.
            if kwargs.get('custom_path_is_full'):
                return custom_path
            # Déterminer le sous-dossier selon le type de document et le contexte
            # Pour les appels d'offres avec devis_marche, utiliser DEVIS/DEVIS_MARCHE
            if document_type == 'devis_marche' and ('appel_offres_id' in kwargs or 'appel_offres_name' in kwargs):
                subfolder = 'DEVIS/DEVIS_MARCHE'
            elif document_type == 'devis_travaux' and ('appel_offres_id' in kwargs or 'appel_offres_name' in kwargs):
                subfolder = 'DEVIS'
            else:
                # Utiliser le sous-dossier par défaut du type de document
                subfolder = self.document_type_folders.get(document_type, 'DEVIS')
            return f"{custom_path}/{subfolder}" if custom_path else subfolder
        
        # ✅ Si un appel_offres_id est fourni, utiliser le chemin de l'appel d'offres
        if 'appel_offres_id' in kwargs and kwargs['appel_offres_id']:
            from .models import AppelOffres
            try:
                appel_offres = AppelOffres.objects.get(id=kwargs['appel_offres_id'])
                base_path = appel_offres.get_drive_path()
                if base_path:
                    # Normaliser base_path en supprimant les slashes au début et à la fin
                    base_path = base_path.strip('/')
                    subfolder = self.document_type_folders.get(document_type, 'DEVIS')
                    # Pour les devis de marché, utiliser la structure DEVIS/DEVIS_MARCHE
                    if document_type == 'devis_marche':
                        subfolder = 'DEVIS/DEVIS_MARCHE'
                    # ✅ Structure pour appels d'offres : Appels_Offres/{base_path}/{subfolder}
                    return f"Appels_Offres/{base_path}/{subfolder}"
            except AppelOffres.DoesNotExist:
                pass
        
        # ✅ Si un chantier_id est fourni, utiliser le chemin du chantier
        if 'chantier_id' in kwargs and kwargs['chantier_id']:
            from .models import Chantier
            try:
                chantier = Chantier.objects.get(id=kwargs['chantier_id'])
                base_path = chantier.get_drive_path()
                if base_path:
                    # Normaliser base_path en supprimant les slashes au début et à la fin
                    base_path = base_path.strip('/')
                    subfolder = self.document_type_folders.get(document_type, 'DEVIS')
                    # ✅ Structure pour chantiers : Chantiers/{base_path}/{subfolder}
                    # Pour certains types, ajouter un sous-dossier supplémentaire (ex: fournisseur, entreprise)
                    if document_type == 'bon_commande' and 'fournisseur_name' in kwargs:
                        fournisseur_slug = normalize_drive_segment(kwargs['fournisseur_name'])
                        return f"Chantiers/{base_path}/{subfolder}/{fournisseur_slug}"
                    elif document_type == 'certificat_paiement' and ('sous_traitant_name' in kwargs or 'sousTraitantName' in kwargs):
                        sous_traitant_name = kwargs.get('sous_traitant_name') or kwargs.get('sousTraitantName', 'SousTraitant')
                        sous_traitant_slug = normalize_drive_segment(sous_traitant_name)
                        return f"Chantiers/{base_path}/SOUS_TRAITANT/{sous_traitant_slug}/Certificat_de_paiement"
                    elif document_type in ['contrat_sous_traitance', 'avenant_sous_traitance'] and ('sous_traitant_name' in kwargs or 'sousTraitantName' in kwargs):
                        sous_traitant_name = kwargs.get('sous_traitant_name') or kwargs.get('sousTraitantName', 'SousTraitant')
                        sous_traitant_slug = normalize_drive_segment(sous_traitant_name)
                        return f"Chantiers/{base_path}/SOUS_TRAITANT/{sous_traitant_slug}"
                    elif document_type == 'devis_marche':
                        return f"Chantiers/{base_path}/DEVIS/{subfolder}"
                    return f"Chantiers/{base_path}/{subfolder}"
            except Chantier.DoesNotExist:
                pass
        
        societe_slug = normalize_drive_segment(societe_name)
        
        # Déterminer le dossier racine et le sous-dossier
        if document_type in ['devis_travaux', 'devis_marche']:
            # Pour les devis, vérifier s'il s'agit d'un chantier ou d'un appel d'offres
            if 'chantier_name' in kwargs:
                # C'est un chantier (devis normal)
                chantier_name = kwargs['chantier_name']
                chantier_slug = normalize_drive_segment(chantier_name)
                subfolder = self.document_type_folders.get(document_type, 'DEVIS')
                
                # Pour les devis de chantier, ajouter le dossier DEVIS/
                if document_type == 'devis_marche':
                    return f"Chantiers/{societe_slug}/{chantier_slug}/DEVIS/{subfolder}"
                else:
                    return f"Chantiers/{societe_slug}/{chantier_slug}/{subfolder}"
            else:
                # C'est un appel d'offres
                appel_offres_name = kwargs['appel_offres_name']
                appel_offres_id = kwargs['appel_offres_id']
                # Utiliser seulement le nom de l'appel d'offres (sans ID devant)
                appel_offres_slug = normalize_drive_segment(appel_offres_name)
                
                # Pour les appels d'offres :
                # - devis_marche (devis initial) → DEVIS/DEVIS_MARCHE
                # - devis_travaux (autres devis) → DEVIS (un niveau plus haut)
                if document_type == 'devis_marche':
                    subfolder = 'DEVIS/DEVIS_MARCHE'
                else:  # devis_travaux
                    subfolder = 'DEVIS'
                
                return f"Appels_Offres/{societe_slug}/{appel_offres_slug}/{subfolder}"
        
        elif document_type == 'certificat_paiement':
            chantier_name = kwargs.get('chantier_name', 'Chantier')
            chantier_slug = normalize_drive_segment(chantier_name)
            sous_traitant_name = kwargs.get('sous_traitant_name') or kwargs.get('sousTraitantName', 'SousTraitant')
            sous_traitant_slug = normalize_drive_segment(sous_traitant_name)
            return f"Chantiers/{societe_slug}/{chantier_slug}/SOUS_TRAITANT/{sous_traitant_slug}/Certificat_de_paiement"

        elif document_type in ['contrat_sous_traitance', 'avenant_sous_traitance', 'contrat', 'contrats']:
            # Pour les contrats et avenants de sous-traitance
            # Chemin: Chantiers/{Societe}/{Chantier}/SOUS_TRAITANT/{Entreprise}/
            chantier_name = kwargs.get('chantier_name', 'Chantier')
            chantier_slug = normalize_drive_segment(chantier_name)
            sous_traitant_name = kwargs.get('sous_traitant_name') or kwargs.get('sousTraitantName')
            if not sous_traitant_name:
                print(f"⚠️ ATTENTION: sous_traitant_name manquant pour {document_type}, utilisation du fallback")
                sous_traitant_name = 'SousTraitant'
            sous_traitant_slug = normalize_drive_segment(sous_traitant_name)
            return f"Chantiers/{societe_slug}/{chantier_slug}/SOUS_TRAITANT/{sous_traitant_slug}"
        
        elif document_type in ['planning_hebdo', 'planning_mensuel', 'rapport_agents']:
            # Ces documents sont maintenant stockés dans Agents/Document_Generaux/
            # Pour le planning hebdo, ajouter l'année comme sous-dossier
            if document_type == 'planning_hebdo':
                year = kwargs.get('year', 'XXXX')
                return f"Agents/Document_Generaux/PlanningHebdo/{year}"
            elif document_type == 'rapport_agents':
                # Pour le rapport agents, ajouter l'année comme sous-dossier
                year = kwargs.get('year', 'XXXX')
                return f"Agents/Document_Generaux/{self.document_type_folders.get(document_type, 'Documents')}/{year}"
            else:
                # Planning mensuel
                return f"Agents/Document_Generaux/{self.document_type_folders.get(document_type, 'Documents')}"
        
        elif document_type == 'situation':
            # Pour les situations, utiliser la structure Chantiers/
            chantier_name = kwargs.get('chantier_name', 'Chantier')
            chantier_slug = normalize_drive_segment(chantier_name)
            subfolder = self.document_type_folders.get(document_type, 'SITUATION')
            return f"Chantiers/{societe_slug}/{chantier_slug}/{subfolder}"
        
        elif document_type == 'bon_commande':
            # Pour les bons de commande, utiliser la structure Chantiers/ avec sous-dossier par fournisseur
            chantier_name = kwargs.get('chantier_name', 'Chantier')
            chantier_slug = normalize_drive_segment(chantier_name)
            fournisseur_name = kwargs.get('fournisseur_name', 'Fournisseur')
            fournisseur_slug = normalize_drive_segment(fournisseur_name)
            subfolder = self.document_type_folders.get(document_type, 'BON_COMMANDE')
            return f"Chantiers/{societe_slug}/{chantier_slug}/{subfolder}/{fournisseur_slug}"
        
        elif document_type == 'facture':
            # Pour les factures, utiliser la structure Chantiers/
            chantier_name = kwargs.get('chantier_name', 'Chantier')
            chantier_slug = normalize_drive_segment(chantier_name)
            subfolder = self.document_type_folders.get(document_type, 'FACTURE')
            return f"Chantiers/{societe_slug}/{chantier_slug}/{subfolder}"
        
        elif document_type == 'avenant':
            # Ces documents sont toujours liés à un chantier
            chantier_name = kwargs['chantier_name']
            chantier_slug = normalize_drive_segment(chantier_name)
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
        # Vérifier Node.js avec plusieurs chemins possibles
        node_paths = ['node', '/usr/bin/node', '/usr/local/bin/node', '/opt/nodejs/bin/node']
        node_found = False
        
        for node_path in node_paths:
            try:
                result = subprocess.run([node_path, '--version'], check=True, capture_output=True, text=True)
                # print(f"✅ Node.js trouvé: {node_path} - Version: {result.stdout.strip()}")
                node_found = True
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        if not node_found:
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
                             force_replace: bool = False,
                             modified_by: str = "Application",
                             **kwargs) -> Tuple[bool, str, str, bool]:
        """
        Génère un PDF et le stocke dans AWS S3 avec gestion des conflits
        
        Args:
            document_type: Type de document
            preview_url: URL de prévisualisation HTML
            societe_name: Nom de la société
            force_replace: Force le remplacement d'un fichier existant
            **kwargs: Paramètres spécifiques au type de document
        
        Returns:
            Tuple[bool, str, str, bool]: (succès, message, chemin_s3, conflit_détecté)
        """
        try:
            # 1. Vérifier les dépendances
            deps_ok, error_msg = self.check_dependencies()
            if not deps_ok:
                return False, error_msg, "", False
            
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
            # print(f"🎯 Génération du PDF {document_type} avec Puppeteer...")
            command = ['node', script_path, preview_url, temp_pdf_path]
            
            result = subprocess.run(
                command, 
                check=True, 
                capture_output=True, 
                text=True, 
                timeout=60
            )
            
            if not os.path.exists(temp_pdf_path):
                return False, "Le fichier PDF n'a pas été généré par Puppeteer", "", False
            
            # print(f"✅ PDF généré avec succès: {temp_pdf_path}")
            
            # 4. Déterminer le nom et l'emplacement S3
            filename = self.generate_pdf_filename(document_type, **kwargs)
            s3_folder_path = self.get_s3_folder_path(document_type, societe_name, **kwargs)
            
            # 5. Créer le dossier S3 s'il n'existe pas
            create_s3_folder_recursive(s3_folder_path)
            
            # 6. Vérifier s'il y a un conflit de nom
            # Si custom_filename est fourni, c'est que l'utilisateur a choisi un nouveau nom
            # pour éviter le conflit, donc on ne vérifie pas de conflit dans ce cas
            s3_file_path = f"{s3_folder_path}/{filename}"
            has_custom_filename = 'custom_filename' in kwargs and kwargs.get('custom_filename')
            
            if has_custom_filename:
                # Nom personnalisé fourni : pas de vérification de conflit
                conflict_detected = False
                # print(f"📝 Nom de fichier personnalisé fourni: {filename} - Pas de vérification de conflit")
            else:
                # Vérifier s'il y a un conflit avec le nom généré automatiquement
                conflict_detected = self.check_file_conflict(s3_file_path)
            
            if conflict_detected:
                # print(f"⚠️ Conflit détecté: {s3_file_path}")
                
                if force_replace:
                    # print(f"🔄 Remplacement forcé activé - déplacement de l'ancien fichier vers l'historique")
                    # Déplacer l'ancien fichier vers l'historique au lieu de le supprimer
                    try:
                        # Créer le dossier Historique à la racine du Drive
                        historique_path = "Historique"
                        create_s3_folder_recursive(historique_path)
                        
                        # Déplacer l'ancien fichier vers l'historique (format unifié)
                        old_s3_path = self._build_historique_destination_path(s3_file_path)
                        
                        # print(f"📦 Déplacement de l'ancien fichier vers l'historique: {old_s3_path}")
                        self.move_file_in_s3(s3_file_path, old_s3_path)
                        # print(f"🗑️ Ancien fichier déplacé vers l'historique: {old_s3_path}")
                        conflict_detected = False  # Plus de conflit après déplacement
                    except Exception as e:
                        # print(f"❌ Erreur lors du déplacement de l'ancien fichier vers l'historique: {str(e)}")
                        return False, f"Erreur lors du déplacement de l'ancien fichier vers l'historique: {str(e)}", "", False
                else:
                # Retourner immédiatement avec l'information de conflit
                # L'utilisateur devra confirmer avant de continuer
                    return False, "Conflit de fichier détecté - confirmation requise", s3_file_path, True
            
            # 7. Uploader le nouveau PDF dans S3 (seulement si pas de conflit)
            # print(f"🚀 Upload du nouveau PDF vers S3: {s3_file_path}")
            success = upload_file_to_s3_robust(temp_pdf_path, s3_file_path, modified_by=modified_by)
            if not success:
                return False, "Échec de l'upload du PDF vers AWS S3", "", False
            
            # 8. Nettoyer le fichier temporaire
            try:
                os.remove(temp_pdf_path)
                # print(f"🧹 Fichier temporaire supprimé: {temp_pdf_path}")
            except:
                pass
            
            # print(f"🎉 PDF stocké avec succès dans S3: {s3_file_path}")
            return True, "PDF généré et stocké avec succès", s3_file_path, conflict_detected
            
        except subprocess.TimeoutExpired:
            return False, "Timeout lors de la génération du PDF (60 secondes)", "", False
        except subprocess.CalledProcessError as e:
            return False, f"Erreur lors de la génération du PDF: {str(e)}", "", False
        except Exception as e:
            return False, f"Erreur inattendue: {str(e)}", "", False

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

    def get_file_from_s3(self, file_path: str) -> Tuple[bool, bytes, str, str]:
        """
        Télécharge n'importe quel fichier depuis AWS S3
        
        Args:
            file_path: Chemin S3 du fichier
            
        Returns:
            Tuple[bool, bytes, str, str]: (succès, contenu_du_fichier, type_mime, nom_fichier)
        """
        try:
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            
            print(f"📥 Téléchargement du fichier depuis S3: {file_path}")
            
            # Télécharger le fichier depuis S3
            response = s3_client.get_object(Bucket=bucket_name, Key=file_path)
            file_content = response['Body'].read()
            
            # Déterminer le type MIME basé sur l'extension
            file_extension = file_path.split('.')[-1].lower() if '.' in file_path else ''
            content_type = self.get_mime_type(file_extension)
            
            # Extraire le nom du fichier normalisé depuis le chemin S3
            normalized_file_name = file_path.split('/')[-1]
            # Convertir le nom normalisé en nom d'affichage (avec espaces)
            file_name = denormalize_filename(normalized_file_name)
            
            print(f"✅ Fichier téléchargé avec succès: {file_name} ({len(file_content)} octets, {content_type})")
            return True, file_content, content_type, file_name
            
        except Exception as e:
            error_msg = f"Erreur lors du téléchargement depuis S3: {str(e)}"
            print(f"❌ {error_msg}")
            return False, b"", "application/octet-stream", ""

    def get_mime_type(self, extension: str) -> str:
        """
        Détermine le type MIME basé sur l'extension du fichier
        
        Args:
            extension: Extension du fichier (sans le point)
            
        Returns:
            str: Type MIME correspondant
        """
        mime_types = {
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'html': 'text/html',
            'htm': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'xml': 'application/xml',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'svg': 'image/svg+xml',
            'webp': 'image/webp',
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'flac': 'audio/flac',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed',
            '7z': 'application/x-7z-compressed',
            'tar': 'application/x-tar',
            'gz': 'application/gzip',
            'dwg': 'application/acad',
            'dxf': 'application/dxf'
        }
        
        return mime_types.get(extension, 'application/octet-stream')

    def check_file_conflict(self, s3_file_path: str) -> bool:
        """
        Vérifie s'il y a un conflit de nom de fichier dans S3
        
        Args:
            s3_file_path: Chemin S3 du fichier
            
        Returns:
            bool: True si un conflit est détecté, False sinon
        """
        try:
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            
            # Vérifier si le fichier existe déjà
            try:
                s3_client.head_object(Bucket=bucket_name, Key=s3_file_path)
                return True  # Le fichier existe déjà
            except s3_client.exceptions.NoSuchKey:
                return False  # Pas de conflit
                
        except Exception as e:
            # print(f"❌ Erreur lors de la vérification du conflit: {str(e)}")
            return False

    def move_file_in_s3(self, old_path: str, new_path: str) -> bool:
        """
        Déplace un fichier dans S3 (copie + suppression)
        
        Args:
            old_path: Ancien chemin S3
            new_path: Nouveau chemin S3
            
        Returns:
            bool: True si le déplacement a réussi, False sinon
        """
        try:
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            
            # Copier le fichier vers le nouveau chemin
            copy_source = {'Bucket': bucket_name, 'Key': old_path}
            s3_client.copy_object(CopySource=copy_source, Bucket=bucket_name, Key=new_path)
            
            # Supprimer l'ancien fichier
            s3_client.delete_object(Bucket=bucket_name, Key=old_path)
            
            # print(f"✅ Fichier déplacé avec succès: {old_path} → {new_path}")
            return True
            
        except Exception as e:
            # print(f"❌ Erreur lors du déplacement du fichier: {str(e)}")
            return False

    def replace_file_with_confirmation(self, document_type: str, preview_url: str, societe_name: str, modified_by: str = "Application", **kwargs) -> Tuple[bool, str, str]:
        """
        Remplace un fichier existant après confirmation de l'utilisateur
        
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
                return False, error_msg, "", False
            
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
            # print(f"🎯 Génération du PDF {document_type} avec Puppeteer...")
            command = ['node', script_path, preview_url, temp_pdf_path]
            
            result = subprocess.run(
                command, 
                check=True, 
                capture_output=True, 
                text=True, 
                timeout=60
            )
            
            if not os.path.exists(temp_pdf_path):
                return False, "Le fichier PDF n'a pas été généré par Puppeteer", "", False
            
            # print(f"✅ PDF généré avec succès: {temp_pdf_path}")
            
            # 4. Déterminer le nom et l'emplacement S3
            filename = self.generate_pdf_filename(document_type, **kwargs)
            s3_folder_path = self.get_s3_folder_path(document_type, societe_name, **kwargs)
            
            # 5. Créer le dossier S3 s'il n'existe pas
            # print(f"📁 Création du dossier S3: {s3_folder_path}")
            create_s3_folder_recursive(s3_folder_path)
            
            # 6. Vérifier le conflit et gérer le remplacement
            s3_file_path = f"{s3_folder_path}/{filename}"
            
            if self.check_file_conflict(s3_file_path):
                # print(f"⚠️ Remplacement du fichier existant: {s3_file_path}")
                
                # Créer le dossier Historique à la racine du Drive
                historique_path = "Historique"
                create_s3_folder_recursive(historique_path)
                
                # Déplacer l'ancien fichier vers l'historique (format unifié)
                old_s3_path = self._build_historique_destination_path(s3_file_path)
                
                # print(f"📦 Déplacement de l'ancien fichier vers l'historique: {old_s3_path}")
                self.move_file_in_s3(s3_file_path, old_s3_path)
            
            # 7. Uploader le nouveau PDF dans S3
            # print(f"🚀 Upload du nouveau PDF vers S3: {s3_file_path}")
            success = upload_file_to_s3(temp_pdf_path, s3_file_path, modified_by=modified_by)
            if not success:
                return False, "Échec de l'upload du PDF vers AWS S3", ""
            
            # 8. Nettoyer le fichier temporaire
            try:
                os.remove(temp_pdf_path)
                # print(f"🧹 Fichier temporaire supprimé: {temp_pdf_path}")
            except:
                pass
            
            # print(f"🎉 PDF remplacé avec succès dans S3: {s3_file_path}")
            return True, "PDF généré et remplacé avec succès", s3_file_path
            
        except subprocess.TimeoutExpired:
            return False, "Timeout lors de la génération du PDF (60 secondes)", ""
        except subprocess.CalledProcessError as e:
            return False, f"Erreur lors de la génération du PDF: {str(e)}", ""
        except Exception as e:
            return False, f"Erreur inattendue: {str(e)}", ""

    def cleanup_old_historique_files(self, days_old: int = 30) -> bool:
        """
        Nettoie les anciens fichiers d'historique (suppression automatique)
        
        Args:
            days_old: Nombre de jours après lequel supprimer (défaut: 30)
            
        Returns:
            bool: True si le nettoyage a réussi, False sinon
        """
        try:
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            
            from datetime import datetime, timedelta
            cutoff_date = datetime.now() - timedelta(days=days_old)
            
            # Lister tous les fichiers dans les dossiers Historique
            paginator = s3_client.get_paginator('list_objects_v2')
            
            deleted_count = 0
            for page in paginator.paginate(Bucket=bucket_name, Prefix=''):
                if 'Contents' in page:
                    for obj in page['Contents']:
                        key = obj['Key']
                        
                        # Vérifier si c'est un fichier d'historique
                        if key.startswith('Historique/') and key.endswith('.pdf'):
                            # Extraire la date du nom de fichier
                            try:
                                # Formats supportés:
                                # - Nouveau: nom__source__YYYYMMDD_HHMMSS.pdf
                                # - Ancien:  Ancien_nom_YYYYMMDD_HHMMSS.pdf
                                filename = key.split('/')[-1]
                                file_date = None

                                # Nouveau format: capturer le timestamp final.
                                match_new = re.search(r'__(\d{8})_(\d{6})(?:\.[^.]+)?$', filename)
                                if match_new:
                                    file_date = datetime.strptime(
                                        f"{match_new.group(1)}_{match_new.group(2)}",
                                        '%Y%m%d_%H%M%S'
                                    )
                                else:
                                    # Ancien format (compat rétro): Ancien_*_YYYYMMDD_HHMMSS.pdf
                                    match_old = re.search(r'_(\d{8})_(\d{6})(?:\.[^.]+)?$', filename)
                                    if match_old:
                                        file_date = datetime.strptime(
                                            f"{match_old.group(1)}_{match_old.group(2)}",
                                            '%Y%m%d_%H%M%S'
                                        )

                                if file_date and file_date < cutoff_date:
                                    # Supprimer le fichier ancien
                                    s3_client.delete_object(Bucket=bucket_name, Key=key)
                                    deleted_count += 1
                                    print(f"🗑️ Fichier historique supprimé: {key}")
                            except:
                                # Si on ne peut pas parser la date, ignorer
                                continue
            
            print(f"🧹 Nettoyage terminé: {deleted_count} fichiers supprimés")
            return True
            
        except Exception as e:
            print(f"❌ Erreur lors du nettoyage: {str(e)}")
            return False

    def list_files_in_s3_folder(self, folder_path: str) -> list:
        """
        Liste les fichiers dans un dossier S3
        
        Args:
            folder_path: Chemin du dossier S3
        
        Returns:
            list: Liste des noms de fichiers (sans le chemin)
        """
        try:
            s3_client = get_s3_client()
            bucket_name = get_s3_bucket_name()
            
            # S'assurer que le chemin se termine par /
            if not folder_path.endswith('/'):
                folder_path += '/'
            
            # Lister les objets dans le dossier
            response = s3_client.list_objects_v2(
                Bucket=bucket_name,
                Prefix=folder_path,
                Delimiter='/'
            )
            
            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    key = obj['Key']
                    # Extraire seulement le nom du fichier (sans le chemin)
                    if key != folder_path and key.endswith('.pdf'):
                        file_name = key.split('/')[-1]
                        files.append(file_name)
            
            # Trier par date de modification (plus récent en premier)
            files.sort(reverse=True)
            return files
            
        except Exception as e:
            print(f"❌ Erreur lors de la liste des fichiers dans {folder_path}: {str(e)}")
            return []


# Instance globale
pdf_manager = PDFManager()
