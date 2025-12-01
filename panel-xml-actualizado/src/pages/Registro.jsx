// src/pages/Registro.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: nombre,
        },
      },
    });

    setCargando(false);

    if (error) {
      console.error(error);
      setError(error.message || "No se pudo crear la cuenta.");
      return;
    }

    // Depende de tu Supabase: puede pedir confirmación por correo.
    setMensaje(
      "Cuenta creada 🎉. Revisa tu correo para confirmar y luego inicia sesión."
    );

    // Opcional: redirigir a login después de unos segundos
    setTimeout(() => {
      navigate("/login");
    }, 2000);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left, #4f46e5 0, #0f172a 40%, #020617 100%)",
        color: "#e5e7eb",
        padding: "1.5rem",
      }}
    >
      {/* Panel izquierdo texto motivacional */}
      <div
        style={{
          flex: 1,
          maxWidth: 520,
          borderRadius: 24,
          padding: "2.5rem 2.75rem",
          marginRight: "1.5rem",
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(79,70,229,0.85))",
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
            Crea tu cuenta de administrador
          </h1>
          <p style={{ opacity: 0.9, marginBottom: "2.25rem" }}>
            Regístrate para gestionar uno o varios negocios, cargar facturas y
            tener control total sobre compras, impuestos y costos.
          </p>

          <div
            style={{
              borderRadius: 18,
              padding: "1.25rem 1.5rem",
              background: "rgba(15,23,42,0.85)",
              border: "1px solid rgba(129,140,248,0.55)",
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
              Ventajas para tu tesis
            </h2>
            <ul
              style={{
                margin: 0,
                paddingLeft: "1.25rem",
                fontSize: "0.9rem",
                lineHeight: 1.6,
                color: "#e0e7ff",
              }}
            >
              <li>Sistema multiusuario con autenticación real (Supabase).</li>
              <li>Escalabilidad: puedes añadir roles y permisos por negocio.</li>
              <li>Seguridad: tokens y gestión de sesión en la nube.</li>
              <li>
                Justificación directa de “factibilidad técnica” y “escalabilidad”.
              </li>
            </ul>
          </div>
        </div>

        <p style={{ fontSize: "0.8rem", opacity: 0.65, marginTop: "2rem" }}>
          Una cuenta por administrador. Los negocios pueden crecer, los usuarios
          también.
        </p>
      </div>

      {/* Panel derecho: formulario registro */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 24,
          padding: "2.5rem 2.75rem",
          background: "#020617",
          boxShadow: "0 20px 45px rgba(0,0,0,0.65)",
          border: "1px solid rgba(129,140,248,0.55)",
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
          Crear cuenta
        </h2>
        <p style={{ fontSize: "0.95rem", opacity: 0.8, marginBottom: "1.75rem" }}>
          Ingresa tus datos para comenzar a usar el sistema.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "0.9rem" }}>
            <label
              htmlFor="nombre"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                opacity: 0.8,
              }}
            >
              Nombre completo
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
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
                (e.target.style.borderColor = "rgba(129,140,248,0.9)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(148,163,184,0.6)")
              }
            />
          </div>

          <div style={{ marginBottom: "0.9rem" }}>
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
                (e.target.style.borderColor = "rgba(129,140,248,0.9)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(148,163,184,0.6)")
              }
            />
          </div>

          <div style={{ marginBottom: "0.9rem" }}>
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
              autoComplete="new-password"
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
                (e.target.style.borderColor = "rgba(129,140,248,0.9)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(148,163,184,0.6)")
              }
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label
              htmlFor="password2"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                opacity: 0.8,
              }}
            >
              Repetir contraseña
            </label>
            <input
              id="password2"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              autoComplete="new-password"
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
                (e.target.style.borderColor = "rgba(129,140,248,0.9)")
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

          {mensaje && (
            <p
              style={{
                color: "#4ade80",
                marginBottom: "0.75rem",
                fontSize: 13,
              }}
            >
              {mensaje}
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
                ? "linear-gradient(90deg, #6b7280, #4b5563)"
                : "linear-gradient(90deg, #4f46e5, #ec4899)",
              color: "#f9fafb",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: cargando ? "not-allowed" : "pointer",
              boxShadow: "0 10px 25px rgba(79,70,229,0.5)",
              transition: "transform 0.08s ease, box-shadow 0.08s ease",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translateY(1px)";
              e.currentTarget.style.boxShadow =
                "0 5px 12px rgba(15,23,42,0.7)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 10px 25px rgba(79,70,229,0.5)";
            }}
          >
            {cargando ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.5rem",
            fontSize: 14,
            textAlign: "center",
            borderTop: "1px solid rgba(55,65,148,0.8)",
            paddingTop: "1rem",
          }}
        >
          <p style={{ marginBottom: "0.75rem", opacity: 0.85 }}>
            ¿Ya tienes una cuenta?
          </p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              padding: "0.55rem 1.25rem",
              borderRadius: 999,
              border: "1px solid rgba(129,140,248,0.9)",
              background: "transparent",
              color: "#e0e7ff",
              fontSize: "0.9rem",
              fontWeight: 500,
              cursor: "pointer",
              transition:
                "background 0.12s ease, color 0.12s ease, transform 0.08s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(79,70,229,0.2)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
