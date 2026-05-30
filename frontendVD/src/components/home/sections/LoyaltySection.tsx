import { Link } from 'react-router-dom';
import { Sparkles, Scale, Gamepad2, Trophy } from 'lucide-react';
import type { GramAccount } from '../../../types';
import { GRAMS_PER_OZ } from '../../../utils/priceCalculator';

interface LoyaltySectionProps {
  isAuthenticated: boolean;
  user: { name?: string } | null;
  gram?: GramAccount;
  currentGrams: number;
  pct: number;
  onNavigate: (path: string) => void;
  addRef: (el: HTMLElement | null) => void;
}

function ScaleIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21h10"/><path d="M12 21v-4"/><path d="M12 17V3"/>
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

export function LoyaltySection({
  isAuthenticated,
  user,
  currentGrams,
  pct,
  addRef,
}: LoyaltySectionProps) {
  return (
    <section
      ref={addRef}
      className="home-loyalty home-section home-section--loyalty scroll-reveal"
      aria-labelledby="gram-heading"
    >
      <div className="home-bento__lava-bg" aria-hidden="true" style={{ opacity: 0.5 }}>
        <div className="home-bento__blob home-bento__blob--1" />
        <div className="home-bento__blob home-bento__blob--2" />
      </div>

      <div className="hero-petals--secondary" aria-hidden="true">
        <div className="hero-petal hero-petal--1" />
        <div className="hero-petal hero-petal--2" />
        <div className="hero-petal hero-petal--3" />
        <div className="hero-petal hero-petal--4" />
      </div>

      <div className="home-loyalty__inner">
        {!isAuthenticated ? (
          <div className="home-loyalty__card">
            <div className="home-bento__lava-bg" aria-hidden="true" style={{ opacity: 0.5 }}>
              <div className="home-bento__blob home-bento__blob--1" style={{ background: 'rgba(249, 168, 37, 0.15)', width: '200px', height: '200px' }} />
              <div className="home-bento__blob home-bento__blob--2" style={{ background: 'rgba(216, 27, 96, 0.1)', width: '150px', height: '150px' }} />
            </div>
            <div className="home-loyalty__ornament-tl" aria-hidden="true" />
            <div className="home-loyalty__ornament-bl" aria-hidden="true" />
            <div className="home-loyalty__fog" aria-hidden="true" />

            <div className="home-loyalty__icon-wrap">
              <Sparkles size={26} className="home-loyalty__icon" />
            </div>

            <h2 id="gram-heading" className="home-loyalty__title">
              Acumula gramos y gana esencias gratis
            </h2>
            <p className="home-loyalty__desc">
              Cada compra te da 1g + una ficha de juego. Al llegar a {GRAMS_PER_OZ}g
              canjeas 1 oz de esencia premium.
            </p>

            <div className="home-loyalty__steps">
              {[
                { Icon: Scale, label: 'Compra' },
                { Icon: Gamepad2, label: 'Juega' },
                { Icon: Trophy, label: 'Canjea' },
              ].map(({ Icon, label }, i) => (
                <div key={label} className="home-loyalty__step">
                  <div className="home-loyalty__step-icon">
                    <Icon size={20} />
                  </div>
                  <span className="home-loyalty__step-label">{label}</span>
                  {i < 2 && (
                    <div className={`home-loyalty__step-connector${i === 0 ? ' home-loyalty__step-connector--active' : ''}`}>
                      <ChevronRightIcon size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Link to="/register" className="home-loyalty__btn">
              Regístrate gratis
              <ChevronRightIcon size={16} />
            </Link>
          </div>
        ) : (
          <div className="home-loyalty__card home-loyalty__card--auth">
            <div className="home-loyalty__auth-header">
              <div>
                <h2 id="gram-heading" className="home-loyalty__auth-title">
                  Mis gramos
                </h2>
                <p className="home-loyalty__auth-subtitle">
                  {user?.name?.split(' ')[0]}
                </p>
              </div>
              <div className="home-loyalty__auth-gold-icon">
                <ScaleIcon size={20} />
              </div>
            </div>

            <div className="home-loyalty__auth-balance">
              <span className="home-loyalty__auth-grams">{currentGrams}</span>
              <span className="home-loyalty__auth-grams-total">/ {GRAMS_PER_OZ}g</span>
            </div>
            <p className="home-loyalty__auth-message">
              {currentGrams >= GRAMS_PER_OZ
                ? '¡Puedes canjear 1 oz de esencia gratis!'
                : `${GRAMS_PER_OZ - currentGrams}g más para tu próxima oz gratis`}
            </p>

            <div className="home-loyalty__progress">
              <div
                className="home-loyalty__progress-bar"
                style={{ width: `${pct}%` }}
              />
            </div>

            <Link to="/mis-gramos" className="home-loyalty__auth-link">
              Ver mi billetera de gramos
              <ChevronRightIcon size={14} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
