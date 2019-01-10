const utils = require('../lib/utils');

describe('utils', () => {
  test('capitalize', () => {
    expect(utils.capitalize('simon')).toBe('Simon');
  });

  test('mmVersion', () => {
    expect(utils.mmVersion().length).toBeTruthy();
  });
});
