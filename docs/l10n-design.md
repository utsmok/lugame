# lugame — l10n (Localization) Design

Status: **Design ready for implementation** (2026-07-25). Linked ADR: ADR-0007
(append to `decisions.md` on land). Sequenced **before** theming — theme labels
(animal/goal names) live in these locale files.

## Goal

Move **every** user-visible string into separate, translation-ready locale files
so the game can be translated into any language by adding one file. Today only
`src/i18n.ts` exists (a flat Dutch `T`), and it is **incomplete**: `src/ui/editor.ts`
hardcodes its own Dutch strings and never imports `T`.

## Target structure

```
src/locales/
  nl.ts        Dutch translation (base; verbatim from current i18n.ts + extracted editor strings)
  en.ts        English translation (NEW; same shape as nl)
  types.ts     `export type Translation = typeof import('./nl').nl;`
               `export type TranslationKey = keyof Translation;`
src/i18n.ts    runtime: registry, current locale, Proxy `T`, t(), setLocale(), getLocale()
```

### `src/i18n.ts` runtime contract

- `REGISTRY`: `[{code:'nl', label:'Nederlands', flag:'🇳🇱'}, {code:'en', label:'English', flag:'🇬🇧'}]`
- `DICTS`: `{ nl, en } satisfies Record<string, Translation>` (catches missing keys at compile time).
- **`T: Translation`** is a **Proxy** so `T.foo` always reads from the *current*
  locale's dict → runtime switching works without re-import, and **zero churn**
  at existing `T.foo` call sites in palette.ts/main.ts. Reading an unknown key
  returns the key string itself (helps surface missing translations).
- `getLocale()`, `setLocale(code)` (persists to `localStorage` key `lugame.locale`
  + dispatches a `window` CustomEvent `lugame:locale`), `availableLocales()`,
  `t(key: TranslationKey): string`.
- Default locale: stored choice → `navigator.language` prefix match → `'nl'`.
- Backward compatible: `import { T } from './i18n'` keeps working unchanged.

## Extraction rules — move EVERY user-visible string

1. **Current `i18n.ts` `T`** → `locales/nl.ts` verbatim; mirror to `locales/en.ts` (translate).
2. **`src/ui/editor.ts`** — the big gap. Extract ALL hardcoded Dutch strings and
   replace with `T.<key>`: `DIR_LABEL` (↑N/→E/↓S/←W — arrows stay, N/E/S/W letters
   localise), `TOOL_LABEL`, every button/heading/placeholder/aria-label/hint, and
   any visible text inside the scoped `CSS` template (`content:` rules, button
   labels). Add `en.ts` entries for each.
3. **`src/ui/palette.ts`** — audit every `textContent`/`aria-label`/`placeholder`;
   any not already via `T` must go through `T`. Add missing keys (chip-remove aria,
   expand/collapse aria, badge aria). Note: `COMMAND_LABEL[cmd]` is used at palette.ts:190-191.
4. **`src/game/types.ts`** — `COMMAND_LABEL` (`vooruit`/`links`/`rechts`/`Sst!`) is
   user-visible (button labels/tooltips/aria). Move it OUT of `types.ts` into the
   locale dict keyed by command; keep `COMMAND_EMOJI`/`EMOJI` (pictographic) in
   `types.ts`. Update importers (palette.ts:190, editor.ts).
5. **`index.html`** — keep `<title>` as a neutral fallback; `main.ts` already sets
   `document.title = T.docTitle`. Add `document.documentElement.lang = getLocale()`
   in main.ts on load. (`lang="nl"` stays as the static default.)
6. **`src/style.css`** — scan `::before`/`::after` `content:` for literal text; if
   any, move to DOM via `T`. (Likely none — verify.)

## Settings UI (palette.ts settings overlay, lines 222-241)

Add a **language picker** row mirroring the toggle pattern: a label "Taal /
Language" (`T.language` key) + one button per `availableLocales()` (flag + label),
active highlighted. On click → `setLocale(code)` then `window.location.reload()`
(simplest correct re-render; document this tradeoff in a comment). A live
`relocalize()` pass is a P2 enhancement, not required now.

## Verification (do ALL before reporting done)

1. `npm run typecheck` clean (the `satisfies Record<string, Translation>` guard
   makes `en.ts` missing-key errors compile-time).
2. `npm run build` clean.
3. Browser smoke (http://localhost:5173): switch NL→EN in settings → confirm
   every visible string flips to English with **no blanks/missing keys** across
   board, palette, queue, controls, all overlays, AND the level editor → switch
   back. Screenshot both. (Run this AFTER the ui-ux audit releases the browser.)
4. Grep source for stray Dutch literals that should be in the dict
   (`rg -n "Tik|Level|Start|Wissen|Instellingen|Opslaan|Sluiten|Nieuw" src`) and
   confirm each is either via `T` or intentionally non-UI (comments).

## Constraints

- Real code change — apply directly to the working tree (other agent is dormant).
- NO formatters, NO test suite (none exists).
- Do NOT change game logic, levels, audio, or rendering — only text/strings +
  locale infrastructure + the one settings UI row.
- Preserve all existing behaviour; this is purely an l10n refactor + EN locale.
- Coordinate with theming: leave room for `theme.<id>.name` / `animal.<id>` /
  `goal.<id>` keys (theming task adds them).
