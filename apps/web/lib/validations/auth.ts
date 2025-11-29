import { z } from 'zod'

export const storeTokenSchema = z.object({
  token: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
})

export const validateTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export type StoreTokenInput = z.infer<typeof storeTokenSchema>
export type ValidateTokenInput = z.infer<typeof validateTokenSchema>
