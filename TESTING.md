# Automated End-to-End Testing

An overview of the End-to-End testing of CHT-Core. 

## Stack overview

### Local Run

`grunt e2e` installs and runs chromedriver, starts couchdb in docker, pushes the compiled app to couchdb, starts api, starts sentinel, and then runs protractor tests against your local environment. 

### Github Actions Run

The build process compiles our application. Then installs horticulturalist to run the app. This puts us closer to production. Executes `grunt ci-e2e`. Which then installs and runs chromedriver. Runs the protractor tests against the installed version. Currently there are 3 jobs that execute in the supported node environments.  

## Protractor Tips

### File Structure
Tests files should repesent a feature within the application. Using `describe` to identify the feature and `it` detail the invidual functions of the feature. 

EX: `describe('Users can login )`  `it(with valid credentials)`

### Page Object Model
We are leveraging the page object model for structure. When identifying elements they should be added to a page object and notwithin a test file. Add functions that do actions to the page within the page object. Keep expects outside of page objects. The tests should be self documenting. 

### Adding identifiers
In some cases adding a unique identifier to an element may be necessary. This could be a piece of data related to the element or a unique name. To do this the app code can be modified to add a `test-` attribute.  

Ex:  `attr.test-id="{{ msg.key }}" ` Will add a `test-id` attribute with the data from the app. 

Then it can be consumed in the test by getting an element by css. EX: ``element(by.css(`#message-list li[test-id="${identifier}"]`)),``



## Debugging
  ### Vscode
  ### IntelliJ Based