import { z } from "zod";

const requiredMessage = "Campo obrigatorio.";
const passwordMessage =
  "A senha deve ter entre 8 e 128 caracteres e conter letras e numeros.";

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, requiredMessage)
      .max(255, "Informe no maximo 255 caracteres."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, requiredMessage)
      .email("Informe um e-mail valido.")
      .max(320, "Informe no maximo 320 caracteres."),
    organizationName: z
      .string()
      .trim()
      .min(1, requiredMessage)
      .max(255, "Informe no maximo 255 caracteres."),
    password: z
      .string()
      .min(1, requiredMessage)
      .min(8, passwordMessage)
      .max(128, passwordMessage)
      .regex(/[A-Za-z]/, passwordMessage)
      .regex(/\d/, passwordMessage),
    passwordConfirmation: z.string().min(1, requiredMessage),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas informadas nao coincidem.",
    path: ["passwordConfirmation"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
