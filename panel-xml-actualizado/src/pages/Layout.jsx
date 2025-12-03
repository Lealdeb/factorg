// src/pages/Layout.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import logoFactorG from "../assets/factorg.png";
import { getMe } from "../services/usuariosService";

export default function Layout({ children }) {
  const [usuarioSupabase, setUsuarioSupabase] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [perfilError, setPerfilError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setUsuarioSupabase(user);

      if (user) {
        try {
          setPerfilError(null);
          const data = await getMe(); // => /auth/me con headers
          setPerfil(data);
        } catch (err) {
          console.error("Error cargando perfil:", err);
          setPerfil(null);
          setPerfilError(err?.message || "Error cargando perfil");
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

  const esSuperadmin = perfil?.rol === "SUPERADMIN";

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-60 bg-white border-r shadow-sm flex flex-col">
        <div className="p-4 flex justify-center items-center border-b">
          <Link to="/">
            <img
              src={logoFactorG}
              alt="FactorG Logo"
              className="h-12 object-contain hover:scale-105 transition-transform duration-200"
            />
          </Link>
        </div>

        <nav className="flex flex-col gap-2 px-6 py-4 flex-1 text-sm">
          <Link to="/" className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700">
            Panel principal
          </Link>
          <Link to="/subir" className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700">
            Subir XML
          </Link>
          <Link to="/leerProd" className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700">
            Productos
          </Link>
          <Link to="/leerFact" className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700">
            Facturas
          </Link>

          {esSuperadmin && (
            <Link
              to="/admin/usuarios"
              className="mt-4 py-2 px-3 rounded hover:bg-orange-50 text-orange-600 font-semibold border border-orange-200"
            >
              Administrar usuarios
            </Link>
          )}
        </nav>

        <div className="px-6 py-4 border-t text-xs text-gray-600">
          {usuarioSupabase ? (
            <>
              <div className="mb-1">
                Sesión: <span className="font-medium">{usuarioSupabase.email}</span>
              </div>

              {perfilError && (
                <div className="mb-2 text-red-600">
                  Perfil: error ({perfilError})
                </div>
              )}

              {perfil?.negocio_nombre && (
                <div className="mb-2">
                  Negocio: <span className="font-medium">{perfil.negocio_nombre}</span>
                </div>
              )}

              {perfil?.rol && (
                <div className="mb-2">
                  Rol: <span className="font-semibold">{perfil.rol}</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="w-full mt-2 py-2 px-3 rounded hover:bg-gray-100 text-red-500 text-left"
              >
                Cerrar sesión
              </button>
            </>
          ) : null}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
