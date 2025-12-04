# app/security.py
import os
import time
import requests
from jose import jwt
from fastapi import HTTPException
from jose.exceptions import JWTError

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")  # legacy HS256
SUPABASE_URL = os.getenv("SUPABASE_URL")  # https://xxxx.supabase.co  (para JWKS)

_JWKS_CACHE = {"data": None, "ts": 0}
JWKS_TTL = 60 * 60  # 1 hora

def _get_jwks():
    if not SUPABASE_URL:
        raise HTTPException(status_code=500, detail="Falta SUPABASE_URL para validar JWT (JWKS)")
    now = time.time()
    if _JWKS_CACHE["data"] and (now - _JWKS_CACHE["ts"]) < JWKS_TTL:
        return _JWKS_CACHE["data"]

    url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    jwks = r.json()
    _JWKS_CACHE["data"] = jwks
    _JWKS_CACHE["ts"] = now
    return jwks

def verify_supabase_jwt(token: str) -> dict:
    """
    Verifica token Supabase.
    - HS256 => usa SUPABASE_JWT_SECRET
    - ES256/RSA => usa JWKS
    """
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
        kid = header.get("kid")

        # 1) HS256 (legacy secret)
        if alg == "HS256":
            if not SUPABASE_JWT_SECRET:
                raise HTTPException(status_code=500, detail="Falta SUPABASE_JWT_SECRET")
            return jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True, "verify_aud": True},
            )

        # 2) ES256 / RS256 (JWKS)
        if not kid:
            raise HTTPException(status_code=401, detail="Token sin kid")
        jwks = _get_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Public key no encontrada (kid)")

        return jwt.decode(
            token,
            key,
            algorithms=[alg] if alg else None,
            audience="authenticated",
            options={"verify_exp": True, "verify_aud": True},
        )

    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    except Exception:
        raise HTTPException(status_code=401, detail="No se pudo validar token")
