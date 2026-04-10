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
from .models import Emetteur
from .serializers import EmetteurSerializer
import json

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
                    'is_superuser': user.is_superuser
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
                'is_superuser': request.user.is_superuser
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
        if not (request.user and request.user.is_authenticated and request.user.is_superuser):
            return Response({
                'error': 'Accès refusé : administrateur requis'
            }, status=status.HTTP_403_FORBIDDEN)

        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        email = data.get('email', '')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        is_staff = bool(data.get('is_staff', False))
        
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
    Lister les utilisateurs (réservé superuser)
    """
    if not (request.user and request.user.is_authenticated and request.user.is_superuser):
        return Response({
            'error': 'Accès refusé : administrateur requis'
        }, status=status.HTTP_403_FORBIDDEN)

    users = User.objects.all().order_by('username')
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
            }
            for u in users
        ]
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_user_active_view(request, user_id):
    """
    Activer / désactiver un utilisateur (réservé superuser)
    """
    if not (request.user and request.user.is_authenticated and request.user.is_superuser):
        return Response({
            'error': 'Accès refusé : administrateur requis'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)

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
    Réinitialiser le mot de passe d'un utilisateur (réservé superuser)
    """
    if not (request.user and request.user.is_authenticated and request.user.is_superuser):
        return Response({
            'error': 'Accès refusé : administrateur requis'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=status.HTTP_404_NOT_FOUND)

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
    Lister / créer des émetteurs (réservé superuser)
    """
    if not (request.user and request.user.is_authenticated and request.user.is_superuser):
        return Response({
            'error': 'Accès refusé : administrateur requis'
        }, status=status.HTTP_403_FORBIDDEN)

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
    Activer / désactiver un émetteur (réservé superuser)
    """
    if not (request.user and request.user.is_authenticated and request.user.is_superuser):
        return Response({
            'error': 'Accès refusé : administrateur requis'
        }, status=status.HTTP_403_FORBIDDEN)

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
