// src/components/Layout.js
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Layout({ children, usuario, setUsuario }) {
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-60 bg-white border-r shadow-sm">
        <div className="p-6 font-bold text-xl text-gray-800">Panel XML</div>
        <nav className="flex flex-col gap-2 px-6">
          <Link to="/subir" className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700">Subir XML</Link>
          <Link to="/leerProd" className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700">Productos</Link>
          <Link to="/leerFact" className="py-2 px-3 rounded hover:bg-gray-100 text-gray-700">Facturas</Link>

          {!usuario && (
            <>
              <Link to="/login" className="py-2 px-3 rounded hover:bg-gray-100 text-blue-600">Iniciar Sesión</Link>
              <Link to="/registro" className="py-2 px-3 rounded hover:bg-gray-100 text-green-600">Registrarse</Link>
            </>
          )}

          {usuario && (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setUsuario(null);
                window.location.href = '/login';
              }}
              className="py-2 px-3 rounded hover:bg-gray-100 text-red-500 text-left"
            >
              Cerrar sesión
            </button>
          )}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
