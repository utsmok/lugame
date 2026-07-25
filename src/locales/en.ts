// English UI strings for lugame — mirrors nl.ts shape.
// `satisfies Record<string, Translation>` in i18n.ts makes a missing key here
// a compile-time error, so this file must stay in lock-step with nl.ts.

import type { Translation } from './types';

export const en: Translation = {
  brand: '🦚 lugame',
  docTitle: 'lugame — peacock & cookie',

  // program queue
  emptyHint: 'Tap the buttons below to add steps…',
  steps: 'Steps',
  showAllSteps: 'Show all steps',
  allSteps: 'All steps',
  closeAllSteps: 'Close all steps',
  removeStep: 'Remove step',

  // controls
  run: '▶ Start',
  clear: '↺ Clear',
  step: '👣 Tap',

  // win overlay
  winEmoji: '🦚🎉🍪',
  winMsg: 'Cookie time!',
  next: 'Next ▶',
  playAgain: 'Again ↻',

  // level select
  pickLevel: 'Pick a level',
  closeLevelSelect: 'Close level picker',
  myLevels: 'My levels',
  levelWord: 'Level',
  deleteCustomLevel: 'Delete level',
  confirmDeleteLevel: 'Delete this level?',

  // topbar
  prevLevel: 'Previous level',
  nextLevel: 'Next level',
  levelSelect: 'Level picker',
  settings: 'Settings',
  openEditor: 'Make a level',

  // settings panel
  settingsTitle: 'Settings',
  closeSettings: 'Close',
  easy: 'Easy mode',
  easyHint: 'After a bump, the game just keeps going.',
  holdOnError: 'Hold on error',
  holdOnErrorHint: 'Keep the peacock on the wrong step until you restart.',
  music: 'Music',
  sound: 'Sound',
  freePlay: 'Free play',
  freePlayHint: 'Unlock every level.',
  locked: 'Locked',
  feathers: 'Feathers',
  hint: 'Hint',
  par: 'Par',
  language: 'Language',

  // themes (settings row + theme names + goal/animal labels per docs/theming-design.md)
  theme: 'Theme',
  themeFarmName: 'Farm',
  themeDesertName: 'Desert',
  goalFarm: 'cookie',
  goalDesert: 'dates',
  animalCow: 'Cow',
  animalPig: 'Pig',
  animalSheep: 'Sheep',
  animalChicken: 'Chicken',
  animalSnake: 'Snake',
  animalDromedary: 'Dromedary',
  animalScorpion: 'Scorpion',
  animalLizard: 'Lizard',

  // command labels
  cmdForward: 'Step',
  cmdLeft: 'Left',
  cmdRight: 'Right',
  cmdFan: 'Shoo!',
  cmdRepeat2: '×2',
  cmdRepeat3: '×3',

  // level editor — direction buttons
  dirN: '\u2191N',
  dirE: '\u2192E',
  dirS: '\u2193S',
  dirW: '\u2190W',

  // level editor — chrome
  editorTitle: 'Level Editor',
  edTools: 'Tools',
  edSize: 'Size',
  edCols: 'Columns',
  edRows: 'Rows',
  edStartDir: 'Start direction',
  edName: 'Name',
  edNamePlaceholder: 'My level',
  edEnergy: 'Energy',
  edEnergyNone: 'None',

  // level editor — tools
  toolPad: 'Path',
  toolEraser: 'Grass',
  toolStart: 'Start',
  toolGoal: 'Cookie',
  toolCow: 'Cow',
  toolPig: 'Pig',
  toolSheep: 'Sheep',
  toolChicken: 'Chicken',
  toolWipe: 'Wipe',

  // level editor — action buttons
  edPlay: '\u25B6 Play',
  edSave: '\u{1F4BE} Save',
  edCopy: '\u{1F4CB} Copy',
  edPaste: '\u{1F4CE} Paste',
  edClear: '\u{1F5D1} Clear',
  edClose: '\u2715 Close',
  edCopied: 'Copied!',
  edPastePrompt: 'Paste level JSON:',

  // level editor — validation errors
  edErrPath: 'Place at least one path tile.',
  edErrStart: 'Place a start point.',
  edErrStartOnPath: 'Start must be on a path tile.',
  edErrGoal: 'Place at least one cookie.',
  edErrGoalOnPath: 'Cookies must be on path tiles.',
  edErrAnimalOnPath: 'Animals must be on path tiles.',
  edErrStartGoal: 'Start and cookie cannot share a tile.',
  edSolvable: 'Solvable — {n} steps',
  edUnsolvable: 'No solution',

  // built-in level names (custom levels keep their user-given name)
  lvl1: 'First Steps',
  lvl2: 'Around the Corner',
  lvl3: 'Shoo, Cow!',
  lvl4: 'Two Friends',
  lvl5: 'The Long Way',
  lvl6: 'Two Cookies',
  lvl7: 'The Crossroads',
  lvl8: 'A Little Snack',
  lvl9: 'Cookie Garden',
  lvl10: 'Hungry Peacock',
  lvl11: 'The Maze',
  lvl12: 'Big Garden',
  lvl13: 'Peacock Parade',
  lvl14: 'Slalom',
};
