import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from "../config";

export default function FacturaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [factura, setFactura] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [negocioSeleccionado, setNegocioSeleccionado] = useState('');

  useEffect(() => {
    const fetchFactura = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/facturas/${id}`);
        setFactura(res.data);
        setNegocioSeleccionado(res.data.negocio_id || '');
      } catch (error) {
        console.error('Error al obtener la factura:', error);
      }
    };

    const fetchNegocios = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/negocios`);
        setNegocios(res.data);
      } catch (error) {
        console.error('Error al obtener negocios:', error);
      }
    };

    fetchFactura();
    fetchNegocios();
  }, [id]);

  const asignarNegocio = async () => {
    if (!negocioSeleccionado) {
      alert("Selecciona un negocio");
      return;
    }
    try {
      await axios.put(`${API_BASE_URL}/facturas/${id}/asignar-negocio`, {
        negocio_id: parseInt(negocioSeleccionado)
      });
      alert("Negocio asignado correctamente");
    } catch (error) {
      console.error('Error al asignar negocio:', error);
      alert("Error al asignar negocio");
    }
  };

  const handleEliminarProducto = async (productoId) => {
    try {
      await axios.delete(`${API_BASE_URL}/productos/${productoId}`);
      setFactura(prev => ({
        ...prev,
        detalles: prev.detalles.filter(d => d.producto.id !== productoId)
      }));
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  };

  const handleEditarProducto = async (productoId) => {
    const nuevoNombre = prompt('Nuevo nombre del producto:');
    if (nuevoNombre) {
      try {
        await axios.put(`${API_BASE_URL}/productos/${productoId}`, { nombre: nuevoNombre });
        setFactura(prev => ({
          ...prev,
          detalles: prev.detalles.map(d =>
            d.producto.id === productoId ? { ...d, producto: { ...d.producto, nombre: nuevoNombre } } : d
          )
        }));
      } catch (error) {
        console.error('Error al editar producto:', error);
      }
    }
  };

  if (!factura) return <div className="p-6">Cargando...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Detalle de Factura #{factura.folio}</h1>
      <p className="mb-2">Fecha de emisión: {factura.fecha_emision}</p>
      <p className="mb-2">Forma de pago: {factura.forma_pago}</p>
      <p className="mb-2">Monto total: ${factura.monto_total}</p>
      <p className="mb-2">Proveedor: {factura.proveedor.nombre} ({factura.proveedor.rut})</p>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Negocio asignado:</label>
        <div className="flex items-center">
          <select
            value={negocioSeleccionado}
            onChange={(e) => setNegocioSeleccionado(e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="">Seleccione un negocio</option>
            {negocios.map((n) => (
              <option key={n.id} value={n.id}>{n.nombre}</option>
            ))}
          </select>
          <button
            onClick={asignarNegocio}
            className="ml-2 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Asignar a negocio
          </button>
        </div>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">Productos</h2>
      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-3">Nombre</th>
            <th className="text-left p-3">Cantidad</th>
            <th className="text-left p-3">Precio Unitario</th>
            <th className="text-left p-3">Total</th>
            <th className="text-left p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {factura.detalles.map((detalle) => (
            <tr key={detalle.id} className="border-t">
              <td className="p-3">{detalle.producto.nombre}</td>
              <td className="p-3">{detalle.cantidad}</td>
              <td className="p-3">${detalle.precio_unitario?.toFixed(0) || '-'}</td>
              <td className="p-3">${detalle.total}</td>
              <td className="p-3 space-x-2">
                <button
                  onClick={() => handleEditarProducto(detalle.producto.id)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleEliminarProducto(detalle.producto.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={() => navigate('/LeerFact')}
        className="mt-6 bg-gray-700 text-white px-4 py-2 rounded"
      >
        Volver a Facturas
      </button>
    </div>
  );
}
