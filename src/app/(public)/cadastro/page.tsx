import { RegisterForm } from "@/app/(public)/cadastro/register-form";

export default function CadastroPage() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          TaskFlow
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Crie sua conta
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Cadastre seu usuário e a organização inicial para comecar a
          configurar o TaskFlow.
        </p>
      </div>
      <RegisterForm />
    </section>
  );
}
