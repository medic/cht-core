describe('Form2Sms service', function() {
  'use strict';

  /** @return a mock form ready for putting in #dbContent */
  var service,
      dbGet = sinon.stub(),
      $log = sinon.stub(),
      $parse = sinon.stub();

  beforeEach(function() {
    module('inboxApp');

    module(function($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        get: dbGet,
      }));
      $provide.value('$log', $parse);
    });
    inject(function(_Form2Sms_) {
      service = _Form2Sms_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(dbGet, $log, $parse);
    sinon.restore();
  });

  describe('#()', function() {
    it('should return nothing for a non-existent doc', () => TODO());
    it('should return nothing for a non-existent form', () => TODO());
    it('should parse attached code for a form', () => TODO());
    it('should fall back to ODK compact form specification if no custom code is provided', () => TODO());
    it('should return nothing if neither code nor ODK compact format are provided', () => TODO());
  });

});

function TODO() {
}

