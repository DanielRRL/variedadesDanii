import { Link } from 'react-router-dom';

export default function VerifyEmailSentPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-brand-pink mb-8">Variedades DANII</h1>

        <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col items-center gap-4">
          <span className="text-5xl">📧</span>
          <h2 className="text-xl font-semibold text-gray-900">Revisa tu correo</h2>
          <p className="text-muted text-sm leading-relaxed">
            Te enviamos un enlace de verificación. Abre tu correo y haz clic en el enlace
            para activar tu cuenta.
          </p>
          <p className="text-xs text-muted">
            ¿No lo ves? Revisa también la carpeta de spam.
          </p>
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
