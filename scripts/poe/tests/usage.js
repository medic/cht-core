const usage = require('../lib/usage');

describe('usage', () => {
  test('show', () => {
    console = { log: jest.fn() };
    expect(console.log).not.toHaveBeenCalled();
    usage.show();
    expect(console.log).toHaveBeenCalled();
  });
});
