
import { useState, useRef} from 'react';
import { uploadXML } from '../services/api';



export default function UploadXML() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const fileInputRef = useRef(null);

const handleUpload = async () => {
  if (!archivo) return;
  const formData = new FormData();
  formData.append("file", archivo);

  try {
    const res = await axios.post(`${API_BASE_URL}/subir-xml/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    alert(res.data.mensaje);
    // refrescar tablas
    await fetchFacturas();
    await fetchProductos();
  } catch (err) {
    const msg = err.response?.data?.detail || "Error al subir XML";
    alert(msg);
  } finally {
    // siempre limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setArchivo(null);
  }
};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Subir XML</h1>
      <div className="bg-white shadow rounded-xl p-6 w-full max-w-xl">
        <input
          type="file"
          accept=".xml"
          onChange={e => setFile(e.target.files[0])}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button
          onClick={handleUpload}
          className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          Subir Factura
        </button>
        {msg && <p className="mt-2 text-green-600 text-sm">{msg}</p>}
      </div>
    </div>
  );
}