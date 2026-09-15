"""User registration and API-key issuance (access-scoping change)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import generate_api_key, hash_api_key
from app.db import get_db
from app.models import User
from app.schemas import UserRegisterIn, UserRegisterOut

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserRegisterOut, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterIn, db: Session = Depends(get_db)) -> UserRegisterOut:
    raw_key = generate_api_key()
    user = User(name=payload.name, api_key_hash=hash_api_key(raw_key))
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRegisterOut(id=user.id, name=user.name, api_key=raw_key)
