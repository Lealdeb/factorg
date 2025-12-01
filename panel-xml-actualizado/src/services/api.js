// src/services/api.js
import axios from "axios";
import { supabase } from "../supabaseClient";

const API = axios.create({
  baseURL: "https://factorg.onrender.com", // tu backend FastAPI en Render
});

// 👉 esto ya lo tenías
async function getAuthHeaders(extra = {}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ...extra };

  const email = user.email;
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    email;

  return {
    "X-User-Email": email,
    "X-User-Name": name,
    ...extra,
  };
}

export async function apiGet(url, config = {}) {
  const headers = await getAuthHeaders(config.headers || {});
  return API.get(url, { ...config, headers });
}

export async function apiPost(url, data, config = {}) {
  const headers = await getAuthHeaders(config.headers || {});
  return API.post(url, data, { ...config, headers });
}

export async function apiPut(url, data, config = {}) {
  const headers = await getAuthHeaders(config.headers || {});
  return API.put(url, data, { ...config, headers });
}

export async function apiDelete(url, config = {}) {
  const headers = await getAuthHeaders(config.headers || {});
  return API.delete(url, { ...config, headers });
}

export { API };


// 👇👇 **AÑADE ESTO AL FINAL** 👇👇

// Helper específico para subir XML (mantiene tu API vieja)
export async function uploadXML(formData) {
  const headers = await getAuthHeaders({
    "Content-Type": "multipart/form-data",
  });

  // /subir-xml/ es tu endpoint FastAPI
  return API.post("/subir-xml/", formData, { headers });
}

// (opcional) si quieres tener también esto:
export async function getProductos(params = {}) {
  const { data } = await apiGet("/productos", { params });
  return data;
}
