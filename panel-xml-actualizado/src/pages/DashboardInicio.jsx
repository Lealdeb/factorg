// src/pages/DashboardInicio.jsx
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import API_BASE_URL from '../config';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
);

export default function DashboardInicio() {
  const [data, setData] = useState(null);

  // catálogos
  const [codigosAdmin, setCodigosAdmin] = useState([]);

  // filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [codAdminId, setCodAdminId] = useState('');
  const [codigoProducto, setCodigoProducto] = useState('');

  // --------- exportación ----------
  const descargarExcelProductos = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/exportar/productos/excel`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'productos.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Error al descargar Excel de productos');
    }
  };

  const exportarFacturas = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/exportar/facturas/excel`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'facturas.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Error al descargar Excel de facturas');
    }
  };

  // --------- cargar catálogos ----------
  const cargarCodigosAdmin = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/codigos_admin`);
      setCodigosAdmin(res.data || []);
    } catch (err) {
      console.error('Error cargando códigos admin', err);
      setCodigosAdmin([]);
    }
  }, []);

  // --------- cargar datos dashboard ----------
  // ✅ override: te permite forzar parámetros (ej: Limpiar manda {} aunque el state aún no cambie)
  const cargarDashboard = useCallback(
    async (override = null) => {
      try {
        const params = {};

        const fi = override?.fecha_inicio ?? fechaInicio;
        const ff = override?.fecha_fin ?? fechaFin;
        const ca = override?.cod_admin_id ?? codAdminId;
        const cp = override?.codigo_producto ?? codigoProducto;

        if (fi) params.fecha_inicio = fi;
        if (ff) params.fecha_fin = ff;
        if (ca) params.cod_admin_id = Number(ca);
        if (cp) params.codigo_producto = String(cp).trim();

        const res = await axios.get(`${API_BASE_URL}/dashboard/principal`, { params });
        setData(res.data);
      } catch (err) {
        console.error('Error cargando dashboard', err);
        setData({
          historial_precios: [],
          facturas_mensuales: [],
          promedios_proveedor: [],
        });
      }
    },
    [fechaInicio, fechaFin, codAdminId, codigoProducto]
  );

  useEffect(() => {
    cargarCodigosAdmin();
    cargarDashboard();
  }, [cargarCodigosAdmin, cargarDashboard]);

  if (!data) return <div className="p-6">Cargando datos...</div>;

  // --------- preparar datos gráficos ---------
  const historial = data.historial_precios || [];
  const fechas = historial.map((p) => p.mes); // YYYY-MM
  const costosProm = historial.map((p) => Number(p.costo_promedio || 0));

  const dataHistorial = {
    labels: fechas,
    datasets: [
      {
        label: 'Costo unitario promedio global',
        data: costosProm,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 3,
      },
    ],
  };

  const fm = data.facturas_mensuales || [];
  const meses = fm.map((f) => f.mes);
  const totales = fm.map((f) => Number(f.total || 0));

  const dataFacturasMensuales = {
    labels: meses,
    datasets: [
      {
        label: 'Total mensual (costo)',
        data: totales,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const pp = data.promedios_proveedor || [];
  const proveedores = pp.map((p) => p.proveedor);
  const promedios = pp.map((p) => Number(p.costo_promedio || 0));

  const palette = [
    'rgba(255, 99, 132, 0.6)',
    'rgba(255, 159, 64, 0.6)',
    'rgba(255, 205, 86, 0.6)',
    'rgba(75, 192, 192, 0.6)',
    'rgba(54, 162, 235, 0.6)',
    'rgba(153, 102, 255, 0.6)',
    'rgba(201, 203, 207, 0.6)',
  ];

  const dataProveedores = {
    labels: proveedores,
    datasets: [
      {
        label: 'Costo unitario promedio por proveedor',
        data: promedios,
        backgroundColor: proveedores.map((_, i) => palette[i % palette.length]),
        borderColor: proveedores.map((_, i) => palette[i % palette.length].replace('0.6', '1')),
        borderWidth: 1,
      },
    ],
  };

  const optionsLine = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: false },
    },
  };

  const optionsBar = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: false },
    },
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Panel Principal</h1>

      {/* Filtros tipo "Productos" */}
      <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Fecha desde</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Fecha hasta</label>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>

        <div className="flex flex-col min-w-[220px]">
          <label className="text-sm font-semibold mb-1">Cod Admin</label>
          <select
            className="border rounded px-2 py-1"
            value={codAdminId}
            onChange={(e) => setCodAdminId(e.target.value)}
          >
            <option value="">(todos)</option>
            {codigosAdmin.map((c) => (
              <option key={c.id} value={c.id}>
                {c.cod_admin} - {c.nombre_producto}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1">Código producto</label>
          <input
            type="text"
            className="border rounded px-2 py-1"
            value={codigoProducto}
            onChange={(e) => setCodigoProducto(e.target.value)}
            placeholder="Ej: 76256385..."
          />
        </div>

        <button onClick={() => cargarDashboard()} className="bg-black text-white px-4 py-2 rounded">
          Buscar
        </button>

        {/* ✅ Limpiar real: fuerza dashboard sin params aunque el state aún no actualice */}
        <button
          onClick={() => {
            setFechaInicio('');
            setFechaFin('');
            setCodAdminId('');
            setCodigoProducto('');
            cargarDashboard({ fecha_inicio: '', fecha_fin: '', cod_admin_id: '', codigo_producto: '' });
          }}
          className="bg-gray-200 px-4 py-2 rounded"
        >
          Limpiar
        </button>
      </div>

      {/* Botones exportación */}
      <div className="flex gap-4">
        <button onClick={descargarExcelProductos} className="bg-green-700 text-white px-4 py-2 rounded">
          Exportar Productos a Excel
        </button>
        <button onClick={exportarFacturas} className="bg-green-600 text-white px-4 py-2 rounded">
          Exportar Facturas a Excel
        </button>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Historial de costos global</h2>
          {fechas.length ? <Line data={dataHistorial} options={optionsLine} /> : (
            <p className="text-sm text-gray-500">No hay datos suficientes para generar el gráfico.</p>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Totales por mes</h2>
          {meses.length ? <Bar data={dataFacturasMensuales} options={optionsBar} /> : (
            <p className="text-sm text-gray-500">No hay datos en el período seleccionado.</p>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4 lg:col-span-2">
          <h2 className="font-semibold mb-2">Costo promedio por proveedor</h2>
          {proveedores.length ? <Bar data={dataProveedores} options={optionsBar} /> : (
            <p className="text-sm text-gray-500">No hay datos para calcular promedios por proveedor.</p>
          )}
        </div>
      </div>
    </div>
  );
}
