# Create new autoamted test case - Guide

This style guide provides editorial guidelines for anyone creating new automated test cases for the CHT-Core.

There are three files that are the base of every new automated test case, the most important one is the `spec` file, which contains the actual test that will be executed. 

Right now the automated tests cover different [CHT Configs](../config/), consider the following setups when writing a new test:
* **default**
    * Config file: [`../tests/e2e/default/wdio.conf.js`](e2e/default/wdio.conf.js)
    * Name convention for the `spec` file: `../tests/e2e/default/*/<name>.wdio-spec.js`
    * Command to execute the tests that belong to this config:  `npm run wdio-local`
* **standard**
    * Config file: [`../tests/e2e/standard/wdio.conf.js`](e2e/standard/wdio.conf.js)
    * Name convention for the `spec` file: `../tests/e2e/standard/*/<name>.wdio-spec.js`
    * Command to execute the tests that belong to this config:  `npm run standard-wdio-local`

**Important:** Make sure the `spec` file follows the name convention correctly, otherwise the file won't be executed. 
## Base files to use

* Page-object file. (`../tests/page-objects/forms/<name>.wdio.page.js`)

    This file should contain the `xml` access and details for the form that is going to be tested, and the methods to access every field that is available in the form.

* Data file. There are two different ways to create/use test data:
  * Creating it using the [`place factory`](factories/cht/contacts/place.js), [`user factory`](factories/cht/users/users.js) or the [`person factory`](factories/cht/contacts/person.js) files.
  
    Using the "factories" will allow you to create hierarchies, contacts, and patients associated with specific places and with their specific attributes and information. For the users, it can create the offline or online to be able to log in with different roles. **Everything can be custom depending on the test requirements**.
  * Or using the file [`user.po.data.js`](page-objects/forms/data/user.po.data.js).  
  
    This file contains all the information about a _"dummy"_ contact that can be used for testing. All the attributes from this contact can be updated as required in the execution code for the test accessing the object.

* e2e testing file. Use the correct name convention when working with the following configs:
    - default: (`../tests/e2e/default/*/<name>.wdio-spec.js`) 
    - standard: (`../tests/e2e/standard/*/<name>.wdio-spec.js`)

    This file should contain **only** the scenario setup and assertions of the test that is going to be executed. All the DOM queries, logging, contact creation and data assignments should be delegated to the Page Object file and the Data file. This will increase test readability and code reusability. For a better understanding follow these files as examples:
    * default config: [`../tests/e2e/default/enketo/pregnancy-visit.wdio-spec.js`](e2e/default/enketo/pregnancy-visit.wdio-spec.js).
    * standard config: [`../test/e2e/standard/forms/immunization-visit.standard-wdio-spec.js`](e2e/standard/enketo/immunization-visit.standard-wdio-spec.js)

### File Structure (spec files)
Test files should represent a feature within the application. Using `describe` to identify the feature and `it` to detail the individual functions of the feature.

Ex: 
```
  describe('Immunization Visit')
    it('Add a new child under 2 years old')
    it('Submit immunization visit ')
    ...
```

### Name convention / location
* Since every test is created by _"selectors"_ it makes more sense to locate them depending on the page that is being tested and not by code feature. Please try to locate every test file in the correct folder.
* Every file name should be using `-` and no `_` nor `camelCase`.
  * Ex: `immunizacion-visit.wdio-spec.js` -> correct
    `immunizacion_visit.wdio-spec.js` -> incorrect
    `immunizacionVisit.wdio-spec.js` -> incorrect
    `ImmunizacionVisit.wdio-spec.js` -> incorrect
* If it is possible, try to avoid repeating the folder name in the file.
  * Ex: file located in the path `e2e/standard/enketo`
    `immunizacion-visit.wdio-spec.js` -> correct
    `immunizacion-visit-enketo.wdio-spec.js` -> incorrect
    `immunizacion-visit-standard.wdio-spec.js` -> incorrect
    `immunizacion-visit-enketo-standard.wdio-spec.js` -> incorrect

### Notes:

* Sometimes the same functionality acts differently depending on the config, to manage those scenarios a new file should be created to overwrite the method that needs some variations and extend from the default file to have access to all of its methods.
For a better understanding please take a look at the file [`../page-objects/standard/contacts/contacts.wdio.page.js`](page-objects/standard/contacts/contacts.wdio.page.js) that has a different implementation for the method `addPlace()` and imports everything else from the file [`../page-objects/contacts/contacts.wdio.page`](page-objects/contacts/contacts.wdio.page.js)

* We decided to separate every functionality in files/folders because we want to make sure that we can reuse as much code as we can. If something new is implemented and might be used for another test will be important to isolate it in a separate file so it can be used in future tests.

* If the new test is not associated to a specific configuration, please located it inside the correct folder of the default config [`e2e/default/*`](e2e/default/). 