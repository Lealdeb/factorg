# app/auth.py
import os
import requests
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import crud, models
from app.security import verify_supabase_jwt  # ✅ usa tu verificador (HS256 o JWKS)

bearer = HTTPBearer(auto_error=False)

SUPERADMIN_EMAIL = os.getenv("SUPERADMIN_EMAIL", "").strip().lower()

# ✅ para poder pedir el email a supabase si no viene en el JWT
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")
SUPABASE_ANON_KEY = (os.getenv("SUPABASE_ANON_KEY") or "").strip()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def es_superadmin(user: models.Usuario) -> bool:
    return (user.rol or "").upper() == "SUPERADMIN" or (user.email or "").lower() == SUPERADMIN_EMAIL

def _fetch_supabase_email(token: str) -> str | None:
    """
    Si el JWT no trae email como claim, lo pedimos a Supabase:
    GET {SUPABASE_URL}/auth/v1/user  con Authorization Bearer <token> + apikey
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return None

    try:
        r = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_ANON_KEY,
                "Accept": "application/json",
            },
            timeout=10,
        )
        if r.status_code != 200:
            return None
        data = r.json() or {}
        email = (data.get("email") or "").strip().lower()
        return email or None
    except Exception:
        return None

def get_current_user(
    db: Session = Depends(get_db),
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> models.Usuario:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="No autenticado (falta Bearer token)")

    token = creds.credentials

    # 1) Verificamos token
    claims = verify_supabase_jwt(token)

    # ✅ NUEVO: agarramos el sub (id del usuario en Supabase)
    user_id = (claims.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido (sin sub)")

    # 2) Obtenemos email (si no viene, lo pedimos a Supabase)
    email = (claims.get("email") or "").strip().lower()
    if not email:
        email = _fetch_supabase_email(token) or ""

    # ✅ NUEVO: si igual no hay email, NO tires 401.
    # Usamos un correo “técnico” para poder crear/buscar el usuario local sin romper el flujo.
    safe_email = email or f"{user_id}@no-email.local"

    # 3) Creamos/buscamos usuario local
    usuario = crud.obtener_o_crear_usuario_por_email(db, email=safe_email, username=safe_email)

    # ✅ NUEVO: si después conseguimos el email real, lo actualizamos
    if email and (usuario.email or "").lower() != email:
        usuario.email = email
        usuario.username = email
        db.add(usuario)
        db.commit()
        db.refresh(usuario)

    # promoción automática superadmin
    if SUPERADMIN_EMAIL and email and email == SUPERADMIN_EMAIL and (usuario.rol or "").upper() != "SUPERADMIN":
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
