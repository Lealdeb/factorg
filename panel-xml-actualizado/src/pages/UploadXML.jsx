import { useState, useRef } from "react";
import { uploadXML } from "../services/api";

export default function UploadXML({ fetchFacturas, fetchProductos }) {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const fileInputRef = useRef(null);

  const handleUpload = async () => {
    if (!file) return setMsg("Selecciona un XML primero.");

    try {
      const res = await uploadXML(file); // ✅ PASA EL FILE, NO FormData
      setMsg(res?.mensaje || "XML subido correctamente ✅");

      if (fetchFacturas) await fetchFacturas();
      if (fetchProductos) await fetchProductos();
    } catch (err) {
      setMsg(err?.response?.data?.detail || "Error al subir XML");
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
          onChange={(e) => { setMsg(""); setFile(e.target.files?.[0] ?? null); }}
        />
        <button onClick={handleUpload} disabled={!file}>
          Subir Factura
        </button>
        {msg && <p>{msg}</p>}
      </div>
    </div>
  );
}
