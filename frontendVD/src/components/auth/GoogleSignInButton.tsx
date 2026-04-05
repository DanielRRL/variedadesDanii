import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { googleLogin } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export default function GoogleSignInButton() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const addToast = useToastStore((s) => s.addToast);
  const btnRef = useRef<HTMLDivElement>(null);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        const res = await googleLogin(response.credential);
        setAuth(res.data.user, res.data.token);
        navigate('/');
      } catch {
        addToast('No se pudo iniciar sesión con Google.', 'error');
      }
    },
    [setAuth, addToast, navigate],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
    });

    if (btnRef.current) {
      window.google.accounts.id.renderButton(btnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: btnRef.current.offsetWidth,
        logo_alignment: 'left',
      });
    }
  }, [handleCredentialResponse]);

  if (!GOOGLE_CLIENT_ID) return null;

  return <div ref={btnRef} className="w-full" />;
}
