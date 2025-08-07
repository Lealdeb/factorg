import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Line, Bar, Radar
} from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, BarElement, RadialLinearScale
} from 'chart.js';
import { API_BASE_URL } from "../config";

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, BarElement,
  RadialLinearScale
);

export default function DashboardInicio() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetch = async () => {
            const res = await axios.get(`${API_BASE_URL}/dashboard/principal`);

      setData(res.data);
    };
    fetch();
  }, []);

  if (!data) return <div className="p-6">Cargando datos...</div>;

  const fechas = data.historial_precios.map(p => p.fecha.slice(0, 10));
  const precios = data.historial_precios.map(p => p.precio_promedio);

  const meses = data.facturas_mensuales.map(f => f.mes.slice(0, 7));
  const totales = data.facturas_mensuales.map(f => f.total);

  const proveedores = data.promedios_proveedor.map(p => p.proveedor);
  const promedios = data.promedios_proveedor.map(p => p.precio_promedio);
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
      responseType: "blob"
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

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-bold">Panel Principal</h1>
      <button onClick={descargarExcel} className="bg-green-700 text-white px-4 py-2 rounded">
        Exportar Productos a Excel
        </button>
        <button
  onClick={exportarFacturas}
  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
>
  Exportar Facturas a Excel
</button>

      <h2>Eventualmente aquí deberia de ir un panel de estadisticas</h2>

     

    
    </div>
  );
}
