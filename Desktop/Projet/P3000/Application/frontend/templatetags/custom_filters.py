from django import template
from datetime import datetime, timedelta
import calendar

register = template.Library()

@register.filter
def get_week_dates(week, year):
    """
    Retourne les dates de la semaine ISO donnée
    """
    # Calculer le premier jour de la semaine ISO
    jan4 = datetime(year, 1, 4)
    jan4_weekday = jan4.weekday()  # 0 = lundi, 6 = dimanche
    week1_start = jan4 - timedelta(days=jan4_weekday)
    
    # Calculer le début de la semaine demandée
    week_start = week1_start + timedelta(weeks=week-1)
    
    # Retourner les 7 jours de la semaine
    dates = []
    for i in range(7):
        dates.append(week_start + timedelta(days=i))
    
    return dates

@register.filter
def get_date(dates_list, index):
    """
    Retourne la date à l'index donné dans la liste des dates
    """
    if index < len(dates_list):
        return dates_list[index]
    return None

@register.filter
def get_item(dictionary, key):
    """
    Retourne la valeur d'une clé dans un dictionnaire
    """
    return dictionary.get(key, '#ffffff')
