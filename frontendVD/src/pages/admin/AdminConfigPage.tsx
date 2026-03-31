/**
 * AdminConfigPage — System configuration panel.
 *
 * Shows key business parameters as read-only cards. These are
 * configured via environment variables on the backend; this page
 * gives the admin visibility without direct database editing.
 *
 * Future: POST /api/admin/config endpoints could make these editable.
 */

import {
  Settings,
  Store,
  Truck,
  Scale,
  Gamepad2,
  Bell,
  Shield,
  Info,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Config sections
// ─────────────────────────────────────────────────────────────────────────────

interface ConfigItem {
  label: string;
  value: string;
  description: string;
}

function ConfigSection({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ElementType;
  title: string;
  items: ConfigItem[];
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-brand-pink" />
        <h2 className="font-heading font-semibold text-sm text-text-primary">{title}</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">{item.label}</p>
              <p className="text-xs text-muted">{item.description}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-brand-pink bg-brand-pink/10 px-2.5 py-1 rounded-lg">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminConfigPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary">Configuración</h1>
          <p className="text-sm text-muted">Parámetros del sistema y reglas de negocio</p>
        </div>
        <Settings size={24} className="text-brand-pink" />
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800">
          Estos valores se configuran desde las variables de entorno del servidor.
          Contacta al desarrollador para modificarlos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConfigSection
          icon={Store}
          title="Tienda"
          items={[
            { label: 'Nombre', value: 'Variedades DANII', description: 'Nombre comercial del negocio' },
            { label: 'Moneda', value: 'COP', description: 'Pesos colombianos' },
            { label: 'Zona horaria', value: 'America/Bogota', description: 'UTC-5' },
          ]}
        />

        <ConfigSection
          icon={Truck}
          title="Envíos"
          items={[
            { label: 'Envío gratis desde', value: '$100.000', description: 'Monto mínimo para envío sin costo' },
            { label: 'Costo de envío base', value: '$8.000', description: 'Tarifa fija de envío estándar' },
            { label: 'Tiempo de entrega', value: '1–3 días', description: 'Promedio para Bogotá y alrededores' },
          ]}
        />

        <ConfigSection
          icon={Scale}
          title="Sistema de Gramos"
          items={[
            { label: 'Gramos por compra', value: '1 g', description: 'Cada producto elegible otorga 1 gramo' },
            { label: 'Gramos para canje', value: '13 g', description: '13 gramos = 1 oz de esencia gratis' },
            { label: 'Compras mínimas', value: '5', description: 'Compras entregadas antes de habilitar canje' },
          ]}
        />

        <ConfigSection
          icon={Gamepad2}
          title="Juegos y Fichas"
          items={[
            { label: 'Fichas por compra', value: '1', description: 'Se emite 1 ficha de juego por compra confirmada' },
            { label: 'Máx. fichas pendientes', value: '3', description: 'Límite de fichas sin usar por usuario' },
            { label: 'Vigencia de ficha', value: '72 h', description: 'Expira si no se juega en 72 horas' },
            { label: 'Gramos por juego', value: '1–4 g', description: 'Rango de gramos ganados en ruleta o puzzle' },
          ]}
        />

        <ConfigSection
          icon={Bell}
          title="Notificaciones"
          items={[
            { label: 'Verificación de email', value: 'Activo', description: 'Se envía email de verificación al registrarse' },
            { label: 'Confirmación de pedido', value: 'Activo', description: 'Email automático al crear un pedido' },
            { label: 'Alerta stock bajo', value: '10 ml', description: 'Umbral para alertas de esencias' },
          ]}
        />

        <ConfigSection
          icon={Shield}
          title="Seguridad"
          items={[
            { label: 'JWT vigencia', value: '24 h', description: 'Duración del token de autenticación' },
            { label: 'Reset de contraseña', value: '1 h', description: 'Vigencia del enlace de recuperación' },
            { label: 'Pasarela de pagos', value: 'Wompi', description: 'Proveedor de pagos integrado' },
          ]}
        />
      </div>
    </div>
  );
}
