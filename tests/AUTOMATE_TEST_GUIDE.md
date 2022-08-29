# Create new autoamted test case - Guide

This style guide provides editorial guidelines for anyone creating new automated test cases for the CHT-Core.

There are three files that are the base of every new automated test case, the most important one is the `spec` file, which contains the actual test that will be executed. 

Right now the automated tests cover different [CHT Configs](https://github.com/medic/cht-core/tree/master/config), consider the following setups when writing a new test:
* **default**
    * Config file: [`../tests/wdio.conf.js`](https://github.com/medic/cht-core/blob/master/tests/wdio.conf.js)
    * Name convention for the `spec` file: `<name>.wdio-spec.js`
    * Command to execute the tests that belong to this config:  `npm run wdio-local`
* **standard**
    * Config file: [`../tests/e2e/standard/wdio.conf.js`](https://github.com/medic/cht-core/blob/master/tests/e2e/standard/wdio.conf.js)
    * Name convention for the `spec` file: `../tests/e2e/standard/*/<name>.standard-wdio-spec.js`
    * Command to execute the tests that belong to this config:  `npm run standard-wdio-local`

**Important:** Make sure the `spec` file follows the name convention correctly, otherwise the file won't be executed. 
## Base files to use

* Page-object file. (`../tests/page-objects/forms/<name>.wdio.page.js`)

    This file should contain the `xml` access and details for the form that is going to be tested, and the methods to access every field that is available in the form.

* Data file. (`../tests/page-objects/forms/data/user.po.data.js`)

    This file contains all the information about a _"dummy"_ contact that can be used for testing. All the attributes from this contact can be updated as required in the execution code for the test accessing the object. If a specific contact is required for the test a new file can be created with that information.

* e2e testing file. Use the correct name convention when working with the following configs:
    - default: (`../tests/e2e/*/<name>.wdio-spec.js`) 
    - standard: (`../tests/e2e/standard/*/<name>.standard-wdio-spec.js`)

    This file should contain **only** the scenario setup and assertions of the test that is going to be executed. All the DOM queries, logging, contact creation and data assignments should be delegated to the Page Object file and the Data file. This will increase test readability and code reusability. For a better understanding follow these files as examples:
    * default config: [`../tests/e2e/forms/pregnancy-visit.wdio-spec.js`](https://github.com/medic/cht-core/blob/master/tests/e2e/forms/pregnancy-visit.wdio-spec.js).
    * standard config: [`../test/e2e/standard/forms/immunization-visit.standard-wdio-spec.js`](https://github.com/medic/cht-core/blob/master/tests/standard/forms/immunization-visit.standard-wdio-spec.js)

### Notes:

* Sometimes the same functionality acts differently depending on the config, to manage those scenarios a new file should be created to overwrite the method that needs some variations and extend from the default file to have access to all of its methods.
For a better understanding please take a look at the file [`../page-objects/standard/contacts/contacts.wdio.page.js`](https://github.com/medic/cht-core/blob/master/tests/page-objects/standard/contacts/contacts.wdio.page.js) that has a different implementation for the method `addPlace()` and imports everything else from the file [`../page-objects/contacts/contacts.wdio.page`](https://github.com/medic/cht-core/blob/master/tests/page-objects/contacts/contacts.wdio.page.js)

* We decided to separate every functionality in files/folders because we want to make sure that we can reuse as much code as we can. If something new is implemented and might be used for another test will be important to isolate it in a separate file so it can be used in future tests.

For `brac` and `cht` configurations, there are [factory models](https://github.com/medic/cht-core/tree/master/tests/factories) that generate test data out of the box with the possibility to cusomize if needed