// src/services/api.js
import axios from "axios";
import { supabase } from "../supabaseClient";

const API = axios.create({
  baseURL: "https://factorg.onrender.com", // tu backend en Render
});

// Helper que construye los headers con el correo del usuario logueado
async function getAuthHeaders(extraHeaders = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const email = session?.user?.email ?? null;

  return {
    ...(extraHeaders || {}),
    ...(email ? { "X-User-Email": email } : {}), // 👉 header que usa el backend
  };
}

// ---------- Helpers genéricos ----------

export async function apiGet(url, config = {}) {
  const headers = await getAuthHeaders(config.headers);
  return API.get(url, { ...config, headers });
}

export async function apiPost(url, data, config = {}) {
  const headers = await getAuthHeaders(config.headers);
  return API.post(url, data, { ...config, headers });
}

export async function apiPut(url, data, config = {}) {
  const headers = await getAuthHeaders(config.headers);
  return API.put(url, data, { ...config, headers });
}

export async function apiDelete(url, config = {}) {
  const headers = await getAuthHeaders(config.headers);
  return API.delete(url, { ...config, headers });
}

// ---------- Helpers específicos de tu app ----------

// Subir XML (mantiene tu comportamiento antiguo)
export async function uploadXML(formData) {
  const headers = await getAuthHeaders({
    "Content-Type": "multipart/form-data",
  });

  return API.post("/subir-xml/", formData, { headers });
}

// Ejemplo de helper para productos (si lo quieres usar)
export async function getProductos(params = {}) {
  const { data } = await apiGet("/productos", { params });
  return data;
}

export { API };
export default API;
