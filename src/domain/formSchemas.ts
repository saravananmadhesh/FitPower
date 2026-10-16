import { z } from 'zod';
import { SEXES } from './profile';

/** v1 parity: `if(!v||v<30||v>250) alert("Enter a valid weight in kg")`. */
export const weightFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  kg: z
    .number({ error: 'Enter a valid weight' })
    .min(30, 'Enter a valid weight in kg')
    .max(250, 'Enter a valid weight in kg'),
});
export type WeightFormValues = z.infer<typeof weightFormSchema>;

const optionalPositiveNumber = z.preprocess(
  (val) => (typeof val === 'number' && Number.isNaN(val) ? undefined : val),
  z.number().positive().optional(),
);

/** v1 parity: `if(!waist&&!chest&&!hip) alert("Enter at least one measurement")`. */
export const measurementFormSchema = z
  .object({
    date: z.string().min(1, 'Date is required'),
    waist: optionalPositiveNumber,
    chest: optionalPositiveNumber,
    hip: optionalPositiveNumber,
  })
  .refine((v) => v.waist !== undefined || v.chest !== undefined || v.hip !== undefined, {
    message: 'Enter at least one measurement',
    path: ['waist'],
  });
/** Post-parse shape (numbers or undefined) — what `onSubmit` receives. */
export type MeasurementFormValues = z.infer<typeof measurementFormSchema>;
/** Pre-parse shape (RHF's raw field values, incl. NaN from empty number inputs). */
export type MeasurementFormInput = z.input<typeof measurementFormSchema>;

/**
 * v1 parity: `if(v){ nToday().kcal += v; ... }` — any non-zero number (incl.
 * negative, for correcting an over-logged entry) is accepted; zero is not.
 */
export const quickAddFormSchema = z.object({
  amount: z
    .number({ error: 'Enter a number' })
    .refine((v) => v !== 0, { message: 'Enter a non-zero amount' }),
});
export type QuickAddFormValues = z.infer<typeof quickAddFormSchema>;

export const stepsFormSchema = z.object({
  steps: z.number({ error: 'Enter a number' }).min(0, 'Enter a positive number'),
});
export type StepsFormValues = z.infer<typeof stepsFormSchema>;

/** The profile fields editable in Settings; everything else comes from onboarding. */
export const profileFormSchema = z.object({
  name: z.string().trim().max(60),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate'),
  sex: z.enum(SEXES),
  heightCm: z.number({ error: 'height' }).min(100, 'height').max(250, 'height'),
  goalWeightKg: z.number({ error: 'goalWeight' }).min(30, 'goalWeight').max(300, 'goalWeight'),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;
