from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from .models import Schedule
from .serializers import ScheduleSerializer

@api_view(['POST'])
@permission_classes([IsAdminUser])  # Restriction aux administrateurs si nécessaire
def copy_schedule(request):
    source_agent_id = request.data.get('sourceAgentId')
    target_agent_id = request.data.get('targetAgentId')
    week = request.data.get('week')
    year = request.data.get('year')

    if not all([source_agent_id, target_agent_id, week, year]):
        return Response({'error': 'Tous les paramètres sont requis.'}, status=400)

    try:
        # Récupérer le planning de l'agent source
        source_schedules = Schedule.objects.filter(agent_id=source_agent_id, week=week, year=year)
        
        # Copier les plannings vers l'agent cible
        for schedule in source_schedules:
            schedule.pk = None  # Définir à None pour créer un nouvel enregistrement
            schedule.agent_id = target_agent_id
            schedule.save()

        return Response({'message': 'Planning copié avec succès.'}, status=200)

    except Exception as e:
        return Response({'error': str(e)}, status=500)