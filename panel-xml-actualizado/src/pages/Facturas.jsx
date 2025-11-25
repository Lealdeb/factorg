import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config';

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);

  // filtros
  const [busquedaRUT, setBusquedaRUT] = useState('');          // proveedor_rut
  const [folio, setFolio] = useState('');                      // folio
  const [negocioNombre, setNegocioNombre] = useState('');      // negocio_nombre
  const [fechaInicio, setFechaInicio] = useState('');          // fecha_inicio
  const [fechaFin, setFechaFin] = useState('');                // fecha_fin

  const [cargando, setCargando] = useState(false);

  // helper para construir params de la API
  const buildParams = () => ({
    proveedor_rut: busquedaRUT || undefined,
    folio: folio || undefined,
    negocio_nombre: negocioNombre || undefined,
    fecha_inicio: fechaInicio || undefined,
    fecha_fin: fechaFin || undefined,
  });

  const fetchFacturas = async (extraParams = {}) => {
    try {
      setCargando(true);
      const params = { ...buildParams(), ...extraParams };

      const res = await axios.get(`${API_BASE_URL}/facturas`, { params });
      setFacturas(res.data);
    } catch (err) {
      console.error('Error al cargar facturas', err);
      alert('Error al cargar facturas');
    } finally {
      setCargando(false);
    }
  };

  // búsqueda con filtros
  const handleBuscar = async (e) => {
    e.preventDefault();
    fetchFacturas();
  };

  const handleLimpiar = () => {
    setBusquedaRUT('');
    setFolio('');
    setNegocioNombre('');
    setFechaInicio('');
    setFechaFin('');
    fetchFacturas({
      proveedor_rut: undefined,
      folio: undefined,
      negocio_nombre: undefined,
      fecha_inicio: undefined,
      fecha_fin: undefined,
    });
  };

  const handleEliminar = async (id) => {
    const confirmar = window.confirm(
      '¿Seguro que deseas eliminar esta factura? También se eliminarán sus detalles asociados.'
    );
    if (!confirmar) return;

    try {
      await axios.delete(`${API_BASE_URL}/facturas/${id}`);
      alert('Factura eliminada correctamente.');
      // recargar con los filtros actuales
      fetchFacturas();
    } catch (err) {
      console.error('Error al eliminar factura', err);
      const msg = err.response?.data?.detail || 'Error al eliminar factura';
      alert(msg);
    }
  };

  useEffect(() => {
    fetchFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Facturas</h1>

      {/* Filtros de búsqueda */}
      <form onSubmit={handleBuscar} className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-sm mb-1">RUT Proveedor</label>
          <input
            type="text"
            placeholder="12.345.678-9"
            value={busquedaRUT}
            onChange={(e) => setBusquedaRUT(e.target.value)}
            className="border rounded p-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm mb-1">Folio</label>
          <input
            type="text"
            placeholder="Folio"
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            className="border rounded p-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm mb-1">Negocio</label>
          <input
            type="text"
            placeholder="Nombre del negocio"
            value={negocioNombre}
            onChange={(e) => setNegocioNombre(e.target.value)}
            className="border rounded p-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm mb-1">Fecha inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border rounded p-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm mb-1">Fecha fin</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border rounded p-2"
          />
        </div>

        <div className="md:col-span-5 flex gap-2 mt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 px-4 rounded"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={handleLimpiar}
            className="bg-gray-400 text-white py-2 px-4 rounded"
          >
            Limpiar
          </button>
        </div>
      </form>

      {cargando && <p className="mb-2 text-sm text-gray-600">Cargando facturas...</p>}

      {/* Tabla de facturas */}
      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-3">ID</th>
            <th className="text-left p-3">Folio</th>
            <th className="text-left p-3">Fecha Emisión</th>
            <th className="text-left p-3">Monto Total</th>
            <th className="text-left p-3">Proveedor</th>
            <th className="text-left p-3">RUT</th>
            <th className="text-left p-3">Negocio</th>
            <th className="text-left p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {facturas.map((factura) => (
            <tr key={factura.id} className="border-t">
              <td className="p-3">{factura.id}</td>
              <td className="p-3">{factura.folio}</td>
              <td className="p-3">
                {factura.fecha_emision
                  ? factura.fecha_emision.slice(0, 10)
                  : ''}
              </td>
              <td className="p-3">
                $
                {Number(factura.monto_total ?? 0).toLocaleString('es-CL', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </td>
              <td className="p-3">{factura.proveedor?.nombre}</td>
              <td className="p-3">{factura.proveedor?.rut}</td>
              <td className="p-3">
                {factura.negocio?.nombre || 'Sin asignar'}
              </td>
              <td className="p-3 space-x-3">
                <Link
                  to={`/facturas/${factura.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Ver Detalles
                </Link>
                <button
                  type="button"
                  onClick={() => handleEliminar(factura.id)}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}

          {facturas.length === 0 && !cargando && (
            <tr>
              <td colSpan={8} className="p-4 text-center text-gray-500">
                No se encontraron facturas para los filtros seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
