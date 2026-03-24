/**
 * VerifyEmailPage — Reads the ?token= query param and calls the verify-email API.
 * Shows success or error feedback.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmail } from '../services/api';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [params]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-surface rounded-[12px] shadow-card w-full max-w-sm p-6 text-center">
        {status === 'loading' && <p className="text-muted">Verificando…</p>}
        {status === 'success' && (
          <>
            <h1 className="font-heading text-xl font-bold text-success mb-2">¡Correo verificado!</h1>
            <Link to="/login" className="text-brand-blue underline text-sm">Iniciar sesión</Link>
          </>
        )}
        {status === 'error' && (
          <h1 className="font-heading text-xl font-bold text-warning">
            Token inválido o expirado
          </h1>
        )}
      </div>
    </main>
  );
}
