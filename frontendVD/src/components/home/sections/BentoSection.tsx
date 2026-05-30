import {
  Gamepad2,
  CreditCard,
  MapPin,
  Trophy,
} from 'lucide-react';

interface BentoCard {
  Icon: typeof Gamepad2;
  title: string;
  desc: string;
  accent: 'pink' | 'blue' | 'gold';
  featured: boolean;
}

interface BentoSectionProps {
  addRef: (el: HTMLElement | null) => void;
}

const BENTO_CARDS: BentoCard[] = [
  {
    Icon: Gamepad2,
    title: 'Juega y gana gramos',
    desc: 'Cada compra te da una ficha. Gira la ruleta y gana gramos extra.',
    accent: 'pink',
    featured: true,
  },
  {
    Icon: CreditCard,
    title: 'Pagos sin comisión',
    desc: 'Nequi, Bancolombia o Bre-B con confirmación inmediata.',
    accent: 'blue',
    featured: false,
  },
  {
    Icon: MapPin,
    title: 'Recoge o recibe en casa',
    desc: 'Retira en tienda gratis o solicita envío a domicilio.',
    accent: 'gold',
    featured: false,
  },
  {
    Icon: Trophy,
    title: '13g = 1 oz gratis',
    desc: 'Acumula gramos en cada compra y canjea esencias premium.',
    accent: 'pink',
    featured: false,
  },
];

export function BentoSection({ addRef }: BentoSectionProps) {
  return (
    <section
      ref={addRef}
      className="home-bento home-section scroll-reveal"
      aria-labelledby="why-heading"
    >
      <div className="home-section__decorative-bg" aria-hidden="true">
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
        <div className="home-section__circle" />
      </div>

      <div className="home-bento__inner">
        <h2 id="why-heading" className="home-bento__title">
          ¿Por qué elegirnos?
        </h2>

        <div className="home-bento__grid">
          {BENTO_CARDS.map(({ Icon, title, desc, accent, featured }) => (
            <div
              key={title}
              className={`home-bento__card${featured ? ' home-bento__card--featured' : ''}`}
            >
              <div className={`home-bento__icon-wrap home-bento__icon-wrap--${accent}`}>
                <Icon
                  size={featured ? 24 : 20}
                  className={`home-bento__icon home-bento__icon--${accent}`}
                />
              </div>
              <p className="home-bento__card-title">{title}</p>
              <p className="home-bento__card-desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
