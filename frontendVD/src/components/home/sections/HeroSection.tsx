import { useRef } from 'react';

interface HeroSectionProps {
  cartCount: number;
  user: { name?: string } | null;
  onNavigate: (path: string) => void;
}

const WA_NUMBER = "573003837442";
const WA_GREETING = encodeURIComponent("Hola, quiero información sobre las esencias");

interface PetalConfig {
  size: number;
  left: string;
  delay: number;
  duration: number;
  opacity: number;
  tint: 'white' | 'pink-light' | 'gold-light';
}

const PETALS: PetalConfig[] = [
  
  { size: 12, left: '8%',  delay: 0,    duration: 11, opacity: 0.45, tint: 'white'     },
  { size: 10, left: '18%', delay: 1.5,  duration: 13, opacity: 0.35, tint: 'pink-light' },
  { size: 8,  left: '30%', delay: 3,    duration: 9,  opacity: 0.40, tint: 'white'     },
  { size: 14, left: '42%', delay: 0.8,  duration: 12, opacity: 0.30, tint: 'gold-light' },
  { size: 10, left: '55%', delay: 2.2,  duration: 10, opacity: 0.50, tint: 'white'     },
  { size: 9,  left: '67%', delay: 4.5,  duration: 14, opacity: 0.38, tint: 'pink-light' },
  { size: 11, left: '78%', delay: 1.0,  duration: 11, opacity: 0.42, tint: 'white'     },
  { size: 8,  left: '92%', delay: 3.5,  duration: 13, opacity: 0.35, tint: 'gold-light' },
];

function ShoppingBagIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}

function ChevronRightIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function ArrowDownIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
    </svg>
  );
}

function UserIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

export function HeroSection({ cartCount, user, onNavigate }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : null;

  return (
    <section ref={sectionRef} className="home-hero home-section" aria-label="Hero">
      <div className="home-hero__blob home-hero__blob-1" aria-hidden="true" />
      <div className="home-hero__blob home-hero__blob-2" aria-hidden="true" />
      <div className="home-hero__blob home-hero__blob-3" aria-hidden="true" />
      <div className="home-hero__glass-overlay" aria-hidden="true" />

      <div className="hero-petals" aria-hidden="true">
        {PETALS.map((petal, i) => (
          <div
            key={i}
            className={`hero-petal hero-petal--${petal.tint}`}
            style={{
              left: petal.left,
              width: petal.size,
              height: petal.size,
              animationDelay: `${petal.delay}s`,
              animationDuration: `${petal.duration}s`,
              '--petal-opacity': petal.opacity,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="home-hero__topbar">
        <div className="home-hero__logo">
          <div className="home-hero__logo-box">
            <img src="/VDlogo.png" alt="VD Logo" className="home-hero__logo-img" />
          </div>
          <div>
            <p className="home-hero__logo-title">Variedades DANII</p>
            <p className="home-hero__logo-subtitle">Perfumería · Armenia, Quindío</p>
          </div>
        </div>

        <div className="home-hero__actions">
          <button
            onClick={() => onNavigate('/carrito')}
            className="home-hero__cart-btn"
            aria-label={`Carrito, ${cartCount} productos`}
          >
            <ShoppingBagIcon size={20} />
            {cartCount > 0 && (
              <span className="home-hero__cart-badge">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>

          {user ? (
            <button
              onClick={() => onNavigate('/perfil')}
              className="home-hero__avatar-btn"
              aria-label="Perfil"
            >
              <span>{initials}</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('/login')}
              className="home-hero__user-btn"
              aria-label="Iniciar sesión"
            >
              <UserIcon size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="home-hero__content">
        <h1 className="home-hero__headline">
          <span className="home-hero__headline-line1">Tu fragancia</span>
          <br />
          <span className="home-hero__headline-line2">perfecta</span>
        </h1>
        <p className="home-hero__sub">
          Lociones, cremas y más al mejor precio
        </p>

        <div className="home-hero__cta-group">
          <button
            onClick={() => onNavigate('/catalogo')}
            className="home-hero__btn-primary"
          >
            Descubrir colección
            <ChevronRightIcon size={16} />
          </button>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${WA_GREETING}`}
            target="_blank"
            rel="noopener noreferrer"
            className="home-hero__btn-secondary"
          >
            Contactar por WhatsApp
          </a>
        </div>
      </div>

      <div className="home-hero__scroll-indicator">
        <span className="home-hero__scroll-text">Desliza</span>
        <ArrowDownIcon size={14} />
      </div>
    </section>
  );
}
