import { z } from 'zod';
import { instruments, type Locale } from './i18n';
export const ensembleTypes = {
  symphony: ['Symphony orchestra', 'Symfoniorkester'],
  chamber: ['Chamber orchestra', 'Kammerorkester'],
  strings: ['String orchestra', 'Strygeorkester'],
  wind: ['Wind orchestra', 'Harmoniorkester'],
  brass: ['Brass band', 'Brassband'],
  big_band: ['Big band', 'Bigband'],
  custom: ['Other / custom ensemble', 'Andet / eget ensemble'],
} as const;
export type EnsembleType = keyof typeof ensembleTypes;
export const chairSchema = z.object({
  instrument: z.enum(Object.keys(instruments) as [string, ...string[]]),
  en: z.string().trim().min(1).max(100),
  da: z.string().trim().min(1).max(100),
});
export const seatingSchema = z.array(chairSchema).max(100);
export type Chair = z.infer<typeof chairSchema>;
const chair = (instrument: string, en: string, da: string): Chair => ({ instrument, en, da });
const numbered = (instrument: keyof typeof instruments, count: number) =>
  Array.from({ length: count }, (_, i) =>
    chair(
      instrument,
      `${instruments[instrument][0]} ${i + 1}`,
      `${instruments[instrument][1]} ${i + 1}`,
    ),
  );
const strings = () => [
  chair('violin', 'Violin I', 'Violin I'),
  chair('violin', 'Violin II', 'Violin II'),
  ...['viola', 'cello', 'double_bass'].map((i) =>
    chair(
      i,
      instruments[i as keyof typeof instruments][0],
      instruments[i as keyof typeof instruments][1],
    ),
  ),
];
export function seatingTemplate(type: EnsembleType): Chair[] {
  switch (type) {
    case 'strings':
      return strings();
    case 'chamber':
      return [
        ...strings(),
        ...['flute', 'oboe', 'clarinet', 'bassoon', 'horn'].flatMap((i) =>
          numbered(i as keyof typeof instruments, 2),
        ),
      ];
    case 'symphony':
      return [
        ...strings(),
        ...['flute', 'oboe', 'clarinet', 'bassoon'].flatMap((i) =>
          numbered(i as keyof typeof instruments, 2),
        ),
        ...numbered('horn', 4),
        ...numbered('trumpet', 3),
        ...numbered('trombone', 2),
        ...numbered('bass_trombone', 1),
        ...numbered('tuba', 1),
        chair('percussion', 'Timpani', 'Pauker'),
        ...numbered('percussion', 2),
        ...numbered('harp', 1),
      ];
    case 'wind':
      return [
        ...numbered('flute', 2),
        ...numbered('oboe', 2),
        ...numbered('clarinet', 3),
        chair('clarinet', 'Bass clarinet', 'Basklarinet'),
        ...numbered('bassoon', 2),
        chair('saxophone', 'Alto saxophone', 'Altsaxofon'),
        chair('saxophone', 'Tenor saxophone', 'Tenorsaxofon'),
        chair('saxophone', 'Baritone saxophone', 'Barytonsaxofon'),
        ...numbered('horn', 4),
        ...numbered('trumpet', 3),
        ...numbered('trombone', 3),
        ...numbered('euphonium', 2),
        ...numbered('tuba', 1),
        ...numbered('percussion', 3),
      ];
    case 'brass':
      return [
        chair('cornet', 'Soprano cornet', 'Soprankornet'),
        chair('cornet', 'Solo cornet', 'Solokornet'),
        chair('cornet', 'Repiano cornet', 'Repianokornet'),
        chair('cornet', 'Cornet 2', 'Kornet 2'),
        chair('cornet', 'Cornet 3', 'Kornet 3'),
        ...numbered('flugelhorn', 1),
        ...numbered('tenor_horn', 3),
        ...numbered('baritone_horn', 2),
        ...numbered('euphonium', 2),
        ...numbered('trombone', 2),
        ...numbered('bass_trombone', 1),
        chair('tuba', 'E-flat bass', 'Es-bas'),
        chair('tuba', 'B-flat bass', 'B-bas'),
        ...numbered('percussion', 3),
      ];
    case 'big_band':
      return [
        chair('saxophone', 'Alto saxophone 1', 'Altsaxofon 1'),
        chair('saxophone', 'Alto saxophone 2', 'Altsaxofon 2'),
        chair('saxophone', 'Tenor saxophone 1', 'Tenorsaxofon 1'),
        chair('saxophone', 'Tenor saxophone 2', 'Tenorsaxofon 2'),
        chair('saxophone', 'Baritone saxophone', 'Barytonsaxofon'),
        ...numbered('trumpet', 4),
        ...numbered('trombone', 3),
        ...numbered('bass_trombone', 1),
        ...numbered('piano', 1),
        ...numbered('guitar', 1),
        ...numbered('bass_guitar', 1),
        ...numbered('drums', 1),
      ];
    default:
      return [];
  }
}
export function readSeating(value: unknown): Chair[] {
  const parsed = seatingSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}
export function chairLabel(chair: Chair, locale: Locale) {
  return chair[locale];
}
