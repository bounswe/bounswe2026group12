/**
 * GLOBAL CONFIGURATION
 *
 * Change NUM_BUTTONS to control how many buttons appear on the homepage.
 * Update BUTTON_LABELS to set the text displayed on each button.
 */

const NUM_BUTTONS = 9;

const BUTTON_LABELS = [
  "🌤️ Daglar - Weather",
  "erencanozkaya",
  "Emirhan",
  "Button 4",
  "ButtonUygar",
  "Live Location of ISS by Ufuk Altunbulak",
  "akdag fun fact",
  "Cagan",
  "Mustafa Ocak",
];

/** Optional per-index handler names (e.g. when label-based name does not match). */
const BUTTON_HANDLERS = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  "onButton_MustafaOcakClick",
];
