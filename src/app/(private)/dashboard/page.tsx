import { DashboardSummary } from "@/app/(private)/dashboard/dashboard-summary";
import { DashboardDetails } from "@/app/(private)/dashboard/dashboard-details";

export default function DashboardPage() {
  return <section aria-labelledby="dashboard-title"><div className="mb-7"><p className="text-sm font-semibold text-indigo-600">Visão geral</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl" id="dashboard-title">Dashboard</h1><p className="mt-2 text-sm text-slate-600">Acompanhe os principais indicadores das solicitações da organização.</p></div><div className="space-y-6"><DashboardSummary /><DashboardDetails /></div></section>;
}
