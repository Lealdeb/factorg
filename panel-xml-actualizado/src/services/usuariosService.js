// src/services/usuariosService.js
import { apiGet, apiPut } from "./api";

export async function getMe() {
  const { data } = await apiGet("/auth/me"); // ✅ Bearer token automático
  return data;
}
