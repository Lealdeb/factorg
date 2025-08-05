import { useState } from 'react';
import axios from 'axios';

export default function BusquedaAvanzadaProductos() {
  const [nombre, setNombre] = useState('');
  const [grupoAdminId, setGrupoAdminId] = useState('');
  const [resultados, setResultados] = useState([]);

  const buscar = async () => {
    try {
      const params = {};
      if (nombre) params.nombre = nombre;
      if (grupoAdminId) params.grupo_admin_id = grupoAdminId;

      const res = await axios.get('http://localhost:8001/productos/buscar-avanzado', { params });
      setResultados(res.data);
    } catch (error) {
      alert('Error en la búsqueda');
      console.error(error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Búsqueda Avanzada de Productos</h1>

      <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
        <div>
          <label className="block mb-1">Nombre del producto:</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1">Código Admin (ID):</label>
          <input
            type="number"
            value={grupoAdminId}
            onChange={(e) => setGrupoAdminId(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>

        <button onClick={buscar} className="bg-blue-600 text-white px-4 py-2 rounded h-fit">
          Buscar
        </button>
      </div>

      {resultados.length > 0 && (
        <table className="w-full border text-left">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">Producto</th>
              <th className="p-2">Proveedor</th>
              <th className="p-2">Precio Unitario</th>
              <th className="p-2">Fecha de Adquisición</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((r, index) => (
              <tr key={index} className="border-t">
                <td className="p-2">{r.producto}</td>
                <td className="p-2">{r.proveedor}</td>
                <td className="p-2">${r.precio_unitario}</td>
                <td className="p-2">{r.fecha_emision}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {resultados.length === 0 && (
        <p className="text-gray-500">No se encontraron resultados.</p>
      )}
    </div>
  );
}
