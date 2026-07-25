# Asset credits — lugame

## Sound

| File | What | Source | Author | License |
| --- | --- | --- | --- | --- |
| `audio/fan.mp3` | peacock call (the "Shoo!" special) | [Peacock2.ogg](https://commons.wikimedia.org/wiki/File:Peacock2.ogg) — Wikimedia Commons | [Secretlondon](https://commons.wikimedia.org/wiki/User:Secretlondon) | **CC BY-SA 3.0** |
| `audio/music.mp3` | background music (loop) | "Carefree" — [incompetech.com](https://incompetech.com/music/royalty-free/music.html) | [Kevin MacLeod](https://incompetech.com) | **CC BY 4.0** |

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

Characters and goals render at runtime as emoji on an HTML5 Canvas (🦚 peacock,
🍪 cookie, 🐮🐷🐑🐔 farm animals) — `src/game/render.ts`.

The scenery (trees, bushes, flowers, grass tufts) uses real pixel-art decor
sprites from a free CC0 tileset:

| Files | What | Source | Author | License |
| --- | --- | --- | --- | --- |
| `img/tile_grass.png`, `tile_dirt.png` | seamless grass + dirt ground tiles | [Simple Tile Set Grass and Dirt Path 32×32](https://opengameart.org/content/simple-tile-set-grass-and-dirt-path-32x32) — OpenGameArt | [GrumpyDiamond](https://opengameart.org/users/grumpydiamond) | **CC0** |
| `img/tree.png`, `tree2.png`, `pine.png`, `bush.png`, `flowers.png`, `flowers2.png`, `grass.png` | top-down trees & bushes decor | [Trees & Bushes](https://opengameart.org/content/trees-bushes) — OpenGameArt | [ansimuz (Luis Zuno)](https://ansimuz.com) | **CC0** |

> **Music attribution (required by CC BY 4.0):** "Carefree" by Kevin MacLeod
> (incompetech.com), licensed under CC BY 4.0. Bundled here as a 42 s mono
> loop with a fade-out. Procedural music remains as a fallback if the file
> is missing.
>
> The decor sprites were extracted from the source spritesheet
> (`trees-and-bushes.png`) by flood-filling the olive-green background to
> transparency and splitting into individual sprites. The ground tiles were
> sliced from a 32×32 tile sheet. All three art assets are CC0 (no
> attribution required) but are credited here with thanks.

A `Tileset` interface (`render.ts`) makes the look swappable — additional
tilesets can be added later by implementing it.
