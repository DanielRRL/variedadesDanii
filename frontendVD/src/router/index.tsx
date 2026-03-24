/**
 * router/index.tsx — Application routing with React Router v6.
 *
 * Route groups:
 *
 *  PUBLIC — accessible without authentication:
 *    /                    → HomePage
 *    /login               → LoginPage
 *    /register            → RegisterPage
 *    /verify-email        → VerifyEmailPage (?token=)
 *    /verify-email-sent   → VerifyEmailSentPage
 *    /forgot-password     → ForgotPasswordPage
 *    /reset-password      → ResetPasswordPage (?token=)
 *    /catalogo            → CatalogPage
 *    /esencia/:id         → EssenceDetailPage
 *
 *  PROTECTED — require isAuthenticated === true:
 *    /carrito             → CartPage
 *    /pedidos             → OrdersListPage
 *    /pedido/:id          → OrderDetailPage
 *    /perfil              → ProfilePage
 *
 *  ADMIN — require role === 'ADMIN':
 *    /admin               → AdminDashboardPage
 *    /admin/inventario    → AdminInventoryPage
 *    /admin/pedidos       → AdminOrdersPage
 *    /admin/clientes      → AdminClientsPage
 */

import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

// ── Lazy page imports (code-split per route) ──────────────────────────────────
import { lazy, Suspense } from 'react';

const HomePage              = lazy(() => import('../pages/HomePage'));
const LoginPage             = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage          = lazy(() => import('../pages/auth/RegisterPage'));
const VerifyEmailPage       = lazy(() => import('../pages/auth/VerifyEmailPage'));
const VerifyEmailSentPage   = lazy(() => import('../pages/auth/VerifyEmailSentPage'));
const ForgotPasswordPage    = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage     = lazy(() => import('../pages/auth/ResetPasswordPage'));
const CatalogPage           = lazy(() => import('../pages/CatalogPage'));
const EssenceDetailPage     = lazy(() => import('../pages/EssenceDetailPage'));

const CartPage             = lazy(() => import('../pages/CartPage'));
const PaymentPendingPage   = lazy(() => import('../pages/PaymentPendingPage'));
const OrderSuccessPage     = lazy(() => import('../pages/OrderSuccessPage'));
const OrdersListPage       = lazy(() => import('../pages/orders/OrdersListPage'));
const OrderDetailPage      = lazy(() => import('../pages/orders/OrderDetailPage'));
const ProfilePage          = lazy(() => import('../pages/ProfilePage'));

const AdminDashboardPage   = lazy(() => import('../pages/admin/AdminDashboardPage'));
const AdminInventoryPage   = lazy(() => import('../pages/admin/AdminInventoryPage'));
const AdminOrdersPage      = lazy(() => import('../pages/admin/AdminOrdersPage'));
const AdminClientsPage     = lazy(() => import('../pages/admin/AdminClientsPage'));
const AdminEssencesPage    = lazy(() => import('../pages/admin/AdminEssencesPage'));
const AdminLoyaltyPage     = lazy(() => import('../pages/admin/AdminLoyaltyPage'));
const AdminInvoicesPage    = lazy(() => import('../pages/admin/AdminInvoicesPage'));
const AdminReportsPage     = lazy(() => import('../pages/admin/AdminReportsPage'));
const AdminReturnItemsPage = lazy(() => import('../pages/admin/AdminReturnItemsPage'));
const AdminConfigPage      = lazy(() => import('../pages/admin/AdminConfigPage'));
const AdminLayout          = lazy(() => import('../pages/admin/AdminLayout'));

// ── Route guard components ────────────────────────────────────────────────────

/**
 * ProtectedRoute — Redirects unauthenticated users to /login.
 * Wraps all routes that require a valid session.
 */
function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

/**
 * AdminRoute — Redirects non-admin users to the home page.
 * Must be nested inside ProtectedRoute (assumes isAuthenticated is already checked).
 */
function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}

/** Minimal loading state shown while lazy-loaded page chunks are fetched. */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-8 h-8 border-4 border-brand-pink border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Router definition ─────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────────────────────────────
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    ),
    children: [
      { index: true,                 element: <HomePage /> },
      { path: 'login',               element: <LoginPage /> },
      { path: 'register',            element: <RegisterPage /> },
      { path: 'verify-email',        element: <VerifyEmailPage /> },
      { path: 'verify-email-sent',   element: <VerifyEmailSentPage /> },
      { path: 'forgot-password',     element: <ForgotPasswordPage /> },
      { path: 'reset-password',      element: <ResetPasswordPage /> },
      { path: 'catalogo',            element: <CatalogPage /> },
      { path: 'esencia/:id',         element: <EssenceDetailPage /> },
    ],
  },

  // ── Protected routes (require login) ──────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/carrito',          element: <CartPage /> },
      { path: '/pago-pendiente',    element: <PaymentPendingPage /> },
      { path: '/pedido-exitoso',    element: <OrderSuccessPage /> },
      { path: '/pedidos',           element: <OrdersListPage /> },
      { path: '/pedido/:id',        element: <OrderDetailPage /> },
      { path: '/perfil',            element: <ProfilePage /> },
    ],
  },

  // ── Admin routes (require role === 'ADMIN') ────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminRoute />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { path: '/admin',                element: <AdminDashboardPage />   },
              { path: '/admin/inventario',     element: <AdminInventoryPage />   },
              { path: '/admin/pedidos',        element: <AdminOrdersPage />      },
              { path: '/admin/esencias',       element: <AdminEssencesPage />    },
              { path: '/admin/clientes',       element: <AdminClientsPage />     },
              { path: '/admin/fidelizacion',   element: <AdminLoyaltyPage />     },
              { path: '/admin/facturas',       element: <AdminInvoicesPage />    },
              { path: '/admin/reportes',       element: <AdminReportsPage />     },
              { path: '/admin/devoluciones',   element: <AdminReturnItemsPage /> },
              { path: '/admin/configuracion',  element: <AdminConfigPage />      },
            ],
          },
        ],
      },
    ],
  },

  // ── Catch-all: redirect unknown paths to home ──────────────────────────────
  { path: '*', element: <Navigate to="/" replace /> },
]);
