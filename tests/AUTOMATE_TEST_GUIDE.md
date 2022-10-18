# Style guide for automated tests

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

* Page-object file. (`../tests/page-objects/../enketo/<name>.wdio.page.js`)
    We are leveraging the [page object model](https://www.thoughtworks.com/insights/blog/using-page-objects-overcome-protractors-shortcomings) for structure. When identifying elements they should be added to a page object and not within a test file. Add functions that perform actions to the page within the page object. Keep expects outside of page objects. The tests should be self-documenting.

* Data file. There are two different ways:
  * Create test data using the [`place factory`](factories/cht/contacts/place.js), the [`user factory`](factories/cht/users/users.js) or the [`person factory`](factories/cht/contacts/person.js) files.
  
    Using the "factories" will allow you to create hierarchies, contacts and patients that are associated with specific places and with their specific attributes and information. It can create offline or online users that can be used to login with different roles. **Everything can be customised depending on the test requirements**.
  * Use pre-existing test data with [`user.data.js`](page-objects/default/users/user.data.js).  
  
    This file contains all the information about a _"dummy"_ contact that can be used for testing. All the attributes from this contact can be updated as required in test's execution code.

* e2e testing file. Use the correct name convention when working with the following configs:
    - default: (`../tests/e2e/default/*/<name>.wdio-spec.js`) 
    - standard: (`../tests/e2e/standard/*/<name>.wdio-spec.js`)

    This file should contain **only** the scenario setup and assertions of the test that is going to be executed. All the DOM queries, logging, contact creation and data assignments should be delegated to the Page Object file and the Data file. This will increase test readability and code reusability. For a better understanding follow these files as examples:
    * default config: [`../tests/e2e/default/enketo/pregnancy-visit.wdio-spec.js`](e2e/default/enketo/pregnancy-visit.wdio-spec.js).
    * standard config: [`../test/e2e/standard/enketo/immunization-visit.wdio-spec.js`](e2e/standard/enketo/immunization-visit.wdio-spec.js)

## Tips to write test cases
### File Structure (spec files)

Test files should represent a feature within the application. Use `describe` to identify the feature and to group test cases. Use `it` to detail individual test cases covering the feature's functionality.

Observe how the following example defines a `describe` using the feature name `Immunization Visit`. It contains two test cases which detail the expected results `should add a new child under 2 years old` and `should submit an immunization visit`.

Ex: 
```
  describe('Immunization Visit', () => {
    it('should add a new child under 2 years old', () => { .... });
    it('should submit an immunization visit', () => { .... });
    ...
  });
```

### Name convention and file location

* Since every test is created by _"selectors"_, it makes sense to locate them into a folder that represents the page being tested and not the feature. Please try to locate every test file in the correct folder.
* Every file name should use `dash-case` (`-`). Do not use `snake-case` (`_`) nor `camelCase`. Please consider the following examples:
  * Correct:
    * `immunizacion-visit.wdio-spec.js`
  * Incorrect:
    * `immunizacion_visit.wdio-spec.js`
    * `immunizacionVisit.wdio-spec.js`
    * `ImmunizacionVisit.wdio-spec.js`
* Whenever possible avoid repeating the folder name in the file name. Please consider the following examples where the file is located in the path `e2e/standard/enketo`:
  * Correct:
    * `immunizacion-visit.wdio-spec.js`
  * Incorrect:
    * `immunizacion-visit-enketo.wdio-spec.js`
    * `immunizacion-visit-standard.wdio-spec.js`
    * `immunizacion-visit-enketo-standard.wdio-spec.js`

### Adding identifiers
In some cases, adding a unique identifier to an element may be necessary. This could be a piece of data related to the element, or a unique name (which can be done by adding a `test-` attribute to the app code).

Ex:  `attr.test-id="{{ msg.key }}" ` Will add a `test-id` attribute with the data from the app.

Then it can be consumed in the test by getting an element by css. EX: ``element(by.css(`#message-list li[test-id="${identifier}"]`)),``

Adding a test identifier is a good option for cases where a CSS selector would otherwise be fragile such as selecting based on an assumed element structure or selecting on CSS classes intended for visual design that may change.

### Notes:

* Sometimes the same functionality behaves differently depending on the config, to manage those scenarios a new file should be created to overwrite the method that needs some variations and extend from the default file to have access to all of its methods.
For a better understanding please take a look at the file [`../page-objects/standard/contacts/contacts.wdio.page.js`](page-objects/standard/contacts/contacts.wdio.page.js) that has a different implementation for the method `addPlace()` and imports everything else from the file [`../page-objects/default/contacts/contacts.wdio.page`](page-objects/default/contacts/contacts.wdio.page.js)

* We decided to separate every functionality in files/folders because we want to make sure that we can reuse as much code as possible. If something new is implemented and might be used for another test, then please isolate the code in a separate file, so it can be reused in future tests.

* If the new test is not associated to a specific configuration, please locate the test inside the correct folder of the default config [`e2e/default/*`](e2e/default/). 
