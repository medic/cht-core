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

    it('provides a read-only schema', function() {
      // given
      var version_one = service.get();

      // when
      delete version_one.person.fields.parent;

      // then
      assert.isDefined(service.get().person.fields.parent);
    });

    it('provides a map of objects when called with no args', function() {
      // expect
      assert.isDefined(service.get().person);
    });

    it('provides a specific schema when called with an arg', function() {
      // expect
      assert.equal(service.get('person').type, 'person');
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
              type: 'custom:medic-place',
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
          icon: 'fa-building',
          fields: {
            name: {
              type: 'string',
              required: true,
            },
            contact: {
              type: 'db:person',
              required: true,
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
          icon: 'fa-hospital-o',
          fields: {
            name: {
              type: 'string',
              required: true,
            },
            parent: {
              type: 'db:district_hospital',
              required: true,
            },
            contact: {
              type: 'db:person',
              required: true,
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
          icon: 'fa-home',
          fields: {
            name: {
              type: 'string',
              required: true,
            },
            parent: {
              type: 'db:health_center',
              required: true,
            },
            contact: {
              type: 'db:person',
              required: true,
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
