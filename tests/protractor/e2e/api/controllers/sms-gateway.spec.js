const utils = require('../../../utils');

fdescribe('/sms', function() {

  describe('GET', function() {

    it('should respond with valid JSON', function() {
      // when
      return get()
        .then(response => {
          // then
          expect(response['medic-gateway']).toBe(true);
        });
    });

  });

  describe('POST', function() {
  });
});

function get() {
  return utils.request({
    path: '/api/sms',
    method: 'GET',
    headers: { 'Content-Type':'application/json' },
  });
}
