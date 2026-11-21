import { z } from 'zod';

// Decode only the fields each UI consumes. Extra API fields remain compatible.
// These schemas never grant server permissions or change authentication rules.
export const sessionIndicatorSchema = z.object({
  me: z.object({ roleCode: z.string().optional() }).nullish(),
});

export const watchAccessSchema = z.object({
  allowed: z.boolean().optional(),
  error: z.object({ code: z.string().optional() }).optional(),
  player: z
    .object({
      embedUrl: z.string().nullable().optional(),
      altUrl: z.string().nullable().optional(),
    })
    .optional(),
  xp: z.object({ gained: z.number().optional(), status: z.string().optional() }).optional(),
});

export type WatchAccessResponse = z.infer<typeof watchAccessSchema>;
