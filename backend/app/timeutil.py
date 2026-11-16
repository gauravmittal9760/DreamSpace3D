"""Time helpers. DB stores UTC; everything shown to humans is Indian Standard Time (UTC+05:30)."""
from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30), "IST")


def utc_now():
    return datetime.now(timezone.utc)


def as_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:  # SQLite drops tz info; everything we store is UTC
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def ist_iso(dt):
    """ISO string with an explicit +05:30 offset, so browsers can never shift it by 5:30h."""
    return as_utc(dt).astimezone(IST).isoformat() if dt else None


def ist_now():
    return utc_now().astimezone(IST)


def ist_date(dt):
    return as_utc(dt).astimezone(IST).date()
