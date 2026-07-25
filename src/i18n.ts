// Centralized Dutch (Nederlands) UI strings for lugame.
// Single source of truth — a future English toggle is a drop-in swap of this table.

export const T = {
  brand: '🦚 lugame',
  docTitle: 'lugame — pauw & het koekje',

  // program queue
  emptyHint: 'Tik op de knoppen hieronder om stappen toe te voegen…',

  // controls
  run: '▶ Start',
  clear: '↺ Wissen',

  // win overlay
  winEmoji: '🦚🎉🍪',
  winMsg: 'Koekjestijd!',
  next: 'Volgende ▶',
  playAgain: 'Opnieuw ↻',

  // level select
  pickLevel: 'Kies een level',
  closeLevelSelect: 'Sluit levelkeuze',
  myLevels: 'Mijn levels',

  // topbar
  prevLevel: 'Vorig level',
  nextLevel: 'Volgend level',
  levelSelect: 'Levelkiezer',
  settings: 'Instellingen',
  openEditor: 'Maak een level',

  // settings panel
  settingsTitle: 'Instellingen',
  closeSettings: 'Sluiten',
  easy: 'Makkelijke modus',
  easyHint: 'Bij een botsing gaat het spelletje gewoon door.',
  holdOnError: 'Houden bij fout',
  holdOnErrorHint: 'Houd de pauw op de foute stap tot je opnieuw start.',
  music: 'Muziek',
  sound: 'Geluid',
} as const;
