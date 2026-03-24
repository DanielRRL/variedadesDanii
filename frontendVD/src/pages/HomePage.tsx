/** HomePage — Landing page with hero section and featured essences. */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h1 className="font-heading text-4xl font-bold text-brand-pink mb-3">
          Variedades DANII
        </h1>
        <p className="text-muted text-lg mb-6">
          Esencias únicas, aromas que te definen. 🌸
        </p>
        <a
          href="/catalogo"
          className="bg-brand-pink text-white font-body font-medium px-8 py-3 rounded-full hover:bg-brand-pink-dark transition-colors"
        >
          Ver Catálogo
        </a>
      </section>
    </main>
  );
}
