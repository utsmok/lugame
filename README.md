# lugame

A grid-based programming game for very young kids (4+). The player queues simple
commands (move forward, turn left, turn right), presses **Run**, and watches a
character carry them out step by step to reach a goal.

Inspired by **[Lightbot](https://github.com/haan/Lightbot)**,
**[GCompris](https://gcompris.net)** (the `programmingMaze` / penguin-to-fish
activity), **Karel the Robot**, and **turtle graphics**.

> Status: **alpha live** at <https://utsmok.github.io/lugame/> — see
> [`docs/decisions.md`](docs/decisions.md) (ADR-0005) and [`docs/audits/`](docs/audits).

## Goals

- **Pre-literate friendly.** No reading required: big icons, big buttons, the
  program is a strip of picture-tiles.
- **Touch-first.** Must work on a tablet / parent's phone, not just a laptop.
- **Gentle.** No harsh failure — a wrong step just resets the character with a
  friendly "whoops".
- **Extensible.** Start with move/turn; the design leaves room for loops,
  procedures, and a level editor later.

## Inspirations (open source)

| Project | License | What we borrow |
| --- | --- | --- |
| [haan/Lightbot](https://github.com/haan/Lightbot) | MIT | Core loop: build program → run → highlight each step. Robot + goal-tile theme. |
| [GCompris `programmingMaze`](https://github.com/gcompris/GCompris-qt) | GPL-3.0-or-later | Instruction set (move/turn/procedure/loop), dead-end handling, run-button gating. *Design inspiration only — no code copied.* |
| [asweigart/botbright](https://github.com/asweigart/botbright) | MIT | Minimal single-file Lightbot clone reference. |

## License

MIT — see [LICENSE](LICENSE). Chosen to match Lightbot and keep the project
maximally reusable for teachers/parents.
