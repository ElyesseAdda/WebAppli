"""
Commande Django pour nettoyer automatiquement les anciens fichiers d'historique
Usage: python manage.py cleanup_historique [--days 30]
"""

from django.core.management.base import BaseCommand
from api.pdf_manager import pdf_manager


class Command(BaseCommand):
    help = 'Nettoie les anciens fichiers d\'historique (suppression automatique après X jours)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Nombre de jours après lequel supprimer les fichiers (défaut: 30)'
        )

    def handle(self, *args, **options):
        days = options['days']
        
        self.stdout.write(
            self.style.SUCCESS(f'🧹 Début du nettoyage des fichiers d\'historique de plus de {days} jours...')
        )
        
        try:
            success = pdf_manager.cleanup_old_historique_files(days_old=days)
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS('✅ Nettoyage terminé avec succès !')
                )
            else:
                self.stdout.write(
                    self.style.ERROR('❌ Erreur lors du nettoyage')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Erreur inattendue: {str(e)}')
            )
