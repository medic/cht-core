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
          type: 'person',
          title: '{{name}}',
          badge: 'fa-user',
          fields: {
            name: {
              type: 'string',
              required: true,
            },
            phone: {
              type: 'phone',
              required: true,
            },
            code: {
              type: 'string',
            },
            notes: {
              type: 'text',
            },
            parent: {
              type: 'db',
              db_type: 'clinic',
              title: 'name',
            },
          },
        });
      });
    });
  });
});
