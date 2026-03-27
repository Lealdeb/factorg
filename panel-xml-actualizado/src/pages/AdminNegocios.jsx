import { useEffect, useState } from "react";
import { crearNegocio, getNegocios } from "../services/negociosService";

const initForm = {
  nombre: "",
  rut_receptor: "",
  razon_social: "",
  correo: "",
  direccion: "",
};

export default function AdminNegocios() {
  const [form, setForm] = useState(initForm);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // {type:'ok'|'err', text:''}

  const onChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await getNegocios();
      setNegocios(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setNegocios([]);
      setMsg({ type: "err", text: "No se pudieron cargar los negocios." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const validar = () => {
    const nombre = form.nombre.trim();
    if (!nombre) return "El nombre es obligatorio.";
    if (nombre.length < 3) return "El nombre debe tener al menos 3 caracteres.";
    const correo = form.correo.trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return "Correo inválido.";
    }
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    const error = validar();
    if (error) {
      setMsg({ type: "err", text: error });
      return;
    }

    try {
      setSaving(true);

      await crearNegocio({
        nombre: form.nombre.trim(),
        rut_receptor: form.rut_receptor.trim() || null,
        razon_social: form.razon_social.trim() || null,
        correo: form.correo.trim() || null,
        direccion: form.direccion.trim() || null,
      });

      setMsg({ type: "ok", text: "✅ Negocio creado correctamente." });
      setForm(initForm);
      await cargar();
    } catch (err) {
      console.error(err);
      setMsg({
        type: "err",
        text: err?.response?.data?.detail || "Error creando negocio.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Administrar Negocios</h1>
          <p className="text-sm text-gray-600">
            Solo SUPERADMIN puede crear negocios manualmente.
          </p>
        </div>
      </div>

      {msg && (
        <div
          className={`mb-4 p-3 rounded border text-sm ${
            msg.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FORM */}
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-3">Crear nuevo negocio</h2>

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nombre *</label>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                value={form.nombre}
                onChange={(e) => onChange("nombre", e.target.value)}
                placeholder="Ej: Cosas Ricas"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">RUT receptor (opcional)</label>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                value={form.rut_receptor}
                onChange={(e) => onChange("rut_receptor", e.target.value)}
                placeholder="Ej: 12345678-9"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Razón social (opcional)</label>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                value={form.razon_social}
                onChange={(e) => onChange("razon_social", e.target.value)}
                placeholder="Ej: Cosas Ricas SpA"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Correo (opcional)</label>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                value={form.correo}
                onChange={(e) => onChange("correo", e.target.value)}
                placeholder="ejemplo@correo.cl"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Dirección (opcional)</label>
              <input
                className="border rounded-lg px-3 py-2 w-full"
                value={form.direccion}
                onChange={(e) => onChange("direccion", e.target.value)}
                placeholder="Ej: Av. Alemania 123, Valdivia"
              />
            </div>

            <button
              disabled={saving}
              className="bg-black text-white px-4 py-2 rounded-lg disabled:opacity-60"
            >
              {saving ? "Creando..." : "Crear negocio"}
            </button>
          </form>
        </div>

        {/* LISTADO */}
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Negocios</h2>
            <button
              onClick={cargar}
              className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            >
              Recargar
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">Cargando...</div>
          ) : negocios.length === 0 ? (
            <div className="text-sm text-gray-500">No hay negocios registrados.</div>
          ) : (
            <div className="overflow-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">RUT</th>
                    <th className="px-3 py-2 text-left">Correo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {negocios.map((n) => (
                    <tr key={n.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="font-medium">{n.nombre}</div>
                        <div className="text-[11px] text-gray-500">ID: {n.id}</div>
                      </td>
                      <td className="px-3 py-2">{n.rut_receptor || "—"}</td>
                      <td className="px-3 py-2">{n.correo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
