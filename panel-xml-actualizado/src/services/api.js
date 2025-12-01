import axios from "axios";
// si tienes config.js podrías hacer:
// import API_BASE_URL from "../config";

const API = axios.create({
  baseURL: "https://factorg.onrender.com", 
  // baseURL: API_BASE_URL,  // si prefieres usar config.js
});

// 🔐 Interceptor: agrega el token en cada request si existe
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// =========================
//  ENDPOINTS EXISTENTES
// =========================

export const uploadXML = (formData) =>
  API.post("/subir-xml/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getProductos = (params = {}) =>
  API.get("/productos", { params });


// =========================
//  NUEVOS ENDPOINTS AUTH
// =========================

// 🔑 LOGIN (usa OAuth2PasswordRequestForm en el backend)
export const login = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append("username", email);   // el backend espera "username"
  formData.append("password", password);

  const res = await API.post("/auth/login", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const token = res.data.access_token;
  if (token) {
    localStorage.setItem("token", token);
  }
  return res.data;
};

// 📝 REGISTER
export const register = async ({ email, username, password, negocio_id }) => {
  const payload = { email, username, password, negocio_id };
  return API.post("/auth/register", payload);
};

// 🏪 Obtener negocios para el combo del register
export const getNegocios = () => API.get("/negocios");

// 👤 Datos del usuario logueado
export const getMe = () => API.get("/auth/me");


// opcional: export por defecto del cliente por si quieres usarlo directo
export default API;
