"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { isApiError } from "@/lib/api-error";
import { loginSchema, type LoginFormValues } from "@/schemas/login";
import { useAppForm } from "@/hooks/use-app-form";
import { useSession } from "@/providers/session-provider";

function getLoginErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 401 || error.code === "invalid_credentials") {
      return "E-mail ou senha inválidos.";
    }

    if (error.status === 422 || error.code === "validation_error") {
      return "Confira os campos do formulário e tente novamente.";
    }

    return "Não foi possível entrar agora. Tente novamente em instantes.";
  }

  if (error instanceof TypeError) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
  }

  return "Não foi possível entrar agora. Tente novamente em instantes.";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, signIn } = useSession();
  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors },
  } = useAppForm(loginSchema, {
    defaultValues: {
      email: searchParams.get("email") ?? "",
      password: "",
    },
    shouldFocusError: true,
  });
  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="mt-8">
        <Loading label="Validando sessão" />
      </div>
    );
  }

  const isSubmitting = mutation.isPending;
  const rootError = mutation.error
    ? getLoginErrorMessage(mutation.error)
    : undefined;

  function handleFieldChange() {
    if (mutation.error) {
      mutation.reset();
    }

    clearErrors();
  }

  return (
    <form
      className="mt-8 space-y-5"
      noValidate
      onSubmit={handleSubmit((values: LoginFormValues) =>
        mutation.mutate(values),
      )}
    >
      <ErrorMessage message={rootError} />

      <FormField id="email" label="E-mail" error={errors.email?.message}>
        <Input
          id="email"
          autoComplete="email"
          disabled={isSubmitting}
          inputMode="email"
          type="email"
          {...register("email", { onChange: handleFieldChange })}
        />
      </FormField>

      <FormField id="password" label="Senha" error={errors.password?.message}>
        <Input
          id="password"
          autoComplete="current-password"
          disabled={isSubmitting}
          type="password"
          {...register("password", { onChange: handleFieldChange })}
        />
      </FormField>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Entrando..." : "Entrar"}
      </Button>

      <p className="text-center text-sm"><Link className="font-medium text-slate-950 underline" href="/recuperar-senha">Esqueci minha senha</Link></p>

      <p className="text-center text-sm text-slate-600">
        Ainda não tem conta?{" "}
        <Link className="font-medium text-slate-950 underline" href="/cadastro">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
