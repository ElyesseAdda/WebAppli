"""
Synchronisation des montants des appels d'offres et des chantiers à partir du devis de chantier.
Utilisé par la commande de gestion, l'API et le signal Devis.
"""
from django.db import transaction

from .models import AppelOffres, Chantier, Devis


def sync_chantier_montants_from_devis(devis):
    """
    Met à jour montant_ht et montant_ttc du chantier à partir du devis de marché
    (devis avec devis_chantier=True) lorsqu'il est modifié.

    Returns:
        bool: True si au moins un montant a été mis à jour, False sinon.
    """
    if not getattr(devis, 'devis_chantier', False) or not getattr(devis, 'chantier_id', None):
        return False
    try:
        chantier = Chantier.objects.get(id=devis.chantier_id)
    except Chantier.DoesNotExist:
        return False
    if devis.price_ht is None and devis.price_ttc is None:
        return False
    updated = False
    if devis.price_ht is not None and chantier.montant_ht != float(devis.price_ht):
        chantier.montant_ht = float(devis.price_ht)
        updated = True
    if devis.price_ttc is not None and chantier.montant_ttc != float(devis.price_ttc):
        chantier.montant_ttc = float(devis.price_ttc)
        updated = True
    if updated:
        chantier.save(update_fields=['montant_ht', 'montant_ttc'])
    return updated


def sync_single_appel_offres_from_devis(appel_offres):
    """
    Met à jour montant_ht et montant_ttc d'un appel d'offres à partir du devis
    de chantier (devis_chantier=True) du chantier transformé, si existant.

    Returns:
        bool: True si au moins un montant a été mis à jour, False sinon.
    """
    if not appel_offres.chantier_transformé_id:
        return False
    devis = Devis.objects.filter(
        chantier=appel_offres.chantier_transformé,
        devis_chantier=True
    ).first()
    if not devis or (devis.price_ht is None and devis.price_ttc is None):
        return False
    updated = False
    if devis.price_ht is not None and appel_offres.montant_ht != float(devis.price_ht):
        appel_offres.montant_ht = float(devis.price_ht)
        updated = True
    if devis.price_ttc is not None and appel_offres.montant_ttc != float(devis.price_ttc):
        appel_offres.montant_ttc = float(devis.price_ttc)
        updated = True
    if updated:
        appel_offres.save(update_fields=['montant_ht', 'montant_ttc'])
    return updated


def _get_devis_for_appel_offres(appel_offres):
    """
    Retourne le devis le plus pertinent pour un appel d'offres :
    - Si transformé en chantier → devis de chantier (devis_chantier=True) du chantier lié
    - Sinon → devis lié directement via la FK appel_offres, le plus récent en premier
    """
    if appel_offres.chantier_transformé_id:
        return Devis.objects.filter(
            chantier=appel_offres.chantier_transformé,
            devis_chantier=True
        ).first()
    return Devis.objects.filter(
        appel_offres=appel_offres
    ).order_by('-date_creation').first()


def sync_appel_offres_montants_depuis_devis(dry_run=False):
    """
    Rafraîchit les montants (montant_ht, montant_ttc) de tous les appels d'offres
    à partir de leur devis associé :
      - AO transformé en chantier → devis de chantier (devis_chantier=True) du chantier lié
      - AO non transformé → devis lié directement (FK appel_offres), le plus récent

    Args:
        dry_run: si True, ne sauvegarde pas les modifications.

    Returns:
        dict: {
            'updated': nombre d'appels d'offres mis à jour,
            'skipped': nombre sans devis ou déjà à jour,
            'errors': nombre d'erreurs,
            'details': liste de { 'id', 'chantier_name', 'updated', 'error'? }
        }
    """
    result = {'updated': 0, 'skipped': 0, 'errors': 0, 'details': []}
    qs = AppelOffres.objects.select_related('chantier_transformé').all()
    for appel_offres in qs:
        try:
            devis = _get_devis_for_appel_offres(appel_offres)
            if not devis:
                result['skipped'] += 1
                result['details'].append({
                    'id': appel_offres.id,
                    'chantier_name': appel_offres.chantier_name,
                    'updated': False,
                    'reason': 'aucun devis associé',
                })
                continue
            if devis.price_ht is None and devis.price_ttc is None:
                result['skipped'] += 1
                result['details'].append({
                    'id': appel_offres.id,
                    'chantier_name': appel_offres.chantier_name,
                    'updated': False,
                    'reason': 'devis sans montants',
                })
                continue
            new_ht = float(devis.price_ht) if devis.price_ht is not None else appel_offres.montant_ht
            new_ttc = float(devis.price_ttc) if devis.price_ttc is not None else appel_offres.montant_ttc
            if appel_offres.montant_ht == new_ht and appel_offres.montant_ttc == new_ttc:
                result['skipped'] += 1
                result['details'].append({
                    'id': appel_offres.id,
                    'chantier_name': appel_offres.chantier_name,
                    'updated': False,
                    'reason': 'déjà à jour',
                })
                continue
            if not dry_run:
                with transaction.atomic():
                    appel_offres.montant_ht = new_ht
                    appel_offres.montant_ttc = new_ttc
                    appel_offres.save(update_fields=['montant_ht', 'montant_ttc'])
            result['updated'] += 1
            result['details'].append({
                'id': appel_offres.id,
                'chantier_name': appel_offres.chantier_name,
                'updated': True,
                'montant_ht': new_ht,
                'montant_ttc': new_ttc,
            })
        except Exception as e:
            result['errors'] += 1
            result['details'].append({
                'id': appel_offres.id,
                'chantier_name': getattr(appel_offres, 'chantier_name', '?'),
                'updated': False,
                'error': str(e),
            })
    return result
