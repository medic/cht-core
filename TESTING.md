# Testing

An overview of testing within CHT-CORE. Check out the [package.json](package.json) for all the tests you can run.

## Unit tests

They live in the `tests` directories of each app. Run them with: `npm run unit`.

## Integration tests

They are located in `tests/integration`. Run them with: `npm run e2e-integration-local`

## Continuous integration

We use [Github Actions](https://github.com/medic/cht-core/actions) which runs `npm run compile` every time some new code is pushed to GitHub.

# End to End Testing 
## Stack overview

### Requirements

1. Follow the guide [DEVELOPMENT.md](DEVELOPMENT.md)
2. JDK installed for Selenium.
3. Docker to run couchdb.

### WebdriverIO

#### Run locally

1. Run `npm ci`
2. Run `npm run build-dev-watch`
3. Run `npm run wdio-local`
4. Run `npx allure open` to view the test reports

#### View the CI report

1. Download the CI run artifact zip file
2. Extract it anyhere
3. From your cht-core directory, run `npx allure open <path>/allure-report/`.

### WebdriverIO GitHub Actions Run

`npm run ci-webdriver-default` is executed to run the Webdriver IO tests.

## Tips to write automated tests

Please read the [style guide for automated tests](tests/AUTOMATE_TEST_GUIDE.md) which provides editorial guidelines for anyone creating new automated test cases for CHT-Core.

## Debugging

Here are two ways to run individual tests and have your IDE break on the specific test.

When debugging it can be helpful to disable the headless browser mode so that you can see the browser window as the tests run. To do this, remove `--headless` from the [tests/e2e/default/wdio.conf.js](tests/e2e/default/wdio.conf.js).

### WebdriverIO

To run just a single test file in WebdriverIO, update the `specs` config in the `wdio.confi.js` to refer to the desired test file.
* Default config: [`tests/e2e/default/wdio.confi.js`](tests/e2e/default/wdio.conf.js)
* Standard config: [`tests/e2e/standard/wdio.confi.js`](tests/e2e/standard/wdio.conf.js)

#### IntelliJ Based

1. In a terminal, run `npm run build-dev-watch`
1. In Intellij, open the [package.json](package.json) file
1. Scroll to the scripts section and click the ▶ button next to `wdio-local`
1. Select `Debug 'wdio-local'`

### Saving artifacts

GitHub actions will artifact all files in tests/logs. This is the directory any logs, results, images, etc... should save to if you want to review them if a build fails. 

### Test Architecture

Our GitHub actions spin up an ubuntu-22.04 machine. Installs software and then launches Couchdb and Horticulturalist in a docker container. This is needed to run our applications in the specific node versions we support while allowing our test code to run in versions of node it they support. This creates a paradigm to keep in mind when writing tests. Tests run on the ubuntu machine. Any test code that starts a server or runs an executable is running outside of the horti container. The ports are exposed for all our services and horti has access to the cht-core root via a volume. Horti can also talk to the host by getting the gateway of the docker network. 

### Glossary 

wdio = WebdriverIo
