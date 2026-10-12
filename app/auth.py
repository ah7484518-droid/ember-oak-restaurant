from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import os

import jwt


JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret-in-development")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        120_000,
    )
    return f"{salt.hex()}:{password_hash.hex()}"


def verify_password(password: str, stored_password: str) -> bool:
    try:
        salt_hex, hash_hex = stored_password.split(":")
        salt = bytes.fromhex(salt_hex)

        calculated_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            120_000,
        )

        return hmac.compare_digest(calculated_hash.hex(), hash_hex)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int, email: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expires_at,
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        JWT_SECRET,
        algorithms=[JWT_ALGORITHM],
    )
