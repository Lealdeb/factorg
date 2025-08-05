/*EditarProducto*/

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';


export default function ProductoDetalle() {
  const { id } = useParams();
  const [producto, setProducto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [porcentajeAdicional, setPorcentajeAdicional] = useState('');
  const [codigosAdmin, setCodigosAdmin] = useState([]);
  const [codigoSeleccionado, setCodigoSeleccionado] = useState(''); 


  useEffect(() => {
    const fetchProducto = async () => {
      const res = await axios.get(`http://localhost:8001/productos/${id}`);
      setProducto(res.data);
      setCategoriaSeleccionada(res.data.categoria?.id || '');
      setGrupoSeleccionado(res.data.grupo_admin?.id || '');
      setPorcentajeAdicional(res.data.porcentaje_adicional || 0);

    };

    const fetchCodigosAdmin = async () => {
      const res = await axios.get('http://localhost:8001/codigos_admin');
      setCodigosAdmin(res.data);
    };
    fetchCodigosAdmin();

    const fetchCategorias = async () => {
      const res = await axios.get('http://localhost:8001/categorias');
      setCategorias(res.data);
    };


    fetchProducto();
    fetchCategorias();
 
  }, [id]);

  const asignarCategoria = async () => {
    if (!categoriaSeleccionada) return alert('Selecciona o crea una categoría válida');

    try {
      const categoriaIdNum = parseInt(categoriaSeleccionada);
      await axios.put(`http://localhost:8001/productos/${id}/asignar-categoria`, {
        categoria_id: categoriaIdNum,
      });
      alert('Categoría asignada correctamente');
    } catch (error) {
      console.error(error);
      alert('Error al asignar categoría');
    }
  };



  const crearCategoria = async () => {
    if (!nuevaCategoria.trim()) return alert('Nombre no válido');
    try {
      const res = await axios.post('http://localhost:8001/categorias', { nombre: nuevaCategoria });
      setCategorias([...categorias, res.data]);
      setCategoriaSeleccionada(res.data.id.toString());
      setNuevaCategoria('');
    } catch (error) {
      console.error(error);
      alert('Error al crear categoría');
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
          <div className="border p-2 rounded bg-gray-100">{value || 'N/A'}</div>
        </div>
      ))}
      {/* IMP. ADICIONAL y Porcentaje editable */}
      <div className="mb-6">
        <label className="block font-semibold mb-1">Impuesto Adicional Calculado:</label>
        <div className="border p-2 rounded bg-gray-100">
          {producto.imp_adicional?.toFixed(2) ?? 0}
        </div>

        <div className="mt-3">
          <label className="block font-semibold mb-1">Editar % Adicional:</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              placeholder="Ej: 0.15"
              value={porcentajeAdicional}
              onChange={(e) => setPorcentajeAdicional(e.target.value)}
              className="border p-2 rounded w-40"
            />
            <button
              onClick={async () => {
                try {
                  await axios.put(`http://localhost:8001/productos/${id}/porcentaje-adicional`, {
                    porcentaje_adicional: parseFloat(porcentajeAdicional)
                  });
                  const res = await axios.get(`http://localhost:8001/productos/${id}`);
                  setProducto(res.data);
                  alert('Actualizado correctamente');
                } catch (error) {
                  console.error(error);
                  alert('Error al actualizar porcentaje');
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>

      {/* CATEGORÍA */}
      <div className="mb-6">

      </div>

      {/* GRUPO ADMIN */}
      {/* COD ADMIN */}
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
            onClick={async () => {
              try {
                const idNum = parseInt(codigoSeleccionado);
                await axios.put(`http://localhost:8001/productos/${id}/asignar-cod-admin`, null, {
                  params: { cod_admin_id: idNum }
                });
                const res = await axios.get(`http://localhost:8001/productos/${id}`);
                setProducto(res.data);
                alert('Código admin asignado correctamente');
              } catch (error) {
                console.error(error);
                alert('Error al asignar código admin');
              }
            }}
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
