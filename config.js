/**
 * GLOBAL CONFIGURATION
 *
 * Change NUM_BUTTONS to control how many buttons appear on the homepage.
 * Update BUTTON_LABELS to set the text displayed on each button.
 * Only 5 buttons are shown (button 6 removed).
 */

const NUM_BUTTONS = 5;

const BUTTON_LABELS = [
  "Button 1",
  "Button 2",
  "Button 3",
  "Button 4",
  "Button 5",
];

// Optional: custom handler function name per button (by index). Omit or leave undefined to use onButton1Click, onButton2Click, etc.
const BUTTON_HANDLERS = [
  "onButton1Click",
  undefined,
  undefined,
  undefined,
  undefined,
];
