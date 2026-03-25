document.addEventListener("DOMContentLoaded", function () {
  var grid = document.getElementById("button-grid");

  for (var i = 0; i < NUM_BUTTONS; i++) {
    var label = BUTTON_LABELS[i] || "Button " + (i + 1);
    var labelName = "onButton" + label.replace(/\s+/g, "") + "Click";
    var indexName = "onButton" + (i + 1) + "Click";
    var explicitHandler =
      typeof BUTTON_HANDLERS !== "undefined" &&
      BUTTON_HANDLERS &&
      BUTTON_HANDLERS[i] != null
        ? BUTTON_HANDLERS[i]
        : null;
    var handler =
      explicitHandler && typeof window[explicitHandler] === "function"
        ? window[explicitHandler]
        : typeof window[labelName] === "function"
          ? window[labelName]
          : typeof window[indexName] === "function"
            ? window[indexName]
            : createFallbackHandler(i + 1);

    var btn = document.createElement("button");
    btn.textContent = label;
    if (label === "Cagan") {
      btn.classList.add("cagan-btn");
    }
    btn.addEventListener("click", handler);
    grid.appendChild(btn);
  }
});

function createFallbackHandler(n) {
  return function () {
    console.log("Button " + n + " clicked -- no handler found");
  };
}
