import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import API_BASE_URL from "../config";

const safeArray = (x) => {
  if (Array.isArray(x)) return x;
  // por si un día devuelves paginado { items: [...], total: n }
  if (Array.isArray(x?.items)) return x.items;
  return [];
};

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);

  // filtros
  const [proveedorRut, setProveedorRut] = useState("");
  const [folio, setFolio] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // paginación
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const buildParams = (pageToLoad = 1, override = {}) => {
    const offset = (pageToLoad - 1) * pageSize;

    const rut = String(override.proveedorRut ?? proveedorRut).trim();
    const fol = String(override.folio ?? folio).trim();
    const fi = override.fechaInicio ?? fechaInicio;
    const ff = override.fechaFin ?? fechaFin;

    const params = { limit: pageSize, offset, _ts: Date.now() };

    // 👇 nombres EXACTOS del backend
    if (rut) params.proveedor_rut = rut;
    if (fol) params.folio = fol;
    if (fi) params.fecha_inicio = fi;
    if (ff) params.fecha_fin = ff;

    return params;
  };

  const fetchFacturas = async (pageToLoad = 1, override = {}) => {
    try {
      setIsLoading(true);
      setMsg("");

      const params = buildParams(pageToLoad, override);
      const res = await axios.get(`${API_BASE_URL}/facturas`, { params });

      const arr = safeArray(res.data);
      setFacturas(arr);
      setPage(pageToLoad);

      // si NO vino array, deja pista en UI
      if (!Array.isArray(res.data) && !Array.isArray(res.data?.items)) {
        setMsg("La API no devolvió una lista de facturas (respuesta inesperada).");
      }
    } catch (err) {
      console.error("Error al cargar facturas", err);

      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Error al cargar facturas.";

      setMsg(detail);
      setFacturas([]); // 👈 evita map error sí o sí
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    fetchFacturas(1);
  };

  const handleLimpiar = () => {
    setProveedorRut("");
    setFolio("");
    setFechaInicio("");
    setFechaFin("");
    fetchFacturas(1, { proveedorRut: "", folio: "", fechaInicio: "", fechaFin: "" });
  };

  const handleEliminar = async (id) => {
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar la factura ID ${id}? Esta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    try {
      setMsg("");
      await axios.delete(`${API_BASE_URL}/facturas/${id}`);
      fetchFacturas(page);
    } catch (err) {
      console.error("Error al eliminar factura", err);
      const detail = err?.response?.data?.detail || "No se pudo eliminar la factura.";
      setMsg(detail);
    }
  };

  useEffect(() => {
    fetchFacturas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const facturasArr = useMemo(() => safeArray(facturas), [facturas]);

  const hayAnterior = page > 1;
  const haySiguiente = facturasArr.length === pageSize;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Facturas</h1>

      {/* Filtros */}
      <form
        onSubmit={handleBuscar}
        className="mb-4 bg-white border rounded-lg p-4 flex flex-wrap gap-3 items-end"
      >
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">RUT proveedor</label>
          <input
            type="text"
            placeholder="Ej: 76.123.456-7"
            value={proveedorRut}
            onChange={(e) => setProveedorRut(e.target.value)}
            className="border rounded p-2 w-56"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Folio</label>
          <input
            type="text"
            placeholder="Ej: 12345"
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            className="border rounded p-2 w-40"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Fecha desde</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border rounded p-2"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Fecha hasta</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border rounded p-2"
          />
        </div>

        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded">
          Buscar
        </button>
        <button
          type="button"
          onClick={handleLimpiar}
          className="bg-gray-400 text-white py-2 px-4 rounded"
        >
          Limpiar
        </button>

        {isLoading && <span className="text-sm text-gray-600">Cargando...</span>}
      </form>

      {msg && (
        <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
          {msg}
        </div>
      )}

      {/* Tabla */}
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
          {facturasArr.map((factura) => (
            <tr key={factura.id} className="border-t">
              <td className="p-3">{factura.id}</td>
              <td className="p-3">{factura.folio}</td>
              <td className="p-3">{factura.fecha_emision}</td>
              <td className="p-3">
                ${Number(factura.monto_total || 0).toLocaleString("es-CL")}
              </td>
              <td className="p-3">{factura.proveedor?.nombre}</td>
              <td className="p-3">{factura.proveedor?.rut}</td>
              <td className="p-3">{factura.negocio?.nombre || "Sin asignar"}</td>
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

          {facturasArr.length === 0 && !isLoading && (
            <tr>
              <td colSpan={8} className="p-3 text-center text-gray-500">
                No hay facturas para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Paginación */}
      <div className="flex items-center gap-4 mt-4">
        <button
          disabled={!hayAnterior}
          onClick={() => hayAnterior && fetchFacturas(page - 1)}
          className={`px-3 py-1 rounded ${
            hayAnterior ? "bg-gray-200" : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Anterior
        </button>

        <span>Página {page}</span>

        <button
          disabled={!haySiguiente}
          onClick={() => haySiguiente && fetchFacturas(page + 1)}
          className={`px-3 py-1 rounded ${
            haySiguiente ? "bg-gray-200" : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
