import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';

import UploadXML from './pages/UploadXML';
import Productos from './pages/Productos';
import Facturas from './pages/Facturas';
import FacturaDetalle from './pages/FacturaDetalle';
import EditarProductos from './pages/EditarProductos';
import DashboardInicio from './pages/DashboardInicio';
import Login from './pages/Login';
import Registro from './pages/Registro';
import RutasProtegidas from './pages/RutasProtegidas';
import Layout from './pages/Layout';
import { supabase } from './supabaseClient';

export default function App() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const obtenerSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUsuario(session?.user ?? null);

      supabase.auth.onAuthStateChange((_event, session) => {
        setUsuario(session?.user ?? null);
      });
    };

    obtenerSesion();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />

        {/* Rutas protegidas dentro del layout */}
        <Route
          path="/*"
          element={
            <RutasProtegidas>
              <Layout usuario={usuario} setUsuario={setUsuario}>
                <Routes>
                  <Route path="/" element={<DashboardInicio />} />
                  <Route path="/subir" element={<UploadXML />} />
                  <Route path="/leerProd" element={<Productos />} />
                  <Route path="/leerFact" element={<Facturas />} />
                  <Route path="/facturas/:id" element={<FacturaDetalle />} />
                  <Route path="/productos/:id" element={<EditarProductos />} />
                </Routes>
              </Layout>
            </RutasProtegidas>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
