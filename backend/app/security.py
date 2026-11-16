import hmac

try:
    from argon2 import PasswordHasher
    from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
    _ph = PasswordHasher()
except Exception:  # pragma: no cover - argon2 is in requirements.txt; fallback only for odd environments
    _ph = None
from werkzeug.security import check_password_hash, generate_password_hash


def hash_password(password: str) -> str:
    if _ph:
        return _ph.hash(password)
    return generate_password_hash(password)


def check_password(stored_hash: str, password) -> bool:
    if not isinstance(password, str) or not stored_hash:
        return False
    try:
        if stored_hash.startswith("$argon2"):
            return bool(_ph and _ph.verify(stored_hash, password))
        return check_password_hash(stored_hash, password)
    except Exception:
        return False


def safe_equal(a: str, b: str) -> bool:
    return hmac.compare_digest((a or "").encode("utf-8"), (b or "").encode("utf-8"))
