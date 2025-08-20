# app/schemas/schemas.py

from pydantic import BaseModel, model_validator
from typing import Optional, List
from datetime import date

# -----------------------------
# SCHEMAS DE RESPUESTA Y ENTRADA
# -----------------------------

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
    um: Optional[str]
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
    codigo: str
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
    codigo: str
    unidad: str
    cantidad: Optional[float]
    proveedor_id: Optional[int]
    categoria_id: Optional[int]
    precio_unitario: Optional[float]
    iva: Optional[float]
    otros_impuestos: Optional[float]
    total_neto: Optional[float]
    cod_admin_id: Optional[int] = None         # 👈 Esto
    cod_admin: Optional[CodigoAdminMaestro] = None 
    proveedor: Optional[Proveedor] = None
    categoria: Optional[Categoria] = None
    imp_adicional: Optional[float]
    porcentaje_adicional: Optional[float]
    folio: Optional [str] = None
    costo_unitario: Optional[float] = None
    total_costo: Optional[float] = None

    @model_validator(mode="after")
    def calcular_costos(self):
        precio_unitario = self.precio_unitario or 0
        cantidad = self.cantidad or 0
        porcentaje_adicional = (
            self.cod_admin.porcentaje_adicional
            if self.cod_admin and self.cod_admin.porcentaje_adicional
            else 0
        )

        es_nc = getattr(self, "es_nota_credito", False)
        signo = -1 if es_nc else 1

        self.total_costo = signo * (precio_unitario * cantidad * (1 + porcentaje_adicional))
        self.costo_unitario = (
            self.total_costo / cantidad if cantidad else 0
        )
        self.imp_adicional = signo * (precio_unitario * cantidad * porcentaje_adicional)
        return self

    class Config:
        from_attributes = True

class PorcentajeAdicionalUpdate(BaseModel):
    porcentaje_adicional: float

# -------- DETALLE FACTURA --------
class DetalleFacturaBase(BaseModel):
    cantidad: float
    precio_unitario: float
    total: float
    iva: float
    otros_impuestos: float
    imp_adicional: Optional[float] = 0.0  # ✅ nuevo

    class Config:
        from_attributes = True


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
    fecha_vencimiento: Optional[date]
    forma_pago: str
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
