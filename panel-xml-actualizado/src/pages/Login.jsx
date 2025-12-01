// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setCargando(false);

    if (error) {
      console.error(error);
      setError("Correo o contraseña incorrectos.");
      return;
    }

    navigate("/");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left, #2563eb 0, #0f172a 40%, #020617 100%)",
        color: "#e5e7eb",
        padding: "1.5rem",
      }}
    >
      {/* Panel izquierdo: branding */}
      <div
        style={{
          flex: 1,
          maxWidth: 520,
          borderRadius: 24,
          padding: "2.5rem 2.75rem",
          marginRight: "1.5rem",
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,64,175,0.85))",
          boxShadow: "0 20px 45px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2.1rem",
              fontWeight: 800,
              marginBottom: "0.75rem",
            }}
          >
            FACT·ORG
          </h1>
          <p style={{ opacity: 0.9, marginBottom: "2.5rem" }}>
            Plataforma para gestionar facturas XML, productos y negocios
          </p>

          <div
            style={{
              borderRadius: 18,
              padding: "1.25rem 1.5rem",
              background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(148,163,184,0.35)",
              backdropFilter: "blur(10px)",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              ¿Qué puedes hacer aquí?
            </h2>
            <ul
              style={{
                margin: 0,
                paddingLeft: "1.25rem",
                fontSize: "0.9rem",
                lineHeight: 1.6,
                color: "#cbd5f5",
              }}
            >
              <li>Subir facturas XML y categorizarlas por negocio.</li>
              <li>Ver productos con historial de precios e impuestos.</li>
              <li>Analizar costos con un dashboard centralizado.</li>
            </ul>
          </div>
        </div>

        <p style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: "2rem" }}>
          Proyecto de tesis — Sistema de gestión de facturas XML.
        </p>
      </div>

      {/* Panel derecho: formulario login */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 24,
          padding: "2.5rem 2.75rem",
          background: "#020617",
          boxShadow: "0 20px 45px rgba(0,0,0,0.65)",
          border: "1px solid rgba(148,163,184,0.4)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h2
          style={{
            fontSize: "1.8rem",
            fontWeight: 700,
            marginBottom: "0.25rem",
          }}
        >
          Bienvenido de vuelta
        </h2>
        <p style={{ fontSize: "0.95rem", opacity: 0.8, marginBottom: "1.75rem" }}>
          Ingresa con tu correo y contraseña para gestionar tus negocios.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                opacity: 0.8,
              }}
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: 10,
                border: "1px solid rgba(148,163,184,0.6)",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.95rem",
                outline: "none",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(96,165,250,0.9)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(148,163,184,0.6)")
              }
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                opacity: 0.8,
              }}
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: 10,
                border: "1px solid rgba(148,163,184,0.6)",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "0.95rem",
                outline: "none",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(96,165,250,0.9)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(148,163,184,0.6)")
              }
            />
          </div>

          {error && (
            <p
              style={{
                color: "#f97373",
                marginBottom: "0.75rem",
                fontSize: 13,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: "100%",
              padding: "0.7rem 1rem",
              borderRadius: 999,
              border: "none",
              marginTop: "0.75rem",
              background: cargando
                ? "linear-gradient(90deg, #4b5563, #6b7280)"
                : "linear-gradient(90deg, #2563eb, #4f46e5)",
              color: "#f9fafb",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: cargando ? "not-allowed" : "pointer",
              boxShadow: "0 10px 25px rgba(37,99,235,0.45)",
              transition: "transform 0.08s ease, box-shadow 0.08s ease",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(1px)";
              e.currentTarget.style.boxShadow = "0 5px 12px rgba(15,23,42,0.7)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 10px 25px rgba(37,99,235,0.45)";
            }}
          >
            {cargando ? "Ingresando..." : "Entrar"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.5rem",
            fontSize: 14,
            textAlign: "center",
            borderTop: "1px solid rgba(30,64,175,0.6)",
            paddingTop: "1rem",
          }}
        >
          <p style={{ marginBottom: "0.75rem", opacity: 0.85 }}>
            ¿Aún no tienes cuenta?
          </p>

          {/* Botón que te lleva al registro */}
          <button
            type="button"
            onClick={() => navigate("/registro")}
            style={{
              padding: "0.55rem 1.25rem",
              borderRadius: 999,
              border: "1px solid rgba(96,165,250,0.9)",
              background: "transparent",
              color: "#bfdbfe",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
              transition:
                "background 0.12s ease, color 0.12s ease, transform 0.08s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(37,99,235,0.18)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Crear cuenta
          </button>

          <p style={{ marginTop: "0.75rem", fontSize: 12, opacity: 0.6 }}>
            Solo administradores de negocio autorizados.
          </p>
        </div>
      </div>
    </div>
  );
}
