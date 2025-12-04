// src/services/usuariosService.js
import { apiGet, apiPut } from "./api";

export async function getMe() {
  const { data } = await apiGet("/auth/me");
  return data;
}

export async function getUsuarios() {
  const { data } = await apiGet("/usuarios");
  return data;
}

export async function updateUsuario(id, payload) {
  const { data } = await apiPut(`/usuarios/${id}`, payload);
  return data;
}

// ✅ Asignar negocio a usuario (SUPERADMIN)
// Requiere endpoint: PUT /usuarios/{id}/asignar-negocio
export async function asignarNegocioAUsuario(usuarioId, negocioId) {
  const { data } = await apiPut(`/usuarios/${usuarioId}/asignar-negocio`, {
    negocio_id: negocioId ?? null,
  });
  return data;
}

// -------- Negocios (select usuario) --------

// ✅ Lista de negocios para select (cualquier usuario logueado)
// Requiere endpoint: GET /negocios/select
export async function getNegociosSelect() {
  const { data } = await apiGet("/negocios/select");
  return data;
}

// ✅ Usuario elige su negocio (solo si aún no tiene)
// Requiere endpoint: PUT /me/negocio
export async function setMiNegocio(negocioId) {
  const { data } = await apiPut("/me/negocio", { negocio_id: negocioId });
  return data;
}

// ✅ Crear negocio (solo SUPERADMIN)
// Requiere endpoint: POST /negocios/manual
export async function crearNegocio(payload) {
  const { data } = await apiPost("/negocios/manual", payload);
  return data;
}