from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import UserNotification
from .serializers import UserNotificationSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    queryset = (
        UserNotification.objects.filter(recipient=request.user)
        .select_related('actor', 'chantier', 'devis')[:80]
    )
    unread_count = UserNotification.objects.filter(
        recipient=request.user,
        is_read=False,
    ).count()
    return Response({
        'results': UserNotificationSerializer(queryset, many=True).data,
        'unread_count': unread_count,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    updated = UserNotification.objects.filter(
        id=notification_id,
        recipient=request.user,
    ).update(is_read=True)
    if not updated:
        return Response({'error': 'Notification introuvable'}, status=404)
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    UserNotification.objects.filter(
        recipient=request.user,
        is_read=False,
    ).update(is_read=True)
    return Response({'ok': True})
