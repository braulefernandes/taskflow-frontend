import { ForgotPasswordForm } from "@/components/password-reset/forgot-password-form";

export default function Page() {
  return <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12"><div><p className="text-sm font-semibold uppercase tracking-wide text-slate-500">TaskFlow</p><h1 className="mt-3 text-3xl font-semibold text-slate-950">Recuperar senha</h1><p className="mt-3 text-sm leading-6 text-slate-600">Informe seu e-mail para receber as instrucoes de redefinição.</p></div><ForgotPasswordForm /></section>;
}
