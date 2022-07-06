# Create new autoamted test case - Guide

This style guide provides editorial guidelines for anyone creating new automated test cases for the CHT-Core.

There are three files that are the base of every new automaated test case, the most importat one is the `<name>.wdio.spec.js` that it will contains the actual test that is going to be executed. It needs to have that name convention because the [config file](https://github.com/medic/cht-core/blob/master/tests/wdio.conf.js#L42-L44) has as an attribute to execute all the files that have `*.wdio-spec.js`.
## Base files to use

* Page-object file. (`../tests/page-objects/forms/<name>.wdio.page.js`)

    This file should contain the `xml` access and details for the form that is going to be tested, and the methods to access every field that is available in the form.

* Data file. (`../tests/page-objects/forms/data/user.po.data.js`)

    This file contains all the information about a _"dummy"_ contact that can be used for testing. All the attributes from this contact can be updated as required in the execution code for the test accessing the object. If a specific contact is required for the test a new file can be created with that information.

* e2e testing file. (`../tests/e2e/forms/<name>.wdio.spec.js`)

    This file should contain **only** the implementation of the test that is going to be executed. All the logging and contact creation should be only referenced in this file. For a better understanding follow the [`pregnancy-visit.wdio-spec.js`](https://github.com/medic/cht-core/blob/master/tests/e2e/forms/pregnancy-visit.wdio-spec.js) file as an example.

### Note:
We decided to separate every functionality in files/folders because we want to make sure that we can reuse as much code as we can. If something new is implemented and might be used for another test will be important to insolate it in a separate file so it can be used in future tests.