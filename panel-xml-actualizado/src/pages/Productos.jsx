// src/pages/Productos.jsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../services/api";
import API_BASE_URL from "../config"; // solo para armar URL export (la haremos con token abajo)
import { supabase } from "../supabaseClient";

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [totalProductos, setTotalProductos] = useState(0);

  // filtros
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [folio, setFolio] = useState("");
  const [codAdminId, setCodAdminId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [negocioId, setNegocioId] = useState("");

  // catálogos
  const [codigosAdmin, setCodigosAdmin] = useState([]);
  const [categorias, setCategorias] = useState([]); // si tu back no tiene /categorias, quedará vacío
  const [negocios, setNegocios] = useState([]);     // si tu back no tiene /negocios, quedará vacío

  // paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 25;
  const ultimaPagina = Math.max(1, Math.ceil(totalProductos / productosPorPagina));

  const CLP = (n) => (n ?? 0).toLocaleString("es-CL", { style: "currency", currency: "CLP" });
  const neg = (v) => (Number(v) < 0 ? "text-red-600" : "");

  const fetchFiltros = useCallback(async () => {
    try {
      const [resAdmin, resCat, resNeg] = await Promise.all([
        apiGet("/codigos_admin_maestro"),
        apiGet("/categorias").catch(() => ({ data: [] })), // evita romper si no existe
        apiGet("/negocios").catch(() => ({ data: [] })),   // evita romper si no existe
      ]);

      setCodigosAdmin(resAdmin.data || []);
      setCategorias(resCat.data || []);
      setNegocios(resNeg.data || []);
    } catch (e) {
      console.error("Error cargando filtros", e);
      setCodigosAdmin([]);
      setCategorias([]);
      setNegocios([]);
    }
  }, []);

  const fetchProductos = useCallback(async (pageToLoad = paginaActual) => {
    try {
      const params = {
        limit: productosPorPagina,
        offset: (pageToLoad - 1) * productosPorPagina,
      };

      if (nombre) params.nombre = nombre;
      if (codigo) params.codigo = codigo;
      if (folio) params.folio = folio;
      if (codAdminId) params.cod_admin_id = codAdminId;
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      if (negocioId) params.negocio_id = negocioId;

      const res = await apiGet("/productos", { params });
      setProductos(res.data?.productos || []);
      setTotalProductos(res.data?.total ?? 0);
      setPaginaActual(pageToLoad);
    } catch (err) {
      console.error("❌ Error al obtener productos", err);
      setProductos([]);
      setTotalProductos(0);
    }
  }, [paginaActual, productosPorPagina, nombre, codigo, folio, codAdminId, fechaInicio, fechaFin, negocioId]);

  const buildQueryString = () => {
    const p = new URLSearchParams();
    if (nombre) p.set("nombre", nombre);
    if (codigo) p.set("codigo", codigo);
    if (folio) p.set("folio", folio);
    if (codAdminId) p.set("cod_admin_id", codAdminId);
    if (fechaInicio) p.set("fecha_inicio", fechaInicio);
    if (fechaFin) p.set("fecha_fin", fechaFin);
    if (negocioId) p.set("negocio_id", negocioId);
    return p.toString();
  };

  // ✅ Export con token (sin depender de <a href> que NO manda Authorization)
  const exportarProductosExcel = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert("No hay sesión activa (token). Inicia sesión de nuevo.");
        return;
      }

      const qs = buildQueryString();
      const url = `${API_BASE_URL}/exportar/productos/excel${qs ? `?${qs}` : ""}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = fileUrl;
      link.setAttribute("download", "productos_filtrados.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
    } catch (e) {
      console.error(e);
      alert("Error al exportar productos.");
    }
  };

  useEffect(() => {
    fetchFiltros();
  }, [fetchFiltros]);

  useEffect(() => {
    fetchProductos(paginaActual);
  }, [paginaActual, fetchProductos]);

  const handleBuscar = (e) => {
    e.preventDefault();
    fetchProductos(1);
  };

  const limpiarFiltros = () => {
    setNombre("");
    setCodigo("");
    setFolio("");
    setCodAdminId("");
    setFechaInicio("");
    setFechaFin("");
    setNegocioId("");
    fetchProductos(1);
  };

  const codigosAdminOrdenados = useMemo(
    () =>
      [...codigosAdmin].sort((a, b) =>
        String(a.cod_admin ?? "").localeCompare(String(b.cod_admin ?? ""), "es", { numeric: true })
      ),
    [codigosAdmin]
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Productos</h1>

      {/* Filtros */}
      <form onSubmit={handleBuscar} className="mb-6 space-y-4">
        <div className="grid grid-cols-7 gap-4">
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
                {(c.cod_admin ?? "—") + " — " + (c.nombre_producto ?? "(sin nombre)")}
              </option>
            ))}
          </select>

          <select
            value={negocioId}
            onChange={(e) => setNegocioId(e.target.value)}
            className="border rounded p-2"
          >
            <option value="">Negocio (todos)</option>
            {negocios.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border rounded p-2"
            title="Desde (FchEmis)"
          />
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border rounded p-2"
            title="Hasta (FchEmis)"
          />
        </div>

        <div className="mt-2 flex gap-2">
          <button type="submit" className="bg-black text-white py-2 px-4 rounded">
            Buscar
          </button>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="bg-gray-300 text-black py-2 px-4 rounded"
          >
            Limpiar
          </button>

          <button
            type="button"
            onClick={exportarProductosExcel}
            className="bg-green-700 text-white py-2 px-4 rounded"
          >
            Exportar Excel
          </button>
        </div>
      </form>

      {/* Tabla */}
      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-3">Folio</th>
            <th className="text-left p-3">Negocio</th>
            <th className="text-left p-3">FchEmis</th>
            <th className="text-left p-3">Nombre (Factura)</th>
            <th className="text-left p-3">Nombre (Admin)</th>
            <th className="text-left p-3">Código</th>
            <th className="text-left p-3">Cod. Admin</th>
            <th className="text-left p-3">Cod. Lectura</th>
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
              const nombreAdmin = p.nombre_maestro ?? p.cod_admin?.nombre_producto ?? "-";
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.folio || "-"}</td>
                  <td className="p-3">{p.negocio_nombre || "-"}</td>
                  <td className="p-3">{p.fecha_emision ? String(p.fecha_emision).slice(0, 10) : "-"}</td>
                  <td className="p-3">{p.nombre}</td>
                  <td className="p-3">{nombreAdmin}</td>
                  <td className="p-3">{p.codigo}</td>
                  <td className="p-3">{p.cod_admin?.cod_admin || "-"}</td>
                  <td className="p-3">{p.cod_lectura || "-"}</td>
                  <td className={`p-3 ${neg(p.cantidad)}`}>{p.cantidad}</td>
                  <td className="p-3">{p.unidad}</td>
                  <td className="p-3">{p.cod_admin?.um ?? "-"}</td>
                  <td className="p-3">{p.cod_admin?.familia || "-"}</td>
                  <td className="p-3">{p.cod_admin?.area || "-"}</td>
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
                    <Link to={`/productos/${p.id}?${buildQueryString()}`} className="text-blue-600 hover:underline">
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="21" className="p-4 text-center text-gray-500">
                No se encontraron productos.
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
