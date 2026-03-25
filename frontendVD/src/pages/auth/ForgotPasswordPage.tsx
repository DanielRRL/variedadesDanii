import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../../services/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
    } catch {
      // Intentionally silent — prevents user enumeration
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Back to login */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1 text-sm text-muted hover:text-text-primary mb-4 transition-colors"
          aria-label="Volver a login"
        >
          <ArrowLeft size={16} />
          Iniciar sesion
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-pink">Variedades DANII</h1>
          <p className="text-muted text-sm mt-1">Recuperar contraseña</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
          {!sent ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Ingresa tu correo y te enviaremos las instrucciones para restablecer tu
                contraseña.
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700" htmlFor="forgot-email">
                  Correo electrónico
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-colors"
                  placeholder="tu@correo.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-pink hover:bg-pink-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {loading ? 'Enviando...' : 'Enviar instrucciones'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <span className="text-4xl">✉️</span>
              <h2 className="text-base font-semibold text-gray-900 text-center">
                Revisa tu correo
              </h2>
              <p className="text-sm text-muted text-center leading-relaxed">
                Si existe una cuenta con ese correo electrónico, recibirás las instrucciones
                para restablecer tu contraseña.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-muted mt-6">
          <Link to="/login" className="text-brand-pink font-medium hover:underline">
            ← Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
