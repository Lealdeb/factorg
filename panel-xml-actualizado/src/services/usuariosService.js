// src/services/usuariosService.js
import { apiGet, apiPut } from "./api";

// Info del usuario actual (la que usa Layout)
export async function getMe() {
  const { data } = await apiGet("/auth/me");
  return data;
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