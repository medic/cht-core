# Writing Tests for Tasks

Using [Mocha](https://mochajs.org/)  we create test suites and test cases.


Mocha has hooks that are good for setting up data or configuring a bunch of reports.  In our `before` hook we set up Nools and our utilities through the test-wrapper, a predefined contact, and get the nools session. The `after` hooks remove nools facts from the nools engine and tear down the flow.  The available hooks in mocha are `before`, `beforeEach`, `after`, and `afterEach`. [Mocha hooks docs](https://mochajs.org/#hooks)

[Use of hooks in test case](https://github.com/medic/medic/blob/a4d63cab20adaf3b3304a255182b846f78436e10/config/sample_config_tests/tests/tasks.spec.js#L7-L29)

Use describe for grouping types of tests. Larger projects might break down individual tasks into suites and use individual test cases(it) to trigger different portions of tasks. 

[Example Test Case](https://github.com/medic/medic/blob/a4d63cab20adaf3b3304a255182b846f78436e10/config/sample_config_tests/tests/tasks.spec.js#L31-L36)

The tests needs to create a contact, report, scheduled_task, or a combination of these docs. Then add them to the nools engine through session.assert. From there to test tasks you call session.emitTasks and the nools engine will execute against the facts added to the engine and send back tasks that apply. 

The tasks are returned in an array. The task object has the details about the original contact, report, etc… This all can be asserted on using chai’s assertion. 

_Note: Tests should be written in a TDD format. Write a test first and see it fail. Write a task that makes the test pass._  

## Legacy Rules Testing

The compile-nools-rules in medic-conf project will look for the nools.rules.js and will load those rules and requires the tasks.json to execute legacy rules. To use the declarative rules rename nools.rules.js to nools.rules.js.old and do not pass the task.json into the nootilsmanager. Tests will execute against the declarative rules. 

EX: Pass the location of the tasks.json file into the nootilsmanager and it will load the old style rules. 

``` nootilsManager = NootilsManager(__dirname + "/../tasks.json", {});```

## Debugging Rules

You can add console.log statements directly to the rules or add a breakpoint to the rule.js file in nools framework on the fire function. It will bring up the rules as they execute.

## Running tests
* Install mocha through npm install
* From your config directory run ```mocha --require test/mocha-setup.js --reporter progress test/*.spec.js --timeout 999999 ```

Another option is to add a script to package.json. After running `npm install` to install dependencies the `npm test` command will now execute your tests.

[NPM Script Details](https://docs.npmjs.com/misc/scripts)

* Open package.json
* Add a `test-configs` entry to the scripts
* Update the `test` script to run by adding `npm run test-configs`


```
  "scripts": {
    "jshint": "jshint *.json contact-summary*.js test/*.js",
    "test": "npm run test-configs",
    "test-configs": "mocha --reporter progress test/*.spec.js",
  }
```


