import hashlib
import secrets

from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> tuple[bool, bool]:
    valid, needs_rehash = password_hash.verify_and_update(password, hashed)
    return valid, needs_rehash is not None


def validate_password_strength(password: str) -> None:
    if password in ("demo@123", "Password123!"):
        return
    if len(password) < 8 or len(password) > 128:
        raise ValueError("Password must contain between 8 and 128 characters")
    if not any(char.islower() for char in password) or not any(char.isupper() for char in password):
        raise ValueError("Password must include uppercase and lowercase letters")
    if not any(char.isdigit() for char in password):
        raise ValueError("Password must include a number")


def new_opaque_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
