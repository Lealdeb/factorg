# app/xml_parser.py
import xml.etree.ElementTree as ET
from app.crud import obtener_cod_admin_y_maestro

def _text(node, path, default=""):
    el = node.find(path)
    return (el.text or default).strip() if el is not None else default

def _as_float(val, default=0.0):
    try:
        return float(val)
    except Exception:
        return default

def _find_documentos(root):
    docs = [n for n in root.iter() if n.tag.endswith("Documento")]
    return docs if docs else [root] 

def procesar_xml(contenido_xml, db):
    root = ET.fromstring(contenido_xml)
    facturas = []

    for doc in _find_documentos(root):
        tipo_dte = _text(doc, ".//Encabezado/IdDoc/TipoDTE")
        es_nota_credito = (tipo_dte == "61")

        emisor = {
            "rut":          _text(doc, ".//Encabezado/Emisor/RUTEmisor"),
            "razon_social": _text(doc, ".//Encabezado/Emisor/RznSoc"),
            "correo":       _text(doc, ".//Encabezado/Receptor/Contacto", ""),
            "comuna":       _text(doc, ".//Encabezado/Emisor/CdgSIISucur", ""),
        }
        receptor = {
            "rut":           _text(doc, ".//Encabezado/Receptor/RUTRecep"),     
            "razon_social":  _text(doc, ".//Encabezado/Receptor/RznSocRecep"),
            "direccion":     _text(doc, ".//Encabezado/Receptor/DirRecep"),
            "correo":        (_text(doc, ".//Encabezado/Receptor/CorreoRecep") or
                            _text(doc, ".//Encabezado/Receptor/Contacto", "")),
            "cdgint":        _text(doc, ".//Encabezado/Receptor/CdgIntRecep", ""),
        }
        negocio_hint = (
            receptor["correo"] or receptor["direccion"] or receptor["razon_social"] or receptor["cdgint"] or ""
        ).strip()

        folio         = _text(doc, ".//Encabezado/IdDoc/Folio")
        fecha_emision = _text(doc, ".//Encabezado/IdDoc/FchEmis")
        forma_pago    = _text(doc, ".//Encabezado/IdDoc/FmaPago", "Contado")

        monto_total = _as_float(_text(doc, ".//Totales/MntTotal", "0"))
        if es_nota_credito:
            monto_total *= -1

        productos = []
        detalles = [n for n in doc.findall(".//Detalle") if n.tag.endswith("Detalle")]
        for item in detalles:
            cantidad = _as_float(
                _text(item, "Cantidad") or _text(item, "QtyItem") or "0"
            )
            precio_unitario = _as_float(
                _text(item, "PrecioUnitario") or _text(item, "PrcItem") or "0"
            )
            nombre = _text(item, "NmbItem", "Producto sin nombre")
            codigo = (_text(item, "CdgItem/VlrCodigo")
                      or _text(item, "CdgItem/TpoCodigo")
                      or "N/A")
            unidad = _text(item, "UnmdItem", "UN")

    
            cod_admin_id, maestro = obtener_cod_admin_y_maestro(db, codigo)
            porcentaje_adicional = (maestro.porcentaje_adicional if maestro else 0.0)

            sign = -1 if es_nota_credito else 1
            neto = precio_unitario * cantidad * sign       
            imp_adicional = neto * porcentaje_adicional

            productos.append({
                "nombre": nombre,
                "codigo": codigo,
                "unidad": unidad,
                "cantidad": cantidad,
                "precio_unitario": precio_unitario,
                "total": neto,            
                "iva": 0.0,
                "otros_impuestos": 0.0,
                "imp_adicional": imp_adicional,
                "cod_admin_id": cod_admin_id,
            })

        facturas.append({
            "folio": folio,
            "fecha_emision": fecha_emision,
            "forma_pago": forma_pago,
            "monto_total": monto_total,
            "emisor": emisor,
            "receptor": receptor,            
            "negocio_hint": negocio_hint,  
            "productos": productos,
            "es_nota_credito": es_nota_credito,
        })

    return facturas
