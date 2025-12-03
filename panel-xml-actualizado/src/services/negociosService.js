// src/services/negociosService.js
import { apiGet } from "./api";
export async function getNegocios() {
  const { data } = await apiGet("/negocios");
  return data;
}
