const { assert } = require('chai');
const path = require('path');
const sinon = require('sinon');

const environment = require('../../src/lib/environment');
const fs = require('../../src/lib/sync-fs');

const TARGET_DIR = path.join(__dirname, '../../build/initialise-project-layout');

const initialiseProjectLayout = require('../../src/fn/initialise-project-layout');

describe('initialise-project-layout', () => {
  it('should create a project with the desired layout', () => {
    // when

    sinon.stub(environment, 'pathToProject').get(() => TARGET_DIR);
    initialiseProjectLayout.execute();

    // then
    assertExists('contact-summary.js');
    assertExists('forms/app');
    assertExists('forms/collect');
    assertExists('forms/contact');
    assertExists('resources');
    assertExists('resources.json');
    assertExists('tasks.js');
    assertExists('targets.js');
    assertExists('.eslintrc');
    assertExists('translations');
    assertExists('app_settings/base_settings.json');
    assertExists('app_settings/forms.json');
    assertExists('app_settings/schedules.json');
  });
});


function assertExists(relativePath) {
  const path = `${TARGET_DIR}/${relativePath}`;
  assert.isTrue(fs.exists(path), `Expected file/dir not found: ${path}`);
}
