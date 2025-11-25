import { useState, useRef } from "react";
import { uploadXML } from "../services/api";

export default function UploadXML({ fetchFacturas, fetchProductos }) {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const fileInputRef = useRef(null);

  const handleUpload = async () => {
    if (!file) {
      setMsg("Selecciona un XML primero.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file); 

    try {
      const res = await uploadXML(formData); 
      setMsg(res?.data?.mensaje || "XML subido correctamente ✅");

      
      if (fetchFacturas) await fetchFacturas();
      if (fetchProductos) await fetchProductos();
    } catch (err) {
      const mensaje = err?.response?.data?.detail || "Error al subir XML";
      setMsg(mensaje);
      console.error(err);
    } finally {
     
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFile(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">Subir XML</h1>

      <div className="bg-white shadow rounded-xl p-6 w-full max-w-xl">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml"
          onChange={(e) => {
            setMsg("");
            setFile(e.target.files?.[0] ?? null);
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        <button
          onClick={handleUpload}
          disabled={!file}
          className="mt-4 w-full bg-blue-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          Subir Factura
        </button>

        {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
      </div>
    </div>
  );
}
