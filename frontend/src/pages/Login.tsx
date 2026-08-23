import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      notify(`Bienvenido, ${user.name.split(' ')[0]}.`, 'success');
      navigate(from || (user.role === 'admin' ? '/admin' : '/'));
    } catch (err: any) {
      notify(err.message || 'No se pudo iniciar sesión.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-3xl mb-2 text-center">Iniciar sesión</h1>
      <p className="text-charcoal/60 text-center mb-8">Accede a tu cuenta de ORIGEN.</p>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Correo electrónico</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
      <p className="text-center text-sm text-charcoal/60 mt-6">
        ¿No tienes cuenta? <Link to="/registro" className="text-gold-dark font-medium hover:underline">Regístrate</Link>
      </p>
      {import.meta.env.DEV && (
        <div className="mt-8 text-xs text-charcoal/40 text-center border-t border-espresso/10 pt-4">
          <p className="font-medium mb-1">Credenciales de desarrollo (seed):</p>
          <p>Admin: admin@origen.dev / DevAdmin123!</p>
          <p>Cliente: cliente@origen.dev / DevClient123!</p>
        </div>
      )}
    </div>
  );
}
