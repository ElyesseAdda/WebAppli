from django.apps import AppConfig



class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    
    def ready(self):
        """
        Appelée quand l'application Django est prête
        Charge automatiquement les signaux
        """
        try:
            # Importer les signaux pour qu'ils soient automatiquement connectés
            import api.signals
            print("[OK] Signaux Drive automatique charges avec succes")
        except ImportError as e:
            print(f"[WARNING] Impossible de charger les signaux Drive: {e}")
        except Exception as e:
            print(f"[ERROR] Erreur lors du chargement des signaux Drive: {e}")
