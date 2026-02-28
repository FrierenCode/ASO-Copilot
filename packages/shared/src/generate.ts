import { z } from 'zod'

export const GenerateRequestSchema = z.object({
  appName: z.string(),
  category: z.string(),
  screenshots: z.array(z.string()).length(6),
})

export const GenerateResponseSchema = z.object({
  variants: z.object({
    A: z.array(z.string()),
    B: z.array(z.string()),
    C: z.array(z.string()),
  }),
  score: z.number(),
  recommendation: z.array(z.string()),
})

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>
