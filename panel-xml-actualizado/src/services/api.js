// src/services/api.js
import axios from "axios";
import { supabase } from "../supabaseClient";

const API_BASE_URL =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "http://localhost:10000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  let session = null;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (!error) session = data?.session ?? null;
  } catch (e) {
    session = null;
  }

  // headers supabase -> tu backend
  const email = session?.user?.email;
  const name =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email;

  config.headers = config.headers || {};
  if (email) config.headers["X-User-Email"] = email;
  if (name) config.headers["X-User-Name"] = name;

  return config;
});

export const apiGet = (url, config) => api.get(url, config);
export const apiPost = (url, data, config) => api.post(url, data, config);
export const apiPut = (url, data, config) => api.put(url, data, config);
export const apiDelete = (url, config) => api.delete(url, config);
