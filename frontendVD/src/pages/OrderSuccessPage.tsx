import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';
import { formatCOP } from '../utils/format';
import { AppBar } from '../components/layout/AppBar';

interface SuccessState {
  orderId:       string;
  orderNumber:   string;
  total:         number;
  paymentMethod: string;
}

export default function OrderSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state    = (location.state ?? {}) as Partial<SuccessState>;

  const {
    orderNumber  = 'VD-0000',
    total        = 0,
  } = state;

  useEffect(() => {
    window.history.replaceState(null, '', '/pedido-exitoso');
  }, [navigate]);

  const handleContinue = () => {
    navigate('/catalogo', { replace: true });
  };

  const handleOrders = () => {
    navigate('/pedidos', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12 text-center font-body">
      <div className="mb-8">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h1 className="font-heading text-2xl font-bold text-text-primary mb-2">
        ¡Pedido confirmado!
      </h1>
      <p className="text-muted mb-2">Tu pedido <span className="font-semibold text-text-primary">{orderNumber}</span> ha sido registrado.</p>
      <p className="text-muted text-sm mb-6">Te notificaremos cuando esté listo para entrega.</p>

      <div className="bg-surface border border-border rounded-2xl px-6 py-4 mb-8 w-full max-w-xs">
        <p className="text-muted text-xs mb-0.5">Total pagado</p>
        <p className="font-heading text-2xl font-bold text-brand-gold">
          {formatCOP(total)}
        </p>
      </div>

      <div className="bg-brand-pink/5 border border-brand-pink/20 rounded-2xl px-6 py-4 flex items-center gap-3 w-full max-w-xs mb-8">
        <Gamepad2 size={22} className="text-brand-pink flex-none" />
        <div className="text-left">
          <p className="font-heading font-semibold text-brand-pink text-sm">
            ¡Ganaste una ficha de juego!
          </p>
          <p className="text-xs text-muted">
            Juega en la sección de juegos cuando tu pedido esté confirmado.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleContinue}
          className="w-full bg-brand-pink text-white font-heading font-semibold text-sm py-3 rounded-full hover:bg-brand-pink/90 transition-colors"
        >
          Seguir comprando
        </button>
        <button
          onClick={handleOrders}
          className="w-full bg-surface border border-border text-text-primary font-heading font-semibold text-sm py-3 rounded-full hover:bg-border/20 transition-colors"
        >
          Ver mis pedidos
        </button>
      </div>

      <AppBar title="Pedido Exitoso" showBack variant="catalog" />
    </div>
  );
}
