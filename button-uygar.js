document.addEventListener("DOMContentLoaded", function () {
  var imageElement = document.getElementById("dog-image");
  var responseElement = document.getElementById("api-response");

  responseElement.textContent = "Loading data from Dog API...";

  fetch("https://dog.ceo/api/breeds/image/random")
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      responseElement.textContent = JSON.stringify(data, null, 2);

      if (data && data.message) {
        imageElement.src = data.message;
      } else {
        imageElement.alt = "No image URL found in API response.";
      }
    })
    .catch(function (error) {
      responseElement.textContent =
        "Error while calling Dog API. Check console for details.";
      console.error("Dog API error:", error);
    });
});
