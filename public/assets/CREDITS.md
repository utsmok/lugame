# Asset credits — lugame

## Sound

| File | What | Source | Author | License |
| --- | --- | --- | --- | --- |
| `audio/fan.mp3` | peacock call (the "Shoo!" special) | [Peacock2.ogg](https://commons.wikimedia.org/wiki/File:Peacock2.ogg) — Wikimedia Commons | [Secretlondon](https://commons.wikimedia.org/wiki/User:Secretlondon) | **CC BY-SA 3.0** |

> **Attribution (required by the license):** "Peacock call" by Secretlondon is
> licensed under CC BY-SA 3.0 via Wikimedia Commons.
> The version bundled here is a derivative — a 1.8 s cut taking the first two of
> the source's three call repeats, with loudness normalization and a 0.2 s
> fade-out, re-encoded to mono 44.1 kHz MP3.

All other sound effects — `step`, `turn`, `flee`, `win`, `bump`, `click` — are
synthesized procedurally at runtime via the Web Audio API
(`src/game/audio.ts`); no asset files are needed for them. A peacock's call
can't be synthesized convincingly, so the call is the one recorded asset. To
override any procedural sound, drop a matching `*.mp3` into this folder — the
engine auto-loads it on first interaction.

## Graphics

All visuals render at runtime as emoji on an HTML5 Canvas (🦚 peacock, 🍪 cookie,
🐮🐷🐑🐔 farm animals) — `src/game/render.ts`. No image assets are bundled, which
keeps the download tiny (~7 KB JS gzipped) and the look consistent across
platforms.
