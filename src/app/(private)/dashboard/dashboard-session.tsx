"use client";

import { Loading } from "@/components/ui/loading";
import { useSession } from "@/providers/session-provider";

const roleLabels = { ADMIN: "Administrador", MANAGER: "Gerente", AGENT: "Agente", REQUESTER: "Solicitante" } as const;

export function DashboardSession() {
  const { status, session } = useSession();
  if (status === "loading") return <Loading label="Carregando sessão" />;
  if (status === "unauthenticated" || !session) return <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Nenhuma sessão autenticada foi encontrada.</p>;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-slate-950">Sua conta</h2>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        <Info label="Nome" value={session.user.name} />
        <Info label="E-mail" value={session.user.email} />
        <Info label="Organização" value={session.organization.name} />
        <Info label="Papel" value={roleLabels[session.membership.role]} />
      </dl>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</dd></div>; }
