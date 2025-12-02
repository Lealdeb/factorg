// src/services/usuariosService.js
import { apiGet, apiPut } from "./api";

// Info del usuario actual (la que usa Layout)
export async function getMe() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const email = session?.user?.email;
  if (!email) throw new Error("No hay sesión de Supabase");

  const { data } = await API.get("/usuarios/me", {
    headers: {
      "X-User-Email": email, // el backend usa esto para buscar en tabla usuarios
    },
  });

  return data; // { email, rol, negocio_nombre, ... }
}
// Lista de usuarios (solo SUPERADMIN)
export async function getUsuarios() {
  const { data } = await apiGet("/usuarios");
  return data;
}

// Actualizar rol/permisos de un usuario
export async function updateUsuario(id, payload) {
  const { data } = await apiPut(`/usuarios/${id}`, payload);
  return data;
}