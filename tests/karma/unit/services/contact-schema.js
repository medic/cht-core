describe('ContactSchema service', function() {
  'use strict';

  var service,
      assert = chai.assert;

  var sortedJson = function(o) {
    var keys = Object.keys(o).sort();
    var s = '{';
    for(var i=0; i<keys.length; ++i) {
      var k = keys[i];
      s += '"' + k + '":' + JSON.stringify(o[k]) + ',';
    }
    // N.B. not valid JSON, as an extra comma will appear
    return s + '}';
  };

  var deepEqual = assert.deepEqual;
  assert.deepEqual = function() {
    try {
      deepEqual.apply(this, arguments);
    } catch(e) {
      throw new Error(e +
          '\nA: ' + sortedJson(arguments[0]) +
          '\nB: ' + sortedJson(arguments[1]));
    }
  };

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
              type: 'custom',
              custom_type: 'facility',
              title: '{{name}}',
            },
          },
        });
      });
    });

    describe('`district_hospital`', function() {
      it('has a simple default', function() {
        assert.deepEqual(service.get().district_hospital, {
          type: 'district_hospital',
          title: '{{name}}',
          badge: 'fa-building',
          fields: {
            name: {
              type: 'string',
              required: true,
            },
            contact: {
              type: 'db',
              db_type: 'person',
              required: true,
              title: '{{name}}',
            },
            external_id: {
              type: 'string',
            },
            notes: {
              type: 'text',
            },
          },
        });
      });
    });

    describe('`health_center`', function() {
      it('has a simple default', function() {
        assert.deepEqual(service.get().health_center, {
          type: 'health_center',
          title: '{{name}}',
          badge: 'fa-hospital-a',
          fields: {
            name: {
              type: 'string',
              required: true,
            },
            parent: {
              type: 'db',
              db_type: 'district_hospital',
              required: true,
              title: '{{name}}',
            },
            contact: {
              type: 'db',
              db_type: 'person',
              required: true,
              title: '{{name}}',
            },
            external_id: {
              type: 'string',
            },
            notes: {
              type: 'text',
            },
          },
        });
      });
    });

    describe('`clinic`', function() {
      it('has a simple default', function() {
        assert.deepEqual(service.get().clinic, {
          type: 'clinic',
          title: '{{name}}',
          badge: 'fa-home',
          fields: {
            name: {
              type: 'string',
              required: true,
            },
            parent: {
              type: 'db',
              db_type: 'health_center',
              required: true,
              title: '{{name}}'
            },
            contact: {
              type: 'db',
              db_type: 'person',
              required: true,
              title: '{{name}}'
            },
            external_id: {
              type: 'string',
            },
            notes: {
              type: 'text',
            },
          },
        });
      });
    });
  });
});
