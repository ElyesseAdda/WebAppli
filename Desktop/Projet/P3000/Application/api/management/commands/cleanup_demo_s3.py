"""
Commande Django pour nettoyer les fichiers S3 anciens de l'environnement DEMO
Usage: python manage.py cleanup_demo_s3
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from datetime import datetime, timedelta
import boto3
from botocore.exceptions import ClientError


class Command(BaseCommand):
    help = 'Nettoie les fichiers S3 de plus de 7 jours dans l\'environnement DEMO'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Nombre de jours de rétention (défaut: 7)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Affiche les fichiers qui seraient supprimés sans les supprimer',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        self.stdout.write(f'🗑️  Nettoyage des fichiers S3 de plus de {days} jours...\n')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('⚠️  Mode DRY-RUN activé (aucune suppression)\n'))

        try:
            # Initialiser le client S3
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME,
            )
            
            bucket_name = settings.AWS_STORAGE_BUCKET_NAME
            cutoff_date = datetime.now(datetime.now().astimezone().tzinfo) - timedelta(days=days)
            
            self.stdout.write(f'📦 Bucket: {bucket_name}')
            self.stdout.write(f'📅 Date limite: {cutoff_date.strftime("%Y-%m-%d %H:%M:%S")}\n')
            
            # Lister tous les objets dans le bucket
            paginator = s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=bucket_name)
            
            total_files = 0
            total_size = 0
            deleted_count = 0
            deleted_size = 0
            
            for page in pages:
                if 'Contents' not in page:
                    continue
                    
                for obj in page['Contents']:
                    total_files += 1
                    total_size += obj['Size']
                    
                    # Vérifier la date de dernière modification
                    last_modified = obj['LastModified']
                    
                    if last_modified < cutoff_date:
                        file_size_mb = obj['Size'] / (1024 * 1024)
                        
                        if dry_run:
                            self.stdout.write(
                                f'  🗑️  [DRY-RUN] {obj["Key"]} '
                                f'({file_size_mb:.2f} MB, '
                                f'{last_modified.strftime("%Y-%m-%d")})'
                            )
                        else:
                            try:
                                s3_client.delete_object(
                                    Bucket=bucket_name,
                                    Key=obj['Key']
                                )
                                self.stdout.write(
                                    f'  ✅ Supprimé: {obj["Key"]} '
                                    f'({file_size_mb:.2f} MB)'
                                )
                            except ClientError as e:
                                self.stdout.write(
                                    self.style.ERROR(
                                        f'  ❌ Erreur lors de la suppression de {obj["Key"]}: {str(e)}'
                                    )
                                )
                                continue
                        
                        deleted_count += 1
                        deleted_size += obj['Size']
            
            # Afficher le résumé
            total_size_mb = total_size / (1024 * 1024)
            deleted_size_mb = deleted_size / (1024 * 1024)
            
            self.stdout.write('\n' + '='*60)
            self.stdout.write(self.style.SUCCESS('\n✅ Nettoyage terminé!\n'))
            self.stdout.write(f'   Total fichiers: {total_files} ({total_size_mb:.2f} MB)')
            
            if dry_run:
                self.stdout.write(
                    f'   Fichiers à supprimer: {deleted_count} ({deleted_size_mb:.2f} MB)'
                )
            else:
                self.stdout.write(
                    f'   Fichiers supprimés: {deleted_count} ({deleted_size_mb:.2f} MB)'
                )
                self.stdout.write(
                    f'   Espace libéré: {deleted_size_mb:.2f} MB'
                )
            
            self.stdout.write('='*60 + '\n')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f'\n❌ Erreur: {str(e)}\n'
                )
            )
            raise
