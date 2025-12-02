// src/pages/Layout.jsx  (o src/components/Layout.jsx, según tu estructura)
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import logoFactorG from "../assets/factorg.png";
import { getMe } from "../services/usuariosService";

export default function Layout({ children, usuario, setUsuario }) {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  // Trae los datos del usuario (rol, permisos) desde el backend
  useEffect(() => {
    const fetchUser = async () => {
      if (!usuario) {
        setUserData(null);
        return;
      }
      try {
        const data = await getMe();
        setUserData(data);
      } catch (err) {
        console.error("Error obteniendo /auth/me", err);
      }
    };
    fetchUser();
  }, [usuario]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setUserData(null);
    navigate("/login");
  };

  const rol = userData?.rol;

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-60 bg-white border-r shadow-sm flex flex-col">
        {/* Logo */}
        <div className="p-4 flex justify-center items-center border-b">
          <Link to="/">
            <img
              src={logoFactorG}
              alt="FactorG Logo"
              className="h-12 object-contain hover:scale-105 transition-transform duration-200"
            />
          </Link>
        </div>

        {/* Navegación */}
        <nav className="flex flex-col gap-2 px-6 py-4 flex-1 text-sm">
          <Link
            to="/"
            className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700"
          >
            Panel principal
          </Link>

          {/* Permisos por usuario (si aún no los usas, se mostrarán igual si son true/undefined) */}
          {userData?.puede_subir_xml !== false && (
            <Link
              to="/subir"
              className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700"
            >
              Subir XML
            </Link>
          )}

          {userData?.puede_ver_tablas !== false && (
            <>
              <Link
                to="/leerProd"
                className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700"
              >
                Productos
              </Link>
              <Link
                to="/leerFact"
                className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700"
              >
                Facturas
              </Link>
            </>
          )}

          {/* Solo SUPERADMIN ve el panel de usuarios */}
          {rol === "SUPERADMIN" && (
            <Link
              to="/admin/usuarios"
              className="py-2 px-3 rounded hover:bg-gray-100 text-purple-600 font-medium"
            >
              Usuarios
            </Link>
          )}
        </nav>

        {/* Zona inferior: login / logout */}
        <div className="px-6 py-4 border-t">
          {!usuario ? (
            <div className="flex flex-col gap-2">
              <Link
                to="/login"
                className="py-2 px-3 rounded border text-center text-blue-600 hover:bg-blue-50"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/registro"
                className="py-2 px-3 rounded border text-center text-green-600 hover:bg-green-50"
              >
                Registrarse
              </Link>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full py-2 px-3 rounded hover:bg-gray-100 text-red-500 text-left"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
