import json
import os
import subprocess
import tempfile
from pathlib import Path
from django.http import HttpResponse, JsonResponse
from django.conf import settings


class PDFGenerator:
    """
    Classe utilitaire pour générer des PDF avec Puppeteer
    """
    
    def __init__(self, script_name="generate_custom_pdf.js"):
        """
        Initialise le générateur PDF
        
        Args:
            script_name (str): Nom du script Puppeteer à utiliser
        """
        self.script_path = self._get_script_path(script_name)
        self.temp_dir = tempfile.gettempdir()
    
    def _get_script_path(self, script_name):
        """Retourne le chemin complet vers le script Puppeteer"""
        # Chemin relatif depuis la racine du projet
        base_path = Path(__file__).parent.parent
        script_path = base_path / "frontend" / "src" / "components" / script_name
        
        if not script_path.exists():
            raise FileNotFoundError(f"Script Puppeteer non trouvé: {script_path}")
        
        return str(script_path)
    
    def generate_pdf(self, preview_url, filename, options=None):
        """
        Génère un PDF à partir d'une URL de prévisualisation
        
        Args:
            preview_url (str): URL de la page à convertir en PDF
            filename (str): Nom du fichier PDF à générer
            options (dict): Options de configuration pour Puppeteer
            
        Returns:
            tuple: (success: bool, file_path: str, error: str)
        """
        try:
            # Préparer le chemin du fichier PDF temporaire
            pdf_path = os.path.join(self.temp_dir, filename)
            
            # Préparer les options
            pdf_options = options or {}
            options_json = json.dumps(pdf_options)
            
            # Construire la commande
            command = [
                'node', 
                self.script_path, 
                preview_url, 
                pdf_path, 
                options_json
            ]
            
            print(f"Exécution de la commande: {' '.join(command)}")
            
            # Exécuter Puppeteer
            result = subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True,
                timeout=120  # Timeout de 2 minutes
            )
            
            print("Sortie standard:", result.stdout)
            if result.stderr:
                print("Sortie d'erreur:", result.stderr)
            
            # Vérifier que le fichier a été créé
            if os.path.exists(pdf_path):
                return True, pdf_path, None
            else:
                return False, None, "Le fichier PDF n'a pas été généré"
                
        except subprocess.TimeoutExpired:
            return False, None, "Timeout lors de la génération du PDF"
        except subprocess.CalledProcessError as e:
            return False, None, f"Erreur Puppeteer: {e.stderr}"
        except Exception as e:
            return False, None, f"Erreur inattendue: {str(e)}"
    
    def create_pdf_response(self, preview_url, filename, options=None):
        """
        Crée une réponse HTTP avec le PDF généré
        
        Args:
            preview_url (str): URL de la page à convertir
            filename (str): Nom du fichier pour le téléchargement
            options (dict): Options de configuration
            
        Returns:
            HttpResponse: Réponse avec le PDF ou JsonResponse avec erreur
        """
        success, file_path, error = self.generate_pdf(preview_url, filename, options)
        
        if success:
            try:
                with open(file_path, 'rb') as pdf_file:
                    response = HttpResponse(
                        pdf_file.read(), 
                        content_type='application/pdf'
                    )
                    response['Content-Disposition'] = f'attachment; filename="{filename}"'
                
                # Nettoyer le fichier temporaire
                os.remove(file_path)
                return response
                
            except Exception as e:
                return JsonResponse({
                    'error': f'Erreur lors de la lecture du PDF: {str(e)}'
                }, status=500)
        else:
            return JsonResponse({
                'error': error
            }, status=500)


class PDFOptions:
    """
    Classe pour définir les options de génération PDF
    """
    
    @staticmethod
    def a4_portrait():
        """Options pour A4 portrait"""
        return {
            'format': 'A4',
            'landscape': False,
            'margin': {
                'top': '20px',
                'right': '20px',
                'bottom': '20px',
                'left': '20px'
            }
        }
    
    @staticmethod
    def a4_landscape():
        """Options pour A4 paysage"""
        return {
            'format': 'A4',
            'landscape': True,
            'margin': {
                'top': '20px',
                'right': '20px',
                'bottom': '20px',
                'left': '20px'
            }
        }
    
    @staticmethod
    def letter_portrait():
        """Options pour Letter portrait"""
        return {
            'format': 'Letter',
            'landscape': False,
            'margin': {
                'top': '20px',
                'right': '20px',
                'bottom': '20px',
                'left': '20px'
            }
        }
    
    @staticmethod
    def custom(format='A4', landscape=False, margin=None, scale=1, wait_time=2000):
        """Options personnalisées"""
        return {
            'format': format,
            'landscape': landscape,
            'margin': margin or {
                'top': '20px',
                'right': '20px',
                'bottom': '20px',
                'left': '20px'
            },
            'scale': scale,
            'waitTime': wait_time
        } 