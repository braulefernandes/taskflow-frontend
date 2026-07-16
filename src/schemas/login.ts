import { z } from "zod";

const requiredMessage = "Campo obrigatório.";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, requiredMessage)
    .email("Informe um e-mail válido.")
    .max(320, "Informe no máximo 320 caracteres."),
  password: z
    .string()
    .min(1, requiredMessage)
    .max(128, "Informe no máximo 128 caracteres."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
