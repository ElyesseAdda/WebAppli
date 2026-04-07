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
    if out.get("photo_platine_s3_key"):
        out["photo_platine_presigned_url"] = _safe_presign(out["photo_platine_s3_key"])
    if out.get("photo_platine_portail_s3_key"):
        out["photo_platine_portail_presigned_url"] = _safe_presign(out["photo_platine_portail_s3_key"])
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
    for k in ("signature_s3_key", "photo_platine_s3_key", "photo_platine_portail_s3_key"):
        v = draft_media.get(k)
        if v:
            keys.append(v)
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
        pk_src = draft_media.get("photo_platine_s3_key")
        if pk_src:
            ext = pk_src.split(".")[-1] if "." in pk_src else "jpg"
            dest = f"rapports_intervention/vigik_platine/rapport_{rapport.id}_{uuid.uuid4().hex[:8]}.{ext}"
            if copy_s3_file(pk_src, dest):
                rapport.photo_platine_s3_key = dest
                rapport.save(update_fields=["photo_platine_s3_key"])
        pk2 = draft_media.get("photo_platine_portail_s3_key")
        if pk2:
            ext = pk2.split(".")[-1] if "." in pk2 else "jpg"
            dest = f"rapports_intervention/vigik_platine_portail/rapport_{rapport.id}_{uuid.uuid4().hex[:8]}.{ext}"
            if copy_s3_file(pk2, dest):
                rapport.photo_platine_portail_s3_key = dest
                rapport.save(update_fields=["photo_platine_portail_s3_key"])

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


