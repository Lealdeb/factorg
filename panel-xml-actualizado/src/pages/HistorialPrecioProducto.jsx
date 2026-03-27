import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function HistorialPrecioProducto({ historial }) {
  const data = {
    labels: historial.map(h => h.fecha),
    datasets: [
      {
        label: 'Precio unitario ($)',
        data: historial.map(h => h.precio_unitario),
        borderColor: 'rgb(75,192,192)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-2">Historial de Precios</h2>
      <Line data={data} />
    </div>
  );
}
