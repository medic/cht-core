const chai = require('chai');
const utils = require('@utils');

describe('impact', () => {

  describe('v1', () => {
    it('responds 501', async () => {
      try {
        await utils.request({ path: '/api/v1/impact' });
        chai.expect.fail('should have thrown');
      } catch (err) {
        chai.expect(err.status).to.equal(501);
        chai.expect(err.body).to.deep.equal({
          code: 501,
          error: 'Not implemented in this release.'
        });
      }
    });
  });

});
