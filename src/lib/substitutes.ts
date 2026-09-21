import { z } from 'zod';
import { instruments } from './i18n';
import type { Database } from './database.types';
export type Substitute = Database['public']['Tables']['ensemble_substitutes']['Row'];
export const substituteSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  instrument: z.enum(Object.keys(instruments) as [string, ...string[]]),
  phone: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[+\d\s().-]+$/),
  email: z.union([z.email().max(254), z.literal('')]).default(''),
});
