// src/pages/AdminUsuarios.jsx
import { useEffect, useState } from "react";
import { getMe, getUsuarios, updateUsuario } from "../services/usuariosService";
import { getNegocios } from "../services/negociosService";

export default function AdminUsuarios() {
  const [me, setMe] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        setError("");

        const [meData, usuariosData, negociosData] = await Promise.all([
          getMe(),
          getUsuarios(),
          getNegocios(),
        ]);

        setMe(meData);
        setUsuarios(usuariosData);
        setNegocios(negociosData);
      } catch (err) {
        console.error(err);
        setError("Error cargando usuarios o negocios.");
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  const handleChangeCampo = (id, campo, valor) => {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [campo]: valor } : u))
    );
  };

  const handleGuardar = async (usuario) => {
    try {
      setGuardandoId(usuario.id);
      setError("");

      const payload = {
        rol: usuario.rol,
        puede_ver_dashboard: usuario.puede_ver_dashboard,
        puede_subir_xml: usuario.puede_subir_xml,
        puede_ver_tablas: usuario.puede_ver_tablas,
        activo: usuario.activo,
        negocio_id: usuario.negocio_id,
      };

      await updateUsuario(usuario.id, payload);
    } catch (err) {
      console.error(err);
      setError("Error guardando cambios. Revisa la consola.");
    } finally {
      setGuardandoId(null);
    }
  };

  if (cargando) return <div className="p-6">Cargando usuarios...</div>;

  if (me && me.rol !== "SUPERADMIN") {
    return (
      <div className="p-6 text-center text-red-600">
        No tienes permisos para administrar usuarios.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Administración de Usuarios</h1>

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-600 mb-4">
        Aquí el SUPERADMIN puede asignar roles, permisos y negocio asociado a
        cada usuario del sistema.
      </p>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Usuario</th>
              <th className="px-3 py-2 text-left">Negocio</th>
              <th className="px-3 py-2 text-left">Rol</th>
              <th className="px-3 py-2 text-center">Dashboard</th>
              <th className="px-3 py-2 text-center">Subir XML</th>
              <th className="px-3 py-2 text-center">Ver Tablas</th>
              <th className="px-3 py-2 text-center">Activo</th>
              <th className="px-3 py-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr
                key={u.id}
                className="border-t hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-2">{u.id}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.username || "-"}</td>

                {/* Negocio */}
                <td className="px-3 py-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={u.negocio_id || ""}
                    onChange={(e) =>
                      handleChangeCampo(
                        u.id,
                        "negocio_id",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  >
                    <option value="">Sin negocio</option>
                    {negocios.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.nombre}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Rol */}
                <td className="px-3 py-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={u.rol || "USUARIO"}
                    onChange={(e) =>
                      handleChangeCampo(u.id, "rol", e.target.value)
                    }
                  >
                    <option value="USUARIO">USUARIO</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPERADMIN">SUPERADMIN</option>
                  </select>
                </td>

                {/* Switches simples: sí/no */}
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={u.puede_ver_dashboard}
                    onChange={(e) =>
                      handleChangeCampo(
                        u.id,
                        "puede_ver_dashboard",
                        e.target.checked
                      )
                    }
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={u.puede_subir_xml}
                    onChange={(e) =>
                      handleChangeCampo(
                        u.id,
                        "puede_subir_xml",
                        e.target.checked
                      )
                    }
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={u.puede_ver_tablas}
                    onChange={(e) =>
                      handleChangeCampo(
                        u.id,
                        "puede_ver_tablas",
                        e.target.checked
                      )
                    }
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={u.activo}
                    onChange={(e) =>
                      handleChangeCampo(u.id, "activo", e.target.checked)
                    }
                  />
                </td>

                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => handleGuardar(u)}
                    disabled={guardandoId === u.id}
                    className="px-3 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {guardandoId === u.id ? "Guardando..." : "Guardar"}
                  </button>
                </td>
              </tr>
            ))}

            {usuarios.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-4 text-center text-gray-500"
                >
                  No hay usuarios registrados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
