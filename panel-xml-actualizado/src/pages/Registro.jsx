import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [negocioId, setNegocioId] = useState("");
  const [negocios, setNegocios] = useState([]);

  const [error, setError] = useState("");
  const [loadingNegocios, setLoadingNegocios] = useState(true);

  useEffect(() => {
    api
      .get("/negocios")
      .then((res) => {
        setNegocios(res.data || []);
      })
      .catch((err) => {
        console.error("Error cargando negocios", err);
        setError("No se pudieron cargar los negocios");
      })
      .finally(() => setLoadingNegocios(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!negocioId) {
      setError("Debes seleccionar un negocio");
      return;
    }

    try {
      const payload = {
        email,
        username,
        password,
        negocio_id: parseInt(negocioId, 10),
      };

      await api.post("/auth/register", payload);

      // Después de registrarse, lo mandamos a login
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError("Error al registrar usuario. Revisa los datos.");
    }
  };

  return (
    <div style={{ maxWidth: 450, margin: "40px auto" }}>
      <h2>Crear cuenta</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            style={{ width: "100%" }}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Nombre de usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="nombre de usuario"
            style={{ width: "100%" }}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            style={{ width: "100%" }}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Negocio</label>
          {loadingNegocios ? (
            <p>Cargando negocios...</p>
          ) : (
            <select
              value={negocioId}
              onChange={(e) => setNegocioId(e.target.value)}
              style={{ width: "100%" }}
              required
            >
              <option value="">Selecciona un negocio</option>
              {negocios.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit">Registrarse</button>
      </form>

      <p style={{ marginTop: 16 }}>
        ¿Ya tienes cuenta?{" "}
        <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}

export default Register;
