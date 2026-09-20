import { z } from 'zod';
import { ensembleTypes, seatingSchema } from './seating';
import type { Database } from './database.types';
export type Ensemble = Database['public']['Tables']['ensembles']['Row'];
export const ensembleSchema = z
  .object({
    id: z.uuid(),
    ensemble_type: z.enum(Object.keys(ensembleTypes) as [string, ...string[]]).default('custom'),
    seating: seatingSchema.default([]),
    name: z.string().trim().min(1).max(150),
    venue: z.string().trim().min(1).max(200),
    address: z.string().trim().max(300).default(''),
    description: z.string().trim().max(5000).default(''),
    compensation_type: z.enum(['paid', 'unpaid', 'negotiable']),
    compensation_amount: z.string().max(12).default(''),
    currency: z.enum(['DKK', 'EUR', 'SEK', 'NOK', 'GBP']),
    organizer_name: z.string().trim().min(1).max(100),
    organizer_phone: z.string().trim().max(40).default(''),
  })
  .refine(
    (v) =>
      v.compensation_type !== 'paid' ||
      (/^\d+(\.\d{1,2})?$/.test(v.compensation_amount) &&
        Number(v.compensation_amount) > 0 &&
        Number(v.compensation_amount) <= 1000000),
  );
export const joinSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(40).default(''),
});
export function ensembleDefaults(ensemble: Ensemble) {
  return {
    ensemble_id: ensemble.id,
    venue: ensemble.venue,
    address: ensemble.address,
    description: ensemble.description,
    compensation_type: ensemble.compensation_type,
    compensation_amount: ensemble.compensation_amount?.toString() || '',
    currency: ensemble.currency || 'DKK',
  };
}
