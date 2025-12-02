// src/components/Layout.js
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import logoFactorG from "../assets/factorg.png";
import { getMe } from "../services/usuariosService";

export default function Layout({ children, usuario, setUsuario }) {
  const [userData, setUserData] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      // Si no hay sesión en Supabase, no intentamos llamar /auth/me
      if (!usuario) {
        setUserData(null);
        setCargando(false);
        return;
      }

      try {
        const data = await getMe();
        setUserData(data);
      } catch (err) {
        console.error("Error obteniendo /auth/me:", err);
      } finally {
        setCargando(false);
      }
    };

    fetchUserData();
  }, [usuario]);

  if (cargando) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-600">
        Cargando panel...
      </div>
    );
  }

  // Si no hay usuario autenticado, mostramos layout mínimo
  if (!usuario) {
    return (
      <div className="flex h-screen bg-gray-50 font-sans">
        <aside className="w-60 bg-white border-r shadow-sm">
          <div className="p-4 flex justify-center items-center">
            <Link to="/">
              <img
                src={logoFactorG}
                alt="FactorG Logo"
                className="h-12 object-contain hover:scale-105 transition-transform duration-200"
              />
            </Link>
          </div>

          <nav className="flex flex-col gap-2 px-6">
            <Link
              to="/login"
              className="py-2 px-3 rounded hover:bg-gray-100 text-blue-600"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/registro"
              className="py-2 px-3 rounded hover:bg-gray-100 text-green-600"
            >
              Registrarse
            </Link>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    );
  }

  // Si hay usuario, usamos lo que viene de /auth/me
  const rol = userData?.rol ?? "USUARIO";
  const puedeSubirXML = userData?.puede_subir_xml ?? false;
  const puedeVerTablas = userData?.puede_ver_tablas ?? false;
  const puedeVerDashboard = userData?.puede_ver_dashboard ?? true;

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-60 bg-white border-r shadow-sm flex flex-col">
        <div className="p-4 flex justify-center items-center">
          <Link to="/">
            <img
              src={logoFactorG}
              alt="FactorG Logo"
              className="h-12 object-contain hover:scale-105 transition-transform duration-200"
            />
          </Link>
        </div>

        <nav className="flex flex-col gap-2 px-6 flex-1">
          {/* Dashboard visible si tiene permiso */}
          {puedeVerDashboard && (
            <Link
              to="/"
              className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700"
            >
              Dashboard
            </Link>
          )}

          {/* Subir XML solo si tiene permiso */}
          {puedeSubirXML && (
            <Link
              to="/subir"
              className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700"
            >
              Subir XML
            </Link>
          )}

          {/* Ver tablas solo si tiene permiso */}
          {puedeVerTablas && (
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

          {/* Panel de usuarios solo para SUPERADMIN */}
          {rol === "SUPERADMIN" && (
            <Link
              to="/admin/usuarios"
              className="py-2 px-3 rounded hover:bg-gray-100 text-purple-700 font-medium"
            >
              Admin Usuarios
            </Link>
          )}
        </nav>

        <div className="px-6 pb-4">
          <div className="text-xs text-gray-400 mb-1">
            {userData?.email} · {rol}
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setUsuario(null);
              window.location.href = "/login";
            }}
            className="w-full py-2 px-3 rounded hover:bg-gray-100 text-red-500 text-left text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 bg-gray-50">{children}</main>
    </div>
  );
}
