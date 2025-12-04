// src/pages/AdminNegocios.jsx
import { useState } from "react";
import { crearNegocio } from "../services/usuariosService";

export default function AdminNegocios() {
  const [form, setForm] = useState({
    nombre: "",
    rut_receptor: "",
    razon_social: "",
    correo: "",
    direccion: "",
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const crear = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!form.nombre.trim()) {
      setMsg("El nombre es obligatorio.");
      return;
    }

    setLoading(true);
    try {
      await crearNegocio({
        nombre: form.nombre.trim(),
        rut_receptor: form.rut_receptor.trim() || null,
        razon_social: form.razon_social.trim() || null,
        correo: form.correo.trim() || null,
        direccion: form.direccion.trim() || null,
      });

      setMsg("✅ Negocio creado.");
      setForm({ nombre: "", rut_receptor: "", razon_social: "", correo: "", direccion: "" });
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.detail || "Error creando negocio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Crear negocio</h1>

      {msg && (
        <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
          {msg}
        </div>
      )}

      <form onSubmit={crear} className="bg-white border rounded-lg p-4 space-y-3">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Nombre *"
          value={form.nombre}
          onChange={(e) => onChange("nombre", e.target.value)}
        />

        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="RUT Receptor (opcional)"
          value={form.rut_receptor}
          onChange={(e) => onChange("rut_receptor", e.target.value)}
        />

        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Razón social (opcional)"
          value={form.razon_social}
          onChange={(e) => onChange("razon_social", e.target.value)}
        />

        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Correo (opcional)"
          value={form.correo}
          onChange={(e) => onChange("correo", e.target.value)}
        />

        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Dirección (opcional)"
          value={form.direccion}
          onChange={(e) => onChange("direccion", e.target.value)}
        />

        <button
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear negocio"}
        </button>
      </form>
    </div>
  );
}
