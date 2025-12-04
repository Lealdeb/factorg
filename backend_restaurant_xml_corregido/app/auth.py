# app/auth.py
import os
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import crud, models

bearer = HTTPBearer(auto_error=False)

SUPERADMIN_EMAIL = os.getenv("SUPERADMIN_EMAIL", "").strip().lower()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "").strip()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def es_superadmin(user: models.Usuario) -> bool:
    return (user.rol or "").upper() == "SUPERADMIN" or (user.email or "").lower() == SUPERADMIN_EMAIL

def get_current_user(
    db: Session = Depends(get_db),
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> models.Usuario:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="No autenticado (falta Bearer token)")

    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="Falta SUPABASE_JWT_SECRET en el servidor")

    token = creds.credentials

    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Token sin email")

    usuario = crud.obtener_o_crear_usuario_por_email(db, email=email, username=email)

    # promoción automática superadmin
    if SUPERADMIN_EMAIL and email == SUPERADMIN_EMAIL and (usuario.rol or "").upper() != "SUPERADMIN":
        usuario.rol = "SUPERADMIN"
        db.add(usuario)
        db.commit()
        db.refresh(usuario)

    if not usuario.activo:
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    return usuario

def solo_superadmin(user: models.Usuario = Depends(get_current_user)) -> models.Usuario:
    if not es_superadmin(user):
        raise HTTPException(status_code=403, detail="Solo SUPERADMIN puede realizar esta acción")
    return user

def require_perm(flag: str):
    def dep(user: models.Usuario = Depends(get_current_user)):
        if es_superadmin(user):
            return user
        if not getattr(user, flag, False):
            raise HTTPException(status_code=403, detail=f"Falta permiso: {flag}")
        return user
    return dep
