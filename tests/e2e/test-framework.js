var assert = require('chai').assert,
    db = require('../../db'),
    request = require('request'),
    utils = require('./utils');

describe('medic-api e2e tests framework', function() {
  beforeEach(function(done) {
    utils.beforeEach()
      .then(function() {
        done();
      })
      .catch(done);
    });

  it('should be able to access medic-api over HTTP', function(done) {
    // when
    request.get({
      uri: process.env.API_URL,
      followRedirect: false,
    },
    function(err, res) {
      // expect
      assert.notOk(err);
      assert.equal(res.statusCode, 302);
      assert.deepEqual(res.headers.location, '/' + db.settings.db + '/_design/medic/_rewrite/');

      done();
    });
  });
});
