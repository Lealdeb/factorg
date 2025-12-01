// src/pages/Registro.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.,!@#$%^&*()_\-+=[\]{};':"\\|<>/?]).{8,}$/;

export default function Registro() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [erroresCampo, setErroresCampo] = useState({});
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!nombre.trim()) {
      nuevosErrores.nombre = "El nombre es obligatorio.";
    }

    if (!email.trim()) {
      nuevosErrores.email = "El correo es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nuevosErrores.email = "Ingresa un correo electrónico válido.";
    }

    if (!password) {
      nuevosErrores.password = "La contraseña es obligatoria.";
    } else if (!PASSWORD_REGEX.test(password)) {
      nuevosErrores.password =
        "Debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo (ej: . , !).";
    }

    setErroresCampo(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErroresCampo({});

    if (!validarFormulario()) return;

    setCargando(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: nombre.trim(),
          },
        },
      });

      setCargando(false);

      if (signUpError) {
        console.error("ERROR SIGNUP:", signUpError);

        const msg = signUpError.message?.toLowerCase() || "";

        if (msg.includes("already registered") || msg.includes("already exists")) {
          setError("Este correo ya está registrado. Intenta iniciar sesión.");
        } else if (msg.includes("password")) {
          setError(
            "La contraseña no cumple la política de seguridad. Revisa los requisitos."
          );
        } else {
          setError(signUpError.message || "No se pudo crear la cuenta.");
        }
        return;
      }

      // Si llegamos aquí es porque no hubo error
      if (data?.user) {
        // Si no usas confirmación por correo, el usuario ya puede loguearse
        navigate("/login");
      } else {
        // Caso con confirmación por correo activada
        alert(
          "Cuenta creada. Revisa tu correo para confirmar la cuenta antes de iniciar sesión."
        );
        navigate("/login");
      }
    } catch (e) {
      console.error(e);
      setError("Error inesperado al registrar. Intenta nuevamente.");
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-white text-center mb-1">
          Crear cuenta
        </h1>
        <p className="text-slate-400 text-center mb-6">
          Regístrate para acceder al panel de facturas
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-700 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Ej: Débora Leal"
            />
            {erroresCampo.nombre && (
              <p className="mt-1 text-xs text-red-400">{erroresCampo.nombre}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="tucorreo@ejemplo.cl"
            />
            {erroresCampo.email && (
              <p className="mt-1 text-xs text-red-400">{erroresCampo.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Mínimo 8 caracteres seguros"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Debe tener al menos 8 caracteres, una mayúscula, una minúscula, un
              número y un símbolo (ej: . , !).
            </p>
            {erroresCampo.password && (
              <p className="mt-1 text-xs text-red-400">
                {erroresCampo.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cargando ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            to="/login"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
