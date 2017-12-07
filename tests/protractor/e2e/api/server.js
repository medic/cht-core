const utils = require('../../utils');

describe('server', () => {
  describe('JSON-only endpoints', () => {
    it('should require application/json Content-Type header', () => {
      const opts = {
        method: 'POST',
        path: '/login',
        body: {}
      };

      return utils.requestOnTestDb(opts, true)
        .then(fail)
        .catch(e => {
          expect(e).toBe('Content-Type must be application/json');
        });
    });
  });
});
