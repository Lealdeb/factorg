# app/main.py

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime,date
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
    PorcentajeAdicionalUpdate, CodigoAdminMaestro, ProductoUpdate, CodigoAdminAsignacion
) 



app = FastAPI()

# CORS para desarrollo local



from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://factorg-front-end.onrender.com",  # dominio del frontend
        "http://localhost:3000"  # para pruebas locales, opcional
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------
# RUTA: Cargar XML
# ---------------------
@app.post("/subir-xml/")
def subir_xml(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".xml"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos XML")

    contenido = file.file.read()
    try:
        facturas = xml_parser.procesar_xml(contenido, db)

        for factura_data in facturas:
            emisor = factura_data["emisor"]
            rut_limpio = emisor["rut"].strip().upper().replace('.', '')
            proveedor = db.query(models.Proveedor).filter(
                func.replace(func.upper(models.Proveedor.rut), '.', '') == rut_limpio
            ).first()

            if not proveedor:
                proveedor = models.Proveedor(
                    rut=emisor["rut"],
                    nombre=emisor["razon_social"],
                    correo_contacto=emisor["correo"],
                    direccion=emisor["comuna"],
                )
                db.add(proveedor)
                db.flush()

            if db.query(models.Factura).filter_by(folio=factura_data["folio"]).first():
                continue

            es_nota_credito = factura_data.get("es_nota_credito", False)
            factor = -1 if es_nota_credito else 1

            factura = models.Factura(
                folio=factura_data["folio"],
                fecha_emision=datetime.strptime(factura_data["fecha_emision"], "%Y-%m-%d").date(),
                forma_pago=factura_data["forma_pago"],
                monto_total=factura_data["monto_total"],
                proveedor_id=proveedor.id,
                es_nota_credito=es_nota_credito
            )
            db.add(factura)
            db.flush()

            for p in factura_data["productos"]:
                cantidad = float(p["cantidad"])
                precio_unitario = float(p["precio_unitario"])
                total_neto = float(p.get("total", 0))
                iva = float(p.get("iva", 0))
                otros_impuestos = float(p.get("otros_impuestos", 0))

                # Siempre respetamos lo que viene en XML:
                nombre = p["nombre"]
                codigo = p["codigo"]
                unidad = p["unidad"]

                # Solo heredamos el cod_admin_id si existe para ese código
                producto_anterior = db.query(models.Producto).filter_by(codigo=codigo).first()
                cod_admin_id = producto_anterior.cod_admin_id if producto_anterior else None

                # Buscamos el porcentaje adicional si existe cod_admin
                porcentaje_adicional = 0.0
                if cod_admin_id:
                    cod_admin = db.query(models.CodigoAdminMaestro).filter_by(id=cod_admin_id).first()
                    if cod_admin:
                        porcentaje_adicional = cod_admin.porcentaje_adicional or 0.0

                # Creamos SIEMPRE un nuevo producto (aunque tenga mismo código)
                producto = models.Producto(
                    nombre=nombre,               # del XML
                    codigo=codigo,               # del XML
                    unidad=unidad,               # del XML
                    cantidad=cantidad,           # del XML
                    proveedor_id=proveedor.id,
                    cod_admin_id=cod_admin_id    # heredado (si aplica)
                )
                db.add(producto)
                db.flush()

                # Cálculo del imp_adicional y totales
                imp_adicional = total_neto * porcentaje_adicional
                total_costo = total_neto + imp_adicional
                costo_unitario = total_costo / cantidad if cantidad else 0

                detalle = models.DetalleFactura(
                    factura_id=factura.id,
                    producto_id=producto.id,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    total=total_neto,
                    iva=iva,
                    otros_impuestos=otros_impuestos,
                    imp_adicional=imp_adicional,
                    total_costo=total_costo,
                    costo_unitario=costo_unitario
                )
                db.add(detalle)

        db.commit()
        return {"mensaje": "XML procesado correctamente", "facturas_procesadas": len(facturas)}

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Factura duplicada")
    except Exception:
        db.rollback()
        print("❌ Error procesando XML:", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Error interno procesando el archivo")


@app.get("/facturas", response_model=List[Factura])
def obtener_facturas(db: Session = Depends(get_db)):
    return crud.obtener_todas_las_facturas(db)

@app.get("/facturas/buscar", response_model=List[Factura])
def buscar_facturas_por_rut(rut: str, db: Session = Depends(get_db)):
    return crud.buscar_facturas_por_rut_proveedor(db, rut)

@app.get("/facturas/{id}", response_model=Factura)
def obtener_factura(id: int, db: Session = Depends(get_db)):
    factura = crud.obtener_factura_por_id(db, id)
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return factura

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
    limit: int = 25,
    offset: int = 0
):
    productos = crud.obtener_productos_filtrados(
        db=db,
        nombre=nombre,
        cod_admin_id=cod_admin_id,
        categoria_id=categoria_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        limit=limit,
        offset=offset
    )

    total = crud.contar_productos_filtrados(
        db=db,
        nombre=nombre,
        cod_admin_id=cod_admin_id,
        categoria_id=categoria_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin
    )

    # 🔧 Cálculo manual para los campos derivados
    for p in productos:
        if hasattr(p, 'detalle_factura') and p.detalle_factura:
            detalle = p.detalle_factura[0]
            p.total_costo = detalle.total_costo
            p.costo_unitario = detalle.costo_unitario
            p.imp_adicional = detalle.imp_adicional

    return {
        "productos": [ProductoConPrecio.from_orm(p) for p in productos],
        "total": total
    }




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

        # Buscar el último DetalleFactura del producto
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




@app.put("/productos/{producto_id}/porcentaje-adicional", response_model=ProductoConPrecio)
def actualizar_imp_adicional(producto_id: int, datos: PorcentajeAdicionalUpdate, db: Session = Depends(get_db)):
    producto = crud.actualizar_porcentaje_adicional(db, producto_id, datos.porcentaje_adicional)
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@app.get("/productos/{producto_id}/historial-precios")
def historial_precios(producto_id: int, db: Session = Depends(get_db)):
    datos = crud.obtener_historial_precios(db, producto_id)
    return [{"fecha": f.fecha_emision.strftime("%Y-%m"), "precio_unitario": float(f.precio_unitario)} for f in datos]

@app.get("/dashboard/principal")
def obtener_datos_dashboard(db: Session = Depends(get_db)):
    # Historial de precios por fecha global
    historial = (
        db.query(
            models.Factura.fecha_emision,
            func.avg(models.DetalleFactura.precio_unitario).label("precio_promedio")
        )
        .join(models.DetalleFactura.factura)
        .group_by(models.Factura.fecha_emision)
        .order_by(models.Factura.fecha_emision)
        .all()
    )

    # Total mensual de facturas
    total_facturas = (
        db.query(
            func.date_trunc('month', models.Factura.fecha_emision).label("mes"),
            func.sum(models.DetalleFactura.total).label("total_mensual")
        )
        .join(models.Factura.detalles)
        .group_by("mes")
        .order_by("mes")
        .all()
    )

    # Promedio por proveedor
    promedio_proveedor = (
        db.query(
            models.Proveedor.nombre,
            func.avg(models.DetalleFactura.precio_unitario).label("precio_promedio")
        )
        .join(models.Producto, models.Producto.proveedor_id == models.Proveedor.id)
        .join(models.DetalleFactura, models.DetalleFactura.producto_id == models.Producto.id)
        .group_by(models.Proveedor.nombre)
        .all()
    )

    return {
        "historial_precios": [{"fecha": h[0], "precio_promedio": h[1]} for h in historial],
        "facturas_mensuales": [{"mes": f[0], "total": f[1]} for f in total_facturas],
        "promedios_proveedor": [{"proveedor": p[0], "precio_promedio": p[1]} for p in promedio_proveedor],
    }




@app.get("/exportar/productos/excel")
def exportar_productos_excel(db: Session = Depends(get_db)):
    productos = crud.obtener_productos_filtrados(db)

    wb = Workbook()
    ws = wb.active
    ws.title = "Productos"

    headers = [
        "ID", "Nombre", "Código", "Cantidad", "Unidad", "Proveedor",
        "Categoría", "Código Admin", "UM", "Familia", "Área",
        "Precio Unitario", "IVA", "Otros Impuestos", "Total Neto", "Imp. Adicional", 
        "Total Costo", "Costo Unitario"
    ]
    ws.append(headers)

    for p in productos:
        cod_admin = p.get("cod_admin")
        categoria = p.get("categoria")

        ws.append([
            p["id"],
            p["nombre"],
            p["codigo"],
            p["cantidad"],
            p["unidad"],
            p["proveedor_id"],
            categoria.nombre if categoria else "",
            cod_admin.cod_admin if cod_admin else "",
            cod_admin.um if cod_admin else "",
            cod_admin.familia if cod_admin else "",
            cod_admin.area if cod_admin else "",
            p["precio_unitario"],
            p["iva"],
            p["otros_impuestos"],
            p["total_neto"],
            p.get("imp_adicional", 0),
            p.get("total_costo", 0),
            p.get("costo_unitario", 0),
        ])



    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0) 

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=productos.xlsx"}
    )


@app.get("/exportar/facturas/excel")
def exportar_facturas_excel(db: Session = Depends(get_db)):
    facturas = db.query(models.Factura).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Facturas"

    # Encabezados
    headers = [
        "ID", "Fecha Emisión", "Fecha Vencimiento", "Proveedor", 
        "RUT Proveedor", "Total Neto", "IVA", "Otros Impuestos", "Total"
    ]
    ws.append(headers)

    for f in facturas:
        total_neto = sum(det.precio_unitario * det.cantidad for det in f.detalles)
        iva = sum(det.iva for det in f.detalles)
        otros = sum(det.otros_impuestos for det in f.detalles)
        total = sum(det.total for det in f.detalles)

        ws.append([
            f.id,
            f.fecha_emision.strftime("%Y-%m-%d"),
            f.fecha_vencimiento.strftime("%Y-%m-%d") if f.fecha_vencimiento else "",
            f.proveedor.nombre if f.proveedor else "",
            f.proveedor.rut if f.proveedor else "",
            total_neto,
            iva,
            otros,
            total
        ])

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=facturas.xlsx"}
    )



@app.get("/productos", response_model=List[ProductoConPrecio])
def filtrar_productos(
    nombre: Optional[str] = Query(None),
    grupo_admin_id: Optional[int] = Query(None),
    categoria_id: Optional[int] = Query(None),
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    productos = crud.obtener_productos_filtrados(
        db, nombre, grupo_admin_id, categoria_id, fecha_inicio, fecha_fin
    )

    if productos:
        print("🔍 Producto[0] =>", productos[0])
        if productos[0].get("cod_admin"):
            print("✅ cod_admin incluido:", productos[0]["cod_admin"])
        else:
            print("❌ cod_admin es None o no está presente")

    return productos

@app.get("/productos/{id}", response_model=ProductoConPrecio)
def obtener_producto_por_id(id: int, db: Session = Depends(get_db)):
    producto = crud.obtener_producto_por_id(db, id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    historial = crud.obtener_historial_precios(db, id)
    detalle = historial[-1] if historial else None

    precio_unitario = detalle.precio_unitario if detalle else 0
    cantidad = detalle.cantidad if detalle else 0
    total_neto = detalle.total if detalle else 0
    imp_adicional = detalle.imp_adicional if detalle else 0
    total_costo = total_neto + imp_adicional
    costo_unitario = total_costo / cantidad if cantidad else 0

    porcentaje_adicional = (
        producto.cod_admin.porcentaje_adicional if producto.cod_admin else 0.0
    )

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
        "total": total_neto,  # puedes usar otro nombre si prefieres
        "porcentaje_adicional": porcentaje_adicional,
        "imp_adicional": imp_adicional,
        "categoria": producto.categoria,
        "cod_admin": producto.cod_admin,
        "total_neto": total_neto,
        "costo_unitario": costo_unitario,
        "total_costo": total_costo,
    }


@app.get("/codigos_admin_maestro", response_model=List[CodigoAdminMaestro])
def listar_codigos_admin_maestro(db: Session = Depends(get_db)):
    return db.query(models.CodigoAdminMaestro).all()

@app.get("/codigos_admin", response_model=List[CodigoAdminMaestro])
def listar_codigos_admin(db: Session = Depends(get_db)):
    return db.query(models.CodigoAdminMaestro).all()

@app.put("/productos/{producto_id}/asignar-cod-admin")
def asignar_cod_admin(producto_id: int, cod_admin_id: int, db: Session = Depends(get_db)):
    producto = crud.actualizar_producto(db, producto_id, ProductoUpdate(cod_admin_id=cod_admin_id))
    return {"mensaje": "Código admin asignado correctamente", "producto": producto}


@app.get("/codigos_admin_maestro", response_model=List[CodigoAdminMaestro])
def get_codigos_admin_maestro(db: Session = Depends(get_db)):
    return db.query(models.CodigoAdminMaestro).all()