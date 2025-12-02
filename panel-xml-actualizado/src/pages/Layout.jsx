// src/pages/Layout.jsx  (o src/components/Layout.jsx, según lo tengas)
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import logoFactorG from "../assets/factorg.png";

export default function Layout({ children }) {
  const [usuario, setUsuario] = useState(null);
  const navigate = useNavigate();

  // Cargar sesión actual al montar el layout
  useEffect(() => {
    const cargarSesion = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUsuario(session?.user ?? null);
    };
    cargarSesion();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
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
        </nav>

        {/* Zona de sesión (abajo) */}
        <div className="px-6 py-4 border-t text-sm">
          {usuario ? (
            <>
              <div className="mb-2 text-xs text-gray-500 break-all">
                Sesión: <span className="font-medium">{usuario.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-2 px-3 rounded hover:bg-gray-100 text-red-500 text-left"
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
