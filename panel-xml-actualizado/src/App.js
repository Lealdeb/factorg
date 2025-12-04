// src/App.js
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import UploadXML from "./pages/UploadXML";
import Productos from "./pages/Productos";
import Facturas from "./pages/Facturas";
import FacturaDetalle from "./pages/FacturaDetalle";
import EditarProductos from "./pages/EditarProductos";
import DashboardInicio from "./pages/DashboardInicio";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import RutasProtegidas from "./pages/RutasProtegidas";
import Layout from "./pages/Layout";
import AdminUsuarios from "./pages/AdminUsuarios";
import { supabase } from "./supabaseClient";


export default function App() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const obtenerSesion = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        {/* RUTAS PÚBLICAS: si hay usuario -> redirige al dashboard */}
        <Route
          path="/login"
          element={
            usuario ? <Navigate to="/" replace /> : <Login setUsuario={setUsuario} />
          }
        />
        <Route
          path="/registro"
          element={
            usuario ? <Navigate to="/" replace /> : <Registro setUsuario={setUsuario} />
          }
        />

        {/* RUTAS PROTEGIDAS DENTRO DEL LAYOUT */}
        <Route
          path="/*"
          element={
            <RutasProtegidas usuario={usuario}>
              <Layout usuario={usuario} setUsuario={setUsuario}>
                <Routes>
                  <Route path="/" element={<DashboardInicio />} />
                  <Route path="/subir" element={<UploadXML />} />
                  <Route path="/leerProd" element={<Productos />} />
                  <Route path="/leerFact" element={<Facturas />} />
                  <Route path="/facturas/:id" element={<FacturaDetalle />} />
                  <Route path="/productos/:id" element={<EditarProductos />} />
                  <Route path="/admin/usuarios" element={<AdminUsuarios />} />
                  <Route path="/perfil" element={<Perfil />} />

                </Routes>
              </Layout>
            </RutasProtegidas>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
