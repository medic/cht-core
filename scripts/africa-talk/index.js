const apikey = "Add your key here"
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
