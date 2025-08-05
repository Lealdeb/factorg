
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8001', // Cambia si usas otro puerto
});

export const uploadXML = (formData) =>
  API.post('/subir-xml/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getProductos = () => API.get('/productos');
