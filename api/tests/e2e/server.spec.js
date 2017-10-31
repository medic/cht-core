const assert = require('chai').assert;
const request = require('request-promise-native');

describe('server', () => {

  describe('JSON-only endpoints', () => {

    it('should require application/json Content-Type header', () => {

      // given
      const opts = {
        method: 'POST',
        url: process.env.API_URL + '/medic/login',
        headers: {},
        data: JSON.stringify({}),
      };

      // when
      return request(opts)
        .then(assert.fail)
        .catch(e => {

          // then
          assert.equal('400 - "Content-Type must be application/json"', e.message);
          assert.equal(400, e.statusCode);

        });

    });

  });

});
