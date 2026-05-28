import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { forgotPassword } from '../../services/api';
import AuthLayout from '../../components/auth/AuthLayout';
import type { FeatureCard } from '../../components/auth/AuthLayout';
import '../../css/ForgotPasswordPage.css';

const FEATURES: FeatureCard[] = [
  { icon: <Mail size={18} />, title: 'Enlace por email', description: 'Válido 30 min · un solo uso' },
  { icon: <ShieldCheck size={18} />, title: 'Sesiones anteriores cerradas', description: 'Para proteger tu cuenta' },
];

export default function ForgotPasswordPage() {
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
    <AuthLayout
      headline="Te ayudamos a recuperar el acceso"
      description="Recibirás un enlace seguro por correo para crear una nueva contraseña en minutos."
      features={FEATURES}
    >
      {/* Back link */}
      <Link to="/" className="back-link">
        <ArrowLeft size={14} /> Volver al inicio
      </Link>

      {/* Title */}
      <h1 className="heading-title">
        Recuperar contraseña
      </h1>
      <p className="heading-subtitle">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
      </p>

      {!sent ? (
        <form onSubmit={handleSubmit} className="form-container">
          {/* Email */}
          <div>
            <label className="form-label" htmlFor="forgot-email">
              Correo electrónico
            </label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="tucorreo@gmail.com"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading
              ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Enviando...</span>
              : 'Enviar enlace de recuperación'}
          </button>
        </form>
      ) : (
        <div className="success-section">
          <div className="success-icon-wrap">
            <Mail size={24} className="text-green-600" />
          </div>
          <h2 className="success-title">Revisa tu correo</h2>
          <p className="success-message">
            Si existe una cuenta con ese correo electrónico, recibirás las instrucciones
            para restablecer tu contraseña.
          </p>
        </div>
      )}

      {/* Info card */}
      <div className="info-card">
        <h3 className="info-card-title">¿Recuerdas cómo accediste?</h3>
        <div className="info-card-row">
          <span className="info-card-dot" style={{ backgroundColor: 'var(--brand-pink)' }} />
          <span className="info-card-text">Si usaste email, recibirás el enlace ahí</span>
        </div>
        <div className="info-card-row">
          <span className="info-card-dot" style={{ backgroundColor: '#3B82F6' }} />
          <span className="info-card-text">Si usaste Google, inicia sesión normalmente con Google</span>
        </div>
      </div>

      <Link
        to="/login"
        className="back-link"
      >
        <ArrowLeft size={14} /> Volver al inicio de sesión
      </Link>
    </AuthLayout>
  );
}