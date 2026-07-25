// lugame i18n runtime.
//
// `T` is a Proxy that always reads from the *current* locale's dictionary, so
// `import { T } from './i18n'` keeps working with zero churn at call sites and
// a locale switch takes effect after a reload (see the language picker in
// palette.ts — a live relocalize() pass is a P2 enhancement, not required now).
// Reading an unknown key returns the key string itself, which surfaces missing
// translations instead of silently rendering a blank.

import { nl } from './locales/nl';
import { en } from './locales/en';
import type { Translation, TranslationKey } from './locales/types';

export type { Translation, TranslationKey };

/** One selectable language, shown in the settings picker. */
export interface LocaleMeta {
  code: string;
  label: string;
  flag: string;
}

/** All available locales, in picker order. */
export const REGISTRY: readonly LocaleMeta[] = [
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

/**
 * All locale dictionaries. `satisfies Record<string, Translation>` makes a
 * missing key in any non-base locale (e.g. en.ts) a compile-time error.
 */
const DICTS = { nl, en } satisfies Record<string, Translation>;

type LocaleCode = keyof typeof DICTS;

const STORAGE_KEY = 'lugame.locale';
const LOCALE_EVENT = 'lugame:locale';

/** stored choice → navigator.language prefix match → 'nl'. */
function detectDefault(): LocaleCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in DICTS) return stored as LocaleCode;
  } catch {
    /* localStorage may be unavailable */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || '';
  const prefix = nav.toLowerCase();
  for (const loc of REGISTRY) {
    if (prefix.startsWith(loc.code)) return loc.code as LocaleCode;
  }
  return 'nl';
}

let current: LocaleCode = detectDefault();

/** The active locale code (e.g. 'nl', 'en'). */
export function getLocale(): string {
  return current;
}

/**
 * Switch locale: persist to `lugame.locale` and dispatch a `lugame:locale`
 * CustomEvent on window. Callers (the settings picker) reload afterwards.
 * Unknown codes are ignored.
 */
export function setLocale(code: string): void {
  if (!(code in DICTS)) return;
  current = code as LocaleCode;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* localStorage may be unavailable */
  }
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: { code } }));
}

/** Locales available in the settings picker. */
export function availableLocales(): readonly LocaleMeta[] {
  return REGISTRY;
}

/** Look up a single key in the current locale (unknown key → the key string). */
export function t(key: TranslationKey): string {
  const d = DICTS[current] as Record<string, unknown>;
  const v = d[key];
  return typeof v === 'string' ? v : (key as string);
}

/**
 * Untyped lookup for dynamically-computed keys (e.g. `theme${Capitalize(id)}Name`).
 * Prefer `T.key` / `t(key)` for statically-known keys; use this only when the
 * key is assembled at runtime. Unknown key → the key string itself.
 */
export function tr(key: string): string {
  const d = DICTS[current] as Record<string, unknown>;
  const v = d[key];
  return typeof v === 'string' ? v : key;
}

/**
 * Live string table for the current locale. Property reads resolve through the
 * Proxy on every access, so a locale switch is reflected without re-import.
 */
export const T: Translation = new Proxy({} as Translation, {
  get(_target, prop) {
    if (typeof prop !== 'string') return undefined;
    const d = DICTS[current] as Record<string, unknown>;
    return prop in d ? d[prop] : prop;
  },
}) as Translation;
