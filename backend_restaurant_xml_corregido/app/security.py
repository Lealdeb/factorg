# app/security.py
import os
import time
import requests
from jose import jwt
from fastapi import HTTPException
from jose.exceptions import JWTError, JWTClaimsError

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")  # https://xxxx.supabase.co
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")       # legacy HS256 (opcional)

_JWKS_CACHE = {"data": None, "ts": 0}
JWKS_TTL = 60 * 60  # 1 hora

def _jwks_url_candidates():
    # Supabase UI suele mostrar .../.well-known/jwks (sin .json)
    return [
        f"{SUPABASE_URL}/auth/v1/.well-known/jwks",
        f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json",
    ]

def _get_jwks():
    if not SUPABASE_URL:
        raise HTTPException(status_code=500, detail="Falta SUPABASE_URL (ej: https://xxxx.supabase.co)")

    now = time.time()
    if _JWKS_CACHE["data"] and (now - _JWKS_CACHE["ts"]) < JWKS_TTL:
        return _JWKS_CACHE["data"]

    last_err = None
    for url in _jwks_url_candidates():
        try:
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            jwks = r.json()
            if "keys" not in jwks:
                raise RuntimeError("JWKS sin campo 'keys'")
            _JWKS_CACHE["data"] = jwks
            _JWKS_CACHE["ts"] = now
            return jwks
        except Exception as e:
            last_err = e

    # Si no pudimos obtener JWKS, esto es problema del servidor, no del usuario
    raise HTTPException(status_code=500, detail=f"No se pudo obtener JWKS de Supabase: {last_err}")

def verify_supabase_jwt(token: str) -> dict:
    """
    Verifica el access_token de Supabase.
    - HS256 => usa SUPABASE_JWT_SECRET (legacy)
    - ES256/RS256 => usa JWKS (recomendado)
    """
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
        kid = header.get("kid")

        issuer = f"{SUPABASE_URL}/auth/v1"
        audience = ["authenticated", "anon"]  # robusto

        # 1) HS256 legacy
        if alg == "HS256":
            if not SUPABASE_JWT_SECRET:
                raise HTTPException(status_code=500, detail="Falta SUPABASE_JWT_SECRET")

            # 1) intentamos con audience authenticated
            try:
                return jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET.strip(),
                    algorithms=["HS256"],
                    audience="authenticated",
                    options={"verify_exp": True, "verify_aud": True},
                )
            except JWTClaimsError:
                # 2) fallback: sin verificar audience (firma+exp igual se verifican)
                return jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET.strip(),
                    algorithms=["HS256"],
                    options={"verify_exp": True, "verify_aud": False},
                )
        # 2) ES256 / RS256 via JWKS
        if not kid:
            raise HTTPException(status_code=401, detail="Token sin kid")

        jwks = _get_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Public key no encontrada (kid)")

        return jwt.decode(
            token,
            key,  # JWK dict
            algorithms=[alg] if alg else ["ES256", "RS256"],
            audience=audience,
            issuer=issuer,
            options={"verify_exp": True, "verify_aud": True, "verify_iss": True},
        )

    except HTTPException:
        raise
    except JWTClaimsError as e:
        raise HTTPException(status_code=401, detail=f"Claims inválidos: {str(e)}")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"No se pudo validar token: {str(e)}")
