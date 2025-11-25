/* EditarProducto.jsx */
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import API_BASE_URL from '../config';

export default function ProductoDetalle() {
  const { id } = useParams();
  const [sp] = useSearchParams();         
  const navigate = useNavigate();

 
  const [orderIds, setOrderIds] = useState([]);
  const [totalEnLista, setTotalEnLista] = useState(0);

  // estado principal
  const [producto, setProducto] = useState(null);

  // catálogos
  const [codigosAdmin, setCodigosAdmin] = useState([]);

  // edición
  const [porcentajeAdicional, setPorcentajeAdicional] = useState('');
  const [otrosValor, setOtrosValor] = useState(0);

  // select de cod_admin (usa objeto {value,label})
  const [codigoSeleccionado, setCodigoSeleccionado] = useState(null);

  // loading flags
  const [savingPct, setSavingPct] = useState(false);
  const [savingOtros, setSavingOtros] = useState(false);
  const [assigningCodAdmin, setAssigningCodAdmin] = useState(false);

  const CLP = (n) =>
    (Number(n) || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

  // opciones ordenadas por cod_admin (orden natural) y con label "COD — Nombre"
  const codAdminOptions = useMemo(() => {
    return [...(codigosAdmin || [])]
      .sort((a, b) =>
        String(a.cod_admin ?? '').localeCompare(String(b.cod_admin ?? ''), 'es', { numeric: true })
      )
      .map((c) => ({
        value: Number(c.id),
        label: `${c.cod_admin ?? '—'} — ${c.nombre_producto ?? '(sin nombre)'}`,
      }));
  }, [codigosAdmin]);

  const cargarProducto = async () => {
    const res = await axios.get(`${API_BASE_URL}/productos/${id}`);
    const p = res.data;
    setProducto(p);
    setPorcentajeAdicional(p.porcentaje_adicional ?? 0);
    setOtrosValor(Number(p.otros ?? 0));

    if (p.cod_admin?.id) {
      setCodigoSeleccionado({
        value: Number(p.cod_admin.id),
        label: `${p.cod_admin.cod_admin ?? '—'} — ${p.cod_admin.nombre_producto ?? '(sin nombre)'}`,
      });
    } else {
      setCodigoSeleccionado(null);
    }
  };

  // carga producto + catálogos
  useEffect(() => {
    (async () => {
      const [prodRes, adminRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/productos/${id}`),
        axios.get(`${API_BASE_URL}/codigos_admin`),
      ]);

      const p = prodRes.data;
      setProducto(p);
      setPorcentajeAdicional(p.porcentaje_adicional ?? 0);
      setOtrosValor(Number(p.otros ?? 0));
      setCodigosAdmin(adminRes.data || []);

      if (p.cod_admin?.id) {
        setCodigoSeleccionado({
          value: Number(p.cod_admin.id),
          label: `${p.cod_admin.cod_admin ?? '—'} — ${p.cod_admin.nombre_producto ?? '(sin nombre)'}`,
        });
      } else {
        setCodigoSeleccionado(null);
      }
    })();
  }, [id]);

  // carga IDs ordenados según filtros (vienen en la URL)
  useEffect(() => {
    (async () => {
      const params = Object.fromEntries(sp.entries());
      const res = await axios.get(`${API_BASE_URL}/productos/order-ids`, { params });
      setOrderIds(res.data?.ids || []);
      setTotalEnLista(res.data?.total || 0);
    })();
  }, [sp]);

  // helpers de navegación
  const idxActual = orderIds.findIndex((x) => String(x) === String(id));
  const prevId = idxActual > 0 ? orderIds[idxActual - 1] : null;
  const nextId = idxActual >= 0 && idxActual < orderIds.length - 1 ? orderIds[idxActual + 1] : null;

  const irPrev = () => prevId && navigate(`/productos/${prevId}?${sp.toString()}`);
  const irNext = () => nextId && navigate(`/productos/${nextId}?${sp.toString()}`);

  const guardarPorcentaje = async (opts = { goNext: false }) => {
    try {
      setSavingPct(true);
      await axios.put(
        `${API_BASE_URL}/productos/${id}/porcentaje-adicional`,
        { porcentaje_adicional: String(porcentajeAdicional) },
        { headers: { 'Content-Type': 'application/json' } }
      );
      await cargarProducto();
      if (opts.goNext && nextId) irNext();
      else alert('Porcentaje actualizado');
    } catch (e) {
      const msg = e?.response?.data?.detail || 'No se pudo actualizar el porcentaje';
      alert(msg);
    } finally {
      setSavingPct(false);
    }
  };

  const guardarOtros = async (opts = { goNext: false }) => {
    try {
      setSavingOtros(true);
      await axios.put(
        `${API_BASE_URL}/productos/${id}/otros`,
        { otros: parseInt(otrosValor, 10) || 0 },
        { headers: { 'Content-Type': 'application/json' } }
      );
      await cargarProducto();
      if (opts.goNext && nextId) irNext();
      else alert('“Otros” actualizado');
    } catch (e) {
      const msg = e?.response?.data?.detail || 'No se pudo actualizar “Otros”';
      alert(msg);
    } finally {
      setSavingOtros(false);
    }
  };

  const asignarCodAdmin = async (opts = { goNext: false }) => {
    if (!codigoSeleccionado?.value) return alert('Selecciona un código admin');
    try {
      setAssigningCodAdmin(true);
      await axios.put(
        `${API_BASE_URL}/productos/${id}/asignar-cod-admin`,
        null,
        { params: { cod_admin_id: Number(codigoSeleccionado.value) } }
      );
      await cargarProducto();
      if (opts.goNext && nextId) irNext();
      else alert('Código admin asignado correctamente');
    } catch (e) {
      alert('Error al asignar código admin');
    } finally {
      setAssigningCodAdmin(false);
    }
  };

  if (!producto) return <div className="p-6">Cargando...</div>;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Detalle del Producto</h1>

      {/* navegación superior */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
        <button onClick={irPrev} disabled={!prevId} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">⟵ Anterior</button>
        <span>#{id} — {idxActual + 1} de {totalEnLista}</span>
        <button onClick={irNext} disabled={!nextId} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Siguiente ⟶</button>
      </div>

      {/* Info básica */}
      {[
        ['Nombre', producto.nombre],
        ['Código', producto.codigo],
        ['Cantidad', producto.cantidad],
        ['Unidad (texto XML)', producto.unidad],
        ['Proveedor', producto.proveedor?.nombre],
        ['Cod. Lectura', producto.cod_lectura],
      ].map(([label, value]) => (
        <div className="mb-3" key={label}>
          <label className="block font-semibold">{label}:</label>
          <div className="border p-2 rounded bg-gray-100">{value ?? 'N/A'}</div>
        </div>
      ))}

      {/* Impuesto adicional */}
      <div className="mb-6">
        <label className="block font-semibold mb-1">Impuesto Adicional Calculado:</label>
        <div className="border p-2 rounded bg-gray-100">{CLP(producto.imp_adicional)}</div>

        <div className="mt-3">
          <label className="block font-semibold mb-1">Editar % Adicional:</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              step="0.01"
              placeholder="Ej: 0.15 (15%) o 10 (10%)"
              value={porcentajeAdicional}
              onChange={(e) => setPorcentajeAdicional(e.target.value)}
              className="border p-2 rounded w-48"
            />
            <button
              onClick={() => guardarPorcentaje({ goNext: false })}
              disabled={savingPct}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
            >
              {savingPct ? 'Guardando…' : 'Guardar'}
            </button>
            {/* Guardar y Siguiente */}
            <button
              onClick={() => guardarPorcentaje({ goNext: true })}
              disabled={savingPct || !nextId}
              className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-60"
              title="Guardar y pasar al siguiente"
            >
              {savingPct ? '...' : 'Guardar y siguiente ⟶'}
            </button>
          </div>
        </div>
      </div>

      {/* OTROS (editable) */}
      <div className="mb-6">
        <label className="block font-semibold mb-1">Otros (monto manual):</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            step="1"
            value={otrosValor}
            onChange={(e) => setOtrosValor(e.target.value)}
            className="border p-2 rounded w-48"
          />
          <button
            onClick={() => guardarOtros({ goNext: false })}
            disabled={savingOtros}
            className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {savingOtros ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={() => guardarOtros({ goNext: true })}
            disabled={savingOtros || !nextId}
            className="bg-teal-700 text-white px-4 py-2 rounded disabled:opacity-60"
            title="Guardar y pasar al siguiente"
          >
            {savingOtros ? '...' : 'Guardar y siguiente ⟶'}
          </button>
        </div>

        {/* Resumen de cálculos */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-sm text-gray-500">Neto (PU × Cant.)</div>
            <div className="border p-2 rounded bg-gray-100">{CLP(producto.total_neto)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Imp. Adicional</div>
            <div className="border p-2 rounded bg-gray-100">{CLP(producto.imp_adicional)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Total Costo</div>
            <div className="border p-2 rounded bg-gray-100">{CLP(producto.total_costo)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Costo Unitario</div>
            <div className="border p-2 rounded bg-gray-100">{CLP(producto.costo_unitario)}</div>
          </div>
        </div>
      </div>

      {/* CÓDIGO ADMIN */}
      <div className="mb-6">
        <label className="block font-semibold mb-1">Código Admin (buscable):</label>
        <div className="flex items-center gap-2">
          <div className="w-full">
            <Select
              options={codAdminOptions}
              value={codigoSeleccionado}
              onChange={(opt) => setCodigoSeleccionado(opt)}
              placeholder="Buscar por código o nombre…"
              isClearable
              isSearchable
              noOptionsMessage={() => 'Sin resultados'}
            />
          </div>
          <button
            onClick={() => asignarCodAdmin({ goNext: false })}
            disabled={assigningCodAdmin || !codigoSeleccionado}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {assigningCodAdmin ? 'Asignando…' : 'Asignar'}
          </button>
          <button
            onClick={() => asignarCodAdmin({ goNext: true })}
            disabled={assigningCodAdmin || !codigoSeleccionado || !nextId}
            className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-60"
            title="Asignar y pasar al siguiente"
          >
            {assigningCodAdmin ? '...' : 'Asignar y siguiente ⟶'}
          </button>
        </div>

        <div className="mt-2 text-sm text-gray-600">
          Actual: <b>{producto.cod_admin?.cod_admin ?? '—'}</b>
          {` — ${producto.cod_admin?.nombre_producto ?? '(sin nombre)'}`}
          {producto.cod_admin?.um != null ? ` | UM: ${producto.cod_admin.um}` : ''}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6">
        <button onClick={irPrev} disabled={!prevId} className="px-3 py-2 bg-gray-200 rounded disabled:opacity-50">⟵ Anterior</button>
        <button onClick={irNext} disabled={!nextId} className="px-3 py-2 bg-gray-200 rounded disabled:opacity-50">Siguiente ⟶</button>
        <Link to={`/leerProd?${sp.toString()}`} className="text-blue-600 hover:underline ml-auto">
          ← Volver a productos
        </Link>
      </div>
    </div>
  );
}
