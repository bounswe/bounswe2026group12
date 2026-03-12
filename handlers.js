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
  console.log("ahmet fun fact");
    // Opening a new window for our fun fact.
    const newWindow = window.open('', '_blank');
    //fetch the response
    fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en')
          .then(res => res.json())
          .then(data => {
              newWindow.document.write(`
                  <html>
                  <head><title>Random Fun Fact</title></head>
                  <body style="font-family: Arial; padding: 40px; text-align:
  center;">
                      <h1>Random Fun Fact</h1>
                      <p style="font-size: 20px;">${data.text}</p>
                      <hr>
                      <h3>What does this API return?</h3>
                      <p>The Useless Facts API returns a random useselss funfact
                      from a database. Each response includes the fact
   text,
                      its source URL, and language info.</p>
                      <h4>Raw API Response:</h4>
                      <pre style="text-align:left; background:#f4f4f4;
  padding:15px; border-radius:8px;">${JSON.stringify(data, null, 2)}</pre>
                  </body>
                  </html>
              `);
          });
}
