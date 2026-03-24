/** ProfilePage — User profile, loyalty info, and settings. */
import { useAuthStore } from '../stores/authStore';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <h1 className="font-heading text-2xl font-bold text-text-primary mb-2">
        Mi Perfil
      </h1>
      {user && (
        <p className="text-muted text-sm">
          {user.name} · {user.email}
        </p>
      )}
    </main>
  );
}
