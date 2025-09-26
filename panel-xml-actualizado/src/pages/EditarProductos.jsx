

/* EditarProducto.jsx */

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import Select from 'react-select';
import API_BASE_URL from '../config';

export default function ProductoDetalle() {
  const { id } = useParams();

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

  // helper CLP
  const CLP = (n) => (Number(n) || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

  // opciones para react-select: "COD — Nombre"
  const codAdminOptions = useMemo(() => {
    return (codigosAdmin || []).map((c) => ({
      value: c.id,
      label: `${c.cod_admin ?? '—'} — ${c.nombre_producto ?? '(sin nombre)'}`
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
        value: p.cod_admin.id,
        label: `${p.cod_admin.cod_admin ?? '—'} — ${p.cod_admin.nombre_producto ?? '(sin nombre)'}`
      });
    } else {
      setCodigoSeleccionado(null);
    }
  };

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
          value: p.cod_admin.id,
          label: `${p.cod_admin.cod_admin ?? '—'} — ${p.cod_admin.nombre_producto ?? '(sin nombre)'}`
        });
      } else {
        setCodigoSeleccionado(null);
      }
    })();
  }, [id]);

  const guardarPorcentaje = async () => {
    try {
      setSavingPct(true);
      await axios.put(
        `${API_BASE_URL}/productos/${id}/porcentaje-adicional`,
        { porcentaje_adicional: String(porcentajeAdicional) },
        { headers: { 'Content-Type': 'application/json' } }
      );
      await cargarProducto();
      alert('Porcentaje actualizado');
    } catch (e) {
      const msg = e?.response?.data?.detail || 'No se pudo actualizar el porcentaje';
      alert(msg);
    } finally {
      setSavingPct(false);
    }
  };

  const guardarOtros = async () => {
    try {
      setSavingOtros(true);
      await axios.put(
        `${API_BASE_URL}/productos/${id}/otros`,
        { otros: parseInt(otrosValor, 10) || 0 },
        { headers: { 'Content-Type': 'application/json' } }
      );
      await cargarProducto();
      alert('“Otros” actualizado');
    } catch (e) {
      const msg = e?.response?.data?.detail || 'No se pudo actualizar “Otros”';
      alert(msg);
    } finally {
      setSavingOtros(false);
    }
  };

  const asignarCodAdmin = async () => {
    if (!codigoSeleccionado?.value) return alert('Selecciona un código admin');
    try {
      setAssigningCodAdmin(true);
      await axios.put(
        `${API_BASE_URL}/productos/${id}/asignar-cod-admin`,
        null,
        { params: { cod_admin_id: parseInt(codigoSeleccionado.value, 10) } }
      );
      await cargarProducto();
      alert('Código admin asignado correctamente');
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

      {/* Info básica */}
      {[
        ['Nombre', producto.nombre],
        ['Código', producto.codigo],
        ['Cantidad', producto.cantidad],
        ['Unidad (texto XML)', producto.unidad],
        ['Proveedor', producto.proveedor?.nombre],
      ].map(([label, value]) => (
        <div className="mb-3" key={label}>
          <label className="block font-semibold">{label}:</label>
          <div className="border p-2 rounded bg-gray-100">{value ?? 'N/A'}</div>
        </div>
      ))}

      {/* Impuesto adicional */}
      <div className="mb-6">
        <label className="block font-semibold mb-1">Impuesto Adicional Calculado:</label>
        <div className="border p-2 rounded bg-gray-100">
          {CLP(producto.imp_adicional)}
        </div>

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
              onClick={guardarPorcentaje}
              disabled={savingPct}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
            >
              {savingPct ? 'Guardando…' : 'Guardar'}
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
            onClick={guardarOtros}
            disabled={savingOtros}
            className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {savingOtros ? 'Guardando…' : 'Guardar'}
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

      {/* CÓDIGO ADMIN con buscador y nombre visible */}
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
            onClick={asignarCodAdmin}
            disabled={assigningCodAdmin || !codigoSeleccionado}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {assigningCodAdmin ? 'Asignando…' : 'Asignar'}
          </button>
        </div>

        {/* Info del actual */}
        <div className="mt-2 text-sm text-gray-600">
          Actual: <b>{producto.cod_admin?.cod_admin ?? '—'}</b>
          {` — ${producto.cod_admin?.nombre_producto ?? '(sin nombre)'}`}
          {producto.cod_admin?.um != null ? ` | UM: ${producto.cod_admin.um}` : ''}
        </div>
      </div>

      <Link to="/leerProd" className="text-blue-600 hover:underline inline-block mt-6">
        ← Volver a productos
      </Link>
    </div>
  );
}
