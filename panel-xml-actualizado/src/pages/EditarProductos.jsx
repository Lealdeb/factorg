/* EditarProducto.jsx */
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import Select from 'react-select';
import API_BASE_URL from '../config';

export default function ProductoDetalle() {
  const { id } = useParams();
  const [producto, setProducto] = useState(null);

  // catálogos
  const [codigosAdmin, setCodigosAdmin] = useState([]);

  // estados edición
  const [porcentajeAdicional, setPorcentajeAdicional] = useState('');
  const [codigoSeleccionado, setCodigoSeleccionado] = useState(null); // {value,label}
  const [otros, setOtros] = useState(0);
  const [savingPct, setSavingPct] = useState(false);
  const [savingOtros, setSavingOtros] = useState(false);
  const [assigningCodAdmin, setAssigningCodAdmin] = useState(false);

  // helpers
  const makeOptions = (list) =>
    (list || []).map((c) => ({
      value: c.id,
      label: `${c.cod_admin ?? '—'} — ${c.nombre_producto ?? '(sin nombre)'}`,
      raw: c,
    }));

  const findOptionById = (options, idVal) =>
    options.find((o) => o.value === idVal) || null;

  const codAdminOptions = useMemo(() => makeOptions(codigosAdmin), [codigosAdmin]);

  const cargarProducto = async () => {
    // recarga producto y catálogo, y alinea el valor del select con las opciones vigentes
    const [prodRes, adminRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/productos/${id}`),
      axios.get(`${API_BASE_URL}/codigos_admin`),
    ]);
    setProducto(prodRes.data);
    setCodigosAdmin(adminRes.data || []);

    setPorcentajeAdicional(prodRes.data.porcentaje_adicional ?? 0);
    setOtros(prodRes.data.otros ?? 0);

    const opts = makeOptions(adminRes.data || []);
    const selected = prodRes.data.cod_admin?.id
      ? findOptionById(opts, prodRes.data.cod_admin.id)
      : null;
    setCodigoSeleccionado(selected);
  };

  useEffect(() => {
    cargarProducto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const guardarPorcentaje = async () => {
    try {
      setSavingPct(true);
      // Normaliza: admite "0.15", "15", "15%", "10,5"
      let v = String(porcentajeAdicional).trim().replace('%', '');
      let num = parseFloat(v.replace(',', '.'));
      if (!Number.isFinite(num)) num = 0;
      if (num > 1) num = num / 100; // 10 -> 0.10

      await axios.put(`${API_BASE_URL}/productos/${id}/porcentaje-adicional`, {
        porcentaje_adicional: String(num),
      });

      await cargarProducto();
      alert('Porcentaje actualizado');
    } catch (e) {
      alert(e.response?.data?.detail || 'No se pudo actualizar el porcentaje');
    } finally {
      setSavingPct(false);
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
      alert(e.response?.data?.detail || 'Error al asignar código admin');
    } finally {
      setAssigningCodAdmin(false);
    }
  };

  const guardarOtros = async () => {
    try {
      setSavingOtros(true);
      let val = parseInt(String(otros).trim(), 10);
      if (!Number.isFinite(val) || val < 0) val = 0;

      await axios.put(`${API_BASE_URL}/productos/${id}/otros`, { otros: val });
      await cargarProducto();
      alert('“Otros” actualizado');
    } catch (e) {
      alert(e.response?.data?.detail || 'No se pudo actualizar “Otros”');
    } finally {
      setSavingOtros(false);
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
          {producto.imp_adicional != null ? Number(producto.imp_adicional).toFixed(2) : '0.00'}
        </div>

        <div className="mt-3">
          <label className="block font-semibold mb-1">Editar % Adicional:</label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              inputMode="decimal"
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
            min="0"
            value={otros}
            onChange={(e) => setOtros(e.target.value)}
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
        <p className="text-xs text-gray-500 mt-1">
          Afecta <b>total_costo</b> y el <b>costo_unitario</b> (según cantidad × UM).
        </p>
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
              filterOption={(option, input) => {
                const txt = input.toLowerCase();
                return option.label.toLowerCase().includes(txt);
              }}
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
