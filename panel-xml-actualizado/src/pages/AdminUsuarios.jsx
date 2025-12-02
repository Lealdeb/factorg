// src/pages/AdminUsuarios.jsx
import { useEffect, useState } from "react";
import { getUsuarios, updateUsuario } from "../services/usuariosService";

const ROLES = ["SUPERADMIN", "ADMIN", "USUARIO"];

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargarUsuarios = async () => {
    try {
      setError(null);
      setCargando(true);
      const data = await getUsuarios();
      setUsuarios(data);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleChangeCampo = async (id, campo, valor) => {
    try {
      await updateUsuario(id, { [campo]: valor });
      await cargarUsuarios();
    } catch (err) {
      console.error(err);
      alert("Error actualizando usuario");
    }
  };

  if (cargando) {
    return <div>Cargando usuarios...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Administración de Usuarios</h1>
      <p className="text-sm text-gray-600 mb-6">
        Aquí puedes asignar roles, permisos y activar/desactivar cuentas.
      </p>

      <div className="overflow-x-auto bg-white rounded-lg shadow-sm border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Negocio</th>
              <th className="px-4 py-2 text-left">Rol</th>
              <th className="px-4 py-2 text-center">Dashboard</th>
              <th className="px-4 py-2 text-center">Subir XML</th>
              <th className="px-4 py-2 text-center">Ver tablas</th>
              <th className="px-4 py-2 text-center">Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.nombre || "—"}</td>
                <td className="px-4 py-2">
                  {u.negocio?.nombre || `ID: ${u.negocio_id ?? "—"}`}
                </td>

                <td className="px-4 py-2">
                  <select
                    value={u.rol}
                    onChange={(e) =>
                      handleChangeCampo(u.id, "rol", e.target.value)
                    }
                    className="border rounded px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="px-4 py-2 text-center">
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

                <td className="px-4 py-2 text-center">
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

                <td className="px-4 py-2 text-center">
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

                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={u.activo}
                    onChange={(e) =>
                      handleChangeCampo(u.id, "activo", e.target.checked)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
