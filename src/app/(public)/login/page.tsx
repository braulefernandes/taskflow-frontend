import { Suspense } from "react";
import { LoginForm } from "@/app/(public)/login/login-form";
import { Loading } from "@/components/ui/loading";

export default function LoginPage() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          TaskFlow
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Entre na sua conta
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Use seu e-mail e senha para acessar sua organizacao no TaskFlow.
        </p>
      </div>
      <Suspense fallback={<Loading label="Carregando login" />}>
        <LoginForm />
      </Suspense>
    </section>
  );
}
