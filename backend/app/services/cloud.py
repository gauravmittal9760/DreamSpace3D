"""Cloudinary wrapper: project thumbnails + private backups + usage statistics."""
import io
import logging
import os

import requests

log = logging.getLogger("dreamspace")
FOLDER = "dreamspace"


def configured():
    return all(os.getenv(k) for k in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"))


def configure():
    if not configured():
        log.warning("Cloudinary is not configured - thumbnails/backups will be disabled.")
        return
    import cloudinary
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True,
    )


# ---------------- thumbnails ----------------

def upload_thumbnail(user_id, project_id, data_url):
    if not configured():
        return None
    import cloudinary.uploader
    res = cloudinary.uploader.upload(
        data_url,
        public_id=f"u{user_id}_p{project_id}",
        folder=f"{FOLDER}/thumbs",
        overwrite=True,
        invalidate=True,
        resource_type="image",
        transformation=[{"width": 640, "height": 400, "crop": "limit"}, {"quality": "auto", "fetch_format": "auto"}],
    )
    return res.get("secure_url")


def delete_thumbnail(user_id, project_id):
    if not configured():
        return
    try:
        import cloudinary.uploader
        cloudinary.uploader.destroy(f"{FOLDER}/thumbs/u{user_id}_p{project_id}", invalidate=True)
    except Exception:
        log.exception("thumbnail delete failed")


def delete_user_thumbnails(user_id):
    if not configured():
        return
    try:
        import cloudinary.api
        cloudinary.api.delete_resources_by_prefix(f"{FOLDER}/thumbs/u{user_id}_")
    except Exception:
        log.exception("user thumbnails delete failed")


# ---------------- backups (raw, authenticated = not publicly reachable) ----------------

def upload_backup(public_id, payload: bytes):
    if not configured():
        return None
    import cloudinary.uploader
    res = cloudinary.uploader.upload(
        io.BytesIO(payload), resource_type="raw", type="authenticated",
        public_id=f"{FOLDER}/backups/{public_id}.json", overwrite=True,
    )
    return res.get("public_id")


def fetch_backup(public_id):
    import cloudinary.utils
    url, _ = cloudinary.utils.cloudinary_url(public_id, resource_type="raw", type="authenticated", sign_url=True, secure=True)
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.content


def delete_backup(public_id):
    if not configured() or not public_id:
        return
    try:
        import cloudinary.uploader
        cloudinary.uploader.destroy(public_id, resource_type="raw", type="authenticated", invalidate=True)
    except Exception:
        log.exception("backup delete failed")


def wipe_everything():
    """Remove every asset this app created (used by 'delete entire app')."""
    if not configured():
        return {"deleted": 0}
    import cloudinary.api
    total = 0
    for rtype, dtype in (("image", "upload"), ("raw", "authenticated"), ("raw", "upload")):
        try:
            res = cloudinary.api.delete_resources_by_prefix(FOLDER + "/", resource_type=rtype, type=dtype)
            total += len(res.get("deleted", {}))
        except Exception:
            log.exception("wipe %s/%s failed", rtype, dtype)
    return {"deleted": total}


# ---------------- usage ----------------

def _folder_stats(prefix, resource_type="image", rtype="upload", cap_pages=6):
    import cloudinary.api
    count, size, cursor, pages = 0, 0, None, 0
    while pages < cap_pages:
        kw = dict(type=rtype, resource_type=resource_type, prefix=prefix, max_results=500)
        if cursor:
            kw["next_cursor"] = cursor
        res = cloudinary.api.resources(**kw)
        for r in res.get("resources", []):
            count += 1
            size += int(r.get("bytes") or 0)
        cursor = res.get("next_cursor")
        pages += 1
        if not cursor:
            break
    return {"count": count, "bytes": size, "truncated": bool(cursor)}


def usage():
    if not configured():
        return {"configured": False}
    import cloudinary.api
    out = {"configured": True, "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME")}
    try:
        u = cloudinary.api.usage()
        def pick(name):
            v = u.get(name) or {}
            return v if isinstance(v, dict) else {"usage": v}
        out.update({
            "plan": u.get("plan"),
            "last_updated": u.get("last_updated"),
            "storage": pick("storage"), "bandwidth": pick("bandwidth"),
            "transformations": pick("transformations"), "credits": pick("credits"),
            "objects": pick("objects"), "requests": u.get("requests"),
            "resources": u.get("resources"), "derived_resources": u.get("derived_resources"),
        })
    except Exception as e:
        out["usage_error"] = f"{type(e).__name__}: {str(e)[:160]}"
    folders = {}
    for label, prefix, rt, dt in (
        ("thumbnails", f"{FOLDER}/thumbs", "image", "upload"),
        ("backups", f"{FOLDER}/backups", "raw", "authenticated"),
    ):
        try:
            folders[label] = _folder_stats(prefix, rt, dt)
        except Exception as e:
            folders[label] = {"error": f"{type(e).__name__}"}
    out["folders"] = folders
    return out
