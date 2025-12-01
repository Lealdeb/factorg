// src/services/usuariosService.js
import { apiGet, apiPut } from "./api";

export async function getMe() {
  const { data } = await apiGet("/auth/me");
  return data; // info del usuario + permisos
}

export async function getUsuarios() {
  const { data } = await apiGet("/usuarios");
  return data; // lista de usuarios
}

export async function updateUsuario(usuarioId, payload) {
  const { data } = await apiPut(`/usuarios/${usuarioId}`, payload);
  return data;
}
