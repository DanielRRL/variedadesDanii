/**
 * ProfilePage — User profile, gram wallet, referral, game tokens, and navigation.
 * Route: /perfil (ProtectedRoute)
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Scale,
  Share2,
  Copy,
  Check,
  Pencil,
  AlertTriangle,
  Mail,
  LogOut,
  Package,
  MapPin,
  Gamepad2,
  Bell,
  X,
  Loader2,
  Shield,
  Crown,
  Star,
  Gift,
  Dices,
} from "lucide-react";
import { clsx } from "clsx";

import { useAuthStore } from "../stores/authStore";
import {
  getMyGramAccount,
  getMyGameTokens,
  getMyReferralCode,
  resendVerification,
  updateMyProfile,
} from "../services/api";
import type { GramAccount, GameToken } from "../types";
import { GRAMS_PER_OZ, gramProgress } from "../utils/priceCalculator";
import { AppBar } from "../components/layout/AppBar";
import { BottomTabBar } from "../components/layout/BottomTabBar";

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
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="Editar perfil">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-slate-800 text-lg">Editar Perfil</h2>
          <button onClick={onClose} aria-label="Cerrar"><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Nombre completo</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/10 transition-all"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              className={`w-full border rounded-xl px-3.5 py-3 text-sm outline-none transition-all ${
                phone && !phoneValid
                  ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-400/10"
                  : "border-slate-200 focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/10"
              }`}
              placeholder="3XX XXX XXXX"
            />
            {phone && !phoneValid && (
              <p className="text-xs text-red-500 mt-1">10 dígitos colombianos, empieza con 3.</p>
            )}
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1.5">
              Email <span className="text-slate-400 italic">(Contacta soporte para cambiar)</span>
            </label>
            <input
              value={user?.email ?? ""}
              readOnly
              className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {success && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <Check size={12} /> Cambios guardados correctamente.
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full py-3.5 rounded-full font-semibold text-sm transition-all ${
              canSave
                ? "bg-brand-pink text-white hover:bg-brand-pink/90 active:scale-[0.98]"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xs text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <LogOut size={22} className="text-red-500" />
        </div>
        <h3 className="font-display font-semibold text-slate-800 text-lg mb-1">¿Cerrar sesión?</h3>
        <p className="text-sm text-slate-500 mb-5">Volverás a la pantalla de inicio.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-slate-200 py-2.5 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white py-2.5 rounded-full text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            Cerrar sesión
          </button>
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

  const { data: gramRes, isLoading: gramLoading } = useQuery({
    queryKey: ["gramAccount"],
    queryFn: getMyGramAccount,
    staleTime: 2 * 60_000,
  });

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

  const gram = (gramRes?.data?.account ?? gramRes?.data) as GramAccount | undefined;
  const referral = referralRes?.data;
  const allTokens: GameToken[] = tokensRes?.data?.pendingTokens ?? tokensRes?.data ?? [];
  const pendingTokens = allTokens.filter((t) => t.status === "PENDING");

  const currentGrams = gram?.currentGrams ?? 0;
  const totalEarned = gram?.totalEarned ?? 0;
  const totalRedeemed = gram?.totalRedeemed ?? 0;
  const pct = gramProgress(currentGrams);

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("")
    : "?";

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

  const navCards = [
    ...(user?.role === "ADMIN"
      ? [{ icon: Shield, label: "Panel Admin", action: () => navigate("/admin"), accent: true as const }]
      : []),
    { icon: Package, label: "Mis pedidos", action: () => navigate("/pedidos") },
    { icon: Scale, label: "Mis gramos", action: () => navigate("/mis-gramos") },
    { icon: Gamepad2, label: "Juegos", action: () => navigate("/juegos") },
    { icon: MapPin, label: "Direcciones", action: () => navigate("/perfil/direcciones") },
    { icon: Bell, label: "Notificaciones", action: () => navigate("/perfil/notificaciones") },
  ];

  const isLoadingGram = gramLoading;
  const level = user?.loyaltyAccount?.level;

  return (
    <div className="min-h-screen bg-background font-body" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}>
      <AppBar title="Mi Perfil" showBack />

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* ── Email verification banner ──────────────────────────────────── */}
        {user && !user.emailVerified && user.role !== "ADMIN" && (
          <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/60 rounded-2xl px-4 py-3.5 flex items-start gap-3">
            <AlertTriangle size={17} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-amber-800">
                Verifica tu email para activar tu cuenta completa.
              </p>
              {resendDone ? (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <Check size={11} /> Correo enviado a {user.email}.
                </p>
              ) : (
                <>
                  {resendError && <p className="text-xs text-red-500 mt-1">{resendError}</p>}
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700 underline underline-offset-2"
                  >
                    {resendLoading ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
                    Reenviar verificación
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── User card ──────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-brand-pink via-brand-pink to-brand-pink-dark rounded-2xl p-5 flex items-center gap-4 overflow-hidden shadow-lg shadow-brand-pink/20">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.18), transparent 65%)' }}
            aria-hidden="true"
          />
          <div className="relative w-14 h-14 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md ring-2 ring-white/30">
            <span className="font-display font-bold text-brand-pink text-xl leading-none">{initials}</span>
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="font-display font-semibold text-white text-lg leading-tight truncate">
              {user?.name ?? "Usuario"}
            </p>
            {level && level !== 'BASIC' && (
              <span className={clsx(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5",
                level === 'VIP' ? 'bg-brand-gold/20 text-brand-gold' : 'bg-white/15 text-white/70'
              )}>
                {level === 'VIP' ? <Crown size={10} strokeWidth={2.5} /> : <Star size={10} strokeWidth={2.5} />}
                {level === 'VIP' ? 'VIP' : 'Preferencial'}
              </span>
            )}
            <p className="text-white/70 text-xs mt-0.5 truncate">{user?.phone}</p>
            <p className="text-white/70 text-xs truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            aria-label="Editar perfil"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 transition-colors flex items-center justify-center"
          >
            <Pencil size={15} className="text-white" />
          </button>
        </div>

        {/* ── Bento grid: Wallet + Referral + Game Tokens ─────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gram wallet — spans 2 columns on desktop */}
          <div className="sm:col-span-2 bg-white rounded-2xl border border-brand-gold/20 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center">
                <Scale size={18} className="text-brand-gold" />
              </div>
              <span className="font-display font-semibold text-slate-800 text-base">Mi billetera de gramos</span>
            </div>

            {isLoadingGram ? (
              <>
                <div className="flex items-baseline gap-2">
                  <div className="h-11 w-16 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-5 w-12 bg-slate-100 rounded animate-pulse" />
                </div>
                <div>
                  <div className="h-2 bg-slate-100 rounded-full" />
                  <div className="h-3 w-48 bg-slate-100 rounded mt-2 animate-pulse" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-slate-50 rounded-xl p-3"><div className="h-6 w-12 bg-slate-100 rounded animate-pulse mx-auto" /><div className="h-3 w-10 bg-slate-100 rounded animate-pulse mt-2 mx-auto" /></div>
                  <div className="flex-1 bg-slate-50 rounded-xl p-3"><div className="h-6 w-12 bg-slate-100 rounded animate-pulse mx-auto" /><div className="h-3 w-10 bg-slate-100 rounded animate-pulse mt-2 mx-auto" /></div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className={clsx(
                    "font-display font-bold text-brand-gold text-[42px] leading-none transition-all",
                    currentGrams >= GRAMS_PER_OZ && "animate-pulse"
                  )}>{currentGrams}</span>
                  <span className="text-slate-400 text-base">/ {GRAMS_PER_OZ}g</span>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    <span>0g</span>
                    <span>{GRAMS_PER_OZ}g = 1 oz gratis</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-gold rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {currentGrams >= GRAMS_PER_OZ
                      ? "¡Puedes canjear 1 oz de esencia gratis!"
                      : `Te faltan ${GRAMS_PER_OZ - currentGrams}g para canjear`}
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 bg-brand-gold/5 rounded-xl p-3 text-center">
                    <p className="font-display font-bold text-brand-gold text-xl leading-none">{totalEarned}g</p>
                    <p className="text-[11px] text-slate-400 mt-1">Ganado</p>
                  </div>
                  <div className="flex-1 bg-brand-pink/5 rounded-xl p-3 text-center">
                    <p className="font-display font-bold text-brand-pink text-xl leading-none">{totalRedeemed}g</p>
                    <p className="text-[11px] text-slate-400 mt-1">Canjeado</p>
                  </div>
                </div>

                {gram?.canRedeem && currentGrams >= GRAMS_PER_OZ ? (
                  <button
                    onClick={() => navigate("/mis-gramos")}
                    className="w-full bg-brand-gold text-white font-semibold text-sm py-3.5 rounded-full hover:bg-brand-gold/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Gift size={16} />
                    Canjear mi oz gratis
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/mis-gramos")}
                    className="flex items-center gap-1 text-brand-blue text-sm font-medium hover:text-brand-blue/80 transition-colors"
                  >
                    <ChevronRight size={14} />
                    Ver historial de gramos
                  </button>
                )}
              </>
            )}
          </div>

          {/* Referral card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                <Share2 size={16} className="text-brand-blue" />
              </div>
              <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">Invita y Gana</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-xl text-slate-800 tracking-[0.15em]">
                {referral?.code ?? "--------"}
              </span>
              <button
                onClick={() => handleCopyCode(referral?.code ?? "")}
                disabled={!referral?.code}
                aria-label="Copiar código"
                className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-brand-blue hover:bg-blue-50 transition-all"
              >
                {codeCopied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              </button>
            </div>

            {codeCopied && <p className="text-xs text-emerald-600 font-medium">¡Copiado!</p>}

            {referral?.usages !== undefined && (
              <p className="text-xs text-brand-blue font-medium">
                {referral.usages} {referral.usages === 1 ? "amigo ha usado" : "amigos han usado"} tu código
              </p>
            )}

            <p className="text-xs text-slate-400 leading-relaxed">
              Gana <span className="font-semibold text-brand-blue">+2g</span> por cada amigo que haga su primera compra.
            </p>
          </div>

          {/* Game tokens card */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-pink/10 flex items-center justify-center">
                <Gamepad2 size={16} className="text-brand-pink" />
              </div>
              <span className="font-heading font-semibold text-slate-800 text-sm">Fichas de juego</span>
            </div>

            {pendingTokens.length > 0 ? (
              <>
                <p className="text-[13px] text-slate-600">
                  Tienes <span className="font-bold text-brand-pink">{pendingTokens.length}</span>{" "}
                  {pendingTokens.length === 1 ? "ficha pendiente" : "fichas pendientes"}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {pendingTokens.slice(0, 5).map((t) => (
                    <span key={t.id} className="text-[11px] bg-brand-pink/10 text-brand-pink px-2.5 py-1 rounded-full font-medium">
                      Ficha
                    </span>
                  ))}
                  {pendingTokens.length > 5 && (
                    <span className="text-[11px] text-slate-400 self-center">+{pendingTokens.length - 5} más</span>
                  )}
                </div>

                <button
                  onClick={() => navigate("/juegos")}
                  className="w-full bg-brand-pink text-white font-semibold text-sm py-3 rounded-full hover:bg-brand-pink/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Gamepad2 size={15} /> Jugar ahora
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-3">
                <Dices size={22} className="text-slate-300" strokeWidth={1.5} />
                <p className="text-[13px] text-slate-400 text-center leading-relaxed">
                  ¡Haz una compra y recibe fichas para jugar!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Navigation cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {navCards.map(({ icon: Icon, label, action, accent }) => (
            <button
              key={label}
              onClick={action}
              className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 flex flex-col items-center gap-2.5 text-center hover:shadow-md hover:-translate-y-0.5 hover:border-brand-pink/20 transition-all duration-200 group"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  accent ? "bg-brand-pink/10" : "bg-slate-100"
                }`}
              >
                <Icon size={20} className={accent ? "text-brand-pink" : "text-slate-600"} strokeWidth={1.5} />
              </div>
              <span className="text-[13px] font-medium text-slate-700 leading-tight">{label}</span>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-pink/40 transition-colors" />
            </button>
          ))}
        </div>

        {/* Divider + Logout */}
        <div className="h-px bg-gradient-to-r from-transparent via-red-100 to-transparent mb-4" />
        <button
          onClick={() => setShowLogoutDialog(true)}
          className="w-full bg-white rounded-2xl border border-red-100 shadow-sm p-4 flex items-center gap-3 hover:bg-red-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <LogOut size={18} className="text-red-400" strokeWidth={1.5} />
          </div>
          <span className="text-[13px] font-medium text-red-500">Cerrar sesión</span>
        </button>
      </main>

      <BottomTabBar />

      {showEditModal && <EditProfileModal onClose={() => setShowEditModal(false)} />}
      {showLogoutDialog && (
        <LogoutDialog onConfirm={handleLogout} onCancel={() => setShowLogoutDialog(false)} />
      )}
    </div>
  );
}
