"""
Montants planning sur le chantier d'une agence — aligné sur schedule_yearly_summary (api.views).
"""

from datetime import date, datetime as dt, timedelta as td

import holidays
from django.db.models import Q

from ..models import Schedule


def planning_montant_chantier_periode(chantier_id: int, date_start: date, date_end: date) -> float:
    """
    Somme des montants planning (créneaux Schedule) pour un chantier donné,
    sur l'intervalle [date_start, date_end] inclus (même formules que l'écran Agences).
    """
    if not chantier_id or not date_start or not date_end:
        return 0.0

    years = list(range(date_start.year, date_end.year + 1))
    fr_holidays = holidays.country_holidays("FR", years=years)

    def get_date_from_week(yr, week, day_name):
        days_of_week = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        day_index = days_of_week.index(day_name)
        lundi = dt.strptime(f"{yr}-W{int(week):02d}-1", "%G-W%V-%u")
        return (lundi + td(days=day_index)).date()

    week_year_pairs = set()
    d = date_start
    while d <= date_end:
        week_year_pairs.add((d.isocalendar()[0], d.isocalendar()[1]))
        d += td(days=1)

    q_objects = Q()
    for iso_year, iso_week in week_year_pairs:
        q_objects |= Q(year=iso_year, week=iso_week)

    schedules = (
        Schedule.objects.filter(q_objects, chantier_id=chantier_id)
        .select_related("agent", "chantier")
    )

    total_m = 0.0
    for s in schedules:
        if not s.chantier_id:
            continue
        try:
            date_creneau = get_date_from_week(s.year, s.week, s.day)
        except (ValueError, IndexError):
            continue
        if date_creneau < date_start or date_creneau > date_end:
            continue

        is_journalier = s.agent.type_paiement == "journalier"
        if is_journalier:
            heures_increment = 4
            taux_horaire = (s.agent.taux_journalier or 0) / 8
        else:
            heures_increment = 1
            taux_horaire = s.agent.taux_Horaire or 0

        has_overtime = s.overtime_hours and s.overtime_hours > 0

        if is_journalier:
            if not has_overtime:
                total_m += float(taux_horaire * heures_increment)
        else:
            if not has_overtime:
                if date_creneau in fr_holidays:
                    total_m += float(taux_horaire * heures_increment * 1.5)
                elif s.day == "Samedi":
                    total_m += float(taux_horaire * heures_increment * 1.25)
                elif s.day == "Dimanche":
                    total_m += float(taux_horaire * heures_increment * 1.5)
                else:
                    total_m += float(taux_horaire * heures_increment)
        if has_overtime:
            overtime_hours = float(s.overtime_hours)
            total_m += float(taux_horaire * overtime_hours * 1.25)

    return total_m
