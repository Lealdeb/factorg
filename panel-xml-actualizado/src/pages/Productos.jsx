import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [grupoAdminId, setGrupoAdminId] = useState('');
  const [grupoAdmin, setGrupoAdmin] = useState([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [totalProductos, setTotalProductos] = useState(0);
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 25;

  const CLP = n => n.toLocaleString("es-CL", { style: "currency", currency: "CLP" });
  const neg = v => (v < 0 ? "text-red-600" : "");

  const fetchProductos = async () => {
    try {
      const res = await axios.get('http://localhost:8001/productos', {
        params: {
          nombre: nombre || undefined,
          cod_admin_id: grupoAdminId || undefined,
          categoria_id: categoriaId || undefined,
          fecha_inicio: fechaInicio || undefined,
          fecha_fin: fechaFin || undefined,
          limit: productosPorPagina,
          offset: (paginaActual - 1) * productosPorPagina
        }
      });
      console.log("🔍 Productos recibidos:", res.data);
      console.log("🔥 res.data:", res.data); // <-- Agregá esta línea
      setProductos(res.data.productos);
      setTotalProductos(res.data.total);
    } catch (err) {
      console.error('❌ Error al obtener productos', err);
    }
  };

  const fetchFiltros = async () => {
    try {
      const resGrupo = await axios.get('http://localhost:8001/codigos_admin_maestro');
      const resCategoria = await axios.get('http://localhost:8001/categorias');
      setGrupoAdmin(resGrupo.data);
      setCategorias(resCategoria.data);
    } catch (err) {
      console.error('Error al obtener filtros', err);
    }
  };

  useEffect(() => {
    fetchFiltros();
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [paginaActual]);


  useEffect(() => {
    fetchProductos();
  }, [paginaActual]);

  const handleBuscar = (e) => {
    e.preventDefault();
    setPaginaActual(1); // resetear a página 1 al buscar
    fetchProductos();
  };

  const limpiarFiltros = () => {
    setNombre('');
    setGrupoAdminId('');
    setCategoriaId('');
    setFechaInicio('');
    setFechaFin('');
    setPaginaActual(1);
    setTimeout(() => {
      fetchProductos();
    }, 0);
  };
  console.log("Estado actual de productos:", productos);
  console.log("Página actual:", paginaActual);
  console.log("Total productos:", totalProductos);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Productos</h1>

      <form onSubmit={handleBuscar} className="mb-6 space-y-4">
        <div className="grid grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Buscar por nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border rounded p-2 w-full"
          />
          <select
            value={grupoAdminId}
            onChange={(e) => setGrupoAdminId(e.target.value)}
            className="border rounded p-2"
          >
            <option value="">Código Admin</option>
            {grupoAdmin.map((g) => (
              <option key={g.id} value={g.id}>{g.cod_admin}</option>
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

      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-3">Folio</th>
            <th className="text-left p-3">Nombre</th>
            <th className="text-left p-3">Código</th>
            <th className="text-left p-3">Cod. Admin</th>
            <th className="text-left p-3">Cantidad</th>
            <th className="text-left p-3">Un. Med</th>
            <th className="text-left p-3">um</th>
            <th className="text-left p-3">Familia</th>
            <th className="text-left p-3">Área</th>
            <th className="text-left p-3">% Imp. Ad</th>
            <th className="text-left p-3">Precio Unitario</th>
            <th className="text-left p-3">Neto</th>
            <th className="text-left p-3">Imp. Ad</th>
            <th className="text-left p-3">Total Costo</th>
            <th className="text-left p-3">Costo Unitario</th>
            <th className="text-left p-3">Editar</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(productos) && productos.length > 0 ? (
            productos.map((p) => (
              <tr
                key={p.id}
                className={`border-t ${p.es_nota_credito ? 'bg-red-50 text-red-700' : ''}`}
              >
                <td className="p-3">
                  <span>{p.folio || '-'}</span>
                  {p.es_nota_credito && (
                    <span className="text-xs font-semibold ml-1">(NC)</span>
                  )}
                </td>
                <td className="p-3">{p.nombre}</td>
                <td className="p-3">{p.codigo}</td>
                <td className="p-3">{p.cod_admin?.cod_admin || '-'}</td>
                <td className={`p-3 ${neg(p.cantidad)}`}>{p.cantidad}</td>
                <td className="p-3">{p.unidad}</td>
                <td className="p-3">{p.cod_admin?.um || '-'}</td>
                <td className="p-3">{p.cod_admin?.familia || '-'}</td>
                <td className="p-3">{p.cod_admin?.area || '-'}</td>
                <td className="p-3">
                  {((p.cod_admin?.porcentaje_adicional || 0) * 100).toFixed(1)}%
                </td>
                <td className={`p-3 ${neg(p.precio_unitario)}`}>{CLP(p.precio_unitario || 0)}</td>
                <td className={`p-3 ${neg(p.total_neto)}`}>{CLP(p.total_neto || 0)}</td>
                <td className={`p-3 ${neg(p.imp_adicional)}`}>{CLP(p.imp_adicional || 0)}</td>
                <td className={`p-3 ${neg(p.total_costo)}`}>{CLP(p.total_costo || 0)}</td>
                <td className={`p-3 ${neg(p.costo_unitario)}`}>{CLP(p.costo_unitario || 0)}</td>
                <td className="p-3">
                  <Link to={`/productos/${p.id}`} className="text-blue-600 hover:underline">
                    Editar
                  </Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="16" className="p-4 text-center text-gray-500">
                {productos === undefined ? 'Cargando productos...' : 'No se encontraron productos.'}
              </td>
            </tr>
          )}
        </tbody>

      </table>

      <div className="flex justify-center gap-2 mt-4">
        {paginaActual > 1 && (
          <button
            onClick={() => setPaginaActual(p => p - 1)}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Anterior
          </button>
        )}
        {paginaActual * productosPorPagina < totalProductos && (
          <button
            onClick={() => setPaginaActual(p => p + 1)}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Siguiente
          </button>
        )}
      </div>
    </div>
  );
}
