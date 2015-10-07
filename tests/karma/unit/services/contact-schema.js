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

    describe('#validate()', function() {
      it('will return `true` if validation passes (simple example)', function() {
        // given
        var schema = {
          name: '{{thing_name}}',
          fields: {
            thing_name: 'string',
          },
        };

        // then
        assert.isTrue(service.validate('contact', schema));
      });

      it('will return `true` if validation passes (simple example)', function() {
        // given
        var schema = {
          name: '{{thing_name}}',
          fields: {
            thing_name: 'string',
          },
        };

        // then
        assert.isTrue(service.validate('contact', schema));
      });

      it('does not require a name property if `name` is a field', function() {
        // given
        var schema = {
          fields: {
            name: 'string',
          },
        };

        // expect
        assert.isTrue(service.validate('contact', schema));
      });

      it('validation fails if `name` property not specified and no `name` field exists', function() {
        // given
        var schema = {
          fields: {
          },
        };

        // expect
        assert.throws(function() {
          service.validate('contact', schema);
        }, Error, /No `name` property specified and no `name` field present./);
      });

      it('will return `true` if validation passes (complex example)', function() {
        // given
        var schema = {
          name: '{{first_name}} {{last_name}}',
          fields: {
            first_name: 'string',
            last_name: 'string',
          },
        };

        // then
        assert.isTrue(service.validate('contact', schema));
      });

      _.forEach([
        'children',
        'parents',
      ], function(badFieldName) {
        it('will throw an Error if restricted name "' + badFieldName + '" is used for a field', function() {
          // given
          var schema = {
            fields: {
              name: 'string',
            },
          };
          schema.fields[badFieldName] = 'string';

          assert.throw(function() {
            service.validate('contact', schema);
          }, Error, /Reserved name used for field./);
        });
      });

      it('will throw an Error if non-existent fields are referenced in `name`', function() {
        // given
        var schema = {
          name: '{{bad}}',
          fields: {
            good: 'string',
          }
        };

        assert.throw(function() {
          service.validate('contact', schema);
        }, Error, 'Non-existent field referenced in name: "bad"');
      });

      it('should fail if `name` field is defined as well as `name` property', function() {
        // given
        var schema = {
          name: '{{honorific}} {{name}}',
          fields: {
            honorific: 'string',
            name: 'string',
          },
        };

        // expect
        assert.throw(function() {
          service.validate('contact', schema);
        }, Error, 'Cannot define calculated `name` if there is also a field called `name`.');
      });
    });

    describe('`person`', function() {
      it('has a simple default', function() {
        assert.deepEqual(service.get().person, {
          type: 'person',
          badge: 'fa-user',
          name: '{{first_name}} {{last_name}}',
          fields: {
            first_name: {
              type: 'string',
              required: true,
            },
            last_name: {
              type: 'string',
              required: true,
            },
            phone: {
              type: 'tel',
              required: true,
            },
            national_id_number: {
              type: 'string',
            },
            date_of_birth: {
              type: 'date',
            },
            alternate_phone: {
              type: 'tel',
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
            location: {
              type: 'geopoint',
              hide_in_view: true,
            },
          },
        });
      });
    });
  });

  describe('#getBelow()', function() {
    _.each({
      district_hospital: [ 'health_center', 'clinic', 'person' ],
      health_center: [  'clinic', 'person' ],
      clinic: [ 'person' ],
      person: [],
    }, function(expected, limit) {
      it('should provide all schemas below ' + limit, function() {
        // when
        var actual = service.getBelow(limit);

        // expect
        assert.deepEqual(Object.keys(actual), expected);
      });
    });
  });

  describe('#getWithoutSpecialFields()', function() {
    it('should not include `name` field', function() {
      // expect
      assert.ok   (service.get()                    .clinic.fields.hasOwnProperty('name'));
      assert.notOk(service.getWithoutSpecialFields().clinic.fields.hasOwnProperty('name'));
    });

    it('should not include fields listed in calculated `name` field', function() {
      // expect
      assert.ok   (service.get()                    .person.fields.hasOwnProperty('first_name'));
      assert.notOk(service.getWithoutSpecialFields().person.fields.hasOwnProperty('first_name'));
      assert.ok   (service.get()                    .person.fields.hasOwnProperty('last_name'));

      assert.notOk(service.getWithoutSpecialFields().person.fields.hasOwnProperty('last_name'));
    });

    it('should not include fields marked `hide_in_view`', function() {
      // expect
      assert.ok   (service.get()                    .clinic.fields.hasOwnProperty('location'));
      assert.notOk(service.getWithoutSpecialFields().clinic.fields.hasOwnProperty('location'));
    });
  });
});
