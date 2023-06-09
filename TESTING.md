# Testing

An overview of testing within CHT-CORE. Check out the [Gruntfile](Gruntfile.js) for all the tests you can run.

## Unit tests

They live in the `tests` directories of each app. Run them with grunt: `grunt unit`.

## Integration tests

They are located in `tests/integration`. Run them with grunt: `grunt e2e-integration`

## Continuous integration

We use [Github Actions](https://github.com/medic/cht-core/actions) which runs `grunt ci` every time some new code is pushed to GitHub.

# End to End Testing 
## Stack overview

### Requirements

1. Follow the guide [DEVELOPMENT.md](DEVELOPMENT.md)
2. JDK installed for Selenium.
3. Docker to run couchdb.

### Local Run

`grunt e2e` installs and runs chromedriver, starts couchdb in docker, pushes the compiled app to couchdb, starts api, starts sentinel, and then runs protractor tests against your local environment. 

### WebdriverIO

#### Run locally

1. Run `npm ci`
2. Run `grunt`
3. Run `npm run wdio-local`
4. Run `npx allure open` to view the test reports

#### View the CI report

1. Download the CI run artifact zip file
2. Extract it anyhere
3. From your cht-core directory, run `npx allure open <path>/allure-report/`.

### GitHub Actions Protractor Run 

The build process compiles our application. Then installs horticulturalist to run the app. This puts us closer to production. Executes `grunt ci-e2e`. Which then installs and runs chromedriver. Runs the protractor tests against the installed app version. Currently there are 3 jobs that execute in the supported node environments.  

### WebdriverIO GitHub Actions Run

The main difference now is that `grunt ci-webdriver` is executed now instead of `ci-e2e`. This executes the Webdriver IO tests.

## Tips to write automated tests

Please read the [style guide for automated tests](tests/AUTOMATE_TEST_GUIDE.md) which provides editorial guidelines for anyone creating new automated test cases for CHT-Core.

## Debugging
Documented here are two ways to run individual tests and have your IDE break on the specific test.

When debugging it can be helpful to disable the headless browser mode so that you can see the browser window as the tests run. To do this, remove `--headless` from the [tests/conf.js](tests/conf.js) file for the Protractor tests and the [tests/e2e/default/wdio.conf.js](tests/e2e/default/wdio.conf.js) file for the WebdriverID tests.

### WebdriverIO

To run just a single test file in WebdriverIO, update the `specs` config in the `wdio.confi.js` to refer to the desired test file.
* Default config: [`tests/e2e/default/wdio.confi.js`](tests/e2e/default/wdio.conf.js)
* Standard config: [`tests/e2e/standard/wdio.confi.js`](tests/e2e/standard/wdio.conf.js)

#### IntelliJ Based

1. In a terminal, run `grunt`
1. In Intellij, open the [package.json](package.json) file
1. Scroll to the scripts section and click the ▶ button next to `wdio-local`
1. Select `Debug 'wdio-local'`

### Protractor

#### Visual Studio Code

##### Setting up Vscode for e2e debugging.

1. This assumes you have gone through the [development](https://github.com/medic/cht-core/blob/master/DEVELOPMENT.md) setup guide. 
1. Copy the vscode launch.json and tasks.json files from this [location](https://github.com/medic/medic-release-testing/tree/master/ide_config/vscode).
1. Paste those files into a directory called .vscode within your cht-core repo. 
1. Click the debug icon on the left tool bar.
1. Select launch e2e.
1. This will now run as if you ran the command `grunt e2e-deploy` and start the `tests/scripts/e2e-servers` script. Then launch protractor to debug the test(s). 

##### Debugging a single test by using the "grep" feature.

1. Open launch.json.
1. Update the grep argument with the name of your test to the args array.
      Note: if you have defined specs or suites that do not include the spec.js. It will not find the test to run.  
      EX: `["${workspaceRoot}/tests/conf.js","--grep=should show the correct privacy policy on login"]`
1. Click the debug icon on the left tool bar.
1. Select launch e2e.

#### IntelliJ Based

1. Click the run menu across the top.
1. Click Edit Configurations.
1. Click the plus to add a configuration.
1. Select Protractor.
1. Set the configuration file to the path of `<cht-core-repo>/tests/conf.js`.
1. Set Node Interpreter is set to your node install. 
1. Set Protractor package is set to the `<cht-core-repo>/node_modules/protractor`.
1. Optionally set the Protractor options to `--capabilities.chromeOptions.args=start-maximized --jasmine.DEFAULT_TIMEOUT_INTERVAL=120000`.
1. Select the radio button for Test.
1. Enter the path to the Test file Ex: `<cht-core-repo>/tests/e2e/protractor/client-side-transitions/muting.spec.js`.
1. Enter the test name. This is a bit of a chore. IntelliJ will automatically add the regex flags for begins(`^`) of line and end of line(`$`). Protractor presents the name for matching as the Describe description followed by the It description. To run the pregnancy test for should have a title you would need to put this as your matcher. `Send message : should have a title`. An alternative would be to select Test File and run the entire file. You can add an `x` in front of `it` to disable the ones you do not need. EX: `xit('should send a message')`.
1. Click ok.
1. Click the run configuration dropdown and select the protractor config. 
1. In a terminal run `grunt e2e-deploy`   NOTE: This has to happen each time you run. 
1. Click debug button in IntelliJ.


## Migration To Webdriver IO

Treat the migration as if you were writing a brand new e2e suite. Not everything we have in the protractor suite needs a 1 to 1 migration. The implicit waits seem to work better in wdio

Each spec file runs independently. There is no need to manage browser state between spec files. 

### Saving artifacts

GitHub actions will artifact all files in tests/logs. This is the directory any logs, results, images, etc... should save to if you want to review them if a build fails. 

### Test Architecture

Our GitHub actions spin up an ubuntu-22.04 machine. Installs software and then launches Couchdb and Horticulturalist in a docker container. This is needed to run our applications in the specific node versions we support while allowing our test code to run in versions of node it they support. This creates a paradigm to keep in mind when writing tests. Tests run on the ubuntu machine. Any test code that starts a server or runs an executable is running outside of the horti container. The ports are exposed for all our services and horti has access to the cht-core root via a volume. Horti can also talk to the host by getting the gateway of the docker network. 

### Glossary 

wdio = WebdriverIo
