const {validTranslations, validDirectory} = require('../lib/validate');
const valid = validTranslations;

describe('validate', () => {

  console = { log: jest.fn() };
  
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
});
