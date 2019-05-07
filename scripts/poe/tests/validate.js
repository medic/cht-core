const {validTranslations, validDirectory, validatePlaceHolders} = require('../lib/validate');
const valid = validTranslations;
const path = require('path');

describe('validate', () => {

  console = {
    log: jest.fn(),
    error: jest.fn()
  };

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
    validatePlaceHolders(['en', 'sw'], path.resolve(__dirname, 'translations', 'matching-placeholders'));
    expect(console.error).toHaveBeenCalledTimes(0);
  });

  test('error on non-matching translation placeholders', () => {
    validatePlaceHolders(['en', 'sw'], path.resolve(__dirname, 'translations', 'non-matching-placeholders'));
    expect(console.error).toHaveBeenCalledWith('\nFAILURE: messages-sw.properties: Translation key Number\\ of\\ form\\ types on line 3 has placeholders that do not match those of messages-en.properties');
  });

});
