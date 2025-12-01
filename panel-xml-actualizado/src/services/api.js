// src/services/api.js
import axios from "axios";
import { supabase } from "../supabaseClient";

const API = axios.create({
  baseURL: "https://factorg.onrender.com", // tu backend FastAPI en Render
});

// Helper: obtiene usuario actual de Supabase y devuelve headers
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

// Exportamos helpers genéricos para GET/POST/PUT con auth
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

// Para cosas públicas (si quisieras)
export { API };
