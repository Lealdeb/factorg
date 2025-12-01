import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [erroresCampo, setErroresCampo] = useState({});
  const [cargando, setCargando] = useState(false);

  const navigate = useNavigate();

  const validarFormulario = () => {
    const nuevosErrores = {};

    if (!email.trim()) {
      nuevosErrores.email = "Ingresa tu correo.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nuevosErrores.email = "Formato de correo inválido.";
    }

    if (!password) {
      nuevosErrores.password = "Ingresa tu contraseña.";
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
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      setCargando(false);

      if (loginError) {
        console.error("ERROR LOGIN:", loginError);
        const msg = loginError.message.toLowerCase();

        if (msg.includes("invalid login credentials")) {
          setError("Correo o contraseña incorrectos.");
        } else if (msg.includes("email not confirmed")) {
          setError("Debes confirmar tu correo antes de ingresar.");
        } else {
          setError(loginError.message);
        }
        return;
      }

      if (data.user) {
        navigate("/"); // entrar al dashboard
      }
    } catch (e) {
      console.error(e);
      setError("Error inesperado. Intenta nuevamente.");
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-white text-center mb-1">
          Bienvenido de vuelta
        </h1>
        <p className="text-slate-400 text-center mb-6">
          Inicia sesión para gestionar tus negocios.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-700 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Tu contraseña"
            />
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
            {cargando ? "Ingresando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          ¿Aún no tienes cuenta?{" "}
          <Link
            to="/registro"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
