import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Line,
  Bar,
} from 'react-chartjs-2';
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
  const [dashboardData, setDashboardData] = useState(null);
  const [historialProducto, setHistorialProducto] = useState([]);

  // filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [codAdminId, setCodAdminId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');

  const [productoIdHist, setProductoIdHist] = useState('');

  // -----------------------
  // CARGA DASHBOARD (HU-17, HU-18)
  // -----------------------
  const cargarDashboard = async () => {
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fecha_inicio', fechaInicio);
      if (fechaFin) params.append('fecha_fin', fechaFin);
      if (codAdminId) params.append('cod_admin_id', codAdminId);
      if (categoriaId) params.append('categoria_id', categoriaId);

      const url = `${API_BASE_URL}/dashboard/principal?${params.toString()}`;
      const res = await axios.get(url);
      setDashboardData(res.data);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      alert('Error cargando datos del dashboard');
    }
  };

  useEffect(() => {
    cargarDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------
  // HISTORIAL DE PRECIOS (HU-16)
  // -----------------------
  const cargarHistorialProducto = async () => {
    if (!productoIdHist) {
      alert('Ingresa un ID de producto');
      return;
    }
    try {
      const res = await axios.get(
        `${API_BASE_URL}/productos/${productoIdHist}/historial-precios`
      );
      setHistorialProducto(res.data);
    } catch (err) {
      console.error('Error cargando historial:', err);
      alert('No se pudo cargar el historial de precios para ese producto');
    }
  };

  // -----------------------
  // EXPORTAR EXCEL (ya lo tenías)
  // -----------------------
  const descargarExcelProductos = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/exportar/productos/excel`,
        { responseType: 'blob' }
      );
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
      const response = await fetch(`${API_BASE_URL}/exportar/facturas/excel`);
      if (!response.ok) throw new Error('Error al descargar el archivo');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'facturas.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exportando facturas:', error);
    }
  };

  if (!dashboardData) {
    return <div className="p-6">Cargando datos del dashboard...</div>;
  }

  // -----------------------
  // DATOS PARA GRÁFICOS
  // -----------------------

  // HU-16: historial por producto
  const labelsHistorial = historialProducto.map(p => p.fecha);
  const dataHistorial = {
    labels: labelsHistorial,
    datasets: [
      {
        label: 'Precio Neto',
        data: historialProducto.map(p => p.precio_neto),
      },
      {
        label: 'Precio con Impuestos',
        data: historialProducto.map(p => p.precio_con_impuestos),
      },
    ],
  };

  // HU-17: facturas por mes
  const labelsMeses = dashboardData.facturas_mensuales.map(f => f.mes.slice(0, 7));
  const dataFacturasMensuales = {
    labels: labelsMeses,
    datasets: [
      {
        label: 'Total Neto',
        data: dashboardData.facturas_mensuales.map(f => f.total_neto),
      },
      {
        label: 'Total Impuestos (IVA + otros)',
        data: dashboardData.facturas_mensuales.map(f => f.total_impuestos),
      },
      {
        label: 'Total con Impuestos',
        data: dashboardData.facturas_mensuales.map(f => f.total_con_impuestos),
      },
    ],
  };

  // HU-18: promedios por proveedor
  const labelsProveedores = dashboardData.promedios_proveedor.map(p => p.proveedor);
  const dataPromediosProveedor = {
    labels: labelsProveedores,
    datasets: [
      {
        label: 'Precio promedio (neto)',
        data: dashboardData.promedios_proveedor.map(p => p.precio_promedio),
      },
    ],
  };

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold mb-4">Panel Principal / Análisis</h1>

      {/* BOTONES DE EXPORTACIÓN */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={descargarExcelProductos}
          className="bg-green-700 text-white px-4 py-2 rounded"
        >
          Exportar Productos a Excel
        </button>
        <button
          onClick={exportarFacturas}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Exportar Facturas a Excel
        </button>
      </div>

      {/* FILTROS GENERALES HU-17 / HU-18 */}
      <section className="border rounded p-4 space-y-2">
        <h2 className="text-lg font-semibold">Filtros de análisis</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium">Fecha inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Fecha fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">cod_admin_id (opcional)</label>
            <input
              type="number"
              value={codAdminId}
              onChange={e => setCodAdminId(e.target.value)}
              className="border rounded px-2 py-1 w-full"
              placeholder="ID de código admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">categoria_id (opcional)</label>
            <input
              type="number"
              value={categoriaId}
              onChange={e => setCategoriaId(e.target.value)}
              className="border rounded px-2 py-1 w-full"
              placeholder="ID categoría"
            />
          </div>
        </div>
        <button
          onClick={cargarDashboard}
          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Aplicar filtros
        </button>
      </section>

      {/* HU-16: HISTORIAL DE PRECIOS POR PRODUCTO */}
      <section className="border rounded p-4 space-y-4">
        <h2 className="text-lg font-semibold">Historial de precios por producto (HU-16)</h2>
        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-sm font-medium">ID de producto</label>
            <input
              type="number"
              value={productoIdHist}
              onChange={e => setProductoIdHist(e.target.value)}
              className="border rounded px-2 py-1"
              placeholder="Ej: 123"
            />
          </div>
          <button
            onClick={cargarHistorialProducto}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Ver historial
          </button>
        </div>

        {historialProducto.length === 0 ? (
          <p className="text-sm text-gray-600">
            Selecciona un producto para ver su historial de precios.
          </p>
        ) : (
          <div className="mt-4">
            <Line
              data={dataHistorial}
              options={{
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: 'Evolución del precio (neto vs con impuestos)',
                  },
                },
              }}
            />
          </div>
        )}
      </section>

      {/* HU-17: FACTURAS POR MES */}
      <section className="border rounded p-4 space-y-4">
        <h2 className="text-lg font-semibold">Facturas por mes (HU-17)</h2>
        {dashboardData.facturas_mensuales.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay facturas en el rango seleccionado.
          </p>
        ) : (
          <Bar
            data={dataFacturasMensuales}
            options={{
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: 'Totales mensuales (neto, impuestos, total)',
                },
              },
            }}
          />
        )}
      </section>

      {/* HU-18: PROMEDIOS POR PROVEEDOR */}
      <section className="border rounded p-4 space-y-4">
        <h2 className="text-lg font-semibold">
          Promedio de precios por proveedor (HU-18)
        </h2>
        {dashboardData.promedios_proveedor.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay datos suficientes para calcular promedios con los filtros actuales.
          </p>
        ) : (
          <Bar
            data={dataPromediosProveedor}
            options={{
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: 'Comparativa de precios promedio por proveedor',
                },
              },
            }}
          />
        )}
      </section>
    </div>
  );
}
