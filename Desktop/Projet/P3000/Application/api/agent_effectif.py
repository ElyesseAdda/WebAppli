"""Helpers pour l'effectif agents : périodes d'inactivité + miroirs is_active / date_desactivation."""
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
    """True si aucune période d'inactivité ne couvre la date."""
    on_date = _as_date(on_date or timezone.localdate())
    return not agent.periodes_inactivite.filter(date_debut__lte=on_date).filter(
        Q(date_fin__isnull=True) | Q(date_fin__gte=on_date)
    ).exists()


def is_visible_for_range(agent: Agent, start, end) -> bool:
    """
    True s'il existe au moins un jour actif dans [start, end].
    Ex. inactif jusqu'au 31/08 inclus → visible sur une semaine qui contient le 01/09.
    """
    start = _as_date(start)
    end = _as_date(end)
    if end < start:
        return False

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

    # Fallback legacy
    if agent.is_active:
        return True
    if agent.date_desactivation and start <= agent.date_desactivation <= end:
        return True
    if agent.date_desactivation and agent.date_desactivation > end:
        return True
    return False


def filter_agents_visible_for_range(queryset: QuerySet, start, end) -> QuerySet:
    """
    Agents visibles sur [start, end] :
    - avec périodes : inclus s'il reste au moins un jour actif dans la plage
    - sans périodes : fallback legacy
    """
    start = _as_date(start)
    end = _as_date(end)

    agents = list(queryset.prefetch_related('periodes_inactivite'))
    visible_ids = [a.pk for a in agents if is_visible_for_range(a, start, end)]
    return queryset.filter(pk__in=visible_ids)


def sync_agent_status(agent: Agent, today: Optional[date] = None) -> Agent:
    """
    Recalcule is_active et date_desactivation à partir des périodes et de today.
    - Inactif si une période couvre today → date_desactivation = début de cette période
    - Sinon actif → date_desactivation = None (historique conservé dans les périodes)
    """
    today = _as_date(today or timezone.localdate())
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


def validate_no_overlap(
    agent: Agent,
    date_debut: date,
    date_fin: Optional[date],
    exclude_periode_id: Optional[int] = None,
) -> Optional[str]:
    """Retourne un message d'erreur si la plage chevauche une période existante."""
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
