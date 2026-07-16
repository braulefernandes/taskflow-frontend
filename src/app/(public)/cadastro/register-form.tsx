"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { isApiError } from "@/lib/api-error";
import { registerSchema, type RegisterFormValues } from "@/schemas/register";
import { registerAccount } from "@/services/auth";
import { useAppForm } from "@/hooks/use-app-form";

const redirectDelayMs = 900;

const defaultValues: RegisterFormValues = {
  name: "",
  email: "",
  organizationName: "",
  password: "",
  passwordConfirmation: "",
};

function getRegisterErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.status === 409 && error.code === "email_already_registered") {
      return "Este e-mail já está cadastrado. Entre ou use outro e-mail.";
    }

    if (error.status === 422 || error.code === "validation_error") {
      return "Confira os campos do formulário e tente novamente.";
    }

    return "Não foi possível concluir o cadastro agora. Tente novamente em instantes.";
  }

  if (error instanceof TypeError) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
  }

  return "Não foi possível concluir o cadastro agora. Tente novamente em instantes.";
}

export function RegisterForm() {
  const router = useRouter();
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useAppForm(registerSchema, {
    defaultValues,
    shouldFocusError: true,
  });
  const mutation = useMutation({
    mutationFn: registerAccount,
    onSuccess: (response) => {
      setSuccessEmail(response.user.email);
      window.setTimeout(() => {
        router.push(`/login?email=${encodeURIComponent(response.user.email)}`);
      }, redirectDelayMs);
    },
    onError: (error) => {
      if (
        isApiError(error) &&
        error.status === 409 &&
        error.code === "email_already_registered"
      ) {
        setError("email", {
          message: "Este e-mail já está cadastrado.",
          type: "server",
        });
      }
    },
  });

  const isSubmitting = mutation.isPending;
  const rootError = mutation.error
    ? getRegisterErrorMessage(mutation.error)
    : undefined;

  return (
    <form
      className="mt-8 space-y-5"
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      {successEmail ? (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
        >
          Cadastro criado para {successEmail}. Redirecionando para o login.
        </div>
      ) : null}

      <ErrorMessage message={rootError} />

      <FormField id="name" label="Nome" error={errors.name?.message}>
        <Input
          id="name"
          autoComplete="name"
          disabled={isSubmitting}
          {...register("name")}
        />
      </FormField>

      <FormField id="email" label="E-mail" error={errors.email?.message}>
        <Input
          id="email"
          autoComplete="email"
          disabled={isSubmitting}
          inputMode="email"
          type="email"
          {...register("email")}
        />
      </FormField>

      <FormField
        id="organizationName"
        label="Nome da organização"
        error={errors.organizationName?.message}
      >
        <Input
          id="organizationName"
          autoComplete="organization"
          disabled={isSubmitting}
          {...register("organizationName")}
        />
      </FormField>

      <FormField
        id="password"
        label="Senha"
        error={errors.password?.message}
        hint="Use de 8 a 128 caracteres, com letras e números."
      >
        <Input
          id="password"
          autoComplete="new-password"
          disabled={isSubmitting}
          type="password"
          {...register("password")}
        />
      </FormField>

      <FormField
        id="passwordConfirmation"
        label="Confirmação de senha"
        error={errors.passwordConfirmation?.message}
      >
        <Input
          id="passwordConfirmation"
          autoComplete="new-password"
          disabled={isSubmitting}
          type="password"
          {...register("passwordConfirmation")}
        />
      </FormField>

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Criando conta..." : "Criar conta"}
      </Button>

      <p className="text-center text-sm text-slate-600">
        Já tem uma conta?{" "}
        <Link className="font-medium text-slate-950 underline" href="/login">
          Entrar
        </Link>
      </p>
    </form>
  );
}
