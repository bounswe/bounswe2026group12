/**
 * GLOBAL CONFIGURATION
 *
 * Change NUM_BUTTONS to control how many buttons appear on the homepage.
 * Update BUTTON_LABELS to set the text displayed on each button.
 */

const NUM_BUTTONS = 9;

const BUTTON_LABELS = [
  "Button 1",
  "Button 2",
  "Button 3",
  "Button 4",
  "Button 5",
  "Button 6",
  "Button 7",
  "Button 8",
  "Mustafa Ocak",
];

// Custom handler names for specific buttons (optional)
// If not specified, defaults to onButton{N}Click pattern
const BUTTON_HANDLERS = [
  null, // Button 1 - use default
  null, // Button 2 - use default
  null, // Button 3 - use default
  null, // Button 4 - use default
  null, // Button 5 - use default
  null, // Button 6 - use default
  null, // Button 7 - use default
  null, // Button 8 - use default
  "onButton_MustafaOcakClick", // Button 9 - custom handler
];
