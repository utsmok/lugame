// Locale types for lugame.
// `Translation` is derived from the base (Dutch) locale so the shape has a
// single source of truth; `en.ts` is checked against it at compile time.

import type { nl } from './nl';

export type Translation = typeof nl;
export type TranslationKey = keyof Translation;
