"""
Drive V2 Serializers - Sérialiseurs pour le Drive V2
"""

from rest_framework import serializers


class FileSerializer(serializers.Serializer):
    """Sérialiseur pour un fichier"""
    name = serializers.CharField()
    path = serializers.CharField()
    size = serializers.IntegerField()
    last_modified = serializers.DateTimeField()
    type = serializers.CharField()
    content_type = serializers.CharField()


class FolderSerializer(serializers.Serializer):
    """Sérialiseur pour un dossier"""
    name = serializers.CharField()
    path = serializers.CharField()
    type = serializers.CharField()


class FolderContentSerializer(serializers.Serializer):
    """Sérialiseur pour le contenu d'un dossier"""
    folders = FolderSerializer(many=True)
    files = FileSerializer(many=True)
    current_path = serializers.CharField()


class CreateFolderSerializer(serializers.Serializer):
    """Sérialiseur pour la création d'un dossier"""
    parent_path = serializers.CharField(required=False, allow_blank=True)
    folder_name = serializers.CharField()


class DeleteItemSerializer(serializers.Serializer):
    """Sérialiseur pour la suppression d'un élément"""
    item_path = serializers.CharField()
    is_folder = serializers.BooleanField(required=False, default=False)


class DownloadUrlSerializer(serializers.Serializer):
    """Sérialiseur pour l'URL de téléchargement"""
    file_path = serializers.CharField()
    expires_in = serializers.IntegerField(required=False, default=3600)


class UploadUrlSerializer(serializers.Serializer):
    """Sérialiseur pour l'URL d'upload"""
    file_path = serializers.CharField(required=False, allow_blank=True)
    file_name = serializers.CharField()
    content_type = serializers.CharField(required=False, default='application/octet-stream')


class SearchSerializer(serializers.Serializer):
    """Sérialiseur pour la recherche"""
    search_term = serializers.CharField()
    folder_path = serializers.CharField(required=False, allow_blank=True)
    max_results = serializers.IntegerField(required=False, default=100)


class MoveItemSerializer(serializers.Serializer):
    """Sérialiseur pour le déplacement d'un élément"""
    source_path = serializers.CharField()
    dest_path = serializers.CharField()


class RenameItemSerializer(serializers.Serializer):
    """Sérialiseur pour le renommage d'un élément"""
    old_path = serializers.CharField()
    new_name = serializers.CharField()


class BreadcrumbSerializer(serializers.Serializer):
    """Sérialiseur pour le fil d'Ariane"""
    name = serializers.CharField()
    path = serializers.CharField()
