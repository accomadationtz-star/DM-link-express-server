const AfricasTalking = require("africastalking");

const africasTalking = AfricasTalking({
  username: process.env.AT_USERNAME,
  apiKey: process.env.AT_API_KEY,
});

module.exports = africasTalking;
