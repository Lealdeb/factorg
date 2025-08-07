
import axios from 'axios';

const API = axios.create({
  baseURL: "https://factorg.onrender.com", // Cambia si usas otro puerto
});

export const uploadXML = (formData) =>
  API.post('/subir-xml/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getProductos = () => API.get('/productos');
