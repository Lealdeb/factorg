const isProd = window.location.hostname !== "localhost";

export const API_BASE_URL = isProd
  ? "https://factorg.onrender.com"
  : "http://localhost:8001";