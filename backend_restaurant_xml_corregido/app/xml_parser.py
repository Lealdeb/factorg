import xml.etree.ElementTree as ET
from app import models
from app.crud import obtener_cod_admin_y_maestro, recalcular_imp_adicional_detalles_producto

def obtener_porcentaje_adicional(codigo_producto, db):
    cod_admin = (
        db.query(models.CodigoAdminMaestro)
        .filter(models.CodigoAdminMaestro.cod_admin == codigo_producto)
        .first()
    )
    return cod_admin.porcentaje_adicional if cod_admin else 0.0

def procesar_xml(contenido_xml, db):
    tree = ET.ElementTree(ET.fromstring(contenido_xml))
    root = tree.getroot()

    tipo_dte = root.findtext(".//Encabezado/IdDoc/TipoDTE")
    es_nota_credito = tipo_dte == "61"  # ← Detectamos si es NC

    # Obtener datos del emisor
    emisor = {
        "rut": root.findtext(".//Encabezado/Emisor/RUTEmisor"),
        "razon_social": root.findtext(".//Encabezado/Emisor/RznSoc"),
        "correo": root.findtext(".//Encabezado/Receptor/Contacto", default=""),
        "comuna": root.findtext(".//Encabezado/Emisor/CdgSIISucur", default=""),
    }

    # Obtener datos de la factura
    folio = root.findtext(".//Encabezado/IdDoc/Folio")
    fecha_emision = root.findtext(".//Encabezado/IdDoc/FchEmis")
    forma_pago = root.findtext(".//Encabezado/IdDoc/FmaPago", default="Contado")
    monto_total = float(root.findtext(".//Totales/MntTotal", "0"))
    if es_nota_credito:
        monto_total *= -1

    # Procesar productos
    productos_xml = root.findall(".//Detalle")
    productos = []
    for item in productos_xml:
        cantidad_text = item.findtext("Cantidad") or item.findtext("QtyItem") or "0"
        cantidad = float(cantidad_text)
        precio_unitario = float(item.findtext("PrecioUnitario") or item.findtext("PrcItem") or "0")

        nombre = item.findtext("NmbItem", "Producto sin nombre")
        codigo = (
            item.findtext("CdgItem/VlrCodigo")
            or item.findtext("CdgItem/TpoCodigo", "N/A")
        )
        unidad = item.findtext("UnmdItem", "UN")

        # Porcentaje heredado si existe cod_admin previo
        cod_admin_id, maestro = obtener_cod_admin_y_maestro(db, codigo)
        porcentaje_adicional = (maestro.porcentaje_adicional if maestro else 0.0)

        # Signo: sólo en montos si es NC (TipoDTE=61)
        sign = -1 if es_nota_credito else 1

        neto = precio_unitario * cantidad * sign
        imp_adicional = neto * porcentaje_adicional
       

        productos.append({
            "nombre": nombre,
            "codigo": codigo,
            "unidad": unidad,
            "cantidad": cantidad,
            "precio_unitario": precio_unitario,
            "total": neto,                # 👈 guardamos el neto calculado, no el del XML
            "iva": 0.0,
            "otros_impuestos": 0.0,
            "imp_adicional": imp_adicional,
            "cod_admin_id": cod_admin_id,
        })


    return [{
        "folio": folio,
        "fecha_emision": fecha_emision,
        "forma_pago": forma_pago,
        "monto_total": monto_total,
        "emisor": emisor,
        "productos": productos,
        "es_nota_credito": es_nota_credito
    }]
