"""
Drive V2 Admin Views - Endpoints admin pour la récupération de fichiers supprimés (S3 Versioning)
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .storage import StorageManager


class DriveAdminViewSet(viewsets.ViewSet):
    """
    ViewSet admin pour gérer le versioning S3 et la récupération de fichiers.
    Réservé aux superusers / staff.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.storage = StorageManager()

    @action(detail=False, methods=['get'], url_path='versioning-status')
    def versioning_status(self, request):
        """Vérifie si le versioning S3 est activé sur le bucket."""
        try:
            result = self.storage.check_versioning_status()
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='deleted-files')
    def list_deleted_files(self, request):
        """
        Liste les fichiers supprimés récupérables.

        Query params:
            - prefix: Préfixe S3 pour filtrer (optionnel)
            - max_results: Nombre max de résultats (optionnel, défaut: 200)
        """
        try:
            prefix = request.query_params.get('prefix', '')
            max_results = int(request.query_params.get('max_results', 200))

            deleted = self.storage.list_deleted_objects(
                prefix=prefix,
                max_keys=max_results
            )

            return Response({
                'deleted_files': deleted,
                'count': len(deleted),
                'prefix': prefix,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='restore-file')
    def restore_file(self, request):
        """
        Restaure un fichier supprimé (supprime le delete marker).

        Body:
            - key: Clé S3 du fichier à restaurer
        """
        try:
            key = request.data.get('key')
            if not key:
                return Response(
                    {'error': 'key est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            success = self.storage.restore_deleted_object(key)

            if success:
                parent_path = '/'.join(key.split('/')[:-1]) + '/' if '/' in key else ''
                file_name = key.split('/')[-1]
                self.storage.update_folder_metadata(
                    parent_path, file_name,
                    modified_by=f"RESTAURÉ par {request.user.get_full_name() or request.user.username}"
                )

                return Response({
                    'success': True,
                    'message': f'Fichier restauré: {key}',
                    'key': key,
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Aucun delete marker trouvé pour ce fichier. Le versioning est-il activé ?'},
                    status=status.HTTP_404_NOT_FOUND
                )

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='restore-batch')
    def restore_batch(self, request):
        """
        Restaure plusieurs fichiers supprimés en une seule opération.

        Body:
            - keys: Liste de clés S3 à restaurer
        """
        try:
            keys = request.data.get('keys', [])
            if not keys:
                return Response(
                    {'error': 'keys est requis (liste de clés S3)'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            results = []
            user_label = f"RESTAURÉ par {request.user.get_full_name() or request.user.username}"

            for key in keys:
                try:
                    success = self.storage.restore_deleted_object(key)
                    if success:
                        parent_path = '/'.join(key.split('/')[:-1]) + '/' if '/' in key else ''
                        file_name = key.split('/')[-1]
                        self.storage.update_folder_metadata(
                            parent_path, file_name, modified_by=user_label
                        )
                    results.append({'key': key, 'success': success})
                except Exception as e:
                    results.append({'key': key, 'success': False, 'error': str(e)})

            restored = sum(1 for r in results if r['success'])
            return Response({
                'results': results,
                'restored_count': restored,
                'total': len(keys),
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='restore-folder')
    def restore_folder(self, request):
        """
        Restaure un dossier entier (tous les fichiers supprimés sous un préfixe).
        Recrée aussi le marqueur .keep du dossier.

        Body:
            - prefix: Préfixe S3 du dossier (ex: "Chantiers/MonChantier/Documents/")
        """
        try:
            prefix = request.data.get('prefix')
            if not prefix:
                return Response(
                    {'error': 'prefix est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            result = self.storage.restore_deleted_folder(prefix)
            user_label = f"RESTAURÉ par {request.user.get_full_name() or request.user.username}"

            if result['restored_count'] > 0:
                self.storage.update_folder_metadata(
                    prefix, '.folder_restored',
                    modified_by=user_label
                )
                try:
                    self.storage.remove_folder_metadata_entry(prefix, '.folder_restored')
                except:
                    pass

            return Response({
                'success': result['restored_count'] > 0,
                'message': f"{result['restored_count']} fichier(s) restauré(s) dans {prefix}",
                'restored_count': result['restored_count'],
                'failed_count': result['failed_count'],
                'details': result['details'],
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='download-deleted-file')
    def download_deleted_file(self, request):
        """
        Génère une URL présignée pour télécharger un fichier supprimé dans le navigateur.

        Query params:
            - key: Clé S3 du fichier supprimé
            - version_id: (optionnel) ID de version spécifique. Si absent, on prend la dernière version avant suppression.
        """
        try:
            key = request.query_params.get('key')
            if not key:
                return Response(
                    {'error': 'key est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            version_id = request.query_params.get('version_id')
            if not version_id:
                version_info = self.storage.get_latest_version_before_delete(key)
                if not version_info:
                    return Response(
                        {'error': 'Aucune version récupérable trouvée pour ce fichier'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                version_id = version_info['version_id']

            url = self.storage.get_presigned_url_for_version(key, version_id)

            return Response({
                'download_url': url,
                'key': key,
                'version_id': version_id,
                'file_name': key.split('/')[-1],
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='restore-to-drive')
    def restore_to_drive(self, request):
        """
        Restaure un fichier supprimé dans le Drive.
        Gère les conflits de nom : si un fichier existe déjà à cet emplacement,
        le fichier restauré est renommé avec le préfixe [RÉCUPÉRÉ].

        Body:
            - key: Clé S3 du fichier à restaurer
            - version_id: (optionnel) ID de version spécifique
        """
        try:
            key = request.data.get('key')
            if not key:
                return Response(
                    {'error': 'key est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            version_id = request.data.get('version_id')
            if not version_id:
                version_info = self.storage.get_latest_version_before_delete(key)
                if not version_info:
                    return Response(
                        {'error': 'Aucune version récupérable trouvée'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                version_id = version_info['version_id']

            conflict = self.storage.object_currently_exists(key)
            user_label = f"RESTAURÉ par {request.user.get_full_name() or request.user.username}"

            if not conflict:
                success = self.storage.restore_deleted_object(key)
                if success:
                    parent_path = '/'.join(key.split('/')[:-1]) + '/' if '/' in key else ''
                    file_name = key.split('/')[-1]
                    self.storage.update_folder_metadata(parent_path, file_name, modified_by=user_label)

                    return Response({
                        'success': True,
                        'message': f'Fichier restauré à son emplacement original',
                        'restored_key': key,
                        'had_conflict': False,
                    }, status=status.HTTP_200_OK)
                else:
                    return Response(
                        {'error': 'Impossible de restaurer le fichier'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            else:
                parent_path = '/'.join(key.split('/')[:-1]) + '/' if '/' in key else ''
                file_name = key.split('/')[-1]

                dot_index = file_name.rfind('.')
                if dot_index > 0:
                    base = file_name[:dot_index]
                    ext = file_name[dot_index:]
                else:
                    base = file_name
                    ext = ''

                new_file_name = f"[RÉCUPÉRÉ]_{base}{ext}"
                new_key = f"{parent_path}{new_file_name}"

                counter = 1
                while self.storage.object_currently_exists(new_key):
                    new_file_name = f"[RÉCUPÉRÉ_{counter}]_{base}{ext}"
                    new_key = f"{parent_path}{new_file_name}"
                    counter += 1

                success = self.storage.copy_version_to_key(key, version_id, new_key)
                if success:
                    self.storage.update_folder_metadata(parent_path, new_file_name, modified_by=user_label)

                    return Response({
                        'success': True,
                        'message': f'Conflit détecté — fichier restauré sous : {new_file_name}',
                        'restored_key': new_key,
                        'original_key': key,
                        'had_conflict': True,
                        'new_file_name': new_file_name,
                    }, status=status.HTTP_200_OK)
                else:
                    return Response(
                        {'error': 'Échec de la copie du fichier'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='restore-to-drive-batch')
    def restore_to_drive_batch(self, request):
        """
        Restaure plusieurs fichiers supprimés dans le Drive avec gestion des conflits.

        Body:
            - keys: Liste de clés S3 à restaurer
        """
        try:
            keys = request.data.get('keys', [])
            if not keys:
                return Response(
                    {'error': 'keys est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user_label = f"RESTAURÉ par {request.user.get_full_name() or request.user.username}"
            results = []

            for key in keys:
                try:
                    version_info = self.storage.get_latest_version_before_delete(key)
                    if not version_info:
                        results.append({'key': key, 'success': False, 'error': 'Aucune version trouvée'})
                        continue

                    version_id = version_info['version_id']
                    conflict = self.storage.object_currently_exists(key)

                    if not conflict:
                        success = self.storage.restore_deleted_object(key)
                        if success:
                            parent_path = '/'.join(key.split('/')[:-1]) + '/' if '/' in key else ''
                            file_name = key.split('/')[-1]
                            self.storage.update_folder_metadata(parent_path, file_name, modified_by=user_label)
                        results.append({'key': key, 'success': success, 'restored_key': key, 'had_conflict': False})
                    else:
                        parent_path = '/'.join(key.split('/')[:-1]) + '/' if '/' in key else ''
                        file_name = key.split('/')[-1]
                        dot_index = file_name.rfind('.')
                        if dot_index > 0:
                            base = file_name[:dot_index]
                            ext = file_name[dot_index:]
                        else:
                            base = file_name
                            ext = ''

                        new_file_name = f"[RÉCUPÉRÉ]_{base}{ext}"
                        new_key = f"{parent_path}{new_file_name}"
                        counter = 1
                        while self.storage.object_currently_exists(new_key):
                            new_file_name = f"[RÉCUPÉRÉ_{counter}]_{base}{ext}"
                            new_key = f"{parent_path}{new_file_name}"
                            counter += 1

                        success = self.storage.copy_version_to_key(key, version_id, new_key)
                        if success:
                            self.storage.update_folder_metadata(parent_path, new_file_name, modified_by=user_label)
                        results.append({
                            'key': key, 'success': success,
                            'restored_key': new_key, 'had_conflict': True,
                            'new_file_name': new_file_name,
                        })
                except Exception as e:
                    results.append({'key': key, 'success': False, 'error': str(e)})

            restored = sum(1 for r in results if r.get('success'))
            conflicts = sum(1 for r in results if r.get('had_conflict'))
            return Response({
                'results': results,
                'restored_count': restored,
                'conflict_count': conflicts,
                'total': len(keys),
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='file-versions')
    def file_versions(self, request):
        """
        Liste toutes les versions d'un fichier spécifique.

        Query params:
            - key: Clé S3 du fichier
        """
        try:
            key = request.query_params.get('key')
            if not key:
                return Response(
                    {'error': 'key est requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            versions = self.storage.list_object_versions(key)

            return Response({
                'key': key,
                'versions': versions,
                'count': len(versions),
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='restore-version')
    def restore_version(self, request):
        """
        Restaure une version spécifique d'un fichier.

        Body:
            - key: Clé S3 du fichier
            - version_id: ID de la version à restaurer
        """
        try:
            key = request.data.get('key')
            version_id = request.data.get('version_id')

            if not key or not version_id:
                return Response(
                    {'error': 'key et version_id sont requis'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            success = self.storage.restore_object_version(key, version_id)

            if success:
                return Response({
                    'success': True,
                    'message': f'Version {version_id} restaurée pour {key}',
                    'key': key,
                    'version_id': version_id,
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Échec de la restauration de la version'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
