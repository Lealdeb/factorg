// config.js
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

if (!API_BASE_URL) {
  console.warn("REACT_APP_BACKEND_URL no está definida. API_BASE_URL = undefined");
}

export default API_BASE_URL;
