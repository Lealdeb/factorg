// src/pages/Productos.jsx
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config';

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [totalProductos, setTotalProductos] = useState(0);

  // filtros
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [folio, setFolio] = useState('');
  const [codAdminId, setCodAdminId] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // catálogos
  const [codigosAdmin, setCodigosAdmin] = useState([]);
  const [categorias, setCategorias] = useState([]);

  // paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 25;
  const ultimaPagina = Math.max(1, Math.ceil(totalProductos / productosPorPagina));

  const CLP = (n) => (n ?? 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
  const neg = (v) => (v < 0 ? 'text-red-600' : '');

  const fetchFiltros = async () => {
    try {
      const [resAdmin, resCat] = await Promise.all([
        axios.get(`${API_BASE_URL}/codigos_admin_maestro`),
        axios.get(`${API_BASE_URL}/categorias`),
      ]);
      setCodigosAdmin(resAdmin.data || []);
      setCategorias(resCat.data || []);
    } catch (e) {
      console.error('Error cargando filtros', e);
    }
  };

  const fetchProductos = async () => {
    try {
      const params = {
        limit: productosPorPagina,
        offset: (paginaActual - 1) * productosPorPagina,
      };
      if (nombre) params.nombre = nombre;
      if (codigo) params.codigo = codigo;
      if (folio) params.folio = folio;
      if (codAdminId) params.cod_admin_id = codAdminId;
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;

      const res = await axios.get(`${API_BASE_URL}/productos`, { params });
      setProductos(res.data?.productos || []);
      setTotalProductos(res.data?.total ?? 0);
    } catch (err) {
      console.error('❌ Error al obtener productos', err);
    }
  };

  useEffect(() => {
    fetchFiltros();
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [paginaActual]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuscar = (e) => {
    e.preventDefault();
    setPaginaActual(1);
    setTimeout(fetchProductos, 0);
  };

  const limpiarFiltros = () => {
    setNombre('');
    setCodigo('');
    setFolio('');
    setCodAdminId('');
    setFechaInicio('');
    setFechaFin('');
    setPaginaActual(1);
    setTimeout(fetchProductos, 0);
  };

  // ordenar opciones "Cod. Admin — Nombre" (orden natural)
  const codigosAdminOrdenados = useMemo(
    () =>
      [...codigosAdmin].sort((a, b) =>
        String(a.cod_admin ?? '').localeCompare(String(b.cod_admin ?? ''), 'es', {
          numeric: true,
        })
      ),
    [codigosAdmin]
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Productos</h1>

      {/* Filtros */}
      <form onSubmit={handleBuscar} className="mb-6 space-y-4">
        <div className="grid grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Nombre (factura o maestro)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border rounded p-2 w-full"
          />
          <input
            type="text"
            placeholder="Código producto"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="border rounded p-2 w-full"
          />
          <input
            type="text"
            placeholder="Folio factura"
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            className="border rounded p-2 w-full"
          />
          <select
            value={codAdminId}
            onChange={(e) => setCodAdminId(e.target.value)}
            className="border rounded p-2"
          >
            <option value="">Cod. Admin</option>
            {codigosAdminOrdenados.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.cod_admin ?? '—') + ' — ' + (c.nombre_producto ?? '(sin nombre)')}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border rounded p-2"
          />
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border rounded p-2"
          />
        </div>

        <div className="mt-2">
          <button type="submit" className="bg-black text-white py-2 px-4 rounded">
            Buscar
          </button>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="bg-gray-300 text-black py-2 px-4 rounded ml-2"
          >
            Limpiar
          </button>
        </div>
      </form>

      {/* Tabla */}
      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-3">Folio</th>
            <th className="text-left p-3">Nombre (Factura)</th>
            <th className="text-left p-3">Nombre (Admin)</th>
            <th className="text-left p-3">Código</th>
            <th className="text-left p-3">Cod. Admin</th>
            <th className="text-left p-3">Cantidad</th>
            <th className="text-left p-3">Un. Med</th>
            <th className="text-left p-3">UM</th>
            <th className="text-left p-3">Familia</th>
            <th className="text-left p-3">Área</th>
            <th className="text-left p-3">% Imp. Ad</th>
            <th className="text-left p-3">Precio Unitario</th>
            <th className="text-left p-3">Neto</th>
            <th className="text-left p-3">Imp. Ad</th>
            <th className="text-left p-3">Otros</th>
            <th className="text-left p-3">Total Costo</th>
            <th className="text-left p-3">Costo Unitario</th>
            <th className="text-left p-3">Editar</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(productos) && productos.length > 0 ? (
            productos.map((p) => {
              const nombreAdmin = p.nombre_maestro ?? p.cod_admin?.nombre_producto ?? '-';
              return (
                <tr key={p.id} className={`border-t ${p.es_nota_credito ? 'bg-red-50 text-red-700' : ''}`}>
                  <td className="p-3">
                    <span>{p.folio || '-'}</span>
                    {p.es_nota_credito && <span className="text-xs font-semibold ml-1">(NC)</span>}
                  </td>
                  <td className="p-3">{p.nombre}</td>
                  <td className="p-3">{nombreAdmin}</td>
                  <td className="p-3">{p.codigo}</td>
                  <td className="p-3">{p.cod_admin?.cod_admin || '-'}</td>
                  <td className={`p-3 ${neg(p.cantidad)}`}>{p.cantidad}</td>
                  <td className="p-3">{p.unidad}</td>
                  <td className="p-3">{p.cod_admin?.um || '-'}</td>
                  <td className="p-3">{p.cod_admin?.familia || '-'}</td>
                  <td className="p-3">{p.cod_admin?.area || '-'}</td>
                  <td className="p-3">
                    {(((p.cod_admin?.porcentaje_adicional) ?? 0) * 100).toFixed(1)}%
                  </td>
                  <td className={`p-3 ${neg(p.precio_unitario)}`}>{CLP(p.precio_unitario)}</td>
                  <td className={`p-3 ${neg(p.total_neto)}`}>{CLP(p.total_neto)}</td>
                  <td className={`p-3 ${neg(p.imp_adicional)}`}>{CLP(p.imp_adicional)}</td>
                  <td className={`p-3 ${neg(p.otros)}`}>{CLP(p.otros)}</td>
                  <td className={`p-3 ${neg(p.total_costo)}`}>{CLP(p.total_costo)}</td>
                  <td className={`p-3 ${neg(p.costo_unitario)}`}>{CLP(p.costo_unitario)}</td>
                  <td className="p-3">
                    <Link to={`/productos/${p.id}`} className="text-blue-600 hover:underline">
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="18" className="p-4 text-center text-gray-500">
                {productos === undefined ? 'Cargando productos...' : 'No se encontraron productos.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Paginación simple */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
          disabled={paginaActual <= 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Anterior
        </button>

        <span className="px-3 py-2 text-sm text-gray-600">
          Página {paginaActual} de {ultimaPagina}
        </span>

        <button
          onClick={() => setPaginaActual((p) => Math.min(ultimaPagina, p + 1))}
          disabled={paginaActual >= ultimaPagina}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Siguiente
        </button>

        <button
          onClick={() => setPaginaActual(ultimaPagina)}
          disabled={paginaActual >= ultimaPagina}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          title="Ir a la última página"
        >
          Ir al final ⤓
        </button>
      </div>
    </div>
  );
}
