/* EditarProducto.jsx */

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import API_BASE_URL from '../config';

export default function ProductoDetalle() {
  const { id } = useParams();
  const [producto, setProducto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [porcentajeAdicional, setPorcentajeAdicional] = useState(''); // puede ser "10", "10%", "0.15"
  const [codigosAdmin, setCodigosAdmin] = useState([]);
  const [codigoSeleccionado, setCodigoSeleccionado] = useState('');
  const [savingPct, setSavingPct] = useState(false);
  const [otrosValor, setOtrosValor] = useState (0);
  const [savingOtros, SetSavingOtros] =useState (false);

  useEffect(() => {
    const fetchProducto = async () => {
      const res = await axios.get(`${API_BASE_URL}/productos/${id}`);
      setProducto(res.data);
      setCategoriaSeleccionada(res.data.categoria?.id || '');
      // el backend devuelve fracción (0..1); dejamos el valor tal cual para el input tipo number.
      setPorcentajeAdicional(res.data.porcentaje_adicional ?? 0);
      setOtrosValor(Number(res.data.otros ?? 0));
    };

    const fetchCodigosAdmin = async () => {
      const res = await axios.get(`${API_BASE_URL}/codigos_admin`);
      setCodigosAdmin(res.data);
    };

    const fetchCategorias = async () => {
      const res = await axios.get(`${API_BASE_URL}/categorias`);
      setCategorias(res.data);
    };

    fetchProducto();
    fetchCodigosAdmin();
    fetchCategorias();
  }, [id]);

  const asignarCategoria = async () => {
    if (!categoriaSeleccionada) return alert('Selecciona o crea una categoría válida');
    try {
      const categoriaIdNum = parseInt(categoriaSeleccionada, 10);
      await axios.put(`${API_BASE_URL}/productos/${id}/asignar-categoria`, {
        categoria_id: categoriaIdNum,
      });
      alert('Categoría asignada correctamente');
    } catch (error) {
      console.error(error);
      alert('Error al asignar categoría');
    }
  };

  const guardarOtros = async () => {
    try {
      setSavingOtros(true);
      // Backend espera entero, permitimos negativos y 0
      const payload = { otros: parseInt(otrosValor, 10) || 0 };

      await axios.put(
        `${API_BASE_URL}/productos/${id}/otros`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );

      // refrescar para ver neto/imp/total_costo/costo_unitario recalculados
      const res = await axios.get(`${API_BASE_URL}/productos/${id}`);
      setProducto(res.data);
      setOtrosValor(Number(res.data.otros ?? 0));
      alert('Campo "Otros" actualizado');
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail || 'No se pudo actualizar "Otros"';
      alert(msg);
    } finally {
      setSavingOtros(false);
    }
  };

  const crearCategoria = async () => {
    if (!nuevaCategoria.trim()) return alert('Nombre no válido');
    try {
      const res = await axios.post(`${API_BASE_URL}/categorias`, { nombre: nuevaCategoria });
      setCategorias([...categorias, res.data]);
      setCategoriaSeleccionada(String(res.data.id));
      setNuevaCategoria('');
    } catch (error) {
      console.error(error);
      alert('Error al crear categoría');
    }
  };

  const guardarPorcentaje = async () => {
    try {
      setSavingPct(true);
      // Mandamos el valor como string; el backend ya normaliza ("10", "10%", "10,5", 0.1, etc.)
      const body = { porcentaje_adicional: String(porcentajeAdicional) };
      await axios.put(
        `${API_BASE_URL}/productos/${id}/porcentaje-adicional`,
        body,
        { headers: { 'Content-Type': 'application/json' } }
      );

      // Refrescar producto para ver imp_adicional actualizado
      const res = await axios.get(`${API_BASE_URL}/productos/${id}`);
      setProducto(res.data);
      alert('Porcentaje actualizado');
    } catch (e) {
      if (e.response) {
        console.error('Status:', e.response.status);
        console.error('Detail:', e.response.data);
        const msg = e.response.data?.detail || 'No se pudo actualizar el porcentaje';
        alert(msg); // si sale "El producto no tiene código admin asignado", primero asigna un código admin
      } else {
        console.error(e);
        alert('Error de red');
      }
    } finally {
      setSavingPct(false);
    }
  };

  const asignarCodAdmin = async () => {
    if (!codigoSeleccionado) return alert('Selecciona un código admin');
    try {
      const idNum = parseInt(codigoSeleccionado, 10);
      await axios.put(`${API_BASE_URL}/productos/${id}/asignar-cod-admin`, null, {
        params: { cod_admin_id: idNum },
      });
      const res = await axios.get(`${API_BASE_URL}/productos/${id}`);
      setProducto(res.data);
      alert('Código admin asignado correctamente');
    } catch (error) {
      console.error(error);
      alert('Error al asignar código admin');
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
        ['Unidad', producto.unidad],
        ['Proveedor', producto.proveedor?.nombre],
      ].map(([label, value]) => (
        <div className="mb-4" key={label}>
          <label className="block font-semibold">{label}:</label>
          <div className="border p-2 rounded bg-gray-100">{value ?? 'N/A'}</div>
        </div>
      ))}

      {/* IMP. ADICIONAL y Porcentaje editable */}
      <div className="mb-6">
        <label className="block font-semibold mb-1">Impuesto Adicional Calculado:</label>
        <div className="border p-2 rounded bg-gray-100">
          {producto.imp_adicional != null ? Number(producto.imp_adicional).toFixed(2) : '0.00'}
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
              {savingPct ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
      {/* OTROS (editable) */}
<div className="mb-6">
  <label className="block font-semibold mb-1">Otros (enteros, admite negativos):</label>
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
      className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
    >
      {savingOtros ? 'Guardando...' : 'Guardar'}
    </button>
  </div>

  {/* Muestra de cálculos resultantes */}
  <div className="mt-3 grid grid-cols-2 gap-3">
    <div>
      <div className="text-sm text-gray-500">Neto (PU × Cant.)</div>
      <div className="border p-2 rounded bg-gray-100">
        {(producto.total_neto ?? 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
      </div>
    </div>
    <div>
      <div className="text-sm text-gray-500">Imp. Adicional</div>
      <div className="border p-2 rounded bg-gray-100">
        {(producto.imp_adicional ?? 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
      </div>
    </div>
    <div>
      <div className="text-sm text-gray-500">Total Costo</div>
      <div className="border p-2 rounded bg-gray-100">
        {(producto.total_costo ?? 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
      </div>
    </div>
    <div>
      <div className="text-sm text-gray-500">Costo Unitario</div>
      <div className="border p-2 rounded bg-gray-100">
        {(producto.costo_unitario ?? 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
      </div>
    </div>
  </div>
</div>


      {/* CÓDIGO ADMIN */}
      <div className="mb-6">
        <label className="block font-semibold mb-1">Código Admin:</label>
        <div className="flex items-center gap-2">
          <select
            value={codigoSeleccionado}
            onChange={(e) => setCodigoSeleccionado(e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="">Seleccione un código admin</option>
            {codigosAdmin.map((c) => (
              <option key={c.id} value={c.id}>{c.cod_admin}</option>
            ))}
          </select>
          <button
            onClick={asignarCodAdmin}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Asignar
          </button>
        </div>
      </div>

      <Link to="/leerProd" className="text-blue-600 hover:underline inline-block mt-6">
        ← Volver a productos
      </Link>
    </div>
  );
}
