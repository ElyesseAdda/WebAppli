"""
Médias brouillon (S3) : chemins dédiés, enrichissement URLs, transfert vers RapportIntervention à la promotion.
"""
import base64
import uuid
from datetime import date

from .models_rapport import PhotoRapport
from .utils import copy_s3_file, generate_presigned_url_for_display, get_s3_bucket_name, get_s3_client, is_s3_available


def _safe_presign(s3_key):
    if not s3_key:
        return None
    try:
        return generate_presigned_url_for_display(s3_key)
    except Exception:
        return None


def enrich_draft_media_with_presigned_urls(draft_media):
    """Ajoute des URLs présignées pour affichage client (GET brouillon)."""
    if not isinstance(draft_media, dict):
        return draft_media
    out = dict(draft_media)
    if out.get("signature_s3_key"):
        out["signature_presigned_url"] = _safe_presign(out["signature_s3_key"])
    plat_keys = out.get("photos_platine_s3_keys")
    if isinstance(plat_keys, list) and plat_keys:
        out["photo_platine_presigned_urls"] = [_safe_presign(k) for k in plat_keys if k]
    elif out.get("photo_platine_s3_key"):
        out["photo_platine_presigned_urls"] = [_safe_presign(out["photo_platine_s3_key"])]
        out["photo_platine_presigned_url"] = out["photo_platine_presigned_urls"][0]
    port_keys = out.get("photos_platine_portail_s3_keys")
    if isinstance(port_keys, list) and port_keys:
        out["photo_platine_portail_presigned_urls"] = [_safe_presign(k) for k in port_keys if k]
    elif out.get("photo_platine_portail_s3_key"):
        out["photo_platine_portail_presigned_urls"] = [_safe_presign(out["photo_platine_portail_s3_key"])]
        out["photo_platine_portail_presigned_url"] = out["photo_platine_portail_presigned_urls"][0]
    # Contrat canonique (nouveau) + compat legacy.
    vigik_platine = []
    for k in out.get("photos_platine_s3_keys") or []:
        if not k:
            continue
        vigik_platine.append({"s3_key": k, "url": _safe_presign(k), "question": "platine"})
    if not vigik_platine and out.get("photo_platine_s3_key"):
        legacy_key = out.get("photo_platine_s3_key")
        vigik_platine.append({"s3_key": legacy_key, "url": _safe_presign(legacy_key), "question": "platine"})
    vigik_portail = []
    for k in out.get("photos_platine_portail_s3_keys") or []:
        if not k:
            continue
        vigik_portail.append({"s3_key": k, "url": _safe_presign(k), "question": "portail"})
    if not vigik_portail and out.get("photo_platine_portail_s3_key"):
        legacy_key = out.get("photo_platine_portail_s3_key")
        vigik_portail.append({"s3_key": legacy_key, "url": _safe_presign(legacy_key), "question": "portail"})
    out["vigik"] = {
        "platine": vigik_platine,
        "portail": vigik_portail,
    }
    pp = out.get("prestation_photos")
    if isinstance(pp, dict):
        out_p = {}
        for idx_str, items in pp.items():
            if not isinstance(items, list):
                out_p[idx_str] = items
                continue
            out_p[idx_str] = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                row = dict(item)
                if row.get("s3_key"):
                    row["presigned_url"] = _safe_presign(row["s3_key"])
                out_p[idx_str].append(row)
        out["prestation_photos"] = out_p
    return out


def collect_s3_keys_from_draft_media(draft_media):
    """Liste toutes les clés S3 d'un _draft_media (pour suppression)."""
    keys = []
    if not isinstance(draft_media, dict):
        return keys
    sig = draft_media.get("signature_s3_key")
    if sig:
        keys.append(sig)
    for list_key in ("photos_platine_s3_keys", "photos_platine_portail_s3_keys"):
        lst = draft_media.get(list_key)
        if isinstance(lst, list):
            for v in lst:
                if v:
                    keys.append(v)
        elif list_key == "photos_platine_s3_keys" and draft_media.get("photo_platine_s3_key"):
            keys.append(draft_media["photo_platine_s3_key"])
        elif list_key == "photos_platine_portail_s3_keys" and draft_media.get("photo_platine_portail_s3_key"):
            keys.append(draft_media["photo_platine_portail_s3_key"])
    pp = draft_media.get("prestation_photos") or {}
    if isinstance(pp, dict):
        for items in pp.values():
            if not isinstance(items, list):
                continue
            for item in items:
                if isinstance(item, dict) and item.get("s3_key"):
                    keys.append(item["s3_key"])
    return keys


def delete_s3_keys(keys):
    if not keys or not is_s3_available():
        return
    s3 = get_s3_client()
    bucket = get_s3_bucket_name()
    for key in keys:
        if not key:
            continue
        try:
            s3.delete_object(Bucket=bucket, Key=key)
        except Exception:
            pass


def _parse_date_photo(val):
    if not val:
        return date.today()
    if hasattr(val, "year"):
        return val
    s = str(val).strip()[:10]
    try:
        y, m, d = [int(x) for x in s.split("-")]
        return date(y, m, d)
    except Exception:
        return date.today()


def _transfer_signature_base64(rapport, data_url):
    """Legacy : signature encore en data URL dans le payload."""
    if not data_url or not isinstance(data_url, str):
        return
    try:
        from .utils import get_s3_client, get_s3_bucket_name, is_s3_available

        if not is_s3_available():
            return
        payload = data_url.split(",", 1)[1] if "," in data_url else data_url
        image_bytes = base64.b64decode(payload)
        s3_key = f"rapports_intervention/signatures/signature_{rapport.id}_{uuid.uuid4().hex[:8]}.png"
        s3 = get_s3_client()
        bucket = get_s3_bucket_name()
        s3.put_object(Bucket=bucket, Key=s3_key, Body=image_bytes, ContentType="image/png")
        rapport.signature_s3_key = s3_key
        rapport.save(update_fields=["signature_s3_key"])
    except Exception:
        pass


def transfer_brouillon_media_to_rapport(brouillon_id, rapport, draft_media):
    """
    Copie les fichiers S3 du brouillon vers les chemins définitifs du rapport
    et crée les PhotoRapport. Gère aussi l'ancien format base64 (_draft_media v1).
    """
    if not draft_media or not isinstance(draft_media, dict):
        return

    rapport.refresh_from_db()
    if draft_media.get("signature_s3_key"):
        src = draft_media["signature_s3_key"]
        dest = f"rapports_intervention/signatures/signature_{rapport.id}_{uuid.uuid4().hex[:8]}.png"
        if copy_s3_file(src, dest):
            rapport.signature_s3_key = dest
            rapport.save(update_fields=["signature_s3_key"])
    elif draft_media.get("signature_draft_data_url"):
        _transfer_signature_base64(rapport, draft_media["signature_draft_data_url"])

    if rapport.type_rapport == "vigik_plus":
        plat_keys = draft_media.get("photos_platine_s3_keys")
        if not isinstance(plat_keys, list) or not plat_keys:
            legacy = draft_media.get("photo_platine_s3_key")
            plat_keys = [legacy] if legacy else []
        new_plat = []
        for pk_src in plat_keys:
            if not pk_src:
                continue
            ext = pk_src.split(".")[-1] if "." in pk_src else "jpg"
            dest = f"rapports_intervention/vigik_platine/rapport_{rapport.id}_{uuid.uuid4().hex[:8]}.{ext}"
            if copy_s3_file(pk_src, dest):
                new_plat.append(dest)
        if new_plat:
            rapport.photos_platine_s3_keys = new_plat
            rapport.save(update_fields=["photos_platine_s3_keys"])

        port_keys = draft_media.get("photos_platine_portail_s3_keys")
        if not isinstance(port_keys, list) or not port_keys:
            legacy2 = draft_media.get("photo_platine_portail_s3_key")
            port_keys = [legacy2] if legacy2 else []
        new_port = []
        for pk_src in port_keys:
            if not pk_src:
                continue
            ext = pk_src.split(".")[-1] if "." in pk_src else "jpg"
            dest = f"rapports_intervention/vigik_platine_portail/rapport_{rapport.id}_{uuid.uuid4().hex[:8]}.{ext}"
            if copy_s3_file(pk_src, dest):
                new_port.append(dest)
        if new_port:
            rapport.photos_platine_portail_s3_keys = new_port
            rapport.save(update_fields=["photos_platine_portail_s3_keys"])

    prestation_photos = draft_media.get("prestation_photos")
    if isinstance(prestation_photos, dict) and rapport.type_rapport != "vigik_plus":
        prestations = list(rapport.prestations.order_by("ordre"))
        for idx_str, items in prestation_photos.items():
            try:
                idx = int(idx_str)
            except (TypeError, ValueError):
                continue
            if idx < 0 or idx >= len(prestations):
                continue
            prestation = prestations[idx]
            if not isinstance(items, list):
                continue
            for meta in items:
                if not isinstance(meta, dict):
                    continue
                src = meta.get("s3_key")
                if not src:
                    continue
                type_photo = meta.get("type_photo") or "avant"
                ext = src.split(".")[-1] if "." in src else "jpg"
                dest = (
                    f"rapports_intervention/photos/rapport_{rapport.id}/prestation_{prestation.id}/"
                    f"{type_photo}_{uuid.uuid4().hex[:8]}.{ext}"
                )
                if not copy_s3_file(src, dest):
                    continue
                nb = PhotoRapport.objects.filter(prestation=prestation, type_photo=type_photo).count()
                PhotoRapport.objects.create(
                    prestation=prestation,
                    s3_key=dest,
                    filename=meta.get("filename") or "photo.jpg",
                    type_photo=type_photo,
                    date_photo=_parse_date_photo(meta.get("date_photo")),
                    ordre=nb,
                )

    keys_to_delete = collect_s3_keys_from_draft_media(draft_media)
    delete_s3_keys(keys_to_delete)


