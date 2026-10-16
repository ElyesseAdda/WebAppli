"""
Système unifié des devis : copie isolée Partie / SousPartie / LigneDetail.

Les devis legacy (structure_isolee=False) continuent de référencer le catalogue.
Les nouveaux devis reçoivent des copies scopées par devis_id.
"""
from __future__ import annotations

from copy import deepcopy
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Iterable, List, Optional, Tuple

from django.db import transaction

from .models import Devis, DevisLigne, LigneDetail, Partie, SousPartie


def devis_has_structure_isolee(devis: Devis) -> bool:
    """True si le devis utilise des copies isolées (flag ou présence de structure unifiée)."""
    if getattr(devis, "structure_isolee", False):
        return True
    return (
        Partie.objects.filter(devis=devis).exists()
        or SousPartie.objects.filter(devis=devis).exists()
        or LigneDetail.objects.filter(devis=devis).exists()
    )


def _to_decimal(value, default="0") -> Decimal:
    if value is None or value == "":
        return Decimal(default)
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


def _index_as_int(value, fallback: int) -> int:
    """index_global sur Partie/SousPartie/LigneDetail est un IntegerField (>0 = unifié)."""
    try:
        number = float(value)
        if number > 0:
            return max(1, int(round(number * 1000)))
    except (TypeError, ValueError):
        pass
    return max(1, int(fallback))


def _partie_numero(value) -> int:
    if value is None or value == "":
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _build_parties_metadata_from_lignes(lignes_payload: List[dict]) -> dict:
    """Construit un parties_metadata minimal à partir des IDs des lignes."""
    selected = []
    parties_seen: Dict[int, dict] = {}

    for ligne in lignes_payload:
        raw_id = ligne.get("ligne_detail") or ligne.get("ligne_detail_id")
        if not raw_id:
            continue
        try:
            ld = LigneDetail._base_manager.select_related(
                "sous_partie", "sous_partie__partie", "partie"
            ).get(id=int(raw_id))
        except (LigneDetail.DoesNotExist, TypeError, ValueError):
            continue

        partie = ld.partie or (ld.sous_partie.partie if ld.sous_partie_id else None)
        sous_partie = ld.sous_partie
        if not partie or not sous_partie:
            continue

        partie_entry = parties_seen.get(partie.id)
        if not partie_entry:
            partie_entry = {
                "id": partie.id,
                "titre": partie.titre or "",
                "type": partie.type or "PEINTURE",
                "index_global": partie.index_global or (len(parties_seen) + 1),
                "numero": partie.numero or (len(parties_seen) + 1),
                "sousParties": [],
            }
            parties_seen[partie.id] = partie_entry
            selected.append(partie_entry)

        sp_entry = next(
            (sp for sp in partie_entry["sousParties"] if sp["id"] == sous_partie.id),
            None,
        )
        if not sp_entry:
            sp_entry = {
                "id": sous_partie.id,
                "description": sous_partie.description or "",
                "index_global": sous_partie.index_global
                or (float(partie_entry["index_global"]) + (len(partie_entry["sousParties"]) + 1) * 0.1),
                "numero": sous_partie.numero,
                "lignesDetails": [],
            }
            partie_entry["sousParties"].append(sp_entry)

        if ld.id not in sp_entry["lignesDetails"]:
            sp_entry["lignesDetails"].append(ld.id)

    return {"selectedParties": selected}


def _remap_special_line_keys(
    bucket: Optional[dict],
    partie_map: Dict[int, int],
    sous_partie_map: Dict[int, int],
) -> dict:
    """Réécrit les clés parties / sousParties (str d'ids) après clonage."""
    if not bucket or not isinstance(bucket, dict):
        return {"global": [], "parties": {}, "sousParties": {}}

    result = {
        "global": deepcopy(bucket.get("global", [])),
        "parties": {},
        "sousParties": {},
    }

    for key, lines in (bucket.get("parties") or {}).items():
        try:
            old_id = int(key)
            new_id = partie_map.get(old_id, old_id)
            result["parties"][str(new_id)] = deepcopy(lines)
        except (TypeError, ValueError):
            result["parties"][key] = deepcopy(lines)

    for key, lines in (bucket.get("sousParties") or {}).items():
        try:
            old_id = int(key)
            new_id = sous_partie_map.get(old_id, old_id)
            result["sousParties"][str(new_id)] = deepcopy(lines)
        except (TypeError, ValueError):
            result["sousParties"][key] = deepcopy(lines)

    return result


def _clone_ligne_detail(
    source: LigneDetail,
    *,
    devis: Devis,
    sous_partie: SousPartie,
    partie: Partie,
    quantite: Decimal,
    index_global: int,
    numero: Optional[str] = None,
) -> LigneDetail:
    return LigneDetail.objects.create(
        sous_partie=sous_partie,
        partie=partie,
        description=source.description,
        unite=source.unite,
        cout_main_oeuvre=source.cout_main_oeuvre,
        cout_materiel=source.cout_materiel,
        taux_fixe=source.taux_fixe,
        marge=source.marge,
        prix=source.prix,
        is_deleted=False,
        index_global=index_global,
        numero=numero or source.numero,
        devis=devis,
        quantite=quantite,
    )


@transaction.atomic
def materialize_unified_structure(
    devis: Devis,
    lignes_payload: Iterable[dict],
    parties_metadata: Optional[dict] = None,
    lignes_speciales: Optional[dict] = None,
    lignes_display: Optional[dict] = None,
) -> Tuple[dict, dict, dict, List[dict], Dict[str, Dict[int, int]]]:
    """
    Crée une structure isolée pour le devis.

    Retourne metadata, lignes_speciales, lignes_display, lignes remappées,
    et les maps {partie|sous_partie|ligne}.
    """
    lignes_list = list(lignes_payload or [])
    metadata = deepcopy(parties_metadata) if parties_metadata else {}
    if not metadata.get("selectedParties"):
        metadata = _build_parties_metadata_from_lignes(lignes_list)

    selected_parties = metadata.get("selectedParties") or []
    empty_speciales = {"global": [], "parties": {}, "sousParties": {}}

    if not selected_parties and not lignes_list:
        devis.structure_isolee = True
        devis.parties_metadata = {"selectedParties": []}
        devis.save(update_fields=["structure_isolee", "parties_metadata"])
        return metadata, empty_speciales, empty_speciales, [], {
            "partie": {},
            "sous_partie": {},
            "ligne": {},
        }

    ligne_by_source: Dict[int, dict] = {}
    for ligne in lignes_list:
        raw_id = ligne.get("ligne_detail") or ligne.get("ligne_detail_id")
        if raw_id is None:
            continue
        try:
            ligne_by_source[int(raw_id)] = ligne
        except (TypeError, ValueError):
            continue

    source_ligne_ids = set(ligne_by_source.keys())
    for partie_meta in selected_parties:
        for sp_meta in partie_meta.get("sousParties") or []:
            for lid in sp_meta.get("lignesDetails") or []:
                try:
                    source_ligne_ids.add(int(lid))
                except (TypeError, ValueError):
                    continue

    sources = {
        ld.id: ld
        for ld in LigneDetail._base_manager.select_related(
            "sous_partie", "sous_partie__partie", "partie"
        ).filter(id__in=source_ligne_ids)
    }

    partie_map: Dict[int, int] = {}
    sous_partie_map: Dict[int, int] = {}
    ligne_map: Dict[int, int] = {}
    remapped_parties: List[dict] = []
    created_partie_ids: List[int] = []
    created_sous_partie_ids: List[int] = []
    created_ligne_ids: List[int] = []

    partie_order = 0
    for partie_meta in selected_parties:
        partie_order += 1
        try:
            source_partie_id = int(partie_meta["id"])
        except (KeyError, TypeError, ValueError):
            continue

        try:
            source_partie = Partie._base_manager.get(id=source_partie_id)
        except Partie.DoesNotExist:
            continue

        partie_index = _index_as_int(
            partie_meta.get("index_global", source_partie.index_global),
            partie_order,
        )
        cloned_partie = Partie.objects.create(
            titre=partie_meta.get("titre") or source_partie.titre,
            type=partie_meta.get("type") or source_partie.type or "PEINTURE",
            is_deleted=False,
            index_global=partie_index,
            numero=_partie_numero(
                partie_meta.get("numero", source_partie.numero or partie_order)
            ),
            devis=devis,
        )
        partie_map[source_partie_id] = cloned_partie.id
        created_partie_ids.append(cloned_partie.id)

        remapped_sous: List[dict] = []
        sp_order = 0
        for sp_meta in partie_meta.get("sousParties") or []:
            sp_order += 1
            try:
                source_sp_id = int(sp_meta["id"])
            except (KeyError, TypeError, ValueError):
                continue

            try:
                source_sp = SousPartie._base_manager.get(id=source_sp_id)
            except SousPartie.DoesNotExist:
                continue

            sp_index = _index_as_int(
                sp_meta.get("index_global", source_sp.index_global),
                partie_index + sp_order,
            )
            numero_sp = sp_meta.get("numero", source_sp.numero)
            cloned_sp = SousPartie.objects.create(
                partie=cloned_partie,
                description=sp_meta.get("description") or source_sp.description,
                is_deleted=False,
                index_global=sp_index,
                numero=str(numero_sp) if numero_sp not in (None, "") else source_sp.numero,
                devis=devis,
            )
            sous_partie_map[source_sp_id] = cloned_sp.id
            created_sous_partie_ids.append(cloned_sp.id)

            remapped_ligne_ids: List[int] = []
            ligne_order = 0
            for raw_ligne_id in sp_meta.get("lignesDetails") or []:
                try:
                    source_ligne_id = int(raw_ligne_id)
                except (TypeError, ValueError):
                    continue

                source_ld = sources.get(source_ligne_id)
                if not source_ld:
                    continue

                payload = ligne_by_source.get(source_ligne_id, {})
                quantite = _to_decimal(payload.get("quantite"), "1")
                ligne_order += 1
                ld_index = _index_as_int(
                    payload.get("index_global", source_ld.index_global),
                    sp_index + ligne_order,
                )
                numero_ld = payload.get("numero") or source_ld.numero
                cloned_ld = _clone_ligne_detail(
                    source_ld,
                    devis=devis,
                    sous_partie=cloned_sp,
                    partie=cloned_partie,
                    quantite=quantite,
                    index_global=ld_index,
                    numero=str(numero_ld) if numero_ld not in (None, "") else None,
                )
                ligne_map[source_ligne_id] = cloned_ld.id
                created_ligne_ids.append(cloned_ld.id)
                remapped_ligne_ids.append(cloned_ld.id)

            remapped_sous.append(
                {
                    **deepcopy(sp_meta),
                    "id": cloned_sp.id,
                    "description": cloned_sp.description,
                    "index_global": sp_meta.get("index_global", cloned_sp.index_global),
                    "numero": cloned_sp.numero,
                    "lignesDetails": remapped_ligne_ids,
                }
            )

        remapped_parties.append(
            {
                **deepcopy(partie_meta),
                "id": cloned_partie.id,
                "titre": cloned_partie.titre,
                "type": cloned_partie.type,
                "index_global": partie_meta.get("index_global", cloned_partie.index_global),
                "numero": cloned_partie.numero,
                "sousParties": remapped_sous,
            }
        )

    orphan_sources = [
        sid for sid in ligne_by_source.keys() if sid not in ligne_map
    ]
    if orphan_sources:
        catchall_partie = Partie.objects.create(
            titre="Autres",
            type="PEINTURE",
            is_deleted=False,
            index_global=_index_as_int(None, len(remapped_parties) + 1),
            numero=len(remapped_parties) + 1,
            devis=devis,
        )
        created_partie_ids.append(catchall_partie.id)
        catchall_sp = SousPartie.objects.create(
            partie=catchall_partie,
            description="Lignes",
            is_deleted=False,
            index_global=_index_as_int(None, catchall_partie.index_global + 1),
            numero=f"{catchall_partie.numero}.1",
            devis=devis,
        )
        created_sous_partie_ids.append(catchall_sp.id)
        orphan_ligne_ids = []
        for order, source_ligne_id in enumerate(orphan_sources, start=1):
            source_ld = sources.get(source_ligne_id)
            if not source_ld:
                continue
            payload = ligne_by_source[source_ligne_id]
            cloned_ld = _clone_ligne_detail(
                source_ld,
                devis=devis,
                sous_partie=catchall_sp,
                partie=catchall_partie,
                quantite=_to_decimal(payload.get("quantite"), "1"),
                index_global=_index_as_int(payload.get("index_global"), order),
            )
            ligne_map[source_ligne_id] = cloned_ld.id
            created_ligne_ids.append(cloned_ld.id)
            orphan_ligne_ids.append(cloned_ld.id)

        remapped_parties.append(
            {
                "id": catchall_partie.id,
                "titre": catchall_partie.titre,
                "type": catchall_partie.type,
                "index_global": catchall_partie.index_global,
                "numero": catchall_partie.numero,
                "sousParties": [
                    {
                        "id": catchall_sp.id,
                        "description": catchall_sp.description,
                        "index_global": catchall_sp.index_global,
                        "numero": catchall_sp.numero,
                        "lignesDetails": orphan_ligne_ids,
                    }
                ],
            }
        )

    # Payload lignes remappé en conservant l'ordre d'origine
    remapped_lignes: List[dict] = []
    for ligne in lignes_list:
        raw_id = ligne.get("ligne_detail") or ligne.get("ligne_detail_id")
        try:
            source_id = int(raw_id)
        except (TypeError, ValueError):
            continue
        clone_id = ligne_map.get(source_id)
        if not clone_id:
            continue
        new_ligne = dict(ligne)
        new_ligne["ligne_detail"] = clone_id
        remapped_lignes.append(new_ligne)

    LigneDetail.objects.filter(devis=devis).exclude(id__in=created_ligne_ids).delete()
    SousPartie.objects.filter(devis=devis).exclude(id__in=created_sous_partie_ids).delete()
    Partie.objects.filter(devis=devis).exclude(id__in=created_partie_ids).delete()

    remapped_metadata = {"selectedParties": remapped_parties}
    remapped_speciales = _remap_special_line_keys(
        lignes_speciales, partie_map, sous_partie_map
    )
    remapped_display = _remap_special_line_keys(
        lignes_display, partie_map, sous_partie_map
    )

    devis.structure_isolee = True
    devis.parties_metadata = remapped_metadata
    devis.lignes_speciales = remapped_speciales
    devis.lignes_display = remapped_display
    devis.save(
        update_fields=[
            "structure_isolee",
            "parties_metadata",
            "lignes_speciales",
            "lignes_display",
        ]
    )

    return (
        remapped_metadata,
        remapped_speciales,
        remapped_display,
        remapped_lignes,
        {"partie": partie_map, "sous_partie": sous_partie_map, "ligne": ligne_map},
    )


def create_devis_lignes(devis: Devis, lignes_payload: Iterable[dict]) -> List[DevisLigne]:
    """Crée les DevisLigne à partir d'un payload déjà remappé."""
    created = []
    for ligne in lignes_payload or []:
        raw_id = ligne.get("ligne_detail") or ligne.get("ligne_detail_id")
        if raw_id is None:
            continue
        data = {
            "devis": devis,
            "ligne_detail_id": int(raw_id),
            "quantite": _to_decimal(ligne.get("quantite"), "0"),
            "prix_unitaire": _to_decimal(ligne.get("prix_unitaire"), "0"),
        }
        if ligne.get("index_global") is not None:
            try:
                index_global = float(ligne["index_global"])
                if index_global >= 0:
                    data["index_global"] = Decimal(str(index_global))
            except (TypeError, ValueError):
                pass
        created.append(DevisLigne.objects.create(**data))
    return created


def apply_unified_on_create(devis: Devis, request_data: dict) -> Dict[str, Any]:
    """Matérialise la structure isolée puis crée les DevisLigne (création)."""
    lignes = request_data.get("lignes") or []
    # Préférer ce qui a déjà été filtré/posé sur le devis (create_devis),
    # puis le payload brut en secours.
    parties_metadata = devis.parties_metadata or request_data.get("parties_metadata") or {}
    lignes_speciales = devis.lignes_speciales or request_data.get("lignes_speciales") or {}
    lignes_display = devis.lignes_display or request_data.get("lignes_display") or {}

    _, _, _, remapped_lignes, maps = materialize_unified_structure(
        devis,
        lignes,
        parties_metadata=parties_metadata,
        lignes_speciales=lignes_speciales,
        lignes_display=lignes_display,
    )

    DevisLigne.objects.filter(devis=devis).delete()
    create_devis_lignes(devis, remapped_lignes)

    return {
        "structure_isolee": True,
        "mode": "unified",
        "cloned_lignes": len(maps.get("ligne") or {}),
        "lignes_count": DevisLigne.objects.filter(devis=devis).count(),
    }


def apply_unified_on_update(
    devis: Devis,
    validated_lignes: Optional[List[dict]],
    parties_metadata: Optional[dict],
    lignes_speciales: Optional[dict],
    lignes_display: Optional[dict],
) -> None:
    """Rematérialise la structure isolée lors d'un update de devis unifié."""
    normalized = []
    for ligne in validated_lignes or []:
        item = dict(ligne)
        ld = item.get("ligne_detail")
        if hasattr(ld, "id"):
            item["ligne_detail"] = ld.id
        normalized.append(item)

    meta = parties_metadata if parties_metadata is not None else devis.parties_metadata
    speciales = lignes_speciales if lignes_speciales is not None else devis.lignes_speciales
    display = lignes_display if lignes_display is not None else devis.lignes_display

    _, _, _, remapped_lignes, _ = materialize_unified_structure(
        devis,
        normalized,
        parties_metadata=meta,
        lignes_speciales=speciales,
        lignes_display=display,
    )

    DevisLigne.objects.filter(devis=devis).delete()
    create_devis_lignes(devis, remapped_lignes)
