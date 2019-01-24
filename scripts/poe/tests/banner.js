const banner = require('../lib/banner');

describe('banner', () => {
  test('show', () => {
    console = { log: jest.fn() };
    expect(console.log).not.toHaveBeenCalled();
    banner.show('something');
    expect(console.log).toHaveBeenCalled();
  });
});
