var utils = require("./utils")
  , assert = require("assert")
  , vows = require("vows")
  , Feature = require("vows-bdd/lib").Feature
  , username = "root"
  , password = "password";

Feature("MSBB to Data Record", module)
    .scenario("Send a SMS message and see it appear as MSBB data record")
    .given("I am logged in", function() {
        utils.loggedIn(username, password, this.callback);
    })
    .complete()
    .finish(module);