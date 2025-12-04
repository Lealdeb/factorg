# app/models.py

from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy import UniqueConstraint
# -----------------------------
# MODELOS SQLAlchemy (Tablas)
# -----------------------------

class Proveedor(Base):
    __tablename__ = "proveedores"

    id = Column(Integer, primary_key=True, index=True)
    rut = Column(String, unique=True, index=True)
    nombre = Column(String)
    tipo_pago = Column(String, nullable=True)
    direccion = Column(String, nullable=True)
    correo_contacto = Column(String, nullable=True)

    facturas = relationship("Factura", back_populates="proveedor")
    productos = relationship("Producto", back_populates="proveedor")


class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True)

    productos = relationship("Producto", back_populates="categoria")


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    codigo = Column(String, index=True)
    unidad = Column(String)
     
    cantidad = Column(Float)

    proveedor_id = Column(Integer, ForeignKey("proveedores.id"))
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)

    proveedor = relationship("Proveedor", back_populates="productos")
    categoria = relationship("Categoria", back_populates="productos")
    
    detalles = relationship("DetalleFactura", back_populates="producto")
    

    cod_admin_id = Column(Integer, ForeignKey("codigos_admin_maestro.id"), nullable=True)
    cod_admin = relationship("CodigoAdminMaestro", back_populates="productos")

    porcentaje_adicional = Column(Float, default=0.0)
    imp_adicional = Column(Float, default=0.0)  
    
    cod_lec_id = Column(Integer, ForeignKey("codigos_lectura.id"), nullable=True)
    cod_lec = relationship("CodigoLectura", back_populates="productos")
  

class Factura(Base):
    __tablename__ = "facturas"
    __table_args__ = (
        UniqueConstraint('proveedor_id', 'folio', name='ux_facturas_proveedor_folio'),
    )

    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String)
    fecha_emision = Column(Date)
    fecha_vencimiento = Column(Date, nullable=True)
    forma_pago = Column(String)
    monto_total = Column(Float)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"))


    proveedor = relationship("Proveedor", back_populates="facturas")
    detalles = relationship("DetalleFactura", back_populates="factura")
    negocio_id = Column(Integer, ForeignKey("nombre_negocio.id"), nullable=True)
    negocio = relationship("NombreNegocio", back_populates="facturas")
    es_nota_credito = Column(Boolean, default=False)



class DetalleFactura(Base):
    __tablename__ = "detalle_factura"
    id = Column(Integer, primary_key=True, index=True)
    factura_id = Column(Integer, ForeignKey("facturas.id"))
    producto_id = Column(Integer, ForeignKey("productos.id"))

    cantidad = Column(Float)
    precio_unitario = Column(Float)
    total = Column(Float)                 # ← aquí guardamos el NETO
    iva = Column(Float, default=0)
    otros_impuestos = Column(Float, default=0)

    imp_adicional = Column(Float, default=0.0)
    otros = Column(Integer, default=0)    # 👈 NUEVO (entero)
    total_costo = Column(Float)
    costo_unitario = Column(Float)

    factura = relationship("Factura", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles")

    
class NombreNegocio(Base):
    __tablename__ = "nombre_negocio"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, nullable=False)
    rut_receptor = Column(String, unique=True, index=True, nullable=True)
    razon_social = Column(String, nullable=True)
    correo = Column(String, nullable=True)
    direccion = Column(String, nullable=True)

    facturas = relationship("Factura", back_populates="negocio")
    # 👇 NUEVO: relación con usuarios
    usuarios = relationship("Usuario", back_populates="negocio")
    





class CodigoAdminMaestro(Base):
    __tablename__ = "codigos_admin_maestro"

    id = Column(Integer, primary_key=True, index=True)
    cod_admin = Column(String)
    nombre_producto = Column(String, nullable=True)
    familia = Column(String, nullable=True)
    area = Column(String, nullable=True)
    um = Column(Float, nullable=True)
    un_medida = Column(String, nullable=True)
    porcentaje_adicional = Column(Float, default=0.0)
    imp_adicional = Column(Float, default=0.0)

    productos = relationship("Producto", back_populates="cod_admin")
    cods_lectura = relationship("CodigoLectura", back_populates="cod_admin")


class CodigoLectura(Base):
    __tablename__ = "codigos_lectura"

    id = Column(Integer, primary_key=True, index=True)
    valor = Column(String(160), unique=True, index=True, nullable=False)  # RUT_PALABRA_COD
    nombre_norm = Column(String, nullable=True)
    codigo_origen = Column(String, nullable=True)
    rut_proveedor = Column(String, nullable=True)

    cod_admin_id = Column(Integer, ForeignKey("codigos_admin_maestro.id"), nullable=True)
    cod_admin = relationship("CodigoAdminMaestro", back_populates="cods_lectura")

    productos = relationship("Producto", back_populates="cod_lec")

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)

    # ✅ NUEVO: UID de Supabase (claims["sub"])
    supabase_uid = Column(String, unique=True, index=True, nullable=True)

    email = Column(String, unique=True, index=True, nullable=False)
    username = Column("nombre", String, nullable=True, default="")
    password_hash = Column("hashed_password", String, nullable=True, default="")

    rol = Column(String, default="USUARIO", nullable=False)
    negocio_id = Column(Integer, ForeignKey("nombre_negocio.id"), nullable=True)

    puede_ver_dashboard = Column(Boolean, default=True)
    puede_subir_xml = Column(Boolean, default=False)
    puede_ver_tablas = Column(Boolean, default=False)
    activo = Column(Boolean, default=True)

    negocio = relationship("NombreNegocio", back_populates="usuarios")