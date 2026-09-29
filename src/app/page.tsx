export default function HomePage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <section aria-labelledby="page-title" className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          <span aria-hidden="true" className="size-2 rounded-full bg-teal-600" />
          {process.env.NODE_ENV === "development"
            ? "Ambiente de desenvolvimento"
            : "Versão inicial"}
        </p>
        <h1 id="page-title" className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          ADSCOM Dashboard
        </h1>
        <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
          Plataforma de presença e evolução digital.
        </p>
      </section>
    </main>
  );
}
