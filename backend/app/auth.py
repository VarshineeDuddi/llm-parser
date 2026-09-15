"""User identity and API-key authentication (access-scoping change).

Keys are opaque, high-entropy random tokens (design.md Decision 2): a
fast cryptographic hash (SHA-256) is appropriate here because there is
no low-entropy human-chosen secret to defend against, unlike a
password."""

import hashlib
import secrets

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User

AUTHENTICATION_FAILURE_DETAIL = "Missing or invalid API key."


def generate_api_key() -> str:
    return secrets.token_urlsafe(32)


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the caller from the `Authorization: Bearer <key>` header.
    Raises a 401 on a missing header, a malformed header, or a key that
    does not match any issued key -- never revealing which of those cases
    applies, only that authentication failed."""
    raw_key = None
    if authorization is not None and authorization.startswith("Bearer "):
        raw_key = authorization.removeprefix("Bearer ").strip()

    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=AUTHENTICATION_FAILURE_DETAIL,
        )

    user = db.execute(
        select(User).where(User.api_key_hash == hash_api_key(raw_key))
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=AUTHENTICATION_FAILURE_DETAIL,
        )
    return user
