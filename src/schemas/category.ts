import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Campo obrigatorio.").max(255, "Informe no maximo 255 caracteres."),
  description: z.string().trim().max(2000, "Informe no maximo 2000 caracteres."),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
