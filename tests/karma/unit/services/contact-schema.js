describe('ContactSchema service', function() {
  'use strict';

  var service,
      assert = chai.assert;

  beforeEach(function() {
    module('inboxApp');
    inject(function(_ContactSchema_) {
      service = _ContactSchema_;
    });
  });

  it('exists', function() {
    assert.isDefined(service);
  });

  describe('#get()', function() {
    it('is a function', function() {
      assert.typeOf(service.get, 'function');
    });

    describe('`person`', function() {
      it('has a simple default', function() {
        assert.deepEqual(service.get().person, {
          name: {
            type: 'string',
            required: true,
          },
          phone: {
            type: 'phone',
            required: true,
          },
          code: 'string',
          notes: 'text',
          catchment_area: 'db:clinic',
          health_center: 'db:health_center',
          district: 'db:district_hospital',
        });
      });
    });
  });
});
