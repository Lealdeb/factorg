// src/pages/Perfil.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { apiGet, apiPut } from "../services/api";

export default function Perfil() {
  const [me, setMe] = useState(null);

  const [negocios, setNegocios] = useState([]);
  const [negocioId, setNegocioId] = useState("");

  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    try {
      const [meRes, negRes] = await Promise.all([
        apiGet("/auth/me"),
        apiGet("/negocios/select"),
      ]);
      setMe(meRes.data);
      setNegocios(negRes.data || []);
      setNegocioId(meRes.data?.negocio_id ?? "");
    } catch (e) {
      console.error(e);
      setMsg("No se pudo cargar tu perfil.");
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const cambiarPassword = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!pass1 || pass1.length < 6) return setMsg("La contraseña debe tener al menos 6 caracteres.");
    if (pass1 !== pass2) return setMsg("Las contraseñas no coinciden.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pass1 });
      if (error) throw error;

      setPass1("");
      setPass2("");
      setMsg("✅ Contraseña actualizada.");
    } catch (err) {
      console.error(err);
      setMsg(err?.message || "Error actualizando contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const elegirNegocio = async () => {
    setMsg("");
    if (!negocioId) return setMsg("Selecciona un negocio.");

    setLoading(true);
    try {
      const res = await apiPut("/me/negocio", { negocio_id: Number(negocioId) });
      setMsg(`✅ Negocio asignado: ${res.data?.negocio_nombre || ""}`);
      await cargar(); // refresca /auth/me
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.detail || "Error asignando negocio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Mi Perfil</h1>

      {msg && (
        <div className="p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
          {msg}
        </div>
      )}

      {/* Info */}
      <div className="bg-white border rounded-lg p-4">
        <div className="text-sm text-gray-600">Email</div>
        <div className="font-semibold">{me?.email || "—"}</div>

        <div className="mt-3 text-sm text-gray-600">Negocio actual</div>
        <div className="font-semibold">{me?.negocio_nombre || "Sin asignar"}</div>
      </div>

      {/* Elegir negocio */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Elegir negocio</h2>

        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Negocio</label>
            <select
              className="border rounded px-3 py-2 min-w-[260px]"
              value={negocioId ?? ""}
              onChange={(e) => setNegocioId(e.target.value)}
              disabled={!!me?.negocio_id} // 🔒 si ya tiene uno, lo bloquea
            >
              <option value="">(Selecciona)</option>
              {negocios.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre}
                </option>
              ))}
            </select>

            {me?.negocio_id ? (
              <span className="text-xs text-gray-500 mt-1">
                Tu negocio ya está asignado. Para cambiarlo, pide al SUPERADMIN.
              </span>
            ) : null}
          </div>

          <button
            onClick={elegirNegocio}
            disabled={loading || !!me?.negocio_id}
            className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Guardar negocio
          </button>
        </div>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Cambiar contraseña</h2>

        <form onSubmit={cambiarPassword} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Nueva contraseña</label>
            <input
              type="password"
              className="border rounded px-3 py-2"
              value={pass1}
              onChange={(e) => setPass1(e.target.value)}
              placeholder="mínimo 6 caracteres"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1">Repetir contraseña</label>
            <input
              type="password"
              className="border rounded px-3 py-2"
              value={pass2}
              onChange={(e) => setPass2(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Guardar nueva contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
