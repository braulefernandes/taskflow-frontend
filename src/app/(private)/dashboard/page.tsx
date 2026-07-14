import { DashboardSession } from "@/app/(private)/dashboard/dashboard-session";

export default function DashboardPage() {
  return (
    <section aria-labelledby="dashboard-title">
      <div className="mb-7">
        <p className="text-sm font-semibold text-indigo-600">Visão geral</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl" id="dashboard-title">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Acompanhe as informações da sua conta e organização.</p>
      </div>
      <DashboardSession />
    </section>
  );
}
