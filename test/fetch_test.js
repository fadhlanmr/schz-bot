import fetch from "node-fetch";

fetch('https://bankina.co.id/id/valas/')
  .then(response => response.text())
  .then(html => {
    // Parse the HTML string and manipulate it
    console.log(html);
    document.body.innerHTML = html; // Example: set the response as the document body
  })
  .catch(error => {
    console.error('Error fetching the page:', error);
  });
