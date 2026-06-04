/**
 * ProfilePage — User profile, gram wallet, referral, game tokens, and navigation.
 * Route: /perfil (ProtectedRoute)
 */

import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Share2,
  Copy,
  Check,
  Pencil,
  AlertTriangle,
  Mail,
  LogOut,
  Package,
  Gamepad2,
  X,
  Loader2,
  Shield,
  Crown,
  Star,
  Heart,
} from "lucide-react";
import { clsx } from "clsx";

import { useAuthStore } from "../stores/authStore";
import {
  getMyGameTokens,
  getMyReferralCode,
  getMyFavorites,
  resendVerification,
  updateMyProfile,
} from "../services/api";
import type { GameToken } from "../types";
import { AppBar } from "../components/layout/AppBar";
import { BottomTabBar } from "../components/layout/BottomTabBar";
import "../css/ProfilePage.css";

// ─── Sub-components ────────────────────────────────────────────────────────

interface RowProps {
  icon: React.ElementType;
  label: string;
  subtitle?: string;
  subtitleClassName?: string;
  onClick: () => void;
  rightElement?: ReactNode;
  variant?: "default" | "accent" | "danger";
}

function Row({ icon: Icon, label, subtitle, subtitleClassName, onClick, rightElement, variant = "default" }: RowProps) {
  return (
    <button onClick={onClick} className={clsx("profile-row", variant === "danger" && "profile-row--danger")}>
      <div className={clsx(
        "profile-row__icon",
        variant === "accent" && "profile-row__icon--accent",
        variant === "danger" && "profile-row__icon--danger",
      )}>
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <div className="profile-row__content">
        <p className={clsx("profile-row__label", variant === "danger" && "profile-row__label--danger")}>{label}</p>
        {subtitle && (
          <p className={clsx("profile-row__subtitle", subtitleClassName)}>{subtitle}</p>
        )}
      </div>
      {rightElement ?? <ChevronRight size={16} className="profile-row__chevron" />}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="profile-section">
      <p className="profile-section__title">{title}</p>
      <div className="profile-section__card">{children}</div>
    </div>
  );
}

// ─── EditProfileModal ──────────────────────────────────────────────────────

function EditProfileModal({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const phoneValid = /^3\d{9}$/.test(phone);
  const canSave = name.trim().length > 0 && phoneValid && !saving;

  const handleSave = async () => {
    if (!user) return;
    setError("");
    setSaving(true);
    try {
      const res = await updateMyProfile(user.id, { name: name.trim(), phone });
      const updated = res.data?.user ?? res.data;
      updateUser({ name: updated.name, phone: updated.phone });
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax?.response?.data?.message ?? "Error al guardar cambios.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-label="Editar perfil">
      <div className="profile-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="profile-modal-body">
        <div className="profile-modal-header">
          <h2>Editar Perfil</h2>
          <button onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="profile-modal-fields">
          <div className="profile-modal-field">
            <label>Nombre completo</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="profile-modal__input"
              placeholder="Tu nombre"
            />
          </div>

          <div className="profile-modal-field">
            <label>Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              className={clsx(
                "profile-modal__input",
                phone && !phoneValid && "profile-modal__input--error",
              )}
              placeholder="3XX XXX XXXX"
            />
            {phone && !phoneValid && (
              <p className="profile-modal__error">10 dígitos colombianos, empieza con 3.</p>
            )}
          </div>

          <div className="profile-modal-field">
            <label>Email <span style={{ color: "#94A3B8", fontStyle: "italic" }}>(Contacta soporte para cambiar)</span></label>
            <input
              value={user?.email ?? ""}
              readOnly
              className="profile-modal__input profile-modal__input--readonly"
            />
          </div>

          {error && <p className="profile-modal__error">{error}</p>}
          {success && (
            <p className="profile-modal__success">
              <Check size={12} /> Cambios guardados correctamente.
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={!canSave}
            className={clsx(
              "profile-modal__submit",
              canSave ? "profile-modal__submit--active" : "profile-modal__submit--disabled",
            )}
          >
            {saving ? (
              <span className="profile-modal__submit-content">
                <Loader2 size={14} className="animate-spin" /> Guardando...
              </span>
            ) : (
              "Guardar Cambios"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LogoutDialog ──────────────────────────────────────────────────────────

function LogoutDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="profile-logout-overlay" role="alertdialog" aria-modal="true">
      <div className="profile-logout-backdrop" onClick={onCancel} aria-hidden="true" />
      <div className="profile-logout-body">
        <div className="profile-logout-icon">
          <LogOut size={22} />
        </div>
        <h3>¿Cerrar sesión?</h3>
        <p>Volverás a la pantalla de inicio.</p>
        <div className="profile-logout-actions">
          <button onClick={onCancel} className="profile-logout__cancel">Cancelar</button>
          <button onClick={onConfirm} className="profile-logout__confirm">Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}

// ─── ProfilePage ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [resendError, setResendError] = useState("");

  const { data: tokensRes } = useQuery({
    queryKey: ["gameTokens", "profile"],
    queryFn: getMyGameTokens,
    staleTime: 60_000,
  });

  const { data: referralRes } = useQuery({
    queryKey: ["referral"],
    queryFn: getMyReferralCode,
    staleTime: 10 * 60_000,
  });

  const { data: favRes } = useQuery({
    queryKey: ["favorites"],
    queryFn: getMyFavorites,
    staleTime: 30_000,
  });

  const referral = referralRes?.data;
  const allTokens: GameToken[] = tokensRes?.data?.pendingTokens ?? tokensRes?.data ?? [];
  const pendingTokens = allTokens.filter((t) => t.status === "PENDING");

  const favList: unknown[] = favRes?.data?.data ?? favRes?.data ?? [];
  const favCount = favList.length;

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("")
    : "?";

  const level = user?.loyaltyAccount?.level;

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendError("");
    try {
      await resendVerification();
      setResendDone(true);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setResendError(ax?.response?.data?.message ?? "Error al reenviar. Intenta más tarde.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/", { replace: true });
  };

  return (
    <div className="profile-page">
      <div className="profile-bg-decor" aria-hidden="true">
        <div className="profile-bg-circle profile-bg-circle--1" />
        <div className="profile-bg-circle profile-bg-circle--2" />
        <div className="profile-bg-circle profile-bg-circle--3" />
        <div className="profile-bg-circle profile-bg-circle--4" />
        <div className="profile-bg-circle profile-bg-circle--5" />
        <div className="profile-bg-circle profile-bg-circle--6" />
        <div className="profile-bg-circle profile-bg-circle--7" />
        <div className="profile-bg-circle profile-bg-circle--8" />
        <div className="profile-bg-circle profile-bg-circle--9" />
        <div className="profile-bg-circle profile-bg-circle--10" />
        <div className="profile-bg-circle profile-bg-circle--11" />
        <div className="profile-bg-circle profile-bg-circle--12" />
        <div className="profile-bg-circle profile-bg-circle--13" />
      </div>
      <AppBar title="MI PERFIL" showBack variant="catalog" />

      <main className="profile-main">

        {/* ── Hero section (full-width) ──────────────────────────────────── */}
        <section className="profile-hero">
          <div className="profile-hero__top">
            <div className="profile-hero__avatar">
              <span className="profile-hero__avatar-text">{initials}</span>
            </div>

            <div className="profile-hero__info">
              <p className="profile-hero__name">{user?.name ?? "Usuario"}</p>
              {level && level !== "BASIC" && (
                <span className={clsx(
                  "profile-hero__lvl-badge",
                  level === "VIP" ? "profile-hero__lvl-badge--vip" : "profile-hero__lvl-badge--preferred",
                )}>
                  {level === "VIP" ? <Crown size={11} strokeWidth={2.5} /> : <Star size={11} strokeWidth={2.5} />}
                  {level === "VIP" ? "VIP" : "Preferencial"}
                </span>
              )}
              <span className="profile-hero__detail">{user?.phone}</span>
              <span className="profile-hero__detail">{user?.email}</span>
            </div>

            <button
              onClick={() => setShowEditModal(true)}
              className="profile-hero__edit-btn"
              aria-label="Editar perfil"
            >
              <Pencil size={16} />
            </button>
          </div>

        </section>

        {/* ── Verification banner ──────────────────────────────────────── */}
        {user && !user.emailVerified && user.role !== "ADMIN" && (
          <div className="profile-verify-banner">
            <AlertTriangle size={17} className="profile-verify-banner__icon" />
            <div className="profile-verify-banner__content">
              <p className="profile-verify-banner__text">
                Verifica tu email para activar tu cuenta completa.
              </p>
              {resendDone ? (
                <p className="profile-verify-banner__success">
                  <Check size={11} /> Correo enviado a {user.email}.
                </p>
              ) : (
                <>
                  {resendError && <p className="profile-verify-banner__error">{resendError}</p>}
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="profile-verify-banner__resend-btn"
                  >
                    {resendLoading ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                    Reenviar verificación
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Section: Mi Cuenta ──────────────────────────────────────── */}
        <Section title="Mi Cuenta">
          <Row
            icon={Package}
            label="Mis pedidos"
            onClick={() => navigate("/pedidos")}
          />
          <Row
            icon={Gamepad2}
            label="Juegos"
            subtitle={pendingTokens.length > 0 ? `${pendingTokens.length} ${pendingTokens.length === 1 ? "ficha pendiente" : "fichas pendientes"}` : undefined}
            subtitleClassName="profile-row__subtitle--accent"
            onClick={() => navigate("/juegos")}
          />
          <Row
            icon={Share2}
            label="Invitar amigos"
            subtitle={referral?.code ?? undefined}
            onClick={() => {}}
            rightElement={
              <span
                role="button"
                tabIndex={referral?.code ? 0 : -1}
                aria-label="Copiar código"
                aria-disabled={!referral?.code}
                className="profile-row__copy-btn"
                onClick={(e) => { e.stopPropagation(); if (referral?.code) handleCopyCode(referral.code); }}
                onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && referral?.code) { e.stopPropagation(); e.preventDefault(); handleCopyCode(referral.code); } }}
              >
                {codeCopied ? <Check size={14} /> : <Copy size={14} />}
              </span>
            }
          />
          {referral?.usages !== undefined && (
            <Row
              icon={Share2}
              label={`${referral.usages} ${referral.usages === 1 ? "amigo ha usado" : "amigos han usado"} tu código`}
              onClick={() => {}}
              rightElement={null}
            />
          )}
        </Section>

        {/* ── Section: Me Gusta ──────────────────────────────────────── */}
        <Section title="Me Gusta">
          <Row
            icon={Heart}
            label="Favoritos"
            variant="accent"
            subtitle={favCount > 0 ? `${favCount} ${favCount === 1 ? "favorito" : "favoritos"}` : undefined}
            subtitleClassName="profile-row__subtitle--accent"
            onClick={() => navigate("/perfil/favoritos")}
          />
        </Section>

        {/* ── Section: Cuenta ──────────────────────────────────────────── */}
        <Section title="Cuenta">
          {user?.role === "ADMIN" && (
            <Row
              icon={Shield}
              label="Panel Admin"
              variant="accent"
              onClick={() => navigate("/admin")}
            />
          )}
          <Row
            icon={LogOut}
            label="Cerrar sesión"
            variant="danger"
            onClick={() => setShowLogoutDialog(true)}
            rightElement={null}
          />
        </Section>

      </main>

      <BottomTabBar />

      {showEditModal && <EditProfileModal onClose={() => setShowEditModal(false)} />}
      {showLogoutDialog && (
        <LogoutDialog onConfirm={handleLogout} onCancel={() => setShowLogoutDialog(false)} />
      )}
    </div>
  );
}
