// src/pages/Layout.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import logoFactorG from "../assets/factorg.png";
import { getMe } from "../services/usuariosService";

export default function Layout({ children }) {
  const [usuarioSupabase, setUsuarioSupabase] = useState(null); // usuario de supabase
  const [perfil, setPerfil] = useState(null); // datos del backend: rol, negocio, permisos
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      // 1) Sesión actual en Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user ?? null;
      setUsuarioSupabase(user);

      // 2) Si hay usuario, pedir datos al backend (/me)
      if (user) {
        try {
          const data = await getMe(); // este endpoint debe devolver { email, rol, negocio, ... }
          setPerfil(data);
        } catch (error) {
          console.error("Error cargando perfil:", error);
        }
      }
    };

    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUsuarioSupabase(null);
    setPerfil(null);
    navigate("/login");
  };

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

        {/* Menú principal */}
        <nav className="flex flex-col gap-2 px-6 py-4 flex-1 text-sm">
          <Link
            to="/"
            className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700"
          >
            Panel principal
          </Link>
          <Link
            to="/subir"
            className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700"
          >
            Subir XML
          </Link>
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

          {/* Solo SUPERADMIN ve el panel de usuarios */}
          {perfil?.rol === "SUPERADMIN" && (
            <Link
              to="/admin/usuarios"
              className="mt-4 py-2 px-3 rounded hover:bg-orange-50 text-orange-600 font-semibold border border-orange-200"
            >
              Administrar usuarios
            </Link>
          )}
        </nav>

        {/* Zona de sesión (parte inferior) */}
        <div className="px-6 py-4 border-t text-xs text-gray-600">
          {usuarioSupabase ? (
            <>
              <div className="mb-1">
                Sesión:{" "}
                <span className="font-medium">
                  {usuarioSupabase.email}
                </span>
              </div>
              {perfil?.negocio_nombre && (
                <div className="mb-2">
                  Negocio:{" "}
                  <span className="font-medium">
                    {perfil.negocio_nombre}
                  </span>
                </div>
              )}
              {perfil?.rol && (
                <div className="mb-2">
                  Rol:{" "}
                  <span className="font-semibold">{perfil.rol}</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="w-full mt-2 py-2 px-3 rounded hover:bg-gray-100 text-red-500 text-left"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
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
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
