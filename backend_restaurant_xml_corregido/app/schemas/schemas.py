# app/schemas/schemas.py

from pydantic import BaseModel, model_validator, validator
from typing import Optional, List, Union
from datetime import date
from decimal import Decimal, InvalidOperation


# -------- NEGOCIO --------
class NombreNegocioBase(BaseModel):
    nombre: str

class NombreNegocio(NombreNegocioBase):
    id: int
    class Config:
        from_attributes = True


class NegocioAsignacion(BaseModel):
    negocio_id: int
    
# -------- CATEGORÍA --------
class CategoriaBase(BaseModel):
    nombre: str

class Categoria(CategoriaBase):
    id: int
    class Config:
        from_attributes = True


# -------- PROVEEDOR --------
class ProveedorBase(BaseModel):
    rut: str
    nombre: str
    tipo_pago: Optional[str] = None
    direccion: Optional[str] = None
    correo_contacto: Optional[str] = None

class Proveedor(ProveedorBase):
    id: int
    class Config:
        from_attributes = True

# -------- ASIGNACIONES (PUT) --------
class CategoriaAsignacion(BaseModel):
    categoria_id: int

class CategoriaCreate(BaseModel):
    nombre: str

class CodigoAdminMaestroCreate(BaseModel):
    cod_admin: str
    nombre_producto: Optional[str]
    familia: Optional[str]
    area: Optional[str]
    um: Optional[float]
    un_medida: Optional[str]
    porcentaje_adicional: Optional[float] = 0.0
    imp_adicional: Optional[float] = 0.0

class CodigoAdminMaestro(CodigoAdminMaestroCreate):
    id: int
    class Config:
        from_attributes = True


# -------- PRODUCTO --------
class ProductoBase(BaseModel):
    nombre: str
    codigo: Optional[str] = None
    unidad: str
    cantidad: float

class Producto(ProductoBase):
    id: int
    proveedor_id: Optional[int]
    categoria: Optional[Categoria] = None
    cod_admin_id: Optional[int]
    cod_admin: Optional[CodigoAdminMaestro]
    class Config:
        from_attributes = True


class ProductoConPrecio(BaseModel):
    id: int
    nombre: str
    codigo: Optional[str] = None
    unidad: str
    cantidad: Optional[float]
    proveedor_id: Optional[int]
    categoria_id: Optional[int]
    precio_unitario: Optional[float]
    iva: Optional[float]
    otros_impuestos: Optional[float]
    total_neto: Optional[float]
    cod_admin_id: Optional[int] = None
    cod_admin: Optional[CodigoAdminMaestro] = None
    proveedor: Optional[Proveedor] = None
    categoria: Optional[Categoria] = None
    imp_adicional: Optional[float]
    porcentaje_adicional: Optional[float]
    folio: Optional[str] = None
    costo_unitario: Optional[float] = None
    total_costo: Optional[float] = None
    nombre_maestro: Optional[str] = None
    otros: Optional[int] = 0            

    class Config:
        from_attributes = True


class PorcentajeAdicionalUpdate(BaseModel):
    porcentaje_adicional: Optional[Union[str, float, int]]

    @validator("porcentaje_adicional", pre=True)
    def parse_porcentaje(cls, v):
        if v is None or v == "":
            return Decimal("0")
        s = str(v).strip().replace(" ", "").replace("%", "").replace(",", ".")
        try:
            d = Decimal(s)
        except InvalidOperation:
            raise ValueError("Formato de porcentaje inválido (ej: 10, 10%, 10,5 o 0.1)")
        if d > 1:
            d = d / Decimal("100")   
        if d < 0: d = Decimal("0")
        if d > 1: d = Decimal("1")
        return d.quantize(Decimal("0.0001"))

# -------- DETALLE FACTURA --------
class DetalleFacturaBase(BaseModel):
    cantidad: float
    precio_unitario: float
    total: float
    iva: float
    otros_impuestos: float
    imp_adicional: Optional[float] = 0.0
    otros: Optional[int] = 0           

    class Config:
        from_attributes = True

class OtrosUpdate(BaseModel):
    otros: int  


class DetalleFactura(DetalleFacturaBase):
    id: int
    producto: Producto
    class Config:
        from_attributes = True


# -------- NEGOCIO --------
class NombreNegocioBase(BaseModel):
    nombre: str

class NombreNegocio(NombreNegocioBase):
    id: int
    class Config:
        from_attributes = True


# -------- FACTURA --------
class FacturaBase(BaseModel):
    folio: str
    fecha_emision: date
    fecha_vencimiento: Optional[date] = None
    forma_pago: Optional[str] = None
    monto_total: float
    proveedor: Proveedor
    negocio: Optional[NombreNegocio] = None
    detalles: List[DetalleFactura]
    es_nota_credito: Optional[bool] = False

    class Config:
        from_attributes = True


class Factura(FacturaBase):
    id: int
    proveedor: Proveedor
    negocio: Optional[NombreNegocio] = None
    detalles: List[DetalleFactura]
    es_nota_credito: Optional[bool] = False

    class Config:
        from_attributes = True



# -------- ACTUALIZACIÓN PRODUCTO --------
class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    unidad: Optional[str] = None
    cantidad: Optional[float] = None
    proveedor_id: Optional[int] = None
    categoria_id: Optional[int] = None
    cod_admin_id: Optional[int] = None
    porcentaje_adicional: Optional[float] = None
    imp_adicional: Optional[float] = None

class CodigoAdminAsignacion(BaseModel):
    cod_admin_id: int

#----------------- cod_lect-----------------

class CodigoLecturaBase(BaseModel):
    valor: str
    nombre_norm: Optional[str] = None
    codigo_origen: Optional[str] = None
    rut_proveedor: Optional[str] = None
    cod_admin_id: Optional[int] = None
class CodigoLecturaResponse(CodigoLecturaBase):
    id: int
    class Config: from_attributes = True

class CodLecSugerirRequest(BaseModel):
    rut_proveedor: str
    nombre_producto: str
    codigo_producto: Optional[str] = None

class CodLecAsignacionRequest(BaseModel):
    cod_lec: str
    cod_admin_id: int
