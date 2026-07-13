import { DashboardSession } from "@/app/(private)/dashboard/dashboard-session";

export default function DashboardPage() {
  return (
    <section className="w-full">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Dashboard inicial
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Sessao
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600">
          Dados publicos retornados por /auth/me. A protecao completa das rotas
          privadas sera refinada na proxima branch.
        </p>
      </div>
      <DashboardSession />
    </section>
  );
}
