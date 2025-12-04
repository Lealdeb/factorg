# app/crud.py
from __future__ import annotations

from datetime import datetime, date
from typing import Optional, Dict, Any

import re
import unicodedata
import string
import hashlib

from fastapi import HTTPException
from sqlalchemy import func, desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, aliased

from app import models


# ---------------------
# FACTURAS
# ---------------------

def obtener_todas_las_facturas(db: Session, limit: int = 100, offset: int = 0):
    return (
        db.query(models.Factura)
        .order_by(models.Factura.fecha_emision.desc(), models.Factura.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

def obtener_cod_admin_y_maestro(db: Session, codigo_producto: str) -> Tuple[Optional[int], Optional[models.CodigoAdminMaestro]]:
    """
    Busca un producto por código y si tiene cod_admin_id devuelve:
    (cod_admin_id, objeto CodigoAdminMaestro). Si no, (None, None).
    """
    producto_existente = (
        db.query(models.Producto)
        .filter(models.Producto.codigo == codigo_producto)
        .order_by(models.Producto.id.desc())  # por si hay varios
        .first()
    )
    if producto_existente and producto_existente.cod_admin_id:
        cod_admin = (
            db.query(models.CodigoAdminMaestro)
            .filter(models.CodigoAdminMaestro.id == producto_existente.cod_admin_id)
            .first()
        )
        return producto_existente.cod_admin_id, cod_admin

    return None, None

def buscar_facturas_por_rut_proveedor(db: Session, rut: str):
    rut = (rut or "").replace(".", "").strip().lower()
    return (
        db.query(models.Factura)
        .join(models.Proveedor)
        .filter(func.replace(func.lower(models.Proveedor.rut), ".", "") == rut)
        .all()
    )


def obtener_factura_por_id(db: Session, id: int):
    return db.query(models.Factura).filter(models.Factura.id == id).first()


def asignar_negocio_a_factura(db: Session, factura_id: int, negocio_id: int):
    factura = db.query(models.Factura).get(factura_id)
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    factura.negocio_id = negocio_id
    db.commit()
    db.refresh(factura)
    return factura


# ---------------------
# NEGOCIOS
# ---------------------

def _rut_norm_basic(rut: Optional[str]) -> Optional[str]:
    if not rut:
        return None
    s = re.sub(r"\.", "", rut).strip()
    s = s.replace("K", "k")
    m = re.match(r"^(\d+)-([0-9k])$", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    m2 = re.match(r"^(\d+)([0-9k])$", s)
    if m2:
        return f"{m2.group(1)}-{m2.group(2)}"
    s = re.sub(r"[^0-9k]", "", s)
    return f"{s[:-1]}-{s[-1]}" if len(s) >= 2 else (s or None)


def obtener_negocios(db: Session):
    return db.query(models.NombreNegocio).order_by(models.NombreNegocio.id.asc()).all()


def upsert_negocio_by_receptor(
    db: Session,
    receptor: dict,
    negocio_hint: Optional[str] = None,
) -> Optional[models.NombreNegocio]:
    """
    Upsert por rut_receptor (normalizado). Si ya existe:
    - rellena campos faltantes (razon_social/correo/direccion) sin pisar datos.
    """
    if not receptor:
        return None

    rut = _rut_norm_basic(receptor.get("rut"))
    if not rut:
        return None

    existente = (
        db.query(models.NombreNegocio)
        .filter(models.NombreNegocio.rut_receptor == rut)
        .first()
    )
    if existente:
        changed = False
        rs = (receptor.get("razon_social") or "").strip() or None
        co = (receptor.get("correo") or "").strip() or None
        di = (receptor.get("direccion") or "").strip() or None

        if not existente.razon_social and rs:
            existente.razon_social = rs
            changed = True
        if not existente.correo and co:
            existente.correo = co
            changed = True
        if not existente.direccion and di:
            existente.direccion = di
            changed = True

        if changed:
            db.add(existente)
            db.flush()
        return existente

    nombre = (receptor.get("razon_social") or negocio_hint or rut or "Negocio sin nombre").strip()

    por_nombre = (
        db.query(models.NombreNegocio)
        .filter(func.lower(models.NombreNegocio.nombre) == nombre.lower())
        .first()
    )
    if por_nombre and not por_nombre.rut_receptor:
        por_nombre.rut_receptor = rut
        por_nombre.razon_social = por_nombre.razon_social or (receptor.get("razon_social") or "").strip() or None
        por_nombre.correo = por_nombre.correo or (receptor.get("correo") or "").strip() or None
        por_nombre.direccion = por_nombre.direccion or (receptor.get("direccion") or "").strip() or None
        db.add(por_nombre)
        db.flush()
        return por_nombre

    nuevo = models.NombreNegocio(
        nombre=nombre,
        rut_receptor=rut,
        razon_social=(receptor.get("razon_social") or "").strip() or None,
        correo=(receptor.get("correo") or "").strip() or None,
        direccion=(receptor.get("direccion") or "").strip() or None,
    )
    db.add(nuevo)
    db.flush()
    return nuevo


def crear_negocio_manual(db: Session, data) -> models.NombreNegocio:
    """
    data: NombreNegocioCreate (Pydantic). Lo tipamos genérico para evitar imports circulares.
    Acepta: nombre, rut (opcional), razon_social, correo, direccion.
    """
    rut_n = _rut_norm_basic(getattr(data, "rut", None)) if getattr(data, "rut", None) else None

    if rut_n:
        existe = (
            db.query(models.NombreNegocio)
            .filter(models.NombreNegocio.rut_receptor == rut_n)
            .first()
        )
        if existe:
            raise HTTPException(status_code=400, detail="Ya existe un negocio con ese RUT")

    existe_nombre = (
        db.query(models.NombreNegocio)
        .filter(func.lower(models.NombreNegocio.nombre) == str(data.nombre).lower())
        .first()
    )
    if existe_nombre:
        raise HTTPException(status_code=400, detail="Ya existe un negocio con ese nombre")

    negocio = models.NombreNegocio(
        nombre=data.nombre,
        rut_receptor=rut_n,
        razon_social=getattr(data, "razon_social", None),
        correo=getattr(data, "correo", None),
        direccion=getattr(data, "direccion", None),
    )
    db.add(negocio)
    db.commit()
    db.refresh(negocio)
    return negocio


# ---------------------
# PRODUCTOS (listado / filtros)
# ---------------------

def obtener_productos_filtrados(
    db: Session,
    nombre: Optional[str] = None,
    cod_admin_id: Optional[int] = None,
    categoria_id: Optional[int] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    codigo: Optional[str] = None,
    folio: Optional[str] = None,
    limit: int = 25,
    offset: int = 0,
    negocio_id: Optional[int] = None,
    negocio_nombre: Optional[str] = None,
):
    Detalle = aliased(models.DetalleFactura)
    Factura = aliased(models.Factura)
    Negocio = aliased(models.NombreNegocio)

    # subquery: toma el ÚLTIMO detalle por producto (por fecha/id)
    subq = (
        db.query(
            Detalle.producto_id.label("producto_id"),
            Detalle.precio_unitario.label("precio_unitario"),
            Detalle.cantidad.label("cant_det"),
            Detalle.iva.label("iva"),
            Detalle.otros_impuestos.label("otros_impuestos"),
            Detalle.total.label("total_neto"),
            Detalle.otros.label("otros_det"),
            Factura.fecha_emision.label("fecha_emision"),
            Factura.folio.label("folio"),
            Factura.negocio_id.label("negocio_id"),
        )
        .join(Factura, Factura.id == Detalle.factura_id)
        .filter(Factura.fecha_emision.isnot(None))
        .order_by(
            Detalle.producto_id,
            desc(Factura.fecha_emision),
            desc(Detalle.id),
        )
        .distinct(Detalle.producto_id)
        .subquery()
    )

    query = (
        db.query(
            models.Producto,
            subq.c.precio_unitario,
            subq.c.cant_det,
            subq.c.iva,
            subq.c.otros_impuestos,
            subq.c.total_neto,
            subq.c.fecha_emision,
            subq.c.otros_det,
            subq.c.folio,
            subq.c.negocio_id,
            Negocio.nombre.label("negocio_nombre"),
        )
        .outerjoin(subq, models.Producto.id == subq.c.producto_id)
        .outerjoin(Negocio, Negocio.id == subq.c.negocio_id)
        .options(
            joinedload(models.Producto.cod_admin),
            joinedload(models.Producto.categoria),
            joinedload(models.Producto.cod_lec),
        )
        .outerjoin(
            models.CodigoAdminMaestro,
            models.Producto.cod_admin_id == models.CodigoAdminMaestro.id,
        )
    )

    if nombre:
        like = f"%{nombre}%"
        query = query.filter(
            func.coalesce(models.CodigoAdminMaestro.nombre_producto, models.Producto.nombre).ilike(like)
        )
    if codigo:
        query = query.filter(models.Producto.codigo.ilike(f"%{codigo}%"))
    if folio:
        query = query.filter(subq.c.folio.ilike(f"%{folio}%"))
    if cod_admin_id:
        query = query.filter(models.Producto.cod_admin_id == cod_admin_id)
    if categoria_id:
        query = query.filter(models.Producto.categoria_id == categoria_id)

    if negocio_id:
        query = query.filter(subq.c.negocio_id == negocio_id)
    if negocio_nombre:
        query = query.filter(Negocio.nombre.ilike(f"%{negocio_nombre}%"))

    fi, ff = fecha_inicio, fecha_fin
    if fi and ff and fi > ff:
        fi, ff = ff, fi
    if fi and ff:
        query = query.filter(subq.c.fecha_emision.between(fi, ff))
    elif fi:
        query = query.filter(subq.c.fecha_emision >= fi)
    elif ff:
        query = query.filter(subq.c.fecha_emision <= ff)

    total = query.order_by(None).with_entities(func.count(models.Producto.id)).scalar() or 0

    resultados = (
        query.order_by(
            subq.c.fecha_emision.desc().nullslast(),
            models.Producto.id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = []
    for (
        producto,
        precio_unitario,
        cant_det,
        iva,
        otros_impuestos,
        total_neto_subq,
        fecha_emision,
        otros_subq,
        folio_val,
        negocio_id_val,
        negocio_nombre_val,
    ) in resultados:
        cantidad = float(cant_det or 0.0)
        neto = float(total_neto_subq or 0.0)

        um = 1.0
        porcentaje_adicional = 0.0
        if producto.cod_admin:
            try:
                um = float(producto.cod_admin.um or 1.0)
            except Exception:
                um = 1.0
            porcentaje_adicional = float(producto.cod_admin.porcentaje_adicional or 0.0)

        imp_adicional = neto * porcentaje_adicional
        otros = float(otros_subq or 0.0)
        total_costo = neto + imp_adicional + otros
        denom = (cantidad * um) if (cantidad and um) else 0.0
        costo_unitario = (total_costo / denom) if denom else 0.0

        ca = producto.cod_admin
        cod_admin_dict = None
        if ca:
            cod_admin_dict = {
                "id": ca.id,
                "cod_admin": ca.cod_admin,
                "nombre_producto": ca.nombre_producto,
                "um": um,
                "familia": ca.familia,
                "area": ca.area,
                "porcentaje_adicional": porcentaje_adicional,
            }

        cat = producto.categoria
        categoria_dict = {"id": cat.id, "nombre": cat.nombre} if cat else None

        cl = producto.cod_lec
        cod_lec_dict = None
        cod_lectura_val = None
        if cl:
            cod_lec_dict = {
                "id": cl.id,
                "valor": cl.valor,
                "nombre_norm": cl.nombre_norm,
                "codigo_origen": cl.codigo_origen,
                "rut_proveedor": cl.rut_proveedor,
                "cod_admin_id": cl.cod_admin_id,
            }
            cod_lectura_val = cl.valor

        items.append({
            "id": producto.id,
            "nombre": producto.nombre,
            "nombre_maestro": (ca.nombre_producto if ca else None),
            "codigo": producto.codigo,
            "unidad": producto.unidad,
            "cantidad": cantidad,
            "proveedor_id": producto.proveedor_id,
            "categoria_id": producto.categoria_id,
            "cod_admin_id": producto.cod_admin_id,
            "cod_admin": cod_admin_dict,
            "cod_lec": cod_lec_dict,
            "cod_lectura": cod_lectura_val,
            "precio_unitario": float(precio_unitario or 0.0),
            "iva": float(iva or 0.0),
            "otros_impuestos": float(otros_impuestos or 0.0),
            "total_neto": neto,
            "porcentaje_adicional": porcentaje_adicional,
            "imp_adicional": imp_adicional,
            "otros": otros,
            "categoria": categoria_dict,
            "folio": folio_val,
            "fecha_emision": fecha_emision,
            "total_costo": total_costo,
            "costo_unitario": costo_unitario,
            "negocio_id": int(negocio_id_val) if negocio_id_val is not None else None,
            "negocio_nombre": negocio_nombre_val,
        })

    return {"items": items, "total": total}


def buscar_producto_por_nombre(db: Session, nombre: str):
    like = f"%{nombre}%"
    return (
        db.query(models.Producto)
        .outerjoin(models.CodigoAdminMaestro, models.Producto.cod_admin_id == models.CodigoAdminMaestro.id)
        .filter(func.coalesce(models.CodigoAdminMaestro.nombre_producto, models.Producto.nombre).ilike(like))
        .all()
    )


def obtener_producto_por_id(db: Session, producto_id: int) -> Optional[Dict[str, Any]]:
    producto = (
        db.query(models.Producto)
        .options(
            joinedload(models.Producto.proveedor),
            joinedload(models.Producto.categoria),
            joinedload(models.Producto.cod_admin),
            joinedload(models.Producto.cod_lec),
        )
        .filter(models.Producto.id == producto_id)
        .first()
    )
    if not producto:
        return None

    cod_lec = producto.cod_lec
    cod_lectura_val = cod_lec.valor if cod_lec else None

    cod_admin = producto.cod_admin
    cod_admin_dict = None
    if cod_admin:
        um_val = cod_admin.um
        try:
            um_val = float(um_val) if um_val is not None else None
        except Exception:
            um_val = None

        cod_admin_dict = {
            "id": cod_admin.id,
            "cod_admin": cod_admin.cod_admin,
            "nombre_producto": cod_admin.nombre_producto,
            "familia": cod_admin.familia,
            "area": cod_admin.area,
            "um": um_val,
            "porcentaje_adicional": float(cod_admin.porcentaje_adicional or 0.0),
        }

    categoria = producto.categoria
    categoria_dict = {"id": categoria.id, "nombre": categoria.nombre} if categoria else None

    return {
        "id": producto.id,
        "nombre": producto.nombre,
        "codigo": producto.codigo,
        "unidad": producto.unidad,
        "cantidad": producto.cantidad,
        "proveedor_id": producto.proveedor_id,
        "categoria_id": producto.categoria_id,
        "cod_admin_id": producto.cod_admin_id,
        "cod_admin": cod_admin_dict,
        "categoria": categoria_dict,
        "cod_lec": (
            {
                "id": cod_lec.id,
                "valor": cod_lec.valor,
                "nombre_norm": cod_lec.nombre_norm,
                "codigo_origen": cod_lec.codigo_origen,
                "rut_proveedor": cod_lec.rut_proveedor,
                "cod_admin_id": cod_lec.cod_admin_id,
            } if cod_lec else None
        ),
        "cod_lectura": cod_lectura_val,
    }


# ---------------------
# CATEGORÍAS
# ---------------------

def obtener_todas_las_categorias(db: Session):
    return db.query(models.Categoria).order_by(models.Categoria.nombre.asc()).all()


def asignar_categoria_producto(db: Session, producto_id: int, categoria_id: int):
    producto = db.query(models.Producto).get(producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    producto.categoria_id = categoria_id
    db.commit()
    db.refresh(producto)
    return producto


# ---------------------
# HISTORIAL / OTROS / IMPUESTO ADICIONAL
# ---------------------

def obtener_historial_precios(db: Session, producto_id: int):
    """
    Devuelve lista de DetalleFactura con su Factura cargada (d.factura).
    """
    return (
        db.query(models.DetalleFactura)
        .options(joinedload(models.DetalleFactura.factura))
        .join(models.Factura, models.DetalleFactura.factura_id == models.Factura.id)
        .filter(models.DetalleFactura.producto_id == producto_id)
        .order_by(models.Factura.fecha_emision.asc(), models.DetalleFactura.id.asc())
        .all()
    )


def recalcular_imp_adicional_detalles_producto(db: Session, producto_id: int):
    producto = (
        db.query(models.Producto)
        .options(joinedload(models.Producto.cod_admin))
        .filter(models.Producto.id == producto_id)
        .first()
    )
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    porcentaje = float(producto.cod_admin.porcentaje_adicional or 0.0) if producto.cod_admin else 0.0

    um = 1.0
    if producto.cod_admin and producto.cod_admin.um is not None:
        try:
            um = float(producto.cod_admin.um)
        except Exception:
            um = 1.0

    detalles = (
        db.query(models.DetalleFactura)
        .options(joinedload(models.DetalleFactura.factura))
        .filter(models.DetalleFactura.producto_id == producto_id)
        .all()
    )

    for d in detalles:
        sign = -1 if (d.factura and getattr(d.factura, "es_nota_credito", False)) else 1
        neto = float(d.precio_unitario or 0.0) * float(d.cantidad or 0.0) * sign
        imp_ad = neto * porcentaje
        otros = float(d.otros or 0.0)

        d.total = neto
        d.imp_adicional = imp_ad
        d.total_costo = neto + imp_ad + otros

        denom = float(d.cantidad or 0.0) * float(um or 1.0)
        d.costo_unitario = (d.total_costo / denom) if denom else 0.0

    db.commit()


def actualizar_otros_en_ultimo_detalle(db: Session, producto_id: int, otros: int):
    detalle = (
        db.query(models.DetalleFactura)
        .join(models.Factura, models.Factura.id == models.DetalleFactura.factura_id)
        .filter(models.DetalleFactura.producto_id == producto_id)
        .order_by(models.Factura.fecha_emision.desc(), models.DetalleFactura.id.desc())
        .first()
    )
    if not detalle:
        raise HTTPException(status_code=404, detail="No hay detalles para este producto")

    producto = detalle.producto
    porcentaje = float(producto.cod_admin.porcentaje_adicional or 0.0) if producto and producto.cod_admin else 0.0
    sign = -1 if (detalle.factura and getattr(detalle.factura, "es_nota_credito", False)) else 1

    detalle.otros = int(otros or 0)

    neto = float(detalle.precio_unitario or 0.0) * float(detalle.cantidad or 0.0) * sign
    imp_ad = neto * porcentaje

    um = 1.0
    if producto and producto.cod_admin and producto.cod_admin.um is not None:
        try:
            um = float(producto.cod_admin.um)
        except Exception:
            um = 1.0

    detalle.total = neto
    detalle.imp_adicional = imp_ad
    detalle.total_costo = neto + imp_ad + float(detalle.otros or 0.0)

    denom = float(detalle.cantidad or 0.0) * float(um or 1.0)
    detalle.costo_unitario = (detalle.total_costo / denom) if denom else 0.0

    db.commit()
    db.refresh(detalle)
    return detalle


def actualizar_porcentaje_adicional(db: Session, producto_id: int, nuevo_porcentaje: float):
    producto = db.query(models.Producto).filter_by(id=producto_id).first()
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if not producto.cod_admin_id:
        raise HTTPException(
            status_code=400,
            detail="El producto no tiene código admin asignado. Asigna un código admin antes de editar el porcentaje."
        )

    cod = db.query(models.CodigoAdminMaestro).get(producto.cod_admin_id)
    if not cod:
        raise HTTPException(status_code=404, detail="Código admin no encontrado")

    porc = max(0.0, min(1.0, float(nuevo_porcentaje or 0.0)))
    cod.porcentaje_adicional = porc
    db.add(cod)
    db.commit()

    recalcular_imp_adicional_detalles_producto(db, producto_id)
    db.refresh(producto)
    return producto


def actualizar_producto(db: Session, producto_id: int, datos):
    """
    datos: ProductoUpdate (Pydantic)
    Detecta cambio de cod_admin_id y recalcula en DetalleFactura.
    """
    producto = (
        db.query(models.Producto)
        .options(joinedload(models.Producto.detalles), joinedload(models.Producto.cod_admin))
        .filter(models.Producto.id == producto_id)
        .first()
    )
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    cod_admin_id_cambiado = False
    for attr, value in datos.dict(exclude_unset=True).items():
        if attr == "cod_admin_id" and getattr(producto, attr) != value:
            cod_admin_id_cambiado = True
        setattr(producto, attr, value)

    db.add(producto)
    db.commit()
    db.refresh(producto)

    if cod_admin_id_cambiado:
        recalcular_imp_adicional_detalles_producto(db, producto_id)

        # Si comparte cod_lec, heredar cod_admin a "hermanos"
        if producto.cod_lec_id:
            hermanos = db.query(models.Producto).filter(
                models.Producto.cod_lec_id == producto.cod_lec_id,
                models.Producto.id != producto.id
            ).all()
            for h in hermanos:
                h.cod_admin_id = producto.cod_admin_id
                db.add(h)
                recalcular_imp_adicional_detalles_producto(db, h.id)
            db.commit()

    return producto


# ---------------------
# CODIGO LECTURA (cod_lec)
# ---------------------

def _normalize_codigo(codigo: Optional[str]) -> str:
    if not codigo:
        return "SINCOD"
    s = str(codigo).strip().upper()
    if s in {"N/A", "NA", "NULL", "NONE"}:
        return "SINCOD"
    s = re.sub(r"[\s\-_./]+", "", s)
    s = re.sub(r"[^A-Z0-9]", "", s)
    return s or "SINCOD"


def _strip_accents(s: str) -> str:
    if not s:
        return ""
    return "".join(ch for ch in unicodedata.normalize("NFD", s) if unicodedata.category(ch) != "Mn")


def _normalize_rut_full(rut: str) -> str:
    if not rut:
        return ""
    s = rut.strip().upper().replace(".", "")
    s = re.sub(r"\s+", "", s)
    m = re.match(r"^(\d+)-([0-9K])$", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    m2 = re.match(r"^(\d+)([0-9K])$", s)
    if m2:
        return f"{m2.group(1)}-{m2.group(2)}"
    cuerpo = re.sub(r"\D", "", s)
    return cuerpo


def _first_word_normalized(nombre: str) -> str:
    if not nombre:
        return "SINNOMBRE"
    palabra = nombre.strip().split()[0]
    palabra = _strip_accents(palabra).upper()
    palabra = "".join(ch for ch in palabra if ch in string.ascii_uppercase)
    return palabra or "SINNOMBRE"


def _normalize_name_for_key(nombre: str) -> str:
    base = _strip_accents(nombre or "").upper()
    tokens = [t for t in re.split(r"\W+", base) if t]
    if not tokens:
        return "SINNOMBRE"
    key = "_".join(tokens[:3])
    return key[:32] or "SINNOMBRE"


def _name_fingerprint(nombre: str) -> str:
    base = _strip_accents((nombre or "").strip().upper())
    h = hashlib.sha1(base.encode("utf-8")).hexdigest()
    return h[:8]


def build_cod_lec(rut_proveedor: str, nombre_producto: str, codigo_producto: Optional[str]) -> str:
    rut = _normalize_rut_full(rut_proveedor) or "RUTDESCONOCIDO"
    nombre_key = _normalize_name_for_key(nombre_producto)

    cod_norm = _normalize_codigo(codigo_producto)
    if cod_norm and cod_norm != "SINCOD":
        return f"{rut}_{nombre_key}_{cod_norm}"

    fp = _name_fingerprint(nombre_producto)
    return f"{rut}_{nombre_key}_NC_{fp}"


def _ensure_unique_cod_lec(
    db: Session,
    base_valor: str,
    nombre_norm: str,
    codigo_origen: Optional[str],
    rut_norm: str,
):
    i = 1
    while True:
        candidate = f"{base_valor}-{i:02d}"
        exists = db.query(models.CodigoLectura).filter(models.CodigoLectura.valor == candidate).first()
        if not exists:
            cod_lec = models.CodigoLectura(
                valor=candidate,
                nombre_norm=nombre_norm,
                codigo_origen=codigo_origen,
                rut_proveedor=rut_norm,
            )
            db.add(cod_lec)
            db.flush()
            return cod_lec
        i += 1


def upsert_cod_lec(db: Session, rut_proveedor: str, nombre_producto: str, codigo_producto: Optional[str]):
    valor = build_cod_lec(rut_proveedor, nombre_producto, codigo_producto)
    cod_lec = db.query(models.CodigoLectura).filter_by(valor=valor).one_or_none()
    if cod_lec:
        return cod_lec

    nombre_norm = _first_word_normalized(nombre_producto)
    rut_norm = _normalize_rut_full(rut_proveedor)

    try:
        cod_lec = models.CodigoLectura(
            valor=valor,
            nombre_norm=nombre_norm,
            codigo_origen=codigo_producto,
            rut_proveedor=rut_norm,
        )
        db.add(cod_lec)
        db.flush()
        return cod_lec
    except IntegrityError:
        db.rollback()
        return _ensure_unique_cod_lec(db, valor, nombre_norm, codigo_producto, rut_norm)


def _codigo_normalizado(codigo_raw: Optional[str]) -> Optional[str]:
    if not codigo_raw:
        return None
    c = str(codigo_raw).strip()
    if not c:
        return None
    if c.upper() == "N/A":
        return None
    return c


def crear_producto_con_cod_lec(
    db: Session,
    proveedor: models.Proveedor,
    nombre: str,
    codigo: Optional[str],
    unidad: str,
    cantidad: float,
    cod_admin_id_heredado: Optional[int],
):
    codigo_norm = _codigo_normalizado(codigo)
    cod_lec = upsert_cod_lec(db, proveedor.rut, nombre, codigo_norm)

    # preferencia: cod_lec.cod_admin_id > heredado > None
    cod_admin_final = cod_lec.cod_admin_id if getattr(cod_lec, "cod_admin_id", None) else None
    if cod_admin_final is None and codigo_norm is not None and cod_admin_id_heredado:
        cod_admin_final = cod_admin_id_heredado

    producto = models.Producto(
        nombre=nombre,
        codigo=codigo_norm,
        unidad=unidad,
        cantidad=cantidad,
        proveedor_id=proveedor.id,
        cod_lec_id=cod_lec.id,
        cod_admin_id=cod_admin_final,
    )
    db.add(producto)
    db.flush()
    return producto


def asignar_cod_lec_a_cod_admin(db: Session, cod_lec_valor: str, cod_admin_id: int):
    cod_lec = db.query(models.CodigoLectura).filter_by(valor=cod_lec_valor).one_or_none()
    if not cod_lec:
        raise HTTPException(status_code=404, detail="cod_lec no encontrado")

    cod_lec.cod_admin_id = cod_admin_id
    db.add(cod_lec)
    db.flush()

    productos = db.query(models.Producto).filter(models.Producto.cod_lec_id == cod_lec.id).all()
    for p in productos:
        if p.cod_admin_id != cod_admin_id:
            p.cod_admin_id = cod_admin_id
            db.add(p)
            recalcular_imp_adicional_detalles_producto(db, p.id)

    return cod_lec


# ---------------------
# USUARIOS (roles/permisos en tu BD; auth real viene desde Supabase JWT)
# ---------------------

def obtener_o_crear_usuario_por_email(db: Session, email: str, username: Optional[str] = None) -> models.Usuario:
    """
    Se usa cuando el backend recibe un JWT de Supabase.
    Si el usuario no existe en tu tabla 'usuarios', lo crea con valores por defecto.
    """
    email_norm = (email or "").strip().lower()
    if not email_norm:
        raise HTTPException(status_code=400, detail="Email requerido")

    usuario = db.query(models.Usuario).filter(models.Usuario.email == email_norm).first()
    if usuario:
        return usuario

    safe_username = (username or email_norm.split("@")[0]).strip() or "usuario"

    # password_hash NO se usa (autentica Supabase), pero tu tabla lo exige NOT NULL.
    usuario = models.Usuario(
        email=email_norm,
        username=safe_username,
        password_hash="SUPABASE_AUTH",
        rol="USUARIO",
        puede_ver_dashboard=True,
        puede_subir_xml=False,
        puede_ver_tablas=False,
        activo=True,
        negocio_id=None,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def listar_usuarios(db: Session):
    return db.query(models.Usuario).order_by(models.Usuario.id.asc()).all()


def obtener_usuario_por_id(db: Session, usuario_id: int) -> Optional[models.Usuario]:
    return db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()


def actualizar_usuario(db: Session, usuario_id: int, datos) -> models.Usuario:
    """
    datos: UsuarioUpdate (Pydantic)
    """
    usuario = obtener_usuario_por_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    for campo, valor in datos.dict(exclude_unset=True).items():
        setattr(usuario, campo, valor)

    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario
