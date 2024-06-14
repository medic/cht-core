const { expect } = require('chai');
const windowLib = require('../../../../../src/js/enketo/lib/window');

describe('window lib', () => {
  let originalWindow;

  before(() => originalWindow = global.window);
  after(() => global.window = originalWindow);

  it('getCurrentHref', () => {
    global.window = {
      location: {
        href: 'http://example.com'
      }
    };
    expect(windowLib.getCurrentHref()).to.equal(global.window.location.href);
  });
});
