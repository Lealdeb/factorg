import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config';

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [busquedaRUT, setBusquedaRUT] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false); // cuando filtras por RUT

  const fetchFacturas = async (pageToLoad = 1) => {
    try {
      setIsLoading(true);
      const offset = (pageToLoad - 1) * pageSize;
      const res = await axios.get(`${API_BASE_URL}/facturas`, {
        params: { limit: pageSize, offset },
      });
      setFacturas(res.data);
      setPage(pageToLoad);
    } catch (err) {
      console.error('Error al cargar facturas', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuscar = async (e) => {
    e.preventDefault();
    if (!busquedaRUT.trim()) {
      // si está vacío, vuelve al modo normal paginado
      setIsSearchMode(false);
      fetchFacturas(1);
      return;
    }
    try {
      setIsLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/facturas/buscar`,
        { params: { rut: busquedaRUT } }
      );
      setFacturas(res.data);
      setIsSearchMode(true); // resultados filtrados (sin paginación)
    } catch (err) {
      console.error('Error al buscar facturas', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLimpiar = () => {
    setBusquedaRUT('');
    setIsSearchMode(false);
    fetchFacturas(1);
  };

  const handleEliminar = async (id) => {
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar la factura ID ${id}? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      await axios.delete(`${API_BASE_URL}/facturas/${id}`);
      // Recargar según el modo actual
      if (isSearchMode) {
        // si estás viendo resultados de búsqueda, vuelve a buscar
        if (busquedaRUT.trim()) {
          const res = await axios.get(
            `${API_BASE_URL}/facturas/buscar`,
            { params: { rut: busquedaRUT } }
          );
          setFacturas(res.data);
        } else {
          setIsSearchMode(false);
          fetchFacturas(page);
        }
      } else {
        fetchFacturas(page);
      }
    } catch (err) {
      console.error('Error al eliminar factura', err);
      alert('No se pudo eliminar la factura.');
    }
  };

  useEffect(() => {
    fetchFacturas(1);
  }, []);

  const haySiguiente = !isSearchMode && facturas.length === pageSize;
  const hayAnterior = !isSearchMode && page > 1;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Facturas</h1>

      {/* Formulario de búsqueda */}
      <form onSubmit={handleBuscar} className="mb-4 flex gap-2 items-center">
        <input
          type="text"
          placeholder="Buscar por RUT del proveedor"
          value={busquedaRUT}
          onChange={(e) => setBusquedaRUT(e.target.value)}
          className="border rounded p-2 w-64"
        />
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

        {isLoading && <span className="ml-4 text-sm text-gray-600">Cargando...</span>}
      </form>

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
              <td className="p-3">{factura.fecha_emision}</td>
              <td className="p-3">
                ${Number(factura.monto_total || 0).toFixed(2)}
              </td>
              <td className="p-3">{factura.proveedor?.nombre}</td>
              <td className="p-3">{factura.proveedor?.rut}</td>
              <td className="p-3">{factura.negocio?.nombre || 'Sin asignar'}</td>
              <td className="p-3 flex gap-3">
                <Link
                  to={`/facturas/${factura.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Ver Detalles
                </Link>
                <button
                  onClick={() => handleEliminar(factura.id)}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}

          {facturas.length === 0 && !isLoading && (
            <tr>
              <td colSpan={8} className="p-3 text-center text-gray-500">
                No hay facturas para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Paginación: solo cuando no estamos filtrando por RUT */}
      {!isSearchMode && (
        <div className="flex items-center gap-4 mt-4">
          <button
            disabled={!hayAnterior}
            onClick={() => hayAnterior && fetchFacturas(page - 1)}
            className={`px-3 py-1 rounded ${
              hayAnterior ? 'bg-gray-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Anterior
          </button>
          <span>Página {page}</span>
          <button
            disabled={!haySiguiente}
            onClick={() => haySiguiente && fetchFacturas(page + 1)}
            className={`px-3 py-1 rounded ${
              haySiguiente ? 'bg-gray-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}