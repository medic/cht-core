const { assert, expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const rewire = require('rewire');

const compileAppSettings = rewire('../../src/fn/compile-app-settings');
const environment = require('../../src/lib/environment');
const fs = require('../../src/lib/sync-fs');

let writeJson;
describe('compile-app-settings', () => {
  beforeEach(() => {
    writeJson = sinon.stub(fs, 'writeJson');
    compileAppSettings.__set__('fs', fs);
  });
  afterEach(() => {
    sinon.restore();
  });

  it('should handle simple config', () =>
    test('simple/project'));

  it('should handle derivative app-settings definitions', () =>
    test('derivative/child'));

  it('should handle config with no separate task-schedules.json file', () =>
    test('no-task-schedules.json/project'));

  it('should handle config with combined targets.js definition', () =>
    test('targets.js/project'));

  it('should reject declarative config with invalid schema', () =>
    testFails('invalid-declarative-schema/project'));

  it('should reject a project with both old and new nools config', () =>
    testFails('unexpected-legacy-nools-rules/project'));

  it('should reject a project with both purge and purging files', () =>
    testFails('purge/both-purge-and-purging/project'));

  it('should reject a project purge file exists and its not valid js', () =>
    testFails('purge/broken-purge-file/project'));

  it('should reject a project invalid purge file config', () =>
    testFails('purge/invalid-purge/project'));

  it('should reject a project with an uncompilable purging function', () =>
    testFails('purge/invalid-purging-function/project'));

  it('should handle a project with a purge function that need to be merged with other purge config', () =>
    test('purge/merge-purging-function/project'));

  it('should handle a project with no export purge config', () =>
    test('purge/no-export-purge/project'));

  it('should handle a project with correct purge config', () =>
    test('purge/purge-correct/project'));

  it('should reject a project where purge.fn is not a function', () =>
    testFails('purge/purge-fn-not-a-function/project'));

  it('should handle a project with a purge function', () =>
    test('purge/purging-function/project'));

  it('should reject a project with eslint error', () =>
    testFails('eslint-error/project'));

  it('can overwrite eslint rules with eslintrc file', () =>
    test('eslintrc/project'));

  it('should handle a configuration using the base_settings file', () =>
    test('base-settings/project'));

  it('should handle a configuration using the forms.json and schedules.json files', () =>
    test('sms-modules/project'));

  it('should reject a configuration using invalid forms.json or schedules.json files', () =>
    testFails('sms-modules/invalid-files'));
});

async function test(relativeProjectDir) {
  const testDir = path.join(__dirname, '../data/compile-app-settings', relativeProjectDir);
  sinon.stub(environment, 'pathToProject').get(() => testDir);

  // when
  await compileAppSettings.execute();

  // then
  const actual = JSON.parse(JSON.stringify(writeJson.args[0][1]));
  const expected = JSON.parse(fs.read(`${testDir}/../app_settings.expected.json`));
  actual.tasks.rules = expected.tasks.rules = '';
  actual.contact_summary = expected.contact_summary = '';
  expect(actual).to.deep.eq(expected);
}

async function testFails(relativeProjectDir) {
  const testDir = path.join(__dirname, '../data/compile-app-settings', relativeProjectDir);

  // when
  try {
    await compileAppSettings.execute(testDir);
    assert.fail('Expected assertion');
  } catch (err) {
    if (err.name === 'AssertionError') {
      throw err;
    }

    assert.ok('asserted');
  }
}
