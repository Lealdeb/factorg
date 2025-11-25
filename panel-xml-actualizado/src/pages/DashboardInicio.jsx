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
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/dashboard/principal`);
        setData(res.data);
      } catch (err) {
        console.error('Error cargando datos del dashboard', err);
      }
    };
    fetch();
  }, []);

  const exportarFacturas = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/exportar/facturas/excel`);
      if (!response.ok) throw new Error("Error al descargar el archivo");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'facturas.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error exportando facturas:", error);
    }
  };

  const descargarExcel = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/exportar/productos/excel`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "productos.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert("Error al descargar Excel");
    }
  };

  if (!data) {
    return <div className="p-6">Cargando datos del panel...</div>;
  }

  const historial = data.historial_precios || [];
  const facturasMensuales = data.facturas_mensuales || [];
  const promediosProveedor = data.promedios_proveedor || [];

  // ---------- Datos para gráficos ----------

  // 1) Historial de precios (línea)
  const fechas = historial.map(p => (p.fecha || '').slice(0, 10));
  const precios = historial.map(p => p.precio_promedio);

  const lineData = {
    labels: fechas,
    datasets: [
      {
        label: 'Precio promedio global',
        data: precios,
        borderColor: 'rgba(37, 99, 235, 0.9)',
        backgroundColor: 'rgba(37, 99, 235, 0.3)',
        tension: 0.2,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Historial de precios promedio por día',
      },
    },
  };

  // 2) Facturas por mes (barras)
  const meses = facturasMensuales.map(f => (f.mes || '').slice(0, 7));
  const totales = facturasMensuales.map(f => f.total);

  const barMesData = {
    labels: meses,
    datasets: [
      {
        label: 'Total neto mensual',
        data: totales,
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
      },
    ],
  };

  const barMesOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Monto total de facturas por mes',
      },
    },
  };

  // 3) Promedio por proveedor (barras)
  const proveedores = promediosProveedor.map(p => p.proveedor);
  const promedios = promediosProveedor.map(p => p.precio_promedio);

  const barProvData = {
    labels: proveedores,
    datasets: [
      {
        label: 'Precio promedio',
        data: promedios,
        backgroundColor: 'rgba(234, 179, 8, 0.8)',
      },
    ],
  };

  const barProvOptions = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Precio promedio por proveedor',
      },
    },
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Panel Principal</h1>
          <p className="text-sm text-gray-600">
            Resumen de compras, precios y proveedores a partir de los DTE XML.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={descargarExcel}
            className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded text-sm"
          >
            Exportar Productos a Excel
          </button>
          <button
            onClick={exportarFacturas}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
          >
            Exportar Facturas a Excel
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Historial de precios */}
        <div className="bg-white shadow rounded-lg p-4">
          {historial.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aún no hay datos suficientes para el historial de precios.
              Sube algunas facturas y recarga el panel.
            </p>
          ) : (
            <Line data={lineData} options={lineOptions} />
          )}
        </div>

        {/* Facturas por mes */}
        <div className="bg-white shadow rounded-lg p-4">
          {facturasMensuales.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay datos de facturas mensuales todavía.
            </p>
          ) : (
            <Bar data={barMesData} options={barMesOptions} />
          )}
        </div>
      </div>

      {/* Promedio por proveedor */}
      <div className="bg-white shadow rounded-lg p-4">
        {promediosProveedor.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aún no hay datos suficientes por proveedor.
          </p>
        ) : (
          <Bar data={barProvData} options={barProvOptions} />
        )}
      </div>
    </div>
  );
}
