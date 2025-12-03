// src/services/api.js
import axios from "axios";
import API_BASE_URL from "../config";
import { supabase } from "../supabaseClient";

const API = axios.create({
  baseURL: "https://factorg.onrender.com",
  baseURL: API_BASE_URL || "http://localhost:8000",
});

// Helper: arma headers con el correo del usuario logueado
async function getAuthHeaders(extraHeaders = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let session = null;

  try {
    const response = await supabase.auth.getSession();
    session = response?.data?.session ?? null;
  } catch (error) {
    console.error("No se pudo obtener la sesión de Supabase", error);
  }

  const email = session?.user?.email ?? null;
  const name =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "";

  return {
    ...(extraHeaders || {}),
    ...(email ? { "X-User-Email": email, "X-User-Name": name } : {}),
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

// ---------- Helpers específicos ----------
export async function uploadXML(formData) {
  const headers = await getAuthHeaders({
    "Content-Type": "multipart/form-data",
  });
  return API.post("/subir-xml/", formData, { headers });
}

export async function getProductos(params = {}) {
  const { data } = await apiGet("/productos", { params });
  return data;
}

export { API };
export default API;
