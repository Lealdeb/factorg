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

  const isError = msg && msg.toLowerCase().includes("error");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Subir XML
      </h1>

      <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-xl border border-gray-100">
        <p className="text-sm text-gray-600 mb-4">
          Selecciona un archivo <span className="font-semibold">.xml</span> con facturas o notas de crédito
          para procesarlo en el sistema.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Archivo XML
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={(e) => {
                setMsg("");
                setFile(e.target.files?.[0] ?? null);
              }}
              className="block w-full text-sm text-gray-900 
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-lg file:border-0
                         file:text-sm file:font-semibold
                         file:bg-indigo-50 file:text-indigo-700
                         hover:file:bg-indigo-100
                         border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                         cursor-pointer"
            />
            {file && (
              <p className="mt-2 text-xs text-gray-500 truncate">
                Archivo seleccionado: <span className="font-medium">{file.name}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file}
            className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold
                       transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                       ${
                         file
                           ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500"
                           : "bg-gray-200 text-gray-500 cursor-not-allowed"
                       }`}
          >
            Subir factura
          </button>
        </div>

        {msg && (
          <div
            className={`mt-4 text-sm px-3 py-2 rounded-lg border ${
              isError
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-green-50 text-green-700 border-green-200"
            }`}
          >
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
