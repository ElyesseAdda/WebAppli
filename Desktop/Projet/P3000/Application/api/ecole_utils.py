"""
Utilitaires pour la gestion des événements "École" des alternants
"""

from datetime import date, datetime
from django.db import models
from .models import Chantier, Agent, AgencyExpense, Schedule, Event
import logging

logger = logging.getLogger(__name__)

def get_or_create_ecole_chantier():
    """
    Récupère ou crée le chantier système "École"
    """
    ecole_chantier, created = Chantier.objects.get_or_create(
        chantier_name="École - Formation",
        defaults={
            'is_system_chantier': True,
            'chantier_type': 'ecole',
            'ville': 'Système',
            'rue': 'Système',
            'state_chantier': 'En Cours',
            'description': 'Chantier système pour les heures d\'école des alternants'
        }
    )
    
    if created:
        logger.info(f"Chantier système 'École' créé avec l'ID {ecole_chantier.id}")
    else:
        logger.info(f"Chantier système 'École' trouvé avec l'ID {ecole_chantier.id}")
    
    return ecole_chantier

def create_ecole_assignments(agent_id, start_date, end_date):
    """
    Crée les assignations automatiques d'école pour un agent sur une période
    
    Args:
        agent_id (int): ID de l'agent
        start_date (date): Date de début
        end_date (date): Date de fin
    
    Returns:
        int: Nombre d'assignations créées
    """
    ecole_chantier = get_or_create_ecole_chantier()
    agent = Agent.objects.get(id=agent_id)
    
    # SUPPRIMER tous les événements existants pour cet agent sur cette période
    # (y compris les événements école existants pour éviter les doublons)
    events_deleted = Event.objects.filter(
        agent_id=agent_id,
        start_date__lte=end_date,
        end_date__gte=start_date
    ).delete()[0]
    
    if events_deleted > 0:
        logger.info(f"Suppression de {events_deleted} événements existants pour {agent.name} sur la période {start_date} à {end_date}")
    
    # Créneaux d'école pour agents horaires : 8h-12h (4h) et 13h-16h (3h) = 7h par jour
    ecole_hours = [
        '8:00', '9:00', '10:00', '11:00',  # Matin : 4h
        '13:00', '14:00', '15:00'          # Après-midi : 3h
    ]
    
    assignments_created = 0
    current_date = start_date
    
    while current_date <= end_date:
        # Vérifier que ce n'est pas un weekend (optionnel)
        if current_date.weekday() < 5:  # Lundi = 0, Vendredi = 4
            # Calculer la semaine ISO
            from datetime import datetime
            week_iso = current_date.isocalendar()[1]
            year_iso = current_date.isocalendar()[0]
            
            # Mapper le jour de la semaine
            days_mapping = {
                0: 'Lundi', 1: 'Mardi', 2: 'Mercredi', 3: 'Jeudi', 4: 'Vendredi'
            }
            day_name = days_mapping[current_date.weekday()]
            
            # SUPPRIMER les assignations existantes pour ce jour avant d'ajouter les nouvelles
            deleted_count = Schedule.objects.filter(
                agent_id=agent_id,
                week=week_iso,
                year=year_iso,
                day=day_name
            ).delete()[0]
            
            if deleted_count > 0:
                logger.info(f"Suppression de {deleted_count} assignations existantes pour {agent.name} - {current_date}")
            
            # Créer les assignations pour chaque créneau d'école
            for hour in ecole_hours:
                assignment, created = Schedule.objects.get_or_create(
                    agent_id=agent_id,
                    week=week_iso,
                    year=year_iso,
                    day=day_name,
                    hour=hour,
                    defaults={
                        'chantier_id': ecole_chantier.id,
                        'is_sav': False
                    }
                )
                
                if created:
                    assignments_created += 1
                    logger.info(f"Assignation école créée: {agent.name} - {current_date} - {hour}")
        
        # Incrémenter la date correctement
        from datetime import timedelta
        current_date = current_date + timedelta(days=1)
    
    # Créer l'événement école en base de données
    ecole_event = Event.objects.create(
        agent=agent,
        start_date=start_date,
        end_date=end_date,
        event_type='ecole',
        subtype=None
    )
    
    logger.info(f"Événement école créé: {ecole_event.id} pour {agent.name} du {start_date} au {end_date}")
    logger.info(f"Total assignations école créées: {assignments_created}")
    return assignments_created

def calculate_ecole_hours_for_agent(agent_id, month, year):
    """
    Calcule les heures d'école réelles pour un agent sur un mois
    
    Args:
        agent_id (int): ID de l'agent
        month (int): Mois (1-12)
        year (int): Année
    
    Returns:
        float: Nombre d'heures d'école
    """
    try:
        ecole_chantier = get_or_create_ecole_chantier()
        agent = Agent.objects.get(id=agent_id)
        
        # Récupérer toutes les assignations "École" pour cet agent ce mois
        # Calculer les semaines ISO qui font partie de ce mois
        from datetime import datetime, timedelta
        from calendar import monthrange
        
        # Obtenir le premier et dernier jour du mois
        first_day = datetime(year, month, 1)
        last_day_num = monthrange(year, month)[1]
        last_day = datetime(year, month, last_day_num)
        
        # Obtenir toutes les semaines ISO qui touchent ce mois
        weeks_in_month = set()
        current = first_day
        while current <= last_day:
            week_iso = current.isocalendar()[1]
            year_iso = current.isocalendar()[0]
            weeks_in_month.add((week_iso, year_iso))
            current += timedelta(days=1)
        
        # Récupérer UNIQUEMENT les assignations des semaines de ce mois
        from django.db.models import Q
        query = Q()
        for week_num, year_num in weeks_in_month:
            query |= Q(week=week_num, year=year_num)
        
        assignments = Schedule.objects.filter(
            agent_id=agent_id,
            chantier_id=ecole_chantier.id
        ).filter(query)
        
        # Pour les agents horaires : 1 assignation = 1h
        total_hours = assignments.count()
        
        logger.info(f"Heures d'école calculées pour l'agent {agent_id}: {total_hours}h")
        return total_hours
        
    except Exception as e:
        logger.error(f"Erreur lors du calcul des heures d'école: {e}")
        return 0

def create_ecole_expense_for_agent(agent_id, month, year):
    """
    Crée ou met à jour la dépense d'école pour un agent
    
    Args:
        agent_id (int): ID de l'agent
        month (int): Mois (1-12)
        year (int): Année
    
    Returns:
        AgencyExpense: Dépense créée ou mise à jour
    """
    try:
        agent = Agent.objects.get(id=agent_id)
        
        # Calculer les heures d'école réelles
        ecole_hours = calculate_ecole_hours_for_agent(agent_id, month, year)
        
        if ecole_hours > 0:
            # Calculer le montant
            amount = ecole_hours * agent.taux_Horaire
            
            # Créer ou mettre à jour la dépense
            expense, created = AgencyExpense.objects.update_or_create(
                agent_id=agent_id,
                is_ecole_expense=True,
                date__month=month,
                date__year=year,
                defaults={
                    'description': f"École - {agent.name} {agent.surname} - {month:02d}/{year}",
                    'amount': amount,
                    'type': 'punctual',  # Dépense ponctuelle, spécifique à ce mois
                    'date': date(year, month, 1),
                    'category': 'Formation',
                    'ecole_hours': ecole_hours
                }
            )
            
            action = "créée" if created else "mise à jour"
            logger.info(f"Dépense école {action} pour {agent.name}: {ecole_hours}h = {amount}€")
            
            return expense
        else:
            # Supprimer la dépense si plus d'heures d'école
            AgencyExpense.objects.filter(
                agent_id=agent_id,
                is_ecole_expense=True,
                date__month=month,
                date__year=year
            ).delete()
            
            logger.info(f"Dépense école supprimée pour l'agent {agent_id} (plus d'heures)")
            return None
            
    except Exception as e:
        logger.error(f"Erreur lors de la création de la dépense école: {e}")
        return None

def recalculate_all_ecole_expenses_for_month(month, year):
    """
    Recalcule toutes les dépenses d'école pour un mois donné
    
    Args:
        month (int): Mois (1-12)
        year (int): Année
    """
    try:
        # Récupérer tous les agents ayant des assignations "École" ce mois
        ecole_chantier = get_or_create_ecole_chantier()
        
        agent_ids = Schedule.objects.filter(
            chantier_id=ecole_chantier.id,
            # Filtrer par mois/année
        ).values_list('agent_id', flat=True).distinct()
        
        logger.info(f"Recalcul des dépenses école pour {len(agent_ids)} agents")
        
        for agent_id in agent_ids:
            create_ecole_expense_for_agent(agent_id, month, year)
            
    except Exception as e:
        logger.error(f"Erreur lors du recalcul des dépenses école: {e}")

def delete_existing_events_for_period(agent_id, start_date, end_date):
    """
    Supprime tous les événements existants pour un agent sur une période
    
    Args:
        agent_id (int): ID de l'agent
        start_date (date): Date de début
        end_date (date): Date de fin
    
    Returns:
        int: Nombre d'événements supprimés
    """
    try:
        events_deleted = Event.objects.filter(
            agent_id=agent_id,
            start_date__lte=end_date,
            end_date__gte=start_date
        ).delete()[0]
        
        if events_deleted > 0:
            logger.info(f"Suppression de {events_deleted} événements existants pour l'agent {agent_id} sur la période {start_date} à {end_date}")
        
        return events_deleted
        
    except Exception as e:
        logger.error(f"Erreur lors de la suppression des événements existants: {e}")
        return 0

def delete_ecole_assignments(agent_id, start_date, end_date):
    """
    Supprime les assignations d'école pour un agent sur une période
    
    Args:
        agent_id (int): ID de l'agent
        start_date (date): Date de début
        end_date (date): Date de fin
    
    Returns:
        int: Nombre d'assignations supprimées
    """
    try:
        ecole_chantier = get_or_create_ecole_chantier()
        
        assignments_deleted = 0
        current_date = start_date
        
        while current_date <= end_date:
            if current_date.weekday() < 5:  # Lundi à Vendredi
                week_iso = current_date.isocalendar()[1]
                year_iso = current_date.isocalendar()[0]
                
                days_mapping = {
                    0: 'Lundi', 1: 'Mardi', 2: 'Mercredi', 3: 'Jeudi', 4: 'Vendredi'
                }
                day_name = days_mapping[current_date.weekday()]
                
                # Supprimer les assignations d'école pour ce jour
                deleted = Schedule.objects.filter(
                    agent_id=agent_id,
                    week=week_iso,
                    year=year_iso,
                    day=day_name,
                    chantier_id=ecole_chantier.id
                ).delete()
                
                assignments_deleted += deleted[0]
            
            # Incrémenter la date correctement
            from datetime import timedelta
            current_date = current_date + timedelta(days=1)
        
        logger.info(f"Total assignations école supprimées: {assignments_deleted}")
        return assignments_deleted
        
    except Exception as e:
        logger.error(f"Erreur lors de la suppression des assignations école: {e}")
        return 0
