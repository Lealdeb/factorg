// src/services/negociosService.js
import { apiGet, apiPost } from "./api";

export async function getNegocios() {
  const { data } = await apiGet("/negocios"); // en backend ya filtra según rol
  return data;
}

export async function crearNegocio(payload) {
  // SUPERADMIN
  const { data } = await apiPost("/negocios/manual", payload);
  return data;
}
