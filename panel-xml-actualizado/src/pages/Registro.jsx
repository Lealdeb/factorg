import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Registro() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleRegistro = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMensaje('Error en registro: ' + error.message);
    } else {
      setMensaje('¡Registro exitoso! Revisa tu correo.');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Registrarse</h2>
      <form onSubmit={handleRegistro} className="space-y-4">
        <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} className="border p-2 w-full" />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="border p-2 w-full" />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Registrarse</button>
      </form>
      {mensaje && <p className="mt-4 text-green-500">{mensaje}</p>}
    </div>
  );
}
