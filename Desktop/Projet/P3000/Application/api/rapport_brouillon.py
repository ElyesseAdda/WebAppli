"""Utilitaires pour les brouillons de rapport (hors modèle ``RapportIntervention``)."""

from datetime import datetime


def compute_champs_manquants(payload):
    """Liste des clés de champs encore manquantes pour une validation finale.

    Équivalent logique au ``RapportInterventionCreateSerializer`` hors statut
    brouillon.
    """
    if not isinstance(payload, dict):
        return ["payload"]

    missing = []
    p = payload
    type_rapport = p.get("type_rapport") or "intervention"

    dates = p.get("dates_intervention")
    has_date = False
    if isinstance(dates, list):
        for d in dates:
            if d and str(d).strip()[:10]:
                s = str(d).strip()[:10]
                try:
                    datetime.strptime(s, "%Y-%m-%d")
                    has_date = True
                    break
                except ValueError:
                    pass
    if not has_date:
        missing.append("dates_intervention")

    devis_a_faire = bool(p.get("devis_a_faire"))
    devis_fait = bool(p.get("devis_fait"))
    devis_lie = p.get("devis_lie")
    if devis_a_faire and devis_fait and not devis_lie:
        missing.append("devis_lie")

    if type_rapport == "vigik_plus":
        if not (p.get("adresse_vigik") or "").strip():
            missing.append("adresse_vigik")
        if p.get("presence_portail") is None:
            missing.append("presence_portail")
        if p.get("presence_portail") is True and p.get("presence_platine_portail") is None:
            missing.append("presence_platine_portail")
        return missing

    if not (p.get("technicien") or "").strip():
        missing.append("technicien")
    if not (p.get("objet_recherche") or "").strip():
        missing.append("objet_recherche")

    return missing
