// src/components/RutasProtegidas.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function RutasProtegidas({ children }) {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUsuario(session?.user ?? null);
      setCargando(false);
    };

    obtenerUsuario();
  }, []);

  if (cargando) return <div>Cargando...</div>;

  return usuario ? children : <Navigate to="/login" replace />;
}
