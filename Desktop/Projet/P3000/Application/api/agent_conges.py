"""Règles de congés payés agents : acquisition mensuelle et déduction des prises."""
from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from .agent_effectif import contrat_covers_day
from .models import Agent, AgentCongeAjustement, AgentCongeSetup, Event

CONGES_PAR_MOIS = Decimal("2.50")
PLAFOND_ANNUEL = Decimal("30.00")
QUANTIZE = Decimal("0.01")
SOLDE_INITIAL_MOTIF = "Solde à ce jour"
KPI_FIELDS = {
    "acquis": "acquis_clos",
    "en_cours": "en_cours",
    "previsionnel": "previsionnel",
    "pris": "pris",
}

CONGE_PAYE_SUBTYPES = {None, "", "paye"}
ACQUISITION_EXCLUDED = {
    ("absence", "injustifiee"),
    ("conge", "sans_solde"),
}

CONGE_SUBTYPE_LABELS = {
    "paye": "Payé",
    "sans_solde": "Sans solde",
    "parental": "Parental",
    "maternite": "Maternité",
    "paternite": "Paternité",
}

EVENT_TYPE_LABELS = {
    "presence": "Présence",
    "absence": "Absence",
    "conge": "Congé",
    "ecole": "École",
}

EVENT_SUBTYPE_LABELS = {
    **CONGE_SUBTYPE_LABELS,
    "justifiee": "Justifiée",
    "injustifiee": "Injustifiée",
    "maladie": "Maladie",
    "rtt": "RTT",
}

MOIS_LABELS = (
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
)


def _q(value) -> Decimal:
    return Decimal(value).quantize(QUANTIZE, rounding=ROUND_HALF_UP)


def _to_float(value: Decimal) -> float:
    return float(_q(value))


def is_weekday(day: date) -> bool:
    return day.weekday() < 5


def each_date(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def count_weekdays(start: date, end: date) -> int:
    if end < start:
        return 0
    return sum(1 for day in each_date(start, end) if is_weekday(day))


def agent_covers_day(agent: Agent, day: date) -> bool:
    contrats = list(agent.contrats.all())
    dated = [c for c in contrats if c.date_debut_contrat]
    if dated:
        return any(contrat_covers_day(c, day) for c in dated)
    return True


def event_covers_day(event: Event, day: date) -> bool:
    start = event.start_date
    end = event.end_date or event.start_date
    return start <= day <= end


def is_paid_leave(event: Event) -> bool:
    return event.event_type == "conge" and (event.subtype in CONGE_PAYE_SUBTYPES)


def excludes_acquisition(event: Event) -> bool:
    return (event.event_type, event.subtype or "") in ACQUISITION_EXCLUDED


def reference_period(ref: date) -> tuple[date, date]:
    """Période légale : 1er juin → 31 mai suivant (reset au 31 mai)."""
    if ref.month >= 6:
        return date(ref.year, 6, 1), date(ref.year + 1, 5, 31)
    return date(ref.year - 1, 6, 1), date(ref.year, 5, 31)


def _event_designation(event: Event) -> str:
    type_label = EVENT_TYPE_LABELS.get(event.event_type, event.event_type)
    sub = EVENT_SUBTYPE_LABELS.get(event.subtype or "", "")
    return f"{type_label} · {sub}" if sub else type_label


def _pick_day_event(day_events: list[Event]) -> Event | None:
    for kind in ("absence", "conge", "ecole"):
        for event in day_events:
            if event.event_type == kind:
                return event
    return None


def _group_daily_items(items: list[dict]) -> list[dict]:
    items = sorted(items, key=lambda x: (x["date"], x["designation"]))
    groups: list[dict] = []
    for item in items:
        last = groups[-1] if groups else None
        consecutive = (
            last
            and last["designation"] == item["designation"]
            and item["date"] == last["end"] + timedelta(days=1)
        )
        weekend_bridge = (
            last
            and last["designation"] == item["designation"]
            and item["date"].weekday() == 0
            and last["end"].weekday() == 4
            and item["date"] == last["end"] + timedelta(days=3)
        )
        if consecutive or weekend_bridge:
            last["end"] = item["date"]
            last["days"] += 1
            continue
        groups.append(
            {
                "start": item["date"],
                "end": item["date"],
                "days": 1,
                "designation": item["designation"],
                "compte": item["compte"],
                "type": item["type"],
            }
        )
    return [
        {
            "start": g["start"].isoformat(),
            "end": g["end"].isoformat(),
            "days": g["days"],
            "designation": g["designation"],
            "compte": g["compte"],
            "type": g["type"],
        }
        for g in groups
    ]


def _month_detail(
    *,
    acquis: Decimal,
    pris_month: int,
    weekdays_month: int,
    covered: int,
    excluded: int,
    presence_days: int,
    absence_days: int,
    conge_days: int,
    ecole_days: int,
    hors_contrat: int,
    jours_ecoules: int,
    recap_items: list[dict],
    statut: str,
    phase: str,
    cap_applique: bool,
    month_start: date,
    effective_end: date,
) -> dict:
    countable = max(0, covered - excluded)
    return {
        "du": month_start.isoformat(),
        "au": effective_end.isoformat(),
        "jours_ouvres_mois": weekdays_month,
        "jours_ecoules": jours_ecoules,
        "jours_contrat": covered,
        "hors_contrat": hors_contrat,
        "presence": presence_days,
        "absence": absence_days,
        "conge": conge_days,
        "ecole": ecole_days,
        "non_acquis": excluded,
        "jours_comptes": countable,
        "pris": pris_month,
        "acquis": _to_float(acquis),
        "taux": _to_float(CONGES_PAR_MOIS),
        "plafond": cap_applique,
        "statut": statut,
        "phase": phase,
        "evenements": _group_daily_items(recap_items),
    }


def iter_period_months(period_start: date, period_end: date):
    year, month = period_start.year, period_start.month
    while True:
        last_day = monthrange(year, month)[1]
        month_start = date(year, month, 1)
        month_end = date(year, month, last_day)
        if month_start > period_end:
            break
        yield year, month, month_start, month_end
        month += 1
        if month > 12:
            month = 1
            year += 1


def _safe_date(year: int, month: int, day: int) -> date:
    last_day = monthrange(year, month)[1]
    return date(year, month, min(day, last_day))


def build_agent_conges(
    agent: Agent,
    year: int | None = None,
    today: date | None = None,
    ref_date: date | None = None,
    apply_setup: bool = True,
) -> dict:
    today = today or timezone.localdate()
    if ref_date is None and year:
        ref_date = _safe_date(year, today.month, today.day)
    ref_date = ref_date or today
    period_start, period_end = reference_period(ref_date)

    events = list(
        Event.objects.filter(
            agent=agent,
            start_date__lte=period_end,
            end_date__gte=period_start,
        )
    )
    ajustements = list(
        agent.conge_ajustements.filter(date__gte=period_start, date__lte=period_end)
    )

    mois = []
    acquis_total = Decimal("0.00")
    pris_total = Decimal("0.00")

    for year, month, month_start, month_end in iter_period_months(period_start, period_end):
        label = f"{MOIS_LABELS[month - 1]} {year}"
        if month_start > today:
            mois.append(
                {
                    "mois": month,
                    "annee": year,
                    "label": label,
                    "acquis": 0,
                    "pris": 0,
                    "jours_ouvres_mois": count_weekdays(month_start, month_end),
                    "jours_ouvres_contrat": 0,
                    "statut": "futur",
                    "phase": "futur",
                }
            )
            continue

        effective_end = min(month_end, today)
        weekdays_month = count_weekdays(month_start, month_end)
        covered = 0
        excluded = 0
        pris_month = 0
        presence_days = 0
        absence_days = 0
        conge_days = 0
        ecole_days = 0
        hors_contrat = 0
        jours_ecoules = 0
        recap_items = []

        for day in each_date(month_start, effective_end):
            if not is_weekday(day):
                continue
            jours_ecoules += 1
            if not agent_covers_day(agent, day):
                hors_contrat += 1
                continue
            covered += 1
            day_events = [e for e in events if event_covers_day(e, day)]
            excluded_day = any(excludes_acquisition(e) for e in day_events)
            if excluded_day:
                excluded += 1
            if any(is_paid_leave(e) for e in day_events):
                pris_month += 1
            picked = _pick_day_event(day_events)
            if picked:
                if picked.event_type == "absence":
                    absence_days += 1
                elif picked.event_type == "conge":
                    conge_days += 1
                elif picked.event_type == "ecole":
                    ecole_days += 1
                recap_items.append(
                    {
                        "date": day,
                        "designation": _event_designation(picked),
                        "compte": not excluded_day,
                        "type": picked.event_type,
                    }
                )
            else:
                presence_days += 1

        countable = max(0, covered - excluded)
        acquis_month = Decimal("0.00")
        statut = "aucun"
        if weekdays_month and countable:
            acquis_month = _q(CONGES_PAR_MOIS * Decimal(countable) / Decimal(weekdays_month))
            if acquis_month > CONGES_PAR_MOIS:
                acquis_month = CONGES_PAR_MOIS
            statut = "complet" if countable >= weekdays_month else "prorata"
        elif covered:
            statut = "non_acquis"

        remaining_cap = PLAFOND_ANNUEL - acquis_total
        if remaining_cap < 0:
            remaining_cap = Decimal("0.00")
        cap_applique = acquis_month > remaining_cap
        if cap_applique:
            acquis_month = remaining_cap

        if month_end < today:
            phase = "clos"
        elif month_start <= today <= month_end:
            phase = "en_cours"
            if statut in ("complet", "prorata"):
                statut = "en_cours"
        else:
            phase = "previsionnel"

        acquis_total += acquis_month
        pris_total += Decimal(pris_month)

        mois.append(
            {
                "mois": month,
                "annee": year,
                "label": label,
                "acquis": _to_float(acquis_month),
                "pris": pris_month,
                "jours_ouvres_mois": weekdays_month,
                "jours_ouvres_contrat": covered,
                "jours_non_acquis": excluded,
                "statut": statut,
                "phase": phase,
                "detail": _month_detail(
                    acquis=acquis_month,
                    pris_month=pris_month,
                    weekdays_month=weekdays_month,
                    covered=covered,
                    excluded=excluded,
                    presence_days=presence_days,
                    absence_days=absence_days,
                    conge_days=conge_days,
                    ecole_days=ecole_days,
                    hors_contrat=hors_contrat,
                    jours_ecoules=jours_ecoules,
                    recap_items=recap_items,
                    statut=statut,
                    phase=phase,
                    cap_applique=cap_applique,
                    month_start=month_start,
                    effective_end=effective_end,
                ),
            }
        )

    previsionnel = Decimal("0.00")
    for month_info in mois:
        if month_info.get("phase") != "previsionnel" and month_info.get("statut") != "futur":
            continue
        year = month_info["annee"]
        month = month_info["mois"]
        last_day = monthrange(year, month)[1]
        month_start = date(year, month, 1)
        month_end = date(year, month, last_day)
        weekdays_month = count_weekdays(month_start, month_end)
        covered = sum(
            1
            for day in each_date(month_start, month_end)
            if is_weekday(day) and agent_covers_day(agent, day)
        )
        acquis_month = Decimal("0.00")
        if weekdays_month and covered:
            acquis_month = _q(CONGES_PAR_MOIS * Decimal(covered) / Decimal(weekdays_month))
            if acquis_month > CONGES_PAR_MOIS:
                acquis_month = CONGES_PAR_MOIS
        remaining_cap = PLAFOND_ANNUEL - acquis_total - previsionnel
        if remaining_cap < 0:
            remaining_cap = Decimal("0.00")
        if acquis_month > remaining_cap:
            acquis_month = remaining_cap
        month_info.update(
            {
                "acquis": _to_float(acquis_month),
                "jours_ouvres_mois": weekdays_month,
                "jours_ouvres_contrat": covered,
                "statut": "previsionnel" if covered else "futur",
                "phase": "previsionnel" if covered else "futur",
            }
        )
        if covered:
            previsionnel += acquis_month

    prises = _group_paid_leaves(events, period_start, min(period_end, today))
    autres_conges = _list_other_leaves(events, period_start, min(period_end, today))

    ajustements_sum = sum((a.jours_signed for a in ajustements), Decimal("0.00"))
    acquis_clos = sum(
        (Decimal(str(m["acquis"])) for m in mois if m.get("phase") == "clos"),
        Decimal("0.00"),
    )
    en_cours_mois = sum(
        (Decimal(str(m["acquis"])) for m in mois if m.get("phase") == "en_cours"),
        Decimal("0.00"),
    )
    acquis_annee = _q(acquis_clos + en_cours_mois)
    en_cours_annee = _q(en_cours_mois + previsionnel)
    solde = _q(acquis_annee + ajustements_sum - pris_total)

    payload = {
        "year": period_end.year,
        "periode_label": f"juin {period_start.year} – mai {period_end.year}",
        "periode_courte": f"{period_start.year}-{period_end.year}",
        "reset_le": f"31 mai {period_end.year}",
        "reset_date": period_end.isoformat(),
        "periode_debut": period_start.isoformat(),
        "periode_fin": period_end.isoformat(),
        "regle": {
            "jours_par_mois": _to_float(CONGES_PAR_MOIS),
            "plafond_annuel": _to_float(PLAFOND_ANNUEL),
            "unite": "jours ouvrés (lundi-vendredi)",
            "periode": "1er juin – 31 mai",
            "reset": "31 mai",
            "description": (
                "2,5 jours acquis par mois civil travaillé (Code du travail), "
                "prorata si le contrat ne couvre pas tout le mois. "
                "Plafond 30 jours / période (1er juin – 31 mai). "
                "Un jour de congé payé posé (lun-ven) déduit 1 jour. "
                "Les absences injustifiées et congés sans solde n'ouvrent pas de droit. "
                "Les compteurs se réinitialisent chaque 31 mai ; le solde non pris "
                "n'est pas reporté automatiquement."
            ),
        },
        "acquis": _to_float(acquis_annee),
        "acquis_clos": _to_float(acquis_clos),
        "en_cours": _to_float(en_cours_mois),
        "en_cours_annee": _to_float(en_cours_annee),
        "previsionnel": _to_float(previsionnel),
        "pris": _to_float(pris_total),
        "ajustements": _to_float(ajustements_sum),
        "solde": _to_float(solde),
        "mois": mois,
        "prises": prises,
        "autres_conges": autres_conges,
        "ajustements_list": [
            {
                "id": a.id,
                "type_mouvement": a.type_mouvement,
                "jours": _to_float(a.jours),
                "jours_signed": _to_float(a.jours_signed),
                "date": a.date.isoformat(),
                "motif": a.motif or "",
                "initial": a.motif == SOLDE_INITIAL_MOTIF,
            }
            for a in ajustements
        ],
        "solde_initial": None,
    }
    initial_adj = next((a for a in ajustements if a.motif == SOLDE_INITIAL_MOTIF), None)
    if initial_adj:
        payload["solde_initial"] = {
            "id": initial_adj.id,
            "date": initial_adj.date.isoformat(),
            "delta": _to_float(initial_adj.jours_signed),
        }
    if apply_setup:
        setup = AgentCongeSetup.objects.filter(agent=agent, period_start=period_start).first()
        payload = _apply_setup(payload, setup)
    else:
        payload["setup"] = {key: False for key in KPI_FIELDS}
    return payload


def _apply_setup(payload: dict, setup: AgentCongeSetup | None) -> dict:
    flags = {key: False for key in KPI_FIELDS}
    if not setup:
        payload["setup"] = flags
        return payload

    live = {
        "acquis": Decimal(str(payload["acquis_clos"])),
        "en_cours": Decimal(str(payload["en_cours"])),
        "previsionnel": Decimal(str(payload["previsionnel"])),
        "pris": Decimal(str(payload["pris"])),
    }
    has_override = False
    for field in KPI_FIELDS:
        stored = getattr(setup, field)
        flags[field] = stored is not None
        if stored is None:
            continue
        has_override = True
        stored_live = getattr(setup, f"{field}_live") or Decimal("0.00")
        displayed = _q(stored + live[field] - stored_live)
        if displayed < 0:
            displayed = Decimal("0.00")
        if field == "acquis":
            payload["acquis_clos"] = _to_float(displayed)
        else:
            payload[field] = _to_float(displayed)

    payload["setup"] = flags
    payload["acquis"] = _to_float(
        _q(Decimal(str(payload["acquis_clos"])) + Decimal(str(payload["en_cours"])))
    )
    payload["en_cours_annee"] = _to_float(
        _q(Decimal(str(payload["en_cours"])) + Decimal(str(payload["previsionnel"])))
    )
    adj = Decimal(str(payload["ajustements"]))
    if has_override:
        adj = sum(
            (Decimal(str(item["jours_signed"])) for item in payload["ajustements_list"] if not item.get("initial")),
            Decimal("0.00"),
        )
        payload["ajustements"] = _to_float(adj)
    payload["solde"] = _to_float(
        _q(
            Decimal(str(payload["acquis_clos"]))
            + Decimal(str(payload["en_cours"]))
            + adj
            - Decimal(str(payload["pris"]))
        )
    )
    return payload


def set_agent_kpi(agent: Agent, field: str, jours, today: date | None = None) -> dict:
    """Enregistre un compteur de départ ; le calcul automatique continue ensuite."""
    if field not in KPI_FIELDS:
        raise ValueError("Indicateur invalide")
    jours = _q(jours)
    if jours < 0:
        raise ValueError("Le nombre de jours ne peut pas être négatif")

    today = today or timezone.localdate()
    live = build_agent_conges(agent, today=today, ref_date=today, apply_setup=False)
    period_start = date.fromisoformat(live["periode_debut"])
    setup, _ = AgentCongeSetup.objects.get_or_create(agent=agent, period_start=period_start)
    live_key = KPI_FIELDS[field]
    setattr(setup, field, jours)
    setattr(setup, f"{field}_live", _q(Decimal(str(live[live_key]))))
    setup.save()
    return build_agent_conges(agent, today=today, ref_date=today)


def set_agent_solde_initial(agent: Agent, target, today: date | None = None) -> dict:
    """Fixe le solde disponible à ce jour ; l'acquisition continue ensuite."""
    today = today or timezone.localdate()
    target = _q(target)
    if target < 0:
        raise ValueError("Le solde ne peut pas être négatif")

    data = build_agent_conges(agent, today=today, ref_date=today)
    period_start = date.fromisoformat(data["periode_debut"])
    period_end = date.fromisoformat(data["periode_fin"])
    existing_qs = agent.conge_ajustements.filter(
        date__gte=period_start,
        date__lte=period_end,
        motif=SOLDE_INITIAL_MOTIF,
    )
    existing_sum = sum((a.jours_signed for a in existing_qs), Decimal("0.00"))
    solde_sans = _q(Decimal(str(data["solde"])) - existing_sum)
    delta = _q(target - solde_sans)
    existing_qs.delete()
    if delta != 0:
        AgentCongeAjustement.objects.create(
            agent=agent,
            type_mouvement="ajout" if delta > 0 else "retrait",
            jours=abs(delta),
            date=today,
            motif=SOLDE_INITIAL_MOTIF,
        )
    return build_agent_conges(agent, today=today, ref_date=today)


def _group_paid_leaves(events, start: date, end: date) -> list[dict]:
    days = []
    for event in events:
        if not is_paid_leave(event):
            continue
        event_start = max(event.start_date, start)
        event_end = min(event.end_date or event.start_date, end)
        for day in each_date(event_start, event_end):
            if is_weekday(day):
                days.append(day)
    unique = sorted(set(days))
    groups = []
    for day in unique:
        if groups and day == groups[-1]["end"] + timedelta(days=1):
            groups[-1]["end"] = day
            groups[-1]["days"] += 1
        elif groups and day.weekday() == 0 and groups[-1]["end"].weekday() == 4 and day == groups[-1]["end"] + timedelta(days=3):
            groups[-1]["end"] = day
            groups[-1]["days"] += 1
        else:
            groups.append(
                {
                    "start": day,
                    "end": day,
                    "days": 1,
                    "designation": "Congé · Payé",
                }
            )
    return [
        {
            "start": g["start"].isoformat(),
            "end": g["end"].isoformat(),
            "days": g["days"],
            "designation": g["designation"],
        }
        for g in groups
    ]


def _list_other_leaves(events, start: date, end: date) -> list[dict]:
    groups = []
    others = [e for e in events if e.event_type == "conge" and not is_paid_leave(e)]
    others.sort(key=lambda e: (e.start_date, e.subtype or ""))
    for event in others:
        event_start = max(event.start_date, start)
        event_end = min(event.end_date or event.start_date, end)
        days = count_weekdays(event_start, event_end)
        if not days:
            continue
        label = CONGE_SUBTYPE_LABELS.get(event.subtype, event.subtype or "Congé")
        groups.append(
            {
                "start": event_start.isoformat(),
                "end": event_end.isoformat(),
                "days": days,
                "designation": f"Congé · {label}",
                "deduit": False,
            }
        )
    return groups
