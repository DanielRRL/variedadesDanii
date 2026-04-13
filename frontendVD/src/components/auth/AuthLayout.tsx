/**
 * AuthLayout — Split-screen layout for all auth pages.
 *
 * Left panel:  Fuchsia background with lava-lamp blob animation, branding,
 *              headline, description, and optional feature cards.
 * Right panel: White background with the actual form content (children).
 *
 * On mobile (< lg):  The left panel renders as a compact top banner.
 * On desktop (≥ lg):  Classic 42/58 horizontal split, left panel sticky.
 */

import type { ReactNode } from 'react';
import "../../css/AuthLayout.css"

// ── Types ────────────────────────────────────────────────────────────────────

export interface FeatureCard {
  icon: ReactNode;
  title: string;
  description: string;
}

interface AuthLayoutProps {
  /** Headline on the fuchsia panel */
  headline: string;
  /** Subtext below headline */
  description: string;
  /** Optional feature cards at the bottom of the fuchsia panel */
  features?: FeatureCard[];
  /** Background variant — defaults to 'pink' */
  variant?: 'pink' | 'green';
  /** Optional custom card rendered at the bottom of the left panel */
  bottomCard?: ReactNode;
  /** The form content */
  children: ReactNode;
}

// ── SVG Goo filter (creates metaball merging effect) ─────────────────────────

function LavaGooFilter() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
      <defs>
        <filter id="lava-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AuthLayout({
  headline,
  description,
  features = [],
  variant = 'pink',
  bottomCard,
  children,
}: AuthLayoutProps) {
  const isPink = variant === 'pink';

  const panelBg = isPink
    ? 'bg-[#D81B60]'
    : 'bg-[#2E7D32]';

  const vignetteStyle = isPink
    ? { background: 'radial-gradient(ellipse at center, transparent 40%, rgba(180, 10, 70, 0.3) 100%)' }
    : { background: 'radial-gradient(ellipse at center, transparent 40%, rgba(20, 80, 30, 0.3) 100%)' };

  const overlayClass = isPink
    ? 'bg-[#D81B60]/20'
    : 'bg-[#2E7D32]/20';

  return (
    <div className="auth-layout">

      {/* SVG filter definition (rendered once, hidden) */}
      <LavaGooFilter />

      {/* ── Left panel — branding + lava lamp ─────────────────────────────── */}
      <div
        className={`auth-left-panel ${panelBg}`}
      >
        {/* Lava lamp blobs — pink variant */}
        {isPink && (
          <div className="lava-container" aria-hidden="true">
            <div className="lava-blob lava-blob-1" />
            <div className="lava-blob lava-blob-2" />
            <div className="lava-blob lava-blob-3" />
            <div className="lava-blob lava-blob-4" />
            <div className="lava-blob lava-blob-5" />
            <div className="lava-blob lava-blob-6" />
            <div className="lava-blob lava-blob-7" />
            <div className="lava-blob lava-blob-8" />
            <div className="lava-blob lava-blob-9" />
            <div className="lava-blob lava-blob-10" />
          </div>
        )}

        {/* Lava lamp blobs — green variant */}
        {!isPink && (
          <div className="lava-container" aria-hidden="true">
            <div className="lava-blob lava-blob-green-1" />
            <div className="lava-blob lava-blob-green-2" />
            <div className="lava-blob lava-blob-green-3" />
            <div className="lava-blob lava-blob-green-4" />
            <div className="lava-blob lava-blob-green-5" />
            <div className="lava-blob lava-blob-green-6" />
            <div className="lava-blob lava-blob-green-7" />
          </div>
        )}

        {/* Overlay to unify blobs with background */}
        <div className={`overlay ${overlayClass}`} />

        {/* Vignette on edges */}
        <div
          className="vignette"
          style={vignetteStyle}
        />

        {/* Content (z-10 to sit above blobs + overlays) */}
        <div className="auth-left-content">

          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-box">
              VD
            </div>
            <div>
              <p className="auth-logo-title">Variedades DANII</p>
              <p className="auth-logo-subtitle">Perfumería · Armenia, Quindío</p>
            </div>
          </div>

          {/* Headline + description */}
          <div className="auth-headline-container">
            <h2 className="auth-headline">
              {headline}
            </h2>
            <p className="auth-description">
              {description}
            </p>
          </div>

          {/* Feature cards */}
          {features.length > 0 && (
            <div className="auth-features">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="feature-item"
                >
                  <div className="feature-icon">
                    {f.icon}
                  </div>
                  <div>
                    <p className="feature-title">{f.title}</p>
                    {f.description && (
                      <p className="feature-description">{f.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Optional bottom card (glassmorphism) */}
          {bottomCard && (
            <div className="auth-bottom-card">
              {bottomCard}
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel — form content ────────────────────────────────────── */}
      <div className="auth-right-panel">
        <div className="auth-right-content">
          {children}
        </div>
      </div>
    </div>
  );
}