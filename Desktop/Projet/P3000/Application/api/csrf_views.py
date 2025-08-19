from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import ensure_csrf_cookie


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token_view(request):
    """
    Vue pour générer et retourner un token CSRF
    """
    from django.middleware.csrf import get_token
    get_token(request)
    return Response({'detail': 'CSRF token generated'})
