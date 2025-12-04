// src/services/api.js
import axios from "axios";
import API_BASE_URL from "../config";
import { supabase } from "../supabaseClient";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// ✅ Agrega Authorization: Bearer <access_token> automáticamente
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err?.response?.status === 401) {
      await supabase.auth.signOut();
      // opcional: window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);


export const apiGet = (url, config) => api.get(url, config);
export const apiPost = (url, body, config) => api.post(url, body, config);
export const apiPut = (url, body, config) => api.put(url, body, config);
export const apiDelete = (url, config) => api.delete(url, config);

export async function uploadXML(file) {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/subir-xml/", formData); // ✅ sin headers
  return data;
}