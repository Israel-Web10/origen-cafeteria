import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      notify('La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }
    setLoading(true);
    try {
      await register({ name, email, password, phone: phone || undefined });
      notify('Cuenta creada con éxito.', 'success');
      navigate('/');
    } catch (err: any) {
      notify(err.message || 'No se pudo crear la cuenta.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-3xl mb-2 text-center">Crear cuenta</h1>
      <p className="text-charcoal/60 text-center mb-8">
        Regístrate para hacer seguimiento a tus pedidos, o continúa como invitado desde el carrito.
      </p>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Nombre completo</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Correo electrónico</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Teléfono</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          <p className="text-xs text-charcoal/40 mt-1">Mínimo 8 caracteres.</p>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
      <p className="text-center text-sm text-charcoal/60 mt-6">
        ¿Ya tienes cuenta? <Link to="/login" className="text-gold-dark font-medium hover:underline">Inicia sesión</Link>
      </p>
    </div>
  );
}
