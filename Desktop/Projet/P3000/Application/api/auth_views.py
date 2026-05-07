from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.decorators import login_required
from django.conf import settings
from .models import Emetteur, UserMobileAccess
from .serializers import EmetteurSerializer
import json


def _is_app_admin(user):
    """Superuser ou compte staff : accès à la gestion applicative (sidebar Admin, utilisateurs)."""
    return bool(user and user.is_authenticated and (user.is_superuser or user.is_staff))


def _get_mobile_access(user):
    """
    Retourne les droits d'accès mobiles d'un utilisateur.
    Les superusers et staff ont accès à toutes les sections.
    Les autres utilisateurs ont les droits définis dans UserMobileAccess.
    """
    if user.is_superuser or user.is_staff:
        return {
            'can_access_rapports': True,
            'can_access_distributeur': True,
            'can_access_drive': True,
        }
    try:
        access = user.mobile_access
        return {
            'can_access_rapports': access.can_access_rapports,
            'can_access_distributeur': access.can_access_distributeur,
            'can_access_drive': access.can_access_drive,
        }
    except UserMobileAccess.DoesNotExist:
        UserMobileAccess.objects.get_or_create(user=user)
        return {
            'can_access_rapports': False,
            'can_access_distributeur': False,
            'can_access_drive': False,
        }


def _deny_if_not_app_admin(request):
    if not _is_app_admin(request.user):
        return Response(
            {'error': 'Accès refusé : administrateur requis'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


def _staff_may_manage_account(actor, target):
    """
    Administrateur non superuser : ne gère que les comptes sans rôle staff ni superuser.
    """
    if actor.is_superuser:
        return True
    if not actor.is_staff:
        return False
    return not target.is_superuser and not target.is_staff


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Vue de connexion améliorée avec gestion des cookies
    """
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return Response({
                'error': 'Nom d\'utilisateur et mot de passe requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Authentifier l'utilisateur
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            # Connecter l'utilisateur
            login(request, user)
            
            # Créer la réponse
            response = Response({
                'success': True,
                'message': 'Connexion réussie',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'mobile_access': _get_mobile_access(user),
                }
            })
            
            # Configurer les cookies de session
            response.set_cookie(
                'sessionid', 
                request.session.session_key,
                max_age=3600,  # 1 heure
                httponly=True,
                samesite='Lax',
                secure=not getattr(settings, 'DEBUG', False)
            )
            
            return response
        else:
            return Response({
                'error': 'Nom d\'utilisateur ou mot de passe incorrect'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except json.JSONDecodeError:
        return Response({
            'error': 'Données JSON invalides'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': f'Erreur lors de la connexion: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def logout_view(request):
    """
    Vue de déconnexion améliorée
    """
    try:
        # Log pour déboguer
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Déconnexion demandée pour l'utilisateur: {request.user.username if request.user.is_authenticated else 'Non authentifié'}")
        
        # Déconnecter l'utilisateur
        logout(request)
        logger.info("Utilisateur déconnecté côté Django")
        
        # Créer une réponse avec suppression des cookies
        response = Response({
            'success': True,
            'message': 'Déconnexion réussie'
        })
        
        # Forcer la suppression de tous les cookies de session
        cookies_to_delete = ['sessionid', 'csrftoken']
        for cookie_name in cookies_to_delete:
            response.delete_cookie(cookie_name, path='/')
            response.delete_cookie(cookie_name, path='/api/')
            response.delete_cookie(cookie_name, domain=None)
            
            # Définir des cookies expirés avec tous les chemins possibles
            response.set_cookie(
                cookie_name, 
                '', 
                max_age=0, 
                expires='Thu, 01 Jan 1970 00:00:00 GMT',
                path='/',
                domain=None,
                secure=not getattr(settings, 'DEBUG', False),
                httponly=True,
                samesite='Lax'
            )
        
        logger.info("Cookies supprimés et expirés")
        return response
        
    except Exception as e:
        return Response({
            'error': f'Erreur lors de la déconnexion: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def check_auth_view(request):
    """
    Vérifier si l'utilisateur est connecté avec gestion des cookies
    """
    if request.user.is_authenticated:
        return Response({
            'authenticated': True,
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'email': request.user.email,
                'is_staff': request.user.is_staff,
                'is_superuser': request.user.is_superuser,
                'mobile_access': _get_mobile_access(request.user),
            }
        })
    else:
        return Response({
            'authenticated': False,
            'user': None
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user_view(request):
    """
    Créer un nouvel utilisateur (pour l'administration)
    """
    try:
        denied = _deny_if_not_app_admin(request)
        if denied:
            return denied

        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        email = data.get('email', '')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        is_staff = bool(data.get('is_staff', False))
        if not request.user.is_superuser:
            is_staff = False
        
        if not username or not password:
            return Response({
                'error': 'Nom d\'utilisateur et mot de passe requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Vérifier si l'utilisateur existe déjà
        if User.objects.filter(username=username).exists():
            return Response({
                'error': 'Ce nom d\'utilisateur existe déjà'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Créer l'utilisateur
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_staff=is_staff
        )
        
        return Response({
            'success': True,
            'message': 'Utilisateur créé avec succès',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        })
        
    except json.JSONDecodeError:
        return Response({
            'error': 'Données JSON invalides'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': f'Erreur lors de la création: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users_view(request):
    """
    Lister les utilisateurs (superuser ou administrateur staff)
    """
    denied = _deny_if_not_app_admin(request)
    if denied:
        return denied

    users = User.objects.select_related('mobile_access').all().order_by('username')
    return Response({
        'success': True,
        'users': [
            {
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'is_active': u.is_active,
                'is_staff': u.is_staff,
                'is_superuser': u.is_superuser,
                'mobile_access': _get_mobile_access(u),
            }
            for u in users
        ]
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_user_active_view(request, user_id):
    """
    Activer / désactiver un utilisateur (superuser ou administrateur staff)
    """
    denied = _deny_if_not_app_admin(request)
    if denied:
        return denied

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if not _staff_may_manage_account(request.user, target_user):
        return Response(
            {
                'error': 'Vous ne pouvez modifier que les comptes utilisateurs sans rôle administrateur.'
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if target_user.id == request.user.id:
        return Response({'error': 'Vous ne pouvez pas vous désactiver vous-même'}, status=status.HTTP_400_BAD_REQUEST)

    target_user.is_active = not target_user.is_active
    target_user.save(update_fields=['is_active'])

    return Response({
        'success': True,
        'message': 'Utilisateur activé' if target_user.is_active else 'Utilisateur désactivé',
        'user': {
            'id': target_user.id,
            'is_active': target_user.is_active
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_user_password_view(request, user_id):
    """
    Réinitialiser le mot de passe d'un utilisateur (superuser ou administrateur staff)
    """
    denied = _deny_if_not_app_admin(request)
    if denied:
        return denied

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if not _staff_may_manage_account(request.user, target_user):
        return Response(
            {
                'error': 'Vous ne pouvez modifier que les comptes utilisateurs sans rôle administrateur.'
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return Response({'error': 'Données JSON invalides'}, status=status.HTTP_400_BAD_REQUEST)

    new_password = data.get('new_password')
    if not new_password:
        return Response({'error': 'Le nouveau mot de passe est requis'}, status=status.HTTP_400_BAD_REQUEST)

    target_user.set_password(new_password)
    target_user.save(update_fields=['password'])

    return Response({
        'success': True,
        'message': f"Mot de passe réinitialisé pour {target_user.username}"
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def manage_emetteurs_view(request):
    """
    Lister / créer des émetteurs (superuser ou administrateur staff)
    """
    denied = _deny_if_not_app_admin(request)
    if denied:
        return denied

    if request.method == 'GET':
        emetteurs = Emetteur.objects.all().order_by('surname', 'name')
        serializer = EmetteurSerializer(emetteurs, many=True)
        return Response({
            'success': True,
            'emetteurs': serializer.data
        })

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return Response({'error': 'Données JSON invalides'}, status=status.HTTP_400_BAD_REQUEST)

    required_fields = ['name', 'surname', 'email', 'phone_Number']
    missing_fields = [field for field in required_fields if not str(data.get(field, '')).strip()]
    if missing_fields:
        return Response(
            {'error': f"Champs requis manquants : {', '.join(missing_fields)}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = EmetteurSerializer(data={
        'name': str(data.get('name', '')).strip(),
        'surname': str(data.get('surname', '')).strip(),
        'email': str(data.get('email', '')).strip(),
        'phone_Number': str(data.get('phone_Number', '')).strip(),
        'is_active': True,
    })
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    emetteur = serializer.save()
    return Response({
        'success': True,
        'message': 'Émetteur créé avec succès',
        'emetteur': EmetteurSerializer(emetteur).data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_emetteur_active_view(request, emetteur_id):
    """
    Activer / désactiver un émetteur (superuser ou administrateur staff)
    """
    denied = _deny_if_not_app_admin(request)
    if denied:
        return denied

    try:
        emetteur = Emetteur.objects.get(id=emetteur_id)
    except Emetteur.DoesNotExist:
        return Response({'error': 'Émetteur introuvable'}, status=status.HTTP_404_NOT_FOUND)

    emetteur.is_active = not emetteur.is_active
    emetteur.save(update_fields=['is_active'])

    return Response({
        'success': True,
        'message': 'Émetteur activé' if emetteur.is_active else 'Émetteur désactivé',
        'emetteur': {
            'id': emetteur.id,
            'is_active': emetteur.is_active
        }
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def update_user_mobile_access_view(request, user_id):
    """
    GET : Récupérer les droits mobiles d'un utilisateur.
    PUT : Mettre à jour les droits mobiles d'un utilisateur (admin requis).
    """
    denied = _deny_if_not_app_admin(request)
    if denied:
        return denied

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)

    access, _ = UserMobileAccess.objects.get_or_create(user=target_user)

    if request.method == 'GET':
        return Response({
            'success': True,
            'user_id': target_user.id,
            'mobile_access': {
                'can_access_rapports': access.can_access_rapports,
                'can_access_distributeur': access.can_access_distributeur,
                'can_access_drive': access.can_access_drive,
            }
        })

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return Response({'error': 'Données JSON invalides'}, status=status.HTTP_400_BAD_REQUEST)

    if 'can_access_rapports' in data:
        access.can_access_rapports = bool(data['can_access_rapports'])
    if 'can_access_distributeur' in data:
        access.can_access_distributeur = bool(data['can_access_distributeur'])
    if 'can_access_drive' in data:
        access.can_access_drive = bool(data['can_access_drive'])
    access.save()

    return Response({
        'success': True,
        'message': 'Droits mobiles mis à jour',
        'mobile_access': {
            'can_access_rapports': access.can_access_rapports,
            'can_access_distributeur': access.can_access_distributeur,
            'can_access_drive': access.can_access_drive,
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_user_staff_view(request, user_id):
    """
    Activer / désactiver le rôle administrateur applicatif (is_staff) pour un utilisateur.
    Interdit sur les superusers et sur soi-même.
    """
    denied = _deny_if_not_app_admin(request)
    if denied:
        return denied

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)

    if target_user.is_superuser:
        return Response(
            {'error': 'Le rôle administrateur des superutilisateurs ne peut pas être modifié ici.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if target_user.id == request.user.id:
        return Response(
            {'error': 'Vous ne pouvez pas retirer ou vous attribuer le rôle administrateur vous-même.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    target_user.is_staff = not target_user.is_staff
    target_user.save(update_fields=['is_staff'])

    return Response({
        'success': True,
        'message': 'Rôle administrateur accordé' if target_user.is_staff else 'Rôle administrateur retiré',
        'user': {
            'id': target_user.id,
            'is_staff': target_user.is_staff,
        },
    })
