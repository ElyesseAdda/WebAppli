import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache


class DriveConsumer(AsyncWebsocketConsumer):
    """
    Consumer WebSocket pour la synchronisation temps réel du Drive
    """
    
    async def connect(self):
        """Connexion WebSocket"""
        self.room_name = self.scope['url_route']['kwargs']['folder_path']
        self.room_group_name = f'drive_{self.room_name}'
        
        # Rejoindre le groupe
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Envoyer un message de confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connexion WebSocket établie',
            'folder_path': self.room_name
        }))
    
    async def disconnect(self, close_code):
        """Déconnexion WebSocket"""
        # Quitter le groupe
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Réception de messages du client"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'join_folder':
                # L'utilisateur rejoint un dossier
                folder_path = text_data_json.get('folder_path', '')
                await self.join_folder(folder_path)
            elif message_type == 'leave_folder':
                # L'utilisateur quitte un dossier
                folder_path = text_data_json.get('folder_path', '')
                await self.leave_folder(folder_path)
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Format JSON invalide'
            }))
    
    async def join_folder(self, folder_path):
        """Rejoindre un dossier spécifique"""
        if folder_path != self.room_name:
            # Changer de groupe
            old_group = f'drive_{self.room_name}'
            new_group = f'drive_{folder_path}'
            
            await self.channel_layer.group_discard(old_group, self.channel_name)
            await self.channel_layer.group_add(new_group, self.channel_name)
            
            self.room_name = folder_path
            self.room_group_name = new_group
    
    async def leave_folder(self, folder_path):
        """Quitter un dossier spécifique"""
        group_name = f'drive_{folder_path}'
        await self.channel_layer.group_discard(group_name, self.channel_name)
    
    # Méthodes pour envoyer des événements au groupe
    
    async def file_added(self, event):
        """Envoyer un événement de fichier ajouté"""
        await self.send(text_data=json.dumps({
            'type': 'file_added',
            'file': event['file'],
            'folder_path': event['folder_path']
        }))
    
    async def file_deleted(self, event):
        """Envoyer un événement de fichier supprimé"""
        await self.send(text_data=json.dumps({
            'type': 'file_deleted',
            'file_path': event['file_path'],
            'folder_path': event['folder_path']
        }))
    
    async def file_renamed(self, event):
        """Envoyer un événement de fichier renommé"""
        await self.send(text_data=json.dumps({
            'type': 'file_renamed',
            'old_path': event['old_path'],
            'new_path': event['new_path'],
            'folder_path': event['folder_path']
        }))
    
    async def folder_added(self, event):
        """Envoyer un événement de dossier ajouté"""
        await self.send(text_data=json.dumps({
            'type': 'folder_added',
            'folder': event['folder'],
            'folder_path': event['folder_path']
        }))
    
    async def folder_deleted(self, event):
        """Envoyer un événement de dossier supprimé"""
        await self.send(text_data=json.dumps({
            'type': 'folder_deleted',
            'folder_path': event['folder_path'],
            'parent_path': event['parent_path']
        }))
    
    async def folder_renamed(self, event):
        """Envoyer un événement de dossier renommé"""
        await self.send(text_data=json.dumps({
            'type': 'folder_renamed',
            'old_path': event['old_path'],
            'new_path': event['new_path'],
            'parent_path': event['parent_path']
        }))
    
    async def cache_invalidated(self, event):
        """Envoyer un événement d'invalidation du cache"""
        await self.send(text_data=json.dumps({
            'type': 'cache_invalidated',
            'folder_path': event['folder_path'],
            'message': 'Le contenu du dossier a été mis à jour'
        }))


# Fonctions utilitaires pour envoyer des événements
async def send_drive_event(folder_path, event_type, data):
    """
    Envoyer un événement à tous les clients connectés à un dossier
    """
    from channels.layers import get_channel_layer
    channel_layer = get_channel_layer()
    
    group_name = f'drive_{folder_path}'
    
    await channel_layer.group_send(group_name, {
        'type': event_type,
        **data
    })


def send_drive_event_sync(folder_path, event_type, data):
    """
    Version synchrone pour envoyer des événements depuis les vues Django
    """
    import asyncio
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    group_name = f'drive_{folder_path}'
    
    # Exécuter de manière asynchrone
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(channel_layer.group_send(group_name, {
            'type': event_type,
            **data
        }))
    finally:
        loop.close()
