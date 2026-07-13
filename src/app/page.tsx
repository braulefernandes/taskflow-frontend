import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16">
      <section className="max-w-2xl space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Fundacao frontend
        </p>
        <h1 className="text-4xl font-semibold text-slate-950">
          TaskFlow esta pronto para receber as proximas telas.
        </h1>
        <p className="text-base leading-7 text-slate-600">
          App Router, providers globais, cliente HTTP e estrutura inicial de
          rotas foram preparados sem implementar autenticacao ou dashboard real.
        </p>
      </section>

      <nav className="flex flex-wrap gap-3" aria-label="Rotas iniciais">
        <Button asChild>
          <Link href="/login">Login</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/cadastro">Cadastro</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </nav>
    </main>
  );
}
