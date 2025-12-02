// src/services/usuariosService.js
import { apiGet, apiPut } from "./api";

// Perfil del usuario actual (rol/negocio/etc.)
export async function getMe() {
  const { data } = await apiGet("/auth/me"); // ✅ endpoint real de tu backend
  return data;
}

// Lista de usuarios (solo SUPERADMIN)
export async function getUsuarios() {
  const { data } = await apiGet("/usuarios");
  return data;
}

// Actualizar rol/permisos
export async function updateUsuario(id, payload) {
  const { data } = await apiPut(`/usuarios/${id}`, payload);
  return data;
}
