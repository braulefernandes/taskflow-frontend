import { z } from "zod";

export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type ApiErrorSchema = z.infer<typeof apiErrorSchema>;
