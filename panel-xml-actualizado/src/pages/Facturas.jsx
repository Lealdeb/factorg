import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import API_BASE_URL from '../config';

export default function Facturas() {
  const [facturas, setFacturas] = useState([]);
  const [busquedaRUT, setBusquedaRUT] = useState('');

  const fetchFacturas = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/facturas`);
      setFacturas(res.data);
    } catch (err) {
      console.error('Error al cargar facturas', err);
    }
  };

  const handleBuscar = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.get(`${API_BASE_URL}/facturas/buscar?rut=${busquedaRUT}`);
      setFacturas(res.data);
    } catch (err) {
      console.error('Error al buscar facturas', err);
    }
  };

  useEffect(() => {
    fetchFacturas();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Facturas</h1>

      {/* Formulario de búsqueda */}
      <form onSubmit={handleBuscar} className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Buscar por RUT del proveedor"
          value={busquedaRUT}
          onChange={(e) => setBusquedaRUT(e.target.value)}
          className="border rounded p-2 w-64"
        />
        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded">
          Buscar
        </button>
        <button
          type="button"
          onClick={() => {
            setBusquedaRUT('');
            fetchFacturas();
          }}
          className="bg-gray-400 text-white py-2 px-4 rounded"
        >
          Limpiar
        </button>
      </form>

      {/* Tabla de facturas */}
      <table className="min-w-full bg-white shadow rounded">
  <thead>
  <tr className="bg-gray-100">
    <th className="text-left p-3">ID</th>
    <th className="text-left p-3">Folio</th>
    <th className="text-left p-3">Fecha Emisión</th>
    <th className="text-left p-3">Monto Total</th>
    <th className="text-left p-3">Proveedor</th>
    <th className="text-left p-3">RUT</th>
    <th className="text-left p-3">Negocio</th> {/* 👈 Nueva columna */}
    <th className="text-left p-3">Acciones</th>
  </tr>
</thead>
<tbody>
  {facturas.map((factura) => (
    <tr key={factura.id} className="border-t">
      <td className="p-3">{factura.id}</td>
      <td className="p-3">{factura.folio}</td>
      <td className="p-3">{factura.fecha_emision}</td>
      <td className="p-3">${factura.monto_total.toFixed(2)}</td>
      <td className="p-3">{factura.proveedor?.nombre}</td>
      <td className="p-3">{factura.proveedor?.rut}</td>
      <td className="p-3">{factura.negocio?.nombre || 'Sin asignar'}</td> {/* 👈 Aquí va el negocio */}
      <td className="p-3">
        <Link
          to={`/facturas/${factura.id}`}
          className="text-blue-600 hover:underline"
        >
          Ver Detalles
        </Link>
      </td>
    </tr>
  ))}
</tbody>
</table>
    </div>
  );
}
