// src/pages/Layout.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import logoFactorG from "../assets/factorg.png";
import { getMe } from "../services/usuariosService";

export default function Layout({ children }) {
  const [usuarioSupabase, setUsuarioSupabase] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [perfilError, setPerfilError] = useState(null);
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const cargarPerfil = async () => {
    try {
      setPerfilError(null);
      setLoadingPerfil(true);
      const data = await getMe(); // ✅ viene con Bearer token (api.js)
      setPerfil(data);
    } catch (err) {
      console.error("Error cargando perfil:", err);
      setPerfil(null);
      setPerfilError(err?.response?.data?.detail || err?.message || "Error cargando perfil");
    } finally {
      setLoadingPerfil(false);
    }
  };

  useEffect(() => {
    // 1) Estado inicial
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setUsuarioSupabase(user);

      if (!user) {
        setPerfil(null);
        setLoadingPerfil(false);
        if (location.pathname !== "/login") navigate("/login");
        return;
      }

      await cargarPerfil();
    };

    init();

    // 2) Reactivo a cambios (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setUsuarioSupabase(user);

      if (!user) {
        setPerfil(null);
        setPerfilError(null);
        setLoadingPerfil(false);
        navigate("/login");
        return;
      }

      await cargarPerfil();
    });

    return () => sub?.subscription?.unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      // Limpieza inmediata UI (por si el listener no alcanza a correr)
      setUsuarioSupabase(null);
      setPerfil(null);
      setPerfilError(null);
      setLoadingPerfil(false);

      const { error } = await supabase.auth.signOut(); // o { scope: "local" }
      if (error) console.error("❌ signOut error:", error);
    } catch (e) {
      console.error("❌ signOut throw:", e);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const esSuperadmin = (perfil?.rol || "").toUpperCase() === "SUPERADMIN";

  // helper permisos
  const can = useMemo(() => {
    return (flag) => esSuperadmin || Boolean(perfil?.[flag]);
  }, [perfil, esSuperadmin]);

  // Si está logueado pero aún cargando perfil, puedes mostrar “cargando”
  const bloqueado = usuarioSupabase && loadingPerfil;

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

        {/* ✅ NAV */}
        <nav className="flex flex-col gap-2 px-6 py-4 flex-1 text-sm">
          <Link
            to="/"
            className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700"
          >
            Panel principal
          </Link>

          {/* ✅ PERFIL: para todos los usuarios logeados */}
          <Link
            to="/perfil"
            className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700"
          >
            Mi perfil
          </Link>

          {can("puede_subir_xml") && (
            <Link
              to="/subir"
              className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700"
            >
              Subir XML
            </Link>
          )}

          {can("puede_ver_tablas") && (
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

          {/* ✅ SUPERADMIN: NEGOCIOS + USUARIOS */}
          {esSuperadmin && (
            <>
              <div className="mt-4 text-xs uppercase tracking-wide text-gray-400">
                Admin
              </div>

              <Link
                to="/admin/negocios"
                className="py-2 px-3 rounded hover:bg-orange-50 text-orange-600 font-semibold border border-orange-200"
              >
                Crear negocio
              </Link>

              <Link
                to="/admin/negocios"
                className="py-2 px-3 rounded hover:bg-orange-50 text-orange-600 font-semibold border border-orange-200"
              >
                Administrar negocios
              </Link>
            </>
          )}
        </nav>


        <div className="px-6 py-4 border-t text-xs text-gray-600">
          {usuarioSupabase ? (
            <>
              <div className="mb-1">
                Sesión: <span className="font-medium">{usuarioSupabase.email}</span>
              </div>

              {bloqueado && (
                <div className="mb-2 text-gray-500">Cargando perfil…</div>
              )}

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
