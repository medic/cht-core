const apikey =
  "9ec78208f9eb7796bdd5eecc1837556c45f18a39c11aa5077f1717733d492124";
const options = { apiKey: apikey, username: "sandbox", sandbox: true };
const africa = require("africastalking")(options);

africa.SMS.send({
  to: ["+254717059404"],
  message: "hello friend"
})
  .then(function(res) {
    console.log(JSON.stringify(res, null, 2));
  })
  .catch(function(err) {
    console.log(err);
  });
