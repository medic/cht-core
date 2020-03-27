const {validTranslations, validDirectory, validatePlaceHolders} = require('../lib/validate');
const valid = validTranslations;
const path = require('path');

const originalJoin = path.join;

describe('validate', () => {

  console = {
    log: jest.fn(),
    error: jest.fn()
  };

  afterEach(() => {
    path.join = originalJoin;
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

  test('successful matching translation placeholders', () => {
    const matchingPlaceholderDir = path.resolve(__dirname, 'translations', 'matching-placeholders');
    path.join = jest.fn().mockReturnValue(path.join(matchingPlaceholderDir, 'messages-ex.properties'));
    validatePlaceHolders(['en', 'sw'], matchingPlaceholderDir);
    expect(console.error).toHaveBeenCalledTimes(0);
  });

  test('error on non-matching translation placeholders', () => {
    const nonMatchingPlaceholderDir = path.resolve(__dirname, 'translations', 'non-matching-placeholders');
    path.join = jest.fn().mockReturnValue(path.join(nonMatchingPlaceholderDir, 'messages-ex.properties'));
    validatePlaceHolders(['en', 'sw'], nonMatchingPlaceholderDir);
    expect(console.error).toHaveBeenCalledWith(
      '\nFAILURE: messages-sw.properties: Translation key Number\\ of\\ form\\ types on line 3 has placeholders that ' +
      'do not match those of messages-en.properties\nYou can use messages-ex.properties to add placeholders missing ' +
      'from the reference context.'
    );
  });

});
