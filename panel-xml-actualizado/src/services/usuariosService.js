// src/services/usuariosService.js
import { apiGet, apiPut } from "./api";

export async function getMe() {
  const { data } = await apiGet("/auth/me");
  return data; // debe traer { email, rol, negocio_id, negocio_nombre, ... }
}

export async function getUsuarios() {
  const { data } = await apiGet("/usuarios");
  return data;
}

export async function updateUsuario(id, payload) {
  const { data } = await apiPut(`/usuarios/${id}`, payload);
  return data;
}
