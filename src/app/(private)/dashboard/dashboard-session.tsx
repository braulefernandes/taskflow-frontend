"use client";

import { Loading } from "@/components/ui/loading";
import { useSession } from "@/providers/session-provider";

export function DashboardSession() {
  const { status, session } = useSession();

  if (status === "loading") {
    return <Loading label="Carregando sessao" />;
  }

  if (status === "unauthenticated" || !session) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Nenhuma sessao autenticada foi encontrada neste navegador.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
        Sessao autenticada.
      </p>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <dt className="text-sm font-medium text-slate-500">Nome</dt>
          <dd className="text-base font-semibold text-slate-950">
            {session.user.name}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-sm font-medium text-slate-500">E-mail</dt>
          <dd className="text-base font-semibold text-slate-950">
            {session.user.email}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-sm font-medium text-slate-500">Organizacao</dt>
          <dd className="text-base font-semibold text-slate-950">
            {session.organization.name}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-sm font-medium text-slate-500">Papel</dt>
          <dd className="text-base font-semibold text-slate-950">
            {session.membership.role}
          </dd>
        </div>
      </dl>
    </div>
  );
}
