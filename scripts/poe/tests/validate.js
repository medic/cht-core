const {validTranslations, validDirectory, validatePlaceHolders} = require('../lib/validate');
const valid = validTranslations;
const path = require('path');
const utils = require('../lib/utils');

describe('validate', () => {

  const originalLog = utils.log;
  const originalInfo = utils.info;
  const originalError = utils.error;

  beforeEach(() => {
    utils.log = jest.fn();
    utils.info = jest.fn();
    utils.error = jest.fn();
  });

  afterEach(() => {
    utils.log = originalLog;
    utils.info = originalInfo;
    utils.error = originalError;
  });

  test('translation file exists', () => {
    expect(valid('tests/messages-en.properties')).toBeFalsy();
  });

  test('translation file name', () => {
    expect(valid('tests/translation/badname.properties')).toBeFalsy();
    expect(valid('tests/translation/badname-en')).toBeFalsy();
  });

  test('good translation content', () => {
    expect(valid('tests/translations/good-en.properties')).toBeTruthy();
  });

  test('directory', () => {
    expect(validDirectory('tests/translations')).toBeTruthy();
  });

  test('successful matching translation placeholders', async () => {
    const matchingPlaceholderDir = path.resolve(__dirname, 'translations', 'matching-placeholders');
    await validatePlaceHolders(['en', 'sw'], matchingPlaceholderDir);
    expect(utils.error).toHaveBeenCalledTimes(0);
  });

  test('error on non-matching translation placeholders', async () => {
    const nonMatchingPlaceholderDir = path.resolve(__dirname, 'translations', 'non-matching-placeholders');
    await validatePlaceHolders(['en', 'sw'], nonMatchingPlaceholderDir);
    expect(utils.info).toHaveBeenCalledWith(
      'Found 1 empty translations trying to compile'
    );
    expect(utils.error).toHaveBeenCalledWith(
      'Cannot compile \'sw\' translation with key \'Number of facilities\' has placeholders ' +
      'that do not match any in the base translation provided'
    );
    expect(utils.error).toHaveBeenCalledWith(
      'Cannot compile \'sw\' translation with key \'Number of form types\' has placeholders ' +
      'that do not match any in the base translation provided'
    );
    expect(utils.error).toHaveBeenCalledWith(
      'Found 2 errors trying to compile\n' +
      'You can use messages-ex.properties to add placeholders missing from the reference context.'
    );
  });

});
