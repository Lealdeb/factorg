import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config';

export default function Productos() {
  // Lista y paginación
  const [productos, setProductos] = useState([]);
  const [totalProductos, setTotalProductos] = useState(0);
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 25;

  // Filtros
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');   // <-- nuevo
  const [folio, setFolio] = useState('');     // <-- nuevo
  const [codAdminId, setCodAdminId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Catálogos
  const [codigosAdmin, setCodigosAdmin] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const CLP = (n) => (Number.isFinite(n) ? n : 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
  const neg = (v) => (v < 0 ? 'text-red-600' : '');

  const offset = useMemo(() => (paginaActual - 1) * productosPorPagina, [paginaActual, productosPorPagina]);

  const fetchProductos = async () => {
    try {
      const params = {
        limit: productosPorPagina,
        offset,
        // Solo mandamos si tienen valor:
        nombre: nombre || undefined,
        codigo: codigo || undefined,
        folio: folio || undefined,
        cod_admin_id: codAdminId || undefined,
        categoria_id: categoriaId || undefined,
      };
      if (fechaInicio) params.fecha_inicio = fechaInicio; // 'YYYY-MM-DD'
      if (fechaFin) params.fecha_fin = fechaFin;

      const res = await axios.get(`${API_BASE_URL}/productos`, { params });

      // El backend devuelve { productos, total } según lo que ajustamos
      setProductos(Array.isArray(res.data.productos) ? res.data.productos : res.data.items || []);
      setTotalProductos(res.data.total ?? 0);
    } catch (err) {
      console.error('❌ Error al obtener productos', err);
      setProductos([]);
      setTotalProductos(0);
    }
  };

  const fetchFiltros = async () => {
    try {
      const [resCodAdmin, resCategorias] = await Promise.all([
        axios.get(`${API_BASE_URL}/codigos_admin_maestro`),
        axios.get(`${API_BASE_URL}/categorias`),
      ]);
      setCodigosAdmin(resCodAdmin.data || []);
      setCategorias(resCategorias.data || []);
    } catch (err) {
      console.error('❌ Error al obtener filtros', err);
    }
  };

  useEffect(() => { fetchFiltros(); }, []);
  useEffect(() => { fetchProductos(); }, [paginaActual]); // paginación
  // También refrescamos al cambiar filtros manualmente con el botón "Buscar"

  const handleBuscar = (e) => {
    e.preventDefault();
    setPaginaActual(1); // reset
    fetchProductos();
  };

  const limpiarFiltros = () => {
    setNombre('');
    setCodigo('');
    setFolio('');
    setCodAdminId('');
    setCategoriaId('');
    setFechaInicio('');
    setFechaFin('');
    setPaginaActual(1);
    // tras limpiar, recargamos
    setTimeout(fetchProductos, 0);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Productos</h1>

      {/* Filtros */}
      <form onSubmit={handleBuscar} className="mb-6 space-y-4">
        <div className="grid grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Nombre o Nombre Maestro"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border rounded p-2 w-full"
          />
          <input
            type="text"
            placeholder="Código de producto"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="border rounded p-2 w-full"
          />
          <input
            type="text"
            placeholder="Folio"
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            className="border rounded p-2 w-full"
          />
          <select
            value={codAdminId}
            onChange={(e) => setCodAdminId(e.target.value)}
            className="border rounded p-2"
          >
            <option value="">Código Admin</option>
            {codigosAdmin.map((g) => (
              <option key={g.id} value={g.id}>
                {g.cod_admin}
              </option>
            ))}
          </select>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="border rounded p-2"
          >
            <option value="">Categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="border rounded p-2 w-full"
            />
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>
        </div>

        <div className="mt-4">
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
            <th className="text-left p-3">Fecha Emisión</th> {/* nuevo */}
            <th className="text-left p-3">Nombre</th>
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
            <th className="text-left p-3">Otros</th>           {/* nuevo */}
            <th className="text-left p-3">Total Costo</th>
            <th className="text-left p-3">Costo Unitario</th>
            <th className="text-left p-3">Editar</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(productos) && productos.length > 0 ? (
            productos.map((p) => (
              <tr
                key={`${p.id}-${p.folio || ''}`}
                className={`border-t ${p.es_nota_credito ? 'bg-red-50 text-red-700' : ''}`}
              >
                <td className="p-3">
                  <span>{p.folio || '-'}</span>
                  {p.es_nota_credito && <span className="text-xs font-semibold ml-1">(NC)</span>}
                </td>
                <td className="p-3">{p.fecha_emision ? String(p.fecha_emision).slice(0, 10) : '-'}</td>
                <td className="p-3">{p.nombre}</td>
                <td className="p-3">{p.codigo}</td>
                <td className="p-3">{p.cod_admin?.cod_admin || '-'}</td>
                <td className={`p-3 ${neg(p.cantidad)}`}>{p.cantidad}</td>
                <td className="p-3">{p.unidad}</td>
                <td className="p-3">{p.cod_admin?.um || '-'}</td>
                <td className="p-3">{p.cod_admin?.familia || '-'}</td>
                <td className="p-3">{p.cod_admin?.area || '-'}</td>
                <td className="p-3">{(((p.cod_admin?.porcentaje_adicional || 0) * 100)).toFixed(1)}%</td>
                <td className={`p-3 ${neg(p.precio_unitario)}`}>{CLP(p.precio_unitario)}</td>
                <td className={`p-3 ${neg(p.total_neto)}`}>{CLP(p.total_neto)}</td>
                <td className={`p-3 ${neg(p.imp_adicional)}`}>{CLP(p.imp_adicional)}</td>
                <td className={`p-3 ${neg(p.otros)}`}>{CLP(p.otros)}</td> {/* nuevo */}
                <td className={`p-3 ${neg(p.total_costo)}`}>{CLP(p.total_costo)}</td>
                <td className={`p-3 ${neg(p.costo_unitario)}`}>{CLP(p.costo_unitario)}</td>
                <td className="p-3">
                  <Link to={`/productos/${p.id}`} className="text-blue-600 hover:underline">Editar</Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="18" className="p-4 text-center text-gray-500">
                {productos === undefined ? 'Cargando productos...' : 'No se encontraron productos.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Paginación */}
      <div className="flex justify-center gap-2 mt-4">
        {paginaActual > 1 && (
          <button onClick={() => setPaginaActual((p) => p - 1)} className="px-4 py-2 bg-gray-200 rounded">
            Anterior
          </button>
        )}
        {paginaActual * productosPorPagina < totalProductos && (
          <button onClick={() => setPaginaActual((p) => p + 1)} className="px-4 py-2 bg-gray-200 rounded">
            Siguiente
          </button>
        )}
      </div>
    </div>
  );
}
