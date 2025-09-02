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
            print("🔌 Signaux Drive automatique chargés avec succès")
        except ImportError as e:
            print(f"⚠️  Impossible de charger les signaux Drive: {e}")
        except Exception as e:
            print(f"❌ Erreur lors du chargement des signaux Drive: {e}")
