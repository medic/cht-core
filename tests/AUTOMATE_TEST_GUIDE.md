# Create new autoamted test case - Guide

A structure that can be used to have an idea about the creation of a new automated test case.

## Base files to use

* Page-object file. (`../tests/page-objects/forms/<name>.wdio.page.js`)

    This file should contain the `xml` access and details for the form that is going to be tested, and the methods to access every field that is available in the form.

* Data file. (`../tests/page-objects/forms/data/user.po.data.js`)

    This file contains all the information about a _"dummy"_ contact that can be used for testing. All the attributes from this contact can be updated as required in the execution code for the test accessing the object. If a specific contact is required for the test a new file can be created with that information.

* e2e testing file. (`../tests/e2e/forms/<name>.wdio.spec.js`)

    This file should contain **only** the implementation of the test that is going to be executed. All the logging and contact creation should be only referenced in this file. For a better understanding follow the `pregnancy-visit.wdio-spec.js` file as an example.