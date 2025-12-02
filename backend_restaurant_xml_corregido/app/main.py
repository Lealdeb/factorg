from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Query, Header
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from datetime import datetime, date
from typing import List, Optional
import traceback
from sqlalchemy import func
from fastapi.responses import StreamingResponse
import io
from openpyxl import Workbook

from app.database import SessionLocal, engine
from app import models, crud, xml_parser
from app.schemas.schemas import (
    Factura, ProductoConPrecio, Producto, Proveedor,
    Categoria, CategoriaAsignacion, CategoriaCreate, 
    NombreNegocio, NegocioAsignacion, NombreNegocioBase, 
    PorcentajeAdicionalUpdate, CodigoAdminMaestro, ProductoUpdate,
    CodigoAdminAsignacion, CodLecSugerirRequest, CodigoLecturaResponse,
    CodLecAsignacionRequest, UsuarioOut, UsuarioUpdate, UsuarioMe,
    UsuarioCreate, Token, NombreNegocioCreate,
)

from app.models import Usuario
import os

from fastapi.middleware.cors import CORSMiddleware



app = FastAPI() 

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://factorg-front-end.onrender.com",
        "http://localhost:3000",
    ],

    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=False,   
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()





SUPERADMIN_EMAIL = os.getenv("SUPERADMIN_EMAIL", "hualadebi@gmail.com")

def get_current_usuario(
    db: Session = Depends(get_db),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
) -> Usuario:
    """
    El front (Supabase) manda el email del usuario logueado en X-User-Email.
    Si no existe en la tabla usuarios, lo creamos con rol USUARIO.
    """
    if not x_user_email:
        raise HTTPException(status_code=401, detail="Falta header X-User-Email")

    usuario = crud.obtener_o_crear_usuario_por_email(
        db, email=x_user_email, username=x_user_name
    )
    if not usuario.activo:
        raise HTTPException(status_code=403, detail="Usuario inactivo")

    return usuario


def solo_superadmin(
    usuario: Usuario = Depends(get_current_usuario),
) -> Usuario:
    """
    Solo permite acceso a quien tenga rol SUPERADMIN
    (y opcionalmente email==SUPERADMIN_EMAIL).
    """
    if usuario.rol != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Solo SUPERADMIN puede realizar esta acción")
    return usuario


# Info del usuario actual (para saber sus permisos en el front)
@app.get("/auth/me", response_model=UsuarioMe)
def auth_me(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_usuario),
):
    # usuario.negocio viene de la relación en el modelo
    return usuario


@app.post("/negocios/manual", response_model=NombreNegocio)
def crear_negocio_manual(
    data: NombreNegocioCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(solo_superadmin),
):
    """
    Crea un negocio manualmente.
    Solo accesible para SUPERADMIN.
    """
    negocio = crud.crear_negocio_manual(db, data)
    return negocio

@app.get("/usuarios", response_model=List[UsuarioOut])
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(solo_superadmin),
):
    usuarios = (
        db.query(models.Usuario)
        .options(joinedload(models.Usuario.negocio))
        .all()
    )
    return usuarios


@app.put("/usuarios/{usuario_id}", response_model=UsuarioOut)
def actualizar_usuario(
    usuario_id: int,
    body: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(solo_superadmin),
):
    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.id == usuario_id)
        .first()
    )
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    data = body.dict(exclude_unset=True)
    for campo, valor in data.items():
        setattr(usuario, campo, valor)

    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


# ---------------------
# RUTA: Cargar XML
@app.post("/subir-xml/")
def subir_xml(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".xml"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos XML. Selecciona un archivo .xml válido.")

    contenido = file.file.read()
    try:
        facturas = xml_parser.procesar_xml(contenido, db)

        nuevas = 0
        duplicadas = 0

        for factura_data in facturas:
            # ===== Proveedor (normalizado por RUT) =====
            emisor = factura_data["emisor"]
            rut_limpio = (emisor["rut"] or "").strip().upper().replace('.', '')
            proveedor = (
                db.query(models.Proveedor)
                .filter(func.replace(func.upper(models.Proveedor.rut), '.', '') == rut_limpio)
                .first()
            )
            if not proveedor:
                proveedor = models.Proveedor(
                    rut=emisor.get("rut"),
                    nombre=emisor.get("razon_social"),
                    correo_contacto=emisor.get("correo"),
                    direccion=emisor.get("comuna"),
                )
                db.add(proveedor)
                db.flush()

            existe = (
                db.query(models.Factura)
                .filter_by(folio=factura_data["folio"], proveedor_id=proveedor.id)
                .first()
            )
            if existe:
                duplicadas += 1
                continue 

            es_nota_credito = bool(factura_data.get("es_nota_credito", False))
            sign = -1 if es_nota_credito else 1

        
            receptor = factura_data.get("receptor") or {}
            negocio = None
            resolver = getattr(crud, "upsert_negocio_by_receptor", None)
            if callable(resolver):
                negocio = resolver(
                    db=db,
                    receptor=receptor,
                    negocio_hint=factura_data.get("negocio_hint"),
                )
            else:
              
                import re as _re
                from sqlalchemy import func as _func

                def _rut_norm_basic(r):
                    if not r: return None
                    s = r.replace(".", "").strip().replace("K", "k")
                    m = _re.match(r"^(\d+)-([0-9k])$", s)
                    if m: return f"{m.group(1)}-{m.group(2)}"
                    m2 = _re.match(r"^(\d+)([0-9k])$", s)
                    if m2: return f"{m2.group(1)}-{m2.group(2)}"
                    s = _re.sub(r"[^0-9k]", "", s)
                    return f"{s[:-1]}-{s[-1]}" if len(s) >= 2 else None

                rut_n = _rut_norm_basic(receptor.get("rut"))
                if rut_n:
                    existente = (
                        db.query(models.NombreNegocio)
                        .filter(models.NombreNegocio.rut_receptor == rut_n)
                        .one_or_none()
                    )
                    if existente:
                        changed = False
                        rs = (receptor.get("razon_social") or "").strip() or None
                        co = (receptor.get("correo") or "").strip() or None
                        di = (receptor.get("direccion") or "").strip() or None
                        if (not existente.razon_social) and rs: existente.razon_social = rs; changed = True
                        if (not existente.correo) and co: existente.correo = co; changed = True
                        if (not existente.direccion) and di: existente.direccion = di; changed = True
                        if (not existente.nombre):
                            hint = (factura_data.get("negocio_hint") or "").strip()
                            if rs or hint:
                                existente.nombre = (rs or hint); changed = True
                        if changed: db.add(existente); db.flush()
                        negocio = existente
                    else:
                        nombre_calc = (receptor.get("razon_social") or factura_data.get("negocio_hint") or rut_n).strip()
                        por_nombre = (
                            db.query(models.NombreNegocio)
                            .filter(_func.lower(models.NombreNegocio.nombre) == nombre_calc.lower())
                            .one_or_none()
                        )
                        if por_nombre and not por_nombre.rut_receptor:
                            por_nombre.rut_receptor = rut_n
                            por_nombre.razon_social = por_nombre.razon_social or (receptor.get("razon_social") or "").strip() or None
                            por_nombre.correo       = por_nombre.correo       or (receptor.get("correo") or "").strip() or None
                            por_nombre.direccion    = por_nombre.direccion    or (receptor.get("direccion") or "").strip() or None
                            db.add(por_nombre); db.flush()
                            negocio = por_nombre
                        else:
                            nuevo = models.NombreNegocio(
                                nombre=nombre_calc,
                                rut_receptor=rut_n,
                                razon_social=(receptor.get("razon_social") or "").strip() or None,
                                correo=(receptor.get("correo") or "").strip() or None,
                                direccion=(receptor.get("direccion") or "").strip() or None,
                            )
                            db.add(nuevo); db.flush()
                            negocio = nuevo

         
            try:
                fecha_emision = datetime.strptime(factura_data["fecha_emision"], "%Y-%m-%d").date()
            except Exception:
                fecha_emision = datetime.fromisoformat(str(factura_data["fecha_emision"])[:10]).date()

            factura = models.Factura(
                folio=factura_data["folio"],
                fecha_emision=fecha_emision,
                forma_pago=factura_data.get("forma_pago"),
                monto_total=factura_data.get("monto_total", 0),
                proveedor_id=proveedor.id,
                es_nota_credito=es_nota_credito,
                negocio_id=(negocio.id if negocio else None),
            )
            db.add(factura)
            db.flush()

            # ===== Detalles =====
            for p in factura_data["productos"]:
                cantidad = float(p.get("cantidad") or 0)
                precio_unitario = float(p.get("precio_unitario") or 0)
                nombre = (p.get("nombre") or "Producto sin nombre").strip()
                unidad = (p.get("unidad") or "UN").strip()

                codigo_raw = (p.get("codigo") or "").strip()
                codigo_norm_up = codigo_raw.upper()
                codigo = None if (not codigo_raw or codigo_norm_up == "N/A") else codigo_raw

                cod_admin_id_heredado = None

                if cod_admin_id_heredado is None and codigo is not None:
                    producto_anterior = (
                        db.query(models.Producto)
                        .filter(
                            models.Producto.codigo == codigo,
                            models.Producto.proveedor_id == proveedor.id,
                            models.Producto.cod_admin_id.isnot(None),
                        )
                        .order_by(models.Producto.id.desc())
                        .first()
                    )
                    if producto_anterior:
                        cod_admin_id_heredado = producto_anterior.cod_admin_id

                producto = crud.crear_producto_con_cod_lec(
                    db=db,
                    proveedor=proveedor,
                    nombre=nombre,
                    codigo=codigo,
                    unidad=unidad,
                    cantidad=cantidad,
                    cod_admin_id_heredado=cod_admin_id_heredado
                )

                porcentaje_adicional = 0.0
                um = 1.0
                if producto.cod_admin_id:
                    ca = db.query(models.CodigoAdminMaestro).get(producto.cod_admin_id)
                    if ca:
                        try:
                            um = float(ca.um) if ca.um is not None else 1.0
                        except Exception:
                            um = 1.0
                        porcentaje_adicional = float(ca.porcentaje_adicional or 0.0)

                neto = precio_unitario * cantidad * sign
                imp_adicional = neto * porcentaje_adicional
                otros = 0.0
                total_costo = neto + imp_adicional + otros
                denom = (cantidad * um) if (cantidad and um) else 0.0
                costo_unitario = (total_costo / denom) if denom else 0.0

                detalle = models.DetalleFactura(
                    factura_id=factura.id,
                    producto_id=producto.id,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    total=neto,
                    iva=0.0,
                    otros_impuestos=0.0,
                    imp_adicional=imp_adicional,
                    otros=otros,
                    total_costo=total_costo,
                    costo_unitario=costo_unitario,
                )
                db.add(detalle)

            nuevas += 1  

        db.commit()

        if nuevas == 0:
            return {
                "mensaje": "El archivo XML ya había sido cargado. No se registraron nuevas facturas.",
                "facturas_nuevas": 0,
                "facturas_duplicadas": duplicadas,
            }

        return {
            "mensaje": f"XML procesado correctamente. Facturas nuevas: {nuevas}, facturas duplicadas omitidas: {duplicadas}.",
            "facturas_nuevas": nuevas,
            "facturas_duplicadas": duplicadas,
        }

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Factura duplicada en base de datos.")
    except Exception:
        db.rollback()
        print("❌ Error procesando XML:", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Error interno procesando el archivo XML.")



@app.delete("/facturas/{id}")
def eliminar_factura(id: int, db: Session = Depends(get_db)):
    factura = db.query(models.Factura).filter(models.Factura.id == id).first()
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    # Eliminar primero los detalles asociados
    db.query(models.DetalleFactura).filter(models.DetalleFactura.factura_id == id).delete()

    db.delete(factura)
    db.commit()
    return {"mensaje": "Factura eliminada correctamente"}


@app.get("/facturas/buscar", response_model=List[Factura])
def buscar_facturas_por_rut(rut: str, db: Session = Depends(get_db)):
    return crud.buscar_facturas_por_rut_proveedor(db, rut)
from sqlalchemy.orm import joinedload

@app.get("/facturas")
def obtener_facturas(
    db: Session = Depends(get_db),
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    negocio_id: Optional[int] = None,
    negocio_nombre: Optional[str] = None,
    proveedor_rut: Optional[str] = None,
    folio: Optional[str] = None,
    limit: int = 25,
    offset: int = 0,
    current_user: models.Usuario = Depends(get_current_user),
):
    q = (
        db.query(models.Factura)
        .options(
            joinedload(models.Factura.proveedor),
            joinedload(models.Factura.negocio),
        )
        .outerjoin(models.NombreNegocio, models.Factura.negocio_id == models.NombreNegocio.id)
        .outerjoin(models.Proveedor, models.Proveedor.id == models.Factura.proveedor_id)
    )

  
    if not es_superadmin(current_user):
        if not current_user.negocio_id:
            # Usuario sin negocio asignado no ve nada
            return {"items": [], "total": 0}
        negocio_id = current_user.negocio_id      # ignoramos lo que venga en la URL
        negocio_nombre = None                     # no se permite cambiarlo

    # --- filtros por fecha ---
    if fecha_inicio and fecha_fin:
        q = q.filter(models.Factura.fecha_emision.between(fecha_inicio, fecha_fin))
    elif fecha_inicio:
        q = q.filter(models.Factura.fecha_emision >= fecha_inicio)
    elif fecha_fin:
        q = q.filter(models.Factura.fecha_emision <= fecha_fin)

    # --- filtros por negocio (ya validados arriba) ---
    if negocio_id:
        q = q.filter(models.Factura.negocio_id == negocio_id)
    if negocio_nombre:
        q = q.filter(models.NombreNegocio.nombre.ilike(f"%{negocio_nombre}%"))

    # --- resto igual ---
    if proveedor_rut:
        rut = proveedor_rut.replace(".", "").upper()
        q = q.filter(func.replace(func.upper(models.Proveedor.rut), ".", "") == rut)

    if folio:
        q = q.filter(models.Factura.folio.ilike(f"%{folio}%"))

    total = q.order_by(None).with_entities(func.count(models.Factura.id)).scalar() or 0

    items = (
        q.order_by(models.Factura.fecha_emision.desc(), models.Factura.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {"items": items, "total": total}



from app.schemas.schemas import ProductoConPrecio
from typing import List 

@app.get("/productos", response_model=dict)
def obtener_productos(
    db: Session = Depends(get_db),
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
    current_user: models.Usuario = Depends(get_current_user),
):
    # 🔐 Forzar negocio si no es superadmin
    if not es_superadmin(current_user):
        if not current_user.negocio_id:
            return {"productos": [], "total": 0}
        negocio_id = current_user.negocio_id
        negocio_nombre = None

    res = crud.obtener_productos_filtrados(
        db=db,
        nombre=nombre,
        cod_admin_id=cod_admin_id,
        categoria_id=categoria_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        codigo=codigo,
        folio=folio,
        limit=limit,
        offset=offset,
        negocio_id=negocio_id,
        negocio_nombre=negocio_nombre,
    )
    return {"productos": res["items"], "total": res["total"]}



@app.get("/productos/buscar", response_model=List[Producto])
def buscar_producto(nombre: str, db: Session = Depends(get_db)):
    return crud.buscar_producto_por_nombre(db, nombre)

@app.get("/proveedores", response_model=List[Proveedor])
def obtener_proveedores(db: Session = Depends(get_db)):
    return crud.obtener_todos_los_proveedores(db)

@app.get("/categorias", response_model=List[Categoria])
def obtener_categorias(db: Session = Depends(get_db)):
    return crud.obtener_todas_las_categorias(db)



@app.post("/categorias", response_model=Categoria)
def crear_categoria(categoria: CategoriaCreate, db: Session = Depends(get_db)):
    nueva = models.Categoria(nombre=categoria.nombre)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


# ---------------------
# RUTAS PUT
# ---------------------

@app.put("/productos/{id}/asignar-categoria", response_model=Producto)
def asignar_categoria(id: int, datos: CategoriaAsignacion, db: Session = Depends(get_db)):
    return crud.asignar_categoria_producto(db, id, datos.categoria_id)

@app.put("/productos/{id}", response_model= Producto)
def actualizar_producto(id: int, producto_update: ProductoUpdate, db: Session = Depends(get_db)):
    producto = db.query(models.Producto).filter(models.Producto.id == id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Actualizar campos básicos
    for campo, valor in producto_update.dict(exclude_unset=True).items():
        setattr(producto, campo, valor)

    db.add(producto)
    db.commit()
    db.refresh(producto)

    # Solo si se asignó un cod_admin_id nuevo
    if producto_update.cod_admin_id:
        cod_admin = db.query(models.CodigoAdminMaestro).filter_by(id=producto_update.cod_admin_id).first()
        if not cod_admin:
            raise HTTPException(status_code=404, detail="Código admin no encontrado")

        
        detalle = (
            db.query(models.DetalleFactura)
            .join(models.Factura, models.Factura.id == models.DetalleFactura.factura_id)
            .filter(models.DetalleFactura.producto_id == id)
            .order_by(models.Factura.fecha_emision.desc())
            .first()
        )

        if detalle:
            porcentaje = cod_admin.porcentaje_adicional or 0
            imp_ad = detalle.precio_unitario * detalle.cantidad * porcentaje
            detalle.imp_adicional = imp_ad
            db.add(detalle)
            db.commit()
            db.refresh(detalle)

    return producto

@app.get("/negocios", response_model=List[NombreNegocio])
def listar_negocios(db: Session = Depends(get_db)):
    return crud.obtener_negocios(db)

@app.put("/facturas/{id}/asignar-negocio", response_model=Factura)
def asignar_negocio(id: int, datos: NegocioAsignacion, db: Session = Depends(get_db)):
    return crud.asignar_negocio_a_factura(db, id, datos.negocio_id)




@app.put("/productos/{producto_id}/porcentaje-adicional")
def actualizar_imp_y_devolver_producto(producto_id: int, datos: PorcentajeAdicionalUpdate, db: Session = Depends(get_db)):
  
    nuevo_porc = float(datos.porcentaje_adicional or 0)
    
    producto = crud.actualizar_porcentaje_adicional(db, producto_id, nuevo_porc)

   
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    historial = crud.obtener_historial_precios(db, producto_id)
    detalle = historial[-1] if historial else None

    precio_unitario = detalle.precio_unitario if detalle else 0
    cantidad = detalle.cantidad if detalle else 0
    total_neto = detalle.total if detalle else 0
    imp_adicional = detalle.imp_adicional if detalle else 0
    otros = (detalle.otros or 0) if detalle else 0

  
    um = 1.0
    if producto.cod_admin and producto.cod_admin.um is not None:
        try:
            um = float(producto.cod_admin.um)
        except Exception:
            um = 1.0

    total_costo = total_neto + imp_adicional + otros
    denom = (cantidad * um)
    costo_unitario = (total_costo / denom) if denom else 0.0


    porcentaje_adicional = producto.cod_admin.porcentaje_adicional if producto.cod_admin else 0.0

    return {
        "id": producto.id,
        "nombre": producto.nombre,
        "codigo": producto.codigo,
        "unidad": producto.unidad,
        "cantidad": cantidad,
        "proveedor": producto.proveedor,
        "proveedor_id": producto.proveedor_id,
        "categoria_id": producto.categoria_id,
        "cod_admin_id": producto.cod_admin_id,
        "precio_unitario": precio_unitario,
        "iva": detalle.iva if detalle else 0,
        "otros_impuestos": detalle.otros_impuestos if detalle else 0,
        "total": total_neto,
        "porcentaje_adicional": porcentaje_adicional,
        "imp_adicional": imp_adicional,
        "categoria": producto.categoria,
        "cod_admin": producto.cod_admin,
        "total_neto": total_neto,
        "costo_unitario": costo_unitario,
        "total_costo": total_costo,
    }

@app.get("/productos/{producto_id}/historial-precios")
def historial_precios(producto_id: int, db: Session = Depends(get_db)):
    """
    HU-16: Historial de precios de un producto.
    Devuelve, por fecha, el precio neto (precio_unitario) y el precio con impuestos
    (costo_unitario) si está calculado en DetalleFactura.
    """
    detalles = crud.obtener_historial_precios(db, producto_id)

    resp = []
    for d in detalles:
        factura = d.factura
        if not factura or not factura.fecha_emision:
            continue

        fecha = factura.fecha_emision
        if isinstance(fecha, (datetime, date)):
            fecha_str = fecha.strftime("%Y-%m")
        else:
            fecha_str = str(fecha)[:7]

        precio_neto = float(d.precio_unitario or 0.0)
        precio_con_impuestos = float(d.costo_unitario or 0.0)

        resp.append({
            "fecha": fecha_str,
            "precio_neto": precio_neto,
            "precio_con_impuestos": precio_con_impuestos,
        })

    return resp

@app.get("/dashboard/principal")
def obtener_datos_dashboard(
    db: Session = Depends(get_db),
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    cod_admin_id: Optional[int] = None,
    codigo_producto: Optional[str] = None,
    current_user: models.Usuario = Depends(get_current_user),
):
    base = (
        db.query(models.DetalleFactura)
        .join(models.Factura, models.Factura.id == models.DetalleFactura.factura_id)
        .join(models.Producto, models.Producto.id == models.DetalleFactura.producto_id)
        .join(models.Proveedor, models.Proveedor.id == models.Producto.proveedor_id)
        .outerjoin(models.NombreNegocio, models.Factura.negocio_id == models.NombreNegocio.id)
    )

    # 🔐 Filtrar por negocio del usuario
    if not es_superadmin(current_user):
        if not current_user.negocio_id:
            # Sin negocio asignado => dashboard vacío
            return {
                "historial_precios": [],
                "facturas_mensuales": [],
                "promedios_proveedor": [],
            }
        base = base.filter(models.Factura.negocio_id == current_user.negocio_id)

    # ---- filtros ----
    if fecha_inicio and fecha_fin:
        base = base.filter(models.Factura.fecha_emision.between(fecha_inicio, fecha_fin))
    elif fecha_inicio:
        base = base.filter(models.Factura.fecha_emision >= fecha_inicio)
    elif fecha_fin:
        base = base.filter(models.Factura.fecha_emision <= fecha_fin)

    if cod_admin_id:
        base = base.filter(models.Producto.cod_admin_id == cod_admin_id)

    if codigo_producto:
        base = base.filter(models.Producto.codigo.ilike(f"%{codigo_producto}%"))


    mes_expr = func.date_trunc('month', models.Factura.fecha_emision).label("mes")

    historial = (
        base.with_entities(
            mes_expr,
            func.avg(models.DetalleFactura.costo_unitario).label("costo_promedio"),
        )
        .group_by(mes_expr)
        .order_by(mes_expr)
        .all()
    )

  
    facturas_mensuales = (
        base.with_entities(
            mes_expr,
            func.sum(models.DetalleFactura.total_costo).label("total"),
        )
        .group_by(mes_expr)
        .order_by(mes_expr)
        .all()
    )


    promedios_proveedor = (
        base.with_entities(
            models.Proveedor.nombre.label("proveedor"),
            func.avg(models.DetalleFactura.costo_unitario).label("costo_promedio"),
        )
        .group_by(models.Proveedor.nombre)
        .order_by(models.Proveedor.nombre)
        .all()
    )


    def mes_to_str(m):
        return (m.strftime("%Y-%m") if hasattr(m, "strftime") else str(m)[:7])

    return {
        "historial_precios": [
            {"mes": mes_to_str(mes), "costo_promedio": float(costo or 0.0)}
            for mes, costo in historial
        ],
        "facturas_mensuales": [
            {"mes": mes_to_str(mes), "total": float(total or 0.0)}
            for mes, total in facturas_mensuales
        ],
        "promedios_proveedor": [
            {"proveedor": prov, "costo_promedio": float(costo or 0.0)}
            for prov, costo in promedios_proveedor
        ],
    }

@app.get("/exportar/productos/excel")
def exportar_productos_excel(
    db: Session = Depends(get_db),
    nombre: Optional[str] = None,
    cod_admin_id: Optional[int] = None,
    categoria_id: Optional[int] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    codigo: Optional[str] = None,
    folio: Optional[str] = None,
    negocio_id: Optional[int] = None,
    negocio_nombre: Optional[str] = None,
):
    res = crud.obtener_productos_filtrados(
        db=db,
        nombre=nombre, cod_admin_id=cod_admin_id, categoria_id=categoria_id,
        fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
        codigo=codigo, folio=folio,
        limit=100000, offset=0,            
        negocio_id=negocio_id, negocio_nombre=negocio_nombre,
    )
    productos = res["items"]

    wb = Workbook(); ws = wb.active; ws.title = "Productos"
    headers = [
        "Folio","Negocio","FchEmis",
        "ID","Nombre","Nombre Maestro","Código",
        "Cod Admin","UM","Familia","Área",
        "Cantidad","Unidad",
        "Precio Unitario","Neto","% Adic","Imp. Adic","Otros",
        "Total Costo","Costo Unitario","Cod Lectura"
    ]
    ws.append(headers)

    for p in productos:
        ca = p.get("cod_admin") or {}
        ws.append([
            p.get("folio",""),
            p.get("negocio_nombre",""),
            str(p.get("fecha_emision") or "")[:10],
            p["id"],
            p["nombre"],
            p.get("nombre_maestro") or "",
            p.get("codigo") or "",
            ca.get("cod_admin",""),
            ca.get("um",""),
            ca.get("familia",""),
            ca.get("area",""),
            p.get("cantidad",0),
            p.get("unidad",""),
            p.get("precio_unitario",0),
            p.get("total_neto",0),
            (ca.get("porcentaje_adicional") or 0),
            p.get("imp_adicional",0),
            p.get("otros",0),
            p.get("total_costo",0),
            p.get("costo_unitario",0),
            p.get("cod_lectura",""),
        ])

    stream = io.BytesIO(); wb.save(stream); stream.seek(0)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=productos_filtrados.xlsx"}
    )


@app.get("/exportar/facturas/excel")
def exportar_facturas_excel(
    db: Session = Depends(get_db),
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    negocio_id: Optional[int] = None,
    negocio_nombre: Optional[str] = None,
    proveedor_rut: Optional[str] = None,
    folio: Optional[str] = None,
):
    q = (
        db.query(models.Factura)
        .outerjoin(models.NombreNegocio, models.Factura.negocio_id == models.NombreNegocio.id)
        .outerjoin(models.Proveedor, models.Proveedor.id == models.Factura.proveedor_id)
    )
    if fecha_inicio and fecha_fin:
        q = q.filter(models.Factura.fecha_emision.between(fecha_inicio, fecha_fin))
    elif fecha_inicio:
        q = q.filter(models.Factura.fecha_emision >= fecha_inicio)
    elif fecha_fin:
        q = q.filter(models.Factura.fecha_emision <= fecha_fin)

    if negocio_id:
        q = q.filter(models.Factura.negocio_id == negocio_id)
    if negocio_nombre:
        q = q.filter(models.NombreNegocio.nombre.ilike(f"%{negocio_nombre}%"))

    if proveedor_rut:
        rut = proveedor_rut.replace(".","").upper()
        q = q.filter(func.replace(func.upper(models.Proveedor.rut), ".", "") == rut)

    if folio:
        q = q.filter(models.Factura.folio.ilike(f"%{folio}%"))

    facturas = q.order_by(models.Factura.fecha_emision.asc(), models.Factura.id.asc()).all()

    wb = Workbook(); ws = wb.active; ws.title = "Facturas"
    headers = [
        "ID","Folio","FchEmis","Proveedor","RUT Proveedor",
        "Negocio","RUT Receptor (si lo guardas)","Total Neto (calc)","IVA","Otros Impuestos","Total (XML)",
        "Es Nota de Crédito"
    ]
    ws.append(headers)

    for f in facturas:
        total_neto = sum(det.precio_unitario * det.cantidad * (-1 if f.es_nota_credito else 1) for det in f.detalles)
        iva = sum(det.iva for det in f.detalles)
        otros = sum(det.otros_impuestos for det in f.detalles)
        total = f.monto_total or 0
        ws.append([
            f.id, f.folio, f.fecha_emision.isoformat() if f.fecha_emision else "",
            (f.proveedor.nombre if f.proveedor else ""),
            (f.proveedor.rut if f.proveedor else ""),
            (f.negocio.nombre if f.negocio else ""),
            getattr(f, "rut_receptor", ""), 
            total_neto, iva, otros, total, bool(f.es_nota_credito),
        ])

    stream = io.BytesIO(); wb.save(stream); stream.seek(0)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=facturas_filtradas.xlsx"}
    )

@app.get("/productos/order-ids")
def productos_order_ids(
    db: Session = Depends(get_db),
    nombre: Optional[str] = None,
    cod_admin_id: Optional[int] = None,
    categoria_id: Optional[int] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    codigo: Optional[str] = None,
    folio: Optional[str] = None,
    negocio_id: Optional[int] = None,
    negocio_nombre: Optional[str] = None,
    max_ids: int = 5000,  # seguridad
):
    
    res = crud.obtener_productos_filtrados(
        db=db,
        nombre=nombre, cod_admin_id=cod_admin_id, categoria_id=categoria_id,
        fecha_inicio=fecha_inicio, fecha_fin=fecha_fin,
        codigo=codigo, folio=folio,
        limit=max_ids, offset=0,
        negocio_id=negocio_id, negocio_nombre=negocio_nombre,
    )
    ids = [item["id"] for item in res["items"]]
    return {"ids": ids, "total": res["total"]}


@app.get("/productos/{id}", response_model=ProductoConPrecio)
def obtener_producto_por_id(id: int, db: Session = Depends(get_db)):
    producto = db.query(models.Producto).filter(models.Producto.id == id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    detalle = (
        db.query(models.DetalleFactura)
        .join(models.Factura, models.Factura.id == models.DetalleFactura.factura_id)
        .filter(models.DetalleFactura.producto_id == id)
        .order_by(models.Factura.fecha_emision.desc(), models.DetalleFactura.id.desc())
        .first()
    )

    if not detalle:
        return {
            "id": producto.id, "nombre": producto.nombre, "codigo": producto.codigo,
            "unidad": producto.unidad, "cantidad": 0, "proveedor": producto.proveedor,
            "proveedor_id": producto.proveedor_id, "categoria_id": producto.categoria_id,
            "cod_admin_id": producto.cod_admin_id, "precio_unitario": 0, "iva": 0,
            "otros_impuestos": 0, "total": 0, "porcentaje_adicional": (producto.cod_admin.porcentaje_adicional if producto.cod_admin else 0.0),
            "imp_adicional": 0, "categoria": producto.categoria, "cod_admin": producto.cod_admin,
            "total_neto": 0, "costo_unitario": 0, "total_costo": 0, "otros": 0
        }

    porcentaje_adicional = producto.cod_admin.porcentaje_adicional if producto.cod_admin else 0.0
    total_costo = detalle.total + detalle.imp_adicional + (detalle.otros or 0)
    um_factor = 1.0
    if producto.cod_admin and producto.cod_admin.um:
        try:
            um_factor = float(producto.cod_admin.um)
        except Exception:
            um_factor = 1.0

    denom = (detalle.cantidad or 0) * um_factor
    costo_unitario = (total_costo / denom) if denom else 0

    return {
        "id": producto.id,
        "nombre": producto.nombre,
        "codigo": producto.codigo,
        "unidad": producto.unidad,
        "cantidad": detalle.cantidad,
        "proveedor": producto.proveedor,
        "proveedor_id": producto.proveedor_id,
        "categoria_id": producto.categoria_id,
        "cod_admin_id": producto.cod_admin_id,
        "precio_unitario": detalle.precio_unitario,
        "iva": detalle.iva,
        "otros_impuestos": detalle.otros_impuestos,
        "total": detalle.total,                      
        "porcentaje_adicional": porcentaje_adicional,
        "imp_adicional": detalle.imp_adicional,
        "categoria": producto.categoria,
        "cod_admin": producto.cod_admin,
        "total_neto": detalle.total,
        "costo_unitario": costo_unitario,
        "total_costo": total_costo,
        "otros": detalle.otros,                       
    }


from sqlalchemy import asc

@app.get("/codigos_admin_maestro", response_model=List[CodigoAdminMaestro])
def listar_codigos_admin_maestro(db: Session = Depends(get_db)):
    return (
        db.query(models.CodigoAdminMaestro)
        .order_by(
            asc(models.CodigoAdminMaestro.cod_admin),
            asc(models.CodigoAdminMaestro.nombre_producto)
        )
        .all()
    )

@app.get("/codigos_admin", response_model=List[CodigoAdminMaestro])
def listar_codigos_admin(db: Session = Depends(get_db)):
    return (
        db.query(models.CodigoAdminMaestro)
        .order_by(
            asc(models.CodigoAdminMaestro.cod_admin),
            asc(models.CodigoAdminMaestro.nombre_producto)
        )
        .all()
    )

@app.put("/productos/{producto_id}/asignar-cod-admin")
def asignar_cod_admin(producto_id: int, cod_admin_id: int, db: Session = Depends(get_db)):
    producto = crud.actualizar_producto(db, producto_id, ProductoUpdate(cod_admin_id=cod_admin_id))
    return {"mensaje": "Código admin asignado correctamente", "producto": producto}



@app.post("/cod-lec/sugerir", response_model=CodigoLecturaResponse)
def sugerir_cod_lec(req: CodLecSugerirRequest, db: Session = Depends(get_db)):
    cod_lec = crud.upsert_cod_lec(db, req.rut_proveedor, req.nombre_producto, req.codigo_producto)
    return cod_lec

@app.post("/cod-lec/asignar")
def asignar_cod_lec(req: CodLecAsignacionRequest, db: Session = Depends(get_db)):
    cod_lec = crud.asignar_cod_lec_a_cod_admin(db, req.cod_lec, req.cod_admin_id)
    return {"ok": True, "cod_lec": cod_lec.valor, "cod_admin_id": cod_lec.cod_admin_id}


from app.schemas.schemas import OtrosUpdate

@app.put("/productos/{producto_id}/otros")
def set_otros_producto(producto_id: int, body: OtrosUpdate, db: Session = Depends(get_db)):
    det = crud.actualizar_otros_en_ultimo_detalle(db, producto_id, body.otros)
    prod = det.producto
    porcentaje = prod.cod_admin.porcentaje_adicional if prod.cod_admin else 0.0

    return {
        "id": prod.id,
        "nombre": prod.nombre,
        "codigo": prod.codigo,
        "unidad": prod.unidad,
        "cantidad": det.cantidad,
        "proveedor": prod.proveedor,
        "proveedor_id": prod.proveedor_id,
        "categoria_id": prod.categoria_id,
        "cod_admin_id": prod.cod_admin_id,
        "precio_unitario": det.precio_unitario,
        "iva": det.iva,
        "otros_impuestos": det.otros_impuestos,
        "total": det.total,                     
        "porcentaje_adicional": porcentaje,
        "imp_adicional": det.imp_adicional,
        "otros": det.otros,                      
        "categoria": prod.categoria,
        "cod_admin": prod.cod_admin,
        "total_neto": det.total,
        "costo_unitario": det.costo_unitario,
        "total_costo": det.total_costo,
    }


