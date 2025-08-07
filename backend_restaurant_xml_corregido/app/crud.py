# app/crud.py

from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException
from app import models
from typing import Optional
from sqlalchemy import func
from datetime import datetime,date
from sqlalchemy.orm import joinedload
from app.models import DetalleFactura



# ---------------------
# FACTURAS
# ---------------------

def obtener_todas_las_facturas(db: Session):
    return db.query(models.Factura).order_by(models.Factura.fecha_emision.desc()).all()

def buscar_facturas_por_rut_proveedor(db: Session, rut: str):
    rut = rut.replace(".", "").lower()  # Limpiar entrada
    return (
        db.query(models.Factura)
        .join(models.Proveedor)
        .filter(func.replace(func.lower(models.Proveedor.rut), ".", "") == rut)
        .all()
    )
def obtener_factura_por_id(db: Session, id: int):
    return db.query(models.Factura).filter(models.Factura.id == id).first()

# ---------------------
# PRODUCTOS
# ---------------------
def obtener_productos_filtrados(
    db: Session,
    nombre: Optional[str] = None,
    cod_admin_id: Optional[int] = None,
    categoria_id: Optional[int] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    limit: int = 25,
    offset: int = 0
):
    from sqlalchemy.orm import aliased
    Detalle = aliased(models.DetalleFactura)
    Factura = aliased(models.Factura)

    subq = (
        db.query(
            Detalle.producto_id.label("producto_id"),
            Detalle.precio_unitario,
            Detalle.iva,
            Detalle.otros_impuestos,
            Detalle.total.label("total_neto"),
            Detalle.imp_adicional,
            Factura.fecha_emision,
            Factura.folio
        )
        .join(Factura, Factura.id == Detalle.factura_id)
        .filter(Factura.fecha_emision != None)
        .order_by(Detalle.producto_id, Factura.fecha_emision.desc())
        .distinct(Detalle.producto_id)
        .subquery()
    )

    query = db.query(
        models.Producto,
        subq.c.precio_unitario,
        subq.c.iva,
        subq.c.otros_impuestos,
        subq.c.total_neto,
        subq.c.fecha_emision,
        subq.c.imp_adicional,
        subq.c.folio
    ).outerjoin(subq, models.Producto.id == subq.c.producto_id)

    query = query.options(
        joinedload(models.Producto.cod_admin),
        joinedload(models.Producto.categoria)
    )

    if nombre:
        query = query.filter(models.Producto.nombre.ilike(f"%{nombre}%"))
    if cod_admin_id:
        query = query.filter(models.Producto.cod_admin_id == cod_admin_id)
    if categoria_id:
        query = query.filter(models.Producto.categoria_id == categoria_id)
    if fecha_inicio and fecha_fin:
        query = query.filter(subq.c.fecha_emision.between(fecha_inicio, fecha_fin))
    
    # Calcular total para paginación (sin límite ni offset)
    total_query = query.with_entities(func.count()).order_by(None)
    total = total_query.scalar()

    # Aplicar orden y paginación
    query = query.order_by(models.Producto.id.asc()).offset(offset).limit(limit)

    # Ejecutar query paginada
    resultados = query.all()  # <--- 🔧 esta línea te faltaba

    productos = []
    for producto, precio_unitario, iva, otros_impuestos, total_neto, fecha_emision, imp_adicional, folio in resultados:
        porcentaje_adicional = (
            producto.cod_admin.porcentaje_adicional if producto.cod_admin else 0.0
        )
        cantidad = producto.cantidad or 0

        total_neto = (
            total_neto if total_neto is not None else (precio_unitario or 0) * cantidad
        )

        imp_adicional = (
            imp_adicional if imp_adicional is not None
            else total_neto * porcentaje_adicional
        )

        productos.append({
            "id": producto.id,
            "nombre": producto.nombre,
            "codigo": producto.codigo,
            "unidad": producto.unidad,
            "cantidad": cantidad,
            "proveedor_id": producto.proveedor_id,
            "categoria_id": producto.categoria_id,
            "cod_admin_id": producto.cod_admin_id,
            "cod_admin": producto.cod_admin,
            "precio_unitario": precio_unitario,
            "iva": iva,
            "otros_impuestos": otros_impuestos,
            "total_neto": total_neto,
            "porcentaje_adicional": porcentaje_adicional,
            "imp_adicional": imp_adicional,
            "categoria": producto.categoria,
            "folio": folio
        })

    return productos

    
def contar_productos_filtrados(db: Session, nombre=None, cod_admin_id=None, categoria_id=None, fecha_inicio=None, fecha_fin=None):
    query = db.query(models.Producto).join(models.DetalleFactura)

    if nombre:
        query = query.filter(models.Producto.nombre.ilike(f"%{nombre}%"))
    if cod_admin_id:
        query = query.filter(models.Producto.cod_admin_id == cod_admin_id)
    if categoria_id:
        query = query.filter(models.Producto.categoria_id == categoria_id)
    if fecha_inicio:
        query = query.filter(models.DetalleFactura.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.filter(models.DetalleFactura.fecha <= fecha_fin)

    return query.count()



  

def obtener_producto_por_id(db: Session, producto_id: int):
    return db.query(models.Producto).filter(models.Producto.id == producto_id).first()

def buscar_producto_por_nombre(db: Session, nombre: str):
    return db.query(models.Producto).filter(models.Producto.nombre.ilike(f"%{nombre}%")).all()

# ---------------------
# CATEGORÍAS
# ---------------------

def obtener_todas_las_categorias(db: Session):
    return db.query(models.Categoria).all()

def asignar_categoria_producto(db: Session, producto_id: int, categoria_id: int):
    producto = db.query(models.Producto).get(producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    producto.categoria_id = categoria_id
    db.commit()
    db.refresh(producto)
    return producto

# ---------------------
# NEGOCIOS
# ---------------------
def obtener_negocios(db: Session):
    return db.query(models.NombreNegocio).all()

def asignar_negocio_a_factura(db: Session, factura_id: int, negocio_id: int):
    factura = db.query(models.Factura).get(factura_id)
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    factura.negocio_id = negocio_id
    db.commit()
    db.refresh(factura)
    return factura

# ---------------------
# PORCENTAJE
# ---------------------
def actualizar_porcentaje_adicional(db: Session, producto_id: int, nuevo_porcentaje: float):
    producto = db.query(models.Producto).filter_by(id=producto_id).first()
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if producto.cod_admin:
        producto.cod_admin.porcentaje_adicional = nuevo_porcentaje
        db.add(producto.cod_admin)
        db.commit()  # 💾 Asegura guardar el nuevo porcentaje

        # 🔁 Ahora sí recalculamos en los detalles:
        recalcular_imp_adicional_detalles_producto(db, producto_id)

        db.refresh(producto)
        return producto
    else:
        raise HTTPException(status_code=400, detail="El producto no tiene código admin asignado")


def obtener_productos_avanzado(db: Session, nombre=None, proveedor_id=None, categoria_id=None, fecha_inicio=None, fecha_fin=None):
    query = (
        db.query(
            models.Producto,
            models.DetalleFactura.precio_unitario,
            models.DetalleFactura.iva,
            models.DetalleFactura.otros_impuestos,
            models.DetalleFactura.total,
            models.DetalleFactura.imp_adicional,
            models.DetalleFactura.total_costo,
            models.DetalleFactura.costo_unitario,
            models.Factura.folio,
            models.Factura.es_nota_credito  # ✅ Aquí está lo bueno
        )
        .join(models.DetalleFactura, models.DetalleFactura.producto_id == models.Producto.id)
        .join(models.Factura, models.Factura.id == models.DetalleFactura.factura_id)
    )

    if nombre:
        query = query.filter(models.Producto.nombre.ilike(f"%{nombre}%"))
    if proveedor_id:
        query = query.filter(models.Producto.proveedor_id == proveedor_id)
    if categoria_id:
        query = query.filter(models.Producto.categoria_id == categoria_id)
    if fecha_inicio not in (None, '', 'undefined') and fecha_fin not in (None, '', 'undefined'):
        query = query.filter(models.Factura.fecha_emision.between(fecha_inicio, fecha_fin))

    resultados = query.all()

    productos = []
    for producto, precio_unitario, iva, otros_impuestos, total, imp_adicional, total_costo, costo_unitario, folio, es_nc in resultados:
        productos.append({
            "id": producto.id,
            "nombre": producto.nombre,
            "codigo": producto.codigo,
            "unidad": producto.unidad,
            "cantidad": producto.cantidad,
            "proveedor_id": producto.proveedor_id,
            "categoria_id": producto.categoria_id,
            "grupo_admin_id": producto.grupo_admin_id,
            "precio_unitario": precio_unitario,
            "iva": iva,
            "otros_impuestos": otros_impuestos,
            "total": total,
            "categoria": producto.categoria,
            "grupo_admin": producto.grupo_admin,
            "imp_adicional": imp_adicional,
            "total_costo": total_costo,
            "costo_unitario": costo_unitario,
            "folio": folio,
            "es_nota_credito": es_nc  # ✅ así sí
        })
    return productos

def obtener_cod_admin_y_maestro(db: Session, codigo_producto: str):
    producto_existente = (
        db.query(models.Producto)
        .filter(models.Producto.codigo == codigo_producto)
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



from app.schemas.schemas import ProductoUpdate
from app import models

def recalcular_imp_adicional_detalles_producto(db: Session, producto_id: int):
    detalles = db.query(models.DetalleFactura).filter(models.DetalleFactura.producto_id == producto_id).all()
    producto = db.query(models.Producto).filter(models.Producto.id == producto_id).first()

    porcentaje = producto.cod_admin.porcentaje_adicional if producto.cod_admin else 0

    for detalle in detalles:
        detalle.imp_adicional = detalle.precio_unitario * detalle.cantidad * porcentaje
        detalle.total_costo = detalle.total + detalle.imp_adicional  # ← campo correcto
        detalle.costo_unitario = detalle.total_costo / detalle.cantidad if detalle.cantidad else 0

    db.commit()



def actualizar_producto(db: Session, producto_id: int, datos: ProductoUpdate):
    print(f"📩 Entrando a actualizar producto ID: {producto_id}")
    producto = db.query(models.Producto)\
        .options(joinedload(models.Producto.detalles))\
        .filter(models.Producto.id == producto_id).first()

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

    if cod_admin_id_cambiado and producto.cod_admin:
        print(f"🔄 Cod_admin cambiado, recalculando imp_adicional")
        recalcular_imp_adicional_detalles_producto(db, producto_id)

    return producto


def obtener_historial_precios(db: Session, producto_id: int):
    return (
        db.query(models.DetalleFactura)
        .join(models.Factura, models.DetalleFactura.factura_id == models.Factura.id)
        .filter(models.DetalleFactura.producto_id == producto_id)
        .order_by(models.Factura.fecha_emision.asc())
        .all()
    )
