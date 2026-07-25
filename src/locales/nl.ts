// Dutch (Nederlands) UI strings for lugame — the base locale.
// This is the source of truth for the Translation shape (see types.ts).
// English mirrors this file in en.ts.

export const nl = {
  brand: '🦚 lugame',
  docTitle: 'lugame — pauw wil koekjes!',

  // program queue
  emptyHint: 'Druk op de knoppen hieronder om stappen toe te voegen…',
  steps: 'Stappen',
  showAllSteps: 'Toon alle stappen',
  allSteps: 'Alle stappen',
  closeAllSteps: 'Sluit stapoverzicht',
  removeStep: 'Verwijder stap',

  // controls
  run: '▶ Start',
  clear: '↺ Wissen',

  // win overlay
  winEmoji: '🦚🎉🍪',
  winMsg: 'Dat was lekker!',
  next: 'Volgende ▶',
  playAgain: 'Opnieuw ↻',

  // level select
  pickLevel: 'Kies een level',
  closeLevelSelect: 'Sluit levelkeuze',
  myLevels: 'Mijn levels',
  levelWord: 'Level',
  deleteCustomLevel: 'Verwijder level',
  confirmDeleteLevel: 'Dit level verwijderen?',

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
  holdOnError: 'Pauze bij fout',
  holdOnErrorHint: 'Pauzeer bij een foute stap zodat je kan zien wat er mis is.',
  music: 'Muziek',
  sound: 'Geluid',
  language: 'Taal',

  // themes (settings row + theme names + goal/animal labels per docs/theming-design.md)
  theme: 'Thema',
  themeFarmName: 'Boerderij',
  themeDesertName: 'Woestijn',
  goalFarm: 'koekje',
  goalDesert: 'dadels',
  animalCow: 'Koe',
  animalPig: 'Varken',
  animalSheep: 'Schaap',
  animalChicken: 'Kip',
  animalSnake: 'Slang',
  animalDromedary: 'Dromedaris',
  animalScorpion: 'Schorpioen',
  animalLizard: 'Hagedis',

  // command labels (moved out of game/types.ts — pictographic EMOJI maps stay there)
  cmdForward: 'Stap',
  cmdLeft: 'Links',
  cmdRight: 'Rechts',
  cmdFan: 'AhaAha!!',

  // level editor — direction buttons (arrows stay; compass letters localisable)
  dirN: '\u2191N',
  dirE: '\u2192E',
  dirS: '\u2193S',
  dirW: '\u2190W',

  // level editor — chrome
  editorTitle: 'Leveleditor',
  edTools: 'Gereedschap',
  edSize: 'Grootte',
  edCols: 'Kolommen',
  edRows: 'Rijen',
  edStartDir: 'Startrichting',
  edName: 'Naam',
  edNamePlaceholder: 'Mijn toffe level',
  edEnergy: 'Energie',
  edEnergyNone: 'Geen',

  // level editor — tools
  toolPad: 'Pad',
  toolEraser: 'Gras',
  toolStart: 'Start',
  toolGoal: 'Koekje',
  toolCow: 'Koe',
  toolPig: 'Varken',
  toolSheep: 'Schaap',
  toolChicken: 'Kip',
  toolWipe: 'Wissen',

  // level editor — action buttons
  edPlay: '\u25B6 Speel',
  edSave: '\u{1F4BE} Bewaar',
  edCopy: '\u{1F4CB} Kopieer',
  edPaste: '\u{1F4CE} Plak',
  edClear: '\u{1F5D1} Leeg',
  edClose: '\u2715 Sluiten',
  edCopied: 'Gekopieerd!',
  edPastePrompt: 'Plak JSON:',

  // level editor — validation errors
  edErrPath: 'Er moet tenminste \u00e9\u00e9n pad zijn.',
  edErrStart: 'Plaats een startpunt.',
  edErrStartOnPath: 'Start moet op een pad zijn.',
  edErrGoal: 'Plaats tenminste \u00e9\u00e9n koekje.',
  edErrGoalOnPath: 'Koekjes moeten op het pad staan.',
  edErrAnimalOnPath: 'Dieren moeten op het pad staan.',
  edErrStartGoal: 'Start en koekje mogen niet op dezelfde plaats.',
};
