import { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config";

export default function UploadXML() {
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setArchivo(file);
  };

  const handleUpload = async () => {
    if (!archivo) {
      alert("Selecciona un archivo XML primero.");
      return;
    }

    try {
      setSubiendo(true);
      const formData = new FormData();
      formData.append("file", archivo); // o "archivo" según tu backend

      await axios.post(`${API_BASE_URL}/upload-xml`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("XML subido correctamente ✅");
      setArchivo(null);
    } catch (err) {
      console.error(err);
      alert("Error subiendo XML ❌");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div>
      <input type="file" accept=".xml" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={subiendo}>
        {subiendo ? "Subiendo..." : "Subir XML"}
      </button>
    </div>
  );
}
