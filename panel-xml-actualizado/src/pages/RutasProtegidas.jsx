// src/components/RutasProtegidas.jsx
import { Navigate } from "react-router-dom";

export default function RutasProtegidas({ usuario, children }) {
  // si aún no sabemos si hay usuario, puedes mostrar un loading
  if (usuario === undefined) {
    return <div>Cargando...</div>;
  }

  // si NO hay usuario → login
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // si hay usuario → renderiza las rutas hijas
  return children;
}
