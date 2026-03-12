/**
 * BUTTON CLICK HANDLERS
 *
 * Each button on the homepage has its own handler function below.
 * Replace the placeholder console.log with your own implementation.
 */

function onButton1Click() {
  console.log("Button 1 clicked -- implement me!");
}

function onButton2Click() {
  console.log("Button 2 clicked -- implement me!");
}

function onButton3Click() {
  console.log("Button 3 clicked -- implement me!");
}

function onButton4Click() {
  console.log("Button 4 clicked -- implement me!");
}

function onButton5Click() {
  console.log("Button 5 clicked -- implement me!");
}

function onButton6Click() {
  var resultBox = document.getElementById("cagan-result");
  resultBox.style.display = "block";
  resultBox.textContent = "Loading...";

  fetch("https://catfact.ninja/fact")
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      resultBox.innerHTML =
        '<strong>🐱 Cagan\'s Cat Fact:</strong><br>' + data.fact;
    })
    .catch(function (error) {
      resultBox.textContent = "Error: " + error.message;
    });
}
