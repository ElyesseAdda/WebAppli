"""Attribution des numéros de devis et de facture.

Le prochain numéro n'est plus le max() brut de tous les libellés en base.
Un numéro saisi ou importé avec une séquence absurde (année, horodatage,
chiffres collés) ne fait plus avancer la série.

Le numéro définitif est attribué à l'enregistrement, sous verrou, dans la
même transaction que la création du document.
"""

import re

from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Devis, Facture, Situation
from .models_numero import DocumentNumeroCompteur

# Au-delà, une séquence lue dans un libellé est considérée comme aberrante
# (année, timestamp, concaténation) et n'alimente pas le compteur.
# Le compteur peut ensuite dépasser cette valeur par incréments successifs.
PLAUSIBLE_MAX = 999

_DEVIS_OFFICIEL = re.compile(
    r'^Devis de travaux n\u00b0(\d{1,4})(?!\d)\.(\d{4})(?: - TS n\u00b0(\d{1,3})(?!\d))?$'
)
_FACTURE_OFFICIELLE = re.compile(
    r'^Facture n\u00b0(\d{1,4})(?!\d)\.(\d{4})$'
)
_SITUATION_OFFICIELLE = re.compile(
    r'^Facture n\u00b0(\d{1,4})(?!\d)\.(\d{4}) - Situation n\u00b0(\d{1,4})(?!\d)$'
)
_SCAN_DEVIS = re.compile(
    r'(?:Devis de travaux n\u00b0|Devis n\u00b0)(\d{1,4})(?!\d)\.(\d{4})'
)
_SCAN_DEVIS_ANCIEN = re.compile(r'^DEV-(\d{1,4})(?!\d)-(\d{2})$')
_SCAN_FACTURE = re.compile(r'Facture n\u00b0(\d{1,4})(?!\d)\.(\d{4})')
_SCAN_TS = re.compile(r'TS n\u00b0(\d{1,3})(?!\d)\s*$')
_SCAN_SITUATION = re.compile(r'Situation n\u00b0(\d{1,4})(?!\d)')
_PREFIXE_DEVIS = re.compile(r'^Devis( de travaux)? n\u00b0')
_PREFIXE_FACTURE = re.compile(r'^Facture n\u00b0')


class NumeroDejaUtilise(Exception):
    """Numéro manuel déjà porté par un autre document."""


def is_numero_devis_officiel(numero):
    return bool(_DEVIS_OFFICIEL.match((numero or '').strip()))


def format_devis_numero(sequence, year, ts_num=None):
    base = f"Devis de travaux n\u00b0{int(sequence):03d}.{int(year)}"
    if ts_num:
        return f"{base} - TS n\u00b0{int(ts_num):02d}"
    return base


def format_facture_numero(sequence, year):
    return f"Facture n\u00b0{int(sequence):02d}.{int(year)}"


def format_situation_numero(sequence, year, sit_num):
    return (
        f"{format_facture_numero(sequence, year)} - Situation n\u00b0{int(sit_num):02d}"
    )


def _annee(year=None):
    return int(year or timezone.now().year)


def _entier(valeur):
    try:
        return int(valeur)
    except (TypeError, ValueError):
        return None


def _max_plausible(valeurs, plafond=PLAUSIBLE_MAX):
    retenues = [v for v in valeurs if 1 <= v <= plafond]
    return max(retenues) if retenues else 0


def _prochain_libre(utilises, plancher):
    seq = int(plancher) + 1
    if seq < 1:
        seq = 1
    while seq in utilises:
        seq += 1
        if seq > 100000:
            raise ValueError("Compteur de numéros épuisé")
    return seq


def _sequences_devis(year):
    sequences = set()
    suffixe = f"{year % 100:02d}"
    for numero in Devis.objects.values_list('numero', flat=True).iterator():
        if not numero:
            continue
        match = _SCAN_DEVIS.search(numero)
        if match and int(match.group(2)) == year:
            sequences.add(int(match.group(1)))
            continue
        ancien = _SCAN_DEVIS_ANCIEN.match(numero.strip())
        if ancien and ancien.group(2) == suffixe:
            sequences.add(int(ancien.group(1)))
    return sequences


def _sequences_facture(year):
    sequences = set()
    for numero in Facture.objects.values_list('numero', flat=True).iterator():
        if not numero:
            continue
        match = _SCAN_FACTURE.search(numero)
        if match and int(match.group(2)) == year:
            sequences.add(int(match.group(1)))
    for numero in Situation.objects.values_list('numero_situation', flat=True).iterator():
        if not numero:
            continue
        match = _SCAN_FACTURE.search(numero)
        if match and int(match.group(2)) == year:
            sequences.add(int(match.group(1)))
    return sequences


def _numeros_ts(chantier_id, year):
    numeros = set()
    if not chantier_id:
        return numeros
    qs = Devis.objects.filter(
        chantier_id=chantier_id,
        devis_chantier=False,
        numero__contains=f".{year}",
    ).values_list('numero', flat=True)
    for numero in qs.iterator():
        if not numero:
            continue
        match = _SCAN_TS.search(numero)
        if match:
            numeros.add(int(match.group(1)))
    return numeros


def _numeros_situation_chantier(chantier_id):
    numeros = set()
    if not chantier_id:
        return numeros
    qs = Situation.objects.filter(chantier_id=chantier_id).values_list(
        'numero_situation', flat=True
    )
    for numero in qs.iterator():
        if not numero:
            continue
        match = _SCAN_SITUATION.search(numero)
        if match:
            numeros.add(int(match.group(1)))
    return numeros


def _plancher(serie, year, utilises):
    compteur = DocumentNumeroCompteur.objects.filter(serie=serie, annee=year).first()
    stocke = compteur.dernier_numero if compteur else 0
    return max(stocke, _max_plausible(utilises))


def _verrouiller_compteur(serie, year):
    for _ in range(3):
        compteur = (
            DocumentNumeroCompteur.objects.select_for_update()
            .filter(serie=serie, annee=year)
            .first()
        )
        if compteur is not None:
            return compteur
        try:
            DocumentNumeroCompteur.objects.create(
                serie=serie, annee=year, dernier_numero=0
            )
        except IntegrityError:
            continue
    return DocumentNumeroCompteur.objects.select_for_update().get(
        serie=serie, annee=year
    )


def _reserver_sequence(serie, year, utilises, sequence_demandee=None):
    """Réserve une séquence. À appeler dans une transaction."""
    compteur = _verrouiller_compteur(serie, year)
    plancher = max(compteur.dernier_numero, _max_plausible(utilises))
    attendue = _prochain_libre(utilises, plancher)

    if (
        sequence_demandee
        and sequence_demandee == attendue
        and sequence_demandee not in utilises
    ):
        compteur.dernier_numero = sequence_demandee
        compteur.save(update_fields=['dernier_numero'])
        return sequence_demandee

    compteur.dernier_numero = attendue
    compteur.save(update_fields=['dernier_numero'])
    return attendue


def peek_devis_numero(is_ts=False, chantier_id=None, year=None):
    year = _annee(year)
    utilises = _sequences_devis(year)
    sequence = _prochain_libre(utilises, _plancher(DocumentNumeroCompteur.SERIE_DEVIS, year, utilises))
    ts_num = None
    if is_ts and chantier_id:
        ts_utilises = _numeros_ts(chantier_id, year)
        ts_num = _prochain_libre(ts_utilises, _max_plausible(ts_utilises, plafond=99))
    numero = format_devis_numero(sequence, year, ts_num)
    return {
        'numero': numero,
        'sequence': f"{sequence:03d}",
        'next_ts': f"{ts_num:02d}" if ts_num else None,
        'year': year,
    }


def peek_facture_numero(year=None):
    year = _annee(year)
    utilises = _sequences_facture(year)
    sequence = _prochain_libre(
        utilises,
        _plancher(DocumentNumeroCompteur.SERIE_FACTURE, year, utilises),
    )
    return {
        'numero': format_facture_numero(sequence, year),
        'sequence': f"{sequence:02d}",
        'year': year,
    }


def peek_situation_numero(chantier_id, year=None):
    year = _annee(year)
    facture = peek_facture_numero(year)
    sequence = int(facture['sequence'])
    sit_utilises = _numeros_situation_chantier(chantier_id)
    sit_num = _prochain_libre(sit_utilises, _max_plausible(sit_utilises))
    return {
        'numero': format_situation_numero(sequence, year, sit_num),
        'sequence': facture['sequence'],
        'situation': f"{sit_num:02d}",
        'year': year,
    }


def claim_devis_numero(requested, *, is_ts=False, chantier_id=None, year=None):
    """Retourne le numéro à enregistrer. Réserve la séquence sous verrou."""
    year = _annee(year)
    requested = (requested or '').strip()
    parsed = _DEVIS_OFFICIEL.match(requested)

    if requested and parsed is None and not _PREFIXE_DEVIS.match(requested):
        if Devis.objects.filter(numero=requested).exists():
            raise NumeroDejaUtilise(f"Numéro de devis déjà existant: {requested}")
        return requested

    with transaction.atomic():
        _verrouiller_compteur(DocumentNumeroCompteur.SERIE_DEVIS, year)
        utilises = _sequences_devis(year)
        sequence_demandee = None
        if parsed and int(parsed.group(2)) == year:
            sequence_demandee = int(parsed.group(1))

        ts_demande = _entier(parsed.group(3)) if parsed and parsed.group(3) else None
        ts_utilises = _numeros_ts(chantier_id, year) if is_ts and chantier_id else set()
        ts_attendu = None
        if is_ts and chantier_id:
            ts_attendu = _prochain_libre(ts_utilises, _max_plausible(ts_utilises, plafond=99))

        attendue = _prochain_libre(
            utilises,
            _plancher(DocumentNumeroCompteur.SERIE_DEVIS, year, utilises),
        )
        honorer = (
            sequence_demandee == attendue
            and sequence_demandee not in utilises
            and (
                not is_ts
                or (ts_demande == ts_attendu and ts_demande not in ts_utilises)
            )
            and not Devis.objects.filter(numero=requested).exists()
        )
        sequence = _reserver_sequence(
            DocumentNumeroCompteur.SERIE_DEVIS,
            year,
            utilises,
            sequence_demandee if honorer else None,
        )
        if is_ts and chantier_id:
            ts_num = ts_demande if honorer else ts_attendu
            return format_devis_numero(sequence, year, ts_num)
        return format_devis_numero(sequence, year)


def claim_facture_numero(requested=None, year=None):
    """Réserve le prochain numéro de facture partagé avec les situations."""
    year = _annee(year)
    requested = (requested or '').strip()
    parsed = _FACTURE_OFFICIELLE.match(requested)

    if requested and parsed is None and not _PREFIXE_FACTURE.match(requested):
        if Facture.objects.filter(numero=requested).exists():
            raise NumeroDejaUtilise(f"Numéro de facture déjà existant: {requested}")
        return requested

    with transaction.atomic():
        _verrouiller_compteur(DocumentNumeroCompteur.SERIE_FACTURE, year)
        utilises = _sequences_facture(year)
        sequence_demandee = None
        if parsed and int(parsed.group(2)) == year:
            sequence_demandee = int(parsed.group(1))
        attendue = _prochain_libre(
            utilises,
            _plancher(DocumentNumeroCompteur.SERIE_FACTURE, year, utilises),
        )
        honorer = (
            sequence_demandee == attendue
            and sequence_demandee not in utilises
            and not Facture.objects.filter(numero=requested).exists()
        )
        sequence = _reserver_sequence(
            DocumentNumeroCompteur.SERIE_FACTURE,
            year,
            utilises,
            sequence_demandee if honorer else None,
        )
        return format_facture_numero(sequence, year)


def claim_situation_numero(requested, chantier_id, year=None):
    """Réserve le numéro de facture partagé et le n° de situation du chantier."""
    year = _annee(year)
    requested = (requested or '').strip()
    parsed = _SITUATION_OFFICIELLE.match(requested)

    if requested and parsed is None and not _PREFIXE_FACTURE.match(requested):
        if Situation.objects.filter(numero_situation=requested).exists():
            raise NumeroDejaUtilise(f"Numéro de situation déjà existant: {requested}")
        return requested

    with transaction.atomic():
        _verrouiller_compteur(DocumentNumeroCompteur.SERIE_FACTURE, year)
        facture_utilises = _sequences_facture(year)
        sit_utilises = _numeros_situation_chantier(chantier_id)
        sit_attendu = _prochain_libre(sit_utilises, _max_plausible(sit_utilises))
        facture_attendue = _prochain_libre(
            facture_utilises,
            _plancher(DocumentNumeroCompteur.SERIE_FACTURE, year, facture_utilises),
        )

        sit_num = sit_attendu
        if parsed:
            sit_demande = int(parsed.group(3))
            if 1 <= sit_demande <= PLAUSIBLE_MAX and sit_demande not in sit_utilises:
                sit_num = sit_demande

        sequence_demandee = None
        if (
            parsed
            and int(parsed.group(2)) == year
            and int(parsed.group(1)) == facture_attendue
            and sit_num == (int(parsed.group(3)) if parsed else None)
        ):
            sequence_demandee = facture_attendue

        sequence = _reserver_sequence(
            DocumentNumeroCompteur.SERIE_FACTURE,
            year,
            facture_utilises,
            sequence_demandee,
        )
        numero = format_situation_numero(sequence, year, sit_num)
        if Situation.objects.filter(numero_situation=numero).exists():
            sit_num = _prochain_libre(sit_utilises, _max_plausible(sit_utilises))
            numero = format_situation_numero(sequence, year, sit_num)
        return numero
