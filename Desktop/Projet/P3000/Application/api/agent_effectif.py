"""Helpers pour l'effectif agents : périodes d'inactivité, contrats, is_active."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from django.db.models import Q, QuerySet
from django.utils import timezone

from .models import Agent, AgentPeriodeInactivite


def _as_date(value) -> date:
    if isinstance(value, date):
        return value
    if hasattr(value, 'date'):
        return value.date()
    return date.fromisoformat(str(value)[:10])


def agent_uses_contrat_visibility(agent: Agent) -> bool:
    """True si au moins un contrat a une date de début (nouveau système)."""
    return agent.contrats.filter(date_debut_contrat__isnull=False).exists()


def get_contrat_fin_effective(contrat) -> Optional[date]:
    """Fin CDD effective (avenants ou date initiale). CDI / sans fin → None."""
    fin = contrat.date_fin_effective
    if fin is None:
        return None
    return _as_date(fin)


def contrat_covers_day(contrat, on_date: date) -> bool:
    """True si la date est dans la plage active du contrat (bornes inclusives)."""
    if not contrat.date_debut_contrat:
        return False
    debut = _as_date(contrat.date_debut_contrat)
    if on_date < debut:
        return False
    if contrat.type_contrat == 'cdd':
        fin = get_contrat_fin_effective(contrat)
        if fin is not None and on_date > fin:
            return False
    return True


def is_active_on_day_via_contrats(agent: Agent, on_date: date) -> bool:
    """True si au moins un contrat couvre la date."""
    on_date = _as_date(on_date)
    for contrat in agent.contrats.all():
        if contrat_covers_day(contrat, on_date):
            return True
    return False


def is_visible_for_range_via_contrats(agent: Agent, start, end) -> bool:
    """True si la plage chevauche au moins un contrat (au moins un jour actif)."""
    start = _as_date(start)
    end = _as_date(end)
    if end < start:
        return False

    for contrat in agent.contrats.all():
        if not contrat.date_debut_contrat:
            continue
        debut = _as_date(contrat.date_debut_contrat)
        if contrat.type_contrat == 'cdd':
            fin = get_contrat_fin_effective(contrat)
            fin_eff = fin if fin is not None else date.max
        else:
            fin_eff = date.max
        if debut <= end and fin_eff >= start:
            return True
    return False


def periodes_chevauchent(
    debut_a: date,
    fin_a: Optional[date],
    debut_b: date,
    fin_b: Optional[date],
) -> bool:
    """True si les deux plages (fin None = ouverte) se chevauchent."""
    fin_a_eff = fin_a or date.max
    fin_b_eff = fin_b or date.max
    return debut_a <= fin_b_eff and debut_b <= fin_a_eff


def has_overlapping_period(
    agent: Agent,
    start: date,
    end: date,
    exclude_periode_id: Optional[int] = None,
) -> bool:
    """True si une période d'inactivité de l'agent chevauche [start, end]."""
    start = _as_date(start)
    end = _as_date(end)
    qs = agent.periodes_inactivite.filter(date_debut__lte=end).filter(
        Q(date_fin__isnull=True) | Q(date_fin__gte=start)
    )
    if exclude_periode_id:
        qs = qs.exclude(pk=exclude_periode_id)
    return qs.exists()


def is_active_on(agent: Agent, on_date: Optional[date] = None) -> bool:
    """True si l'agent est actif à la date donnée."""
    on_date = _as_date(on_date or timezone.localdate())
    if agent_uses_contrat_visibility(agent):
        return is_active_on_day_via_contrats(agent, on_date)
    return not agent.periodes_inactivite.filter(date_debut__lte=on_date).filter(
        Q(date_fin__isnull=True) | Q(date_fin__gte=on_date)
    ).exists()


def is_visible_for_range(agent: Agent, start, end) -> bool:
    """
    True s'il existe au moins un jour actif dans [start, end].
    Contrats (si dates renseignées) sinon périodes d'inactivité / legacy.
    """
    start = _as_date(start)
    end = _as_date(end)
    if end < start:
        return False

    if agent_uses_contrat_visibility(agent):
        return is_visible_for_range_via_contrats(agent, start, end)

    periods = list(agent.periodes_inactivite.all())
    if periods:
        current = start
        while current <= end:
            covered = False
            for p in periods:
                if p.date_debut <= current and (p.date_fin is None or p.date_fin >= current):
                    covered = True
                    break
            if not covered:
                return True
            current += timedelta(days=1)
        return False

    if agent.is_active:
        return True
    if agent.date_desactivation and start <= agent.date_desactivation <= end:
        return True
    if agent.date_desactivation and agent.date_desactivation > end:
        return True
    return False


def filter_agents_visible_for_range(queryset: QuerySet, start, end) -> QuerySet:
    """Agents visibles sur [start, end] (contrats ou périodes / legacy)."""
    start = _as_date(start)
    end = _as_date(end)

    agents = list(
        queryset.prefetch_related('periodes_inactivite', 'contrats__avenants')
    )
    visible_ids = [a.pk for a in agents if is_visible_for_range(a, start, end)]
    return queryset.filter(pk__in=visible_ids)


def sync_agent_status(agent: Agent, today: Optional[date] = None) -> Agent:
    """Recalcule is_active et date_desactivation (contrats ou périodes)."""
    today = _as_date(today or timezone.localdate())

    if agent_uses_contrat_visibility(agent):
        agent.is_active = is_active_on_day_via_contrats(agent, today)
        agent.date_desactivation = None if agent.is_active else today
        agent.save(update_fields=['is_active', 'date_desactivation'])
        return agent

    covering = (
        agent.periodes_inactivite.filter(date_debut__lte=today)
        .filter(Q(date_fin__isnull=True) | Q(date_fin__gte=today))
        .order_by('-date_debut', '-id')
        .first()
    )
    if covering:
        agent.is_active = False
        agent.date_desactivation = covering.date_debut
    else:
        agent.is_active = True
        agent.date_desactivation = None
    agent.save(update_fields=['is_active', 'date_desactivation'])
    return agent


def migrate_agent_to_contrat_visibility(agent: Agent) -> Agent:
    """
    Passe l'agent au système contrats : supprime les périodes d'inactivité
    et recalcule is_active depuis les dates de contrat.
    """
    if not agent_uses_contrat_visibility(agent):
        return sync_agent_status(agent)
    agent.periodes_inactivite.all().delete()
    return sync_agent_status(agent)


def after_agent_contrats_changed(agent: Agent) -> Agent:
    """À appeler après toute modification de contrat ou avenant."""
    agent = Agent.objects.prefetch_related('contrats__avenants', 'periodes_inactivite').get(
        pk=agent.pk
    )
    return migrate_agent_to_contrat_visibility(agent)


def validate_no_overlap(
    agent: Agent,
    date_debut: date,
    date_fin: Optional[date],
    exclude_periode_id: Optional[int] = None,
) -> Optional[str]:
    """Retourne un message d'erreur si la plage chevauche une période existante."""
    if agent_uses_contrat_visibility(agent):
        return (
            "L'effectif de cet agent est géré par les dates de contrat "
            "(carte agent). Modifiez les contrats plutôt que les périodes d'inactivité."
        )
    date_debut = _as_date(date_debut)
    date_fin = _as_date(date_fin) if date_fin else None
    if date_fin is not None and date_fin < date_debut:
        return 'La date de fin doit être postérieure ou égale à la date de début'
    if has_overlapping_period(agent, date_debut, date_fin or date.max, exclude_periode_id):
        return 'Cette période chevauche une période d\'inactivité existante'
    return None


def create_periode(
    agent: Agent,
    date_debut,
    date_fin=None,
    motif: str = '',
) -> AgentPeriodeInactivite:
    """Crée une période après validation, puis synchronise le statut courant."""
    date_debut = _as_date(date_debut)
    date_fin = _as_date(date_fin) if date_fin else None
    error = validate_no_overlap(agent, date_debut, date_fin)
    if error:
        raise ValueError(error)
    periode = AgentPeriodeInactivite.objects.create(
        agent=agent,
        date_debut=date_debut,
        date_fin=date_fin,
        motif=motif or '',
    )
    sync_agent_status(agent)
    return periode


def close_open_periodes(agent: Agent, date_fin=None) -> int:
    """Ferme toutes les périodes ouvertes avec date_fin (défaut: today). Retourne le nombre fermé."""
    if agent_uses_contrat_visibility(agent):
        return 0
    date_fin = _as_date(date_fin or timezone.localdate())
    updated = 0
    for periode in agent.periodes_inactivite.filter(date_fin__isnull=True):
        if date_fin < periode.date_debut:
            periode.date_fin = periode.date_debut
        else:
            periode.date_fin = date_fin
        periode.save(update_fields=['date_fin'])
        updated += 1
    sync_agent_status(agent)
    return updated
