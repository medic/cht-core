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
          label: 'contact.type.person',
          pluralLabel: 'contact.type.person.plural',
          addButtonLabel: 'contact.type.person.new',
          icon: 'medic-person',
          fields: {
            name: {
              type: 'string',
              required: true,
            },
            date_of_birth: {
              type: 'date',
            },
            phone: {
              type: 'tel',
              required: true,
            },
            alternate_phone: {
              type: 'tel',
            },
            notes: {
              type: 'text',
            },
            parent: {
              type: 'custom:medic-place',
              hide_in_form: true,
            },
          },
        });
      });
    });

    describe('`district_hospital`', function() {
      it('has a simple default', function() {
        assert.deepEqual(service.get().district_hospital, {
          type: 'district_hospital',
          label: 'contact.type.district_hospital',
          pluralLabel: 'contact.type.district_hospital.plural',
          addButtonLabel: 'contact.type.district_hospital.new',
          icon: 'medic-district-hospital',
          fields: {
            name: {
              type: 'string',
              required: true,
            },
            contact: {
              type: 'db:person',
              required: true,
              parent: 'PARENT'
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
          label: 'contact.type.health_center',
          pluralLabel: 'contact.type.health_center.plural',
          addButtonLabel: 'contact.type.health_center.new',
          icon: 'medic-health-center',
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
              parent: 'PARENT'
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
          label: 'contact.type.clinic',
          pluralLabel: 'contact.type.clinic.plural',
          addButtonLabel: 'contact.type.clinic.new',
          icon: 'medic-clinic',
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
              parent: 'PARENT'
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

  describe('#getVisibleFields()', function() {
    it('should not include `name` field', function() {
      // expect
      assert.ok   (service.get()             .clinic.fields.hasOwnProperty('name'));
      assert.notOk(service.getVisibleFields().clinic.fields.hasOwnProperty('name'));
    });

    /*
     * Test disabled while the default Schema's `Person` has a standard `name` field.
    it('should not include fields listed in calculated `name` field', function() {
      // expect
      assert.ok   (service.get()             .person.fields.hasOwnProperty('first_name'));
      assert.notOk(service.getVisibleFields().person.fields.hasOwnProperty('first_name'));
      assert.ok   (service.get()             .person.fields.hasOwnProperty('last_name'));

      assert.notOk(service.getVisibleFields().person.fields.hasOwnProperty('last_name'));
    });
    */

    it('should not include fields marked `hide_in_view`', function() {
      // expect
      assert.ok   (service.get()             .clinic.fields.hasOwnProperty('location'));
      assert.notOk(service.getVisibleFields().clinic.fields.hasOwnProperty('location'));
    });
  });

  describe('#getTypes()', function() {
    it('should list types in hierarchical order', function() {
      assert.deepEqual(service.getTypes(), ['district_hospital', 'health_center', 'clinic', 'person']);
    });
  });

  describe('#getPlaceTypes()', function() {
    it('should list place types in hierarchical order', function() {
      assert.deepEqual(service.getPlaceTypes(), ['district_hospital', 'health_center', 'clinic']);
    });
  });

  describe('#getChildPlaceType()', function() {
    _.each({
      district_hospital: 'health_center',
      health_center: 'clinic',
      clinic: undefined,
      person: undefined,
      garbage: undefined
    }, function(child, parent) {
      it('should provide child type for ' + parent, function() {
        // when
        var actual = service.getChildPlaceType(parent);

        // expect
        assert.equal(actual, child);
      });
    });
  });

});
