const sinon = require('sinon');
const utils = require('./utils');

const ANY_STRING = /^.*$/;
const ANY_NUMBER = /^[0-9]+(\\.[0-9]*)?$/;

const configWatcher = require('../../../src/services/config-watcher');

const settings = {
  contact_types: [
    {
      id: 'district_hospital',
      name_key: 'contact.type.district_hospital',
      group_key: 'contact.type.district_hospital.plural',
      create_key: 'contact.type.district_hospital.new',
      edit_key: 'contact.type.place.edit',
      icon: 'medic-district-hospital',
      create_form: 'form:contact:district_hospital:create',
      edit_form: 'form:contact:district_hospital:edit'
    },
    {
      id: 'health_center',
      name_key: 'contact.type.health_center',
      group_key: 'contact.type.health_center.plural',
      create_key: 'contact.type.health_center.new',
      edit_key: 'contact.type.place.edit',
      parents: [ 'district_hospital' ],
      icon: 'medic-health-center',
      create_form: 'form:contact:health_center:create',
      edit_form: 'form:contact:health_center:edit'
    },
    {
      id: 'clinic',
      name_key: 'contact.type.clinic',
      group_key: 'contact.type.clinic.plural',
      create_key: 'contact.type.clinic.new',
      edit_key: 'contact.type.place.edit',
      parents: [ 'health_center' ],
      icon: 'medic-clinic',
      create_form: 'form:contact:clinic:create',
      edit_form: 'form:contact:clinic:edit',
      count_visits: true
    },
    {
      id: 'person',
      name_key: 'contact.type.person',
      group_key: 'contact.type.person.plural',
      create_key: 'contact.type.person.new',
      edit_key: 'contact.type.person.edit',
      primary_contact_key: 'clinic.field.contact',
      parents: [ 'district_hospital', 'health_center', 'clinic' ],
      icon: 'medic-person',
      create_form: 'form:contact:person:create',
      edit_form: 'form:contact:person:edit',
      person: true
    }
  ]
};

describe('extract-person-contacts migration', function() {
  afterEach(function() {
    sinon.restore();
    return utils.tearDown();
  });

  it('converts and minifies a 0.4 structure into a 2.x one', async () => {
    const clinic = {
      _id: 'clinic-id',
      type: 'clinic',
      name: 'The Clinic',
      contact: {
        name: 'Clinic Contact',
        phone: '555 1000'
      },
      parent: {
        _id: 'hc-id',
        _rev: '15-0f2d0e53d04251e7171a51b76c881dbb',
        type: 'health_center',
        name: 'The Health Center',
        contact: {
          name: 'HC Contact',
          phone: '555 2000'
        },
        parent: {
          _id: 'dh-id',
          _rev: '3-c2fd98be72a3ff7ececf452c67f68f5a',
          type: 'district_hospital',
          name: 'The District Hospital',
          contact: {
            name: 'DH Contact',
            phone: '555 3000'
          }
        }
      },
      sent_forms: {
        ANCR: '2015-12-12T11:00:18.886Z',
        F: '2015-08-06T11:08:45.000Z'
      }
    };
    const clinicContact = {
      name: 'Clinic Contact',
      phone: '555 1000',
      reported_date: ANY_NUMBER,
      type: 'person',
      parent: {
        _id: 'clinic-id',
        parent: {
          _id: 'hc-id',
          parent: {
            _id: 'dh-id',
          }
        }
      }
    };
    const clinicFixed = {
      _id: 'clinic-id',
      type: 'clinic',
      name: 'The Clinic',
      contact: {
        _id: ANY_STRING,
        parent: {
          _id: 'clinic-id',
          parent: {
            _id: 'hc-id',
            parent: {
              _id: 'dh-id',
            }
          }
        }
      },
      parent: {
        _id: 'hc-id',
        parent: {
          _id: 'dh-id',
        }
      },
      sent_forms: {
        ANCR: '2015-12-12T11:00:18.886Z',
        F: '2015-08-06T11:08:45.000Z'
      }
    };
    const healthCenter = {
      _id: 'hc-id',
      type: 'health_center',
      name: 'The Health Center',
      contact: {
        name: 'HC Contact',
        phone: '555 2000'
      },
      parent: {
        _id: 'dh-id',
        type: 'district_hospital',
        name: 'The District Hospital',
        parent: {},
        contact: {
          name: 'DH Contact',
          phone: '555 3000'
        }
      }
    };
    const healthCenterContact = {
      name: 'HC Contact',
      phone: '555 2000',
      reported_date: ANY_NUMBER,
      type: 'person',
      parent: {
        _id: 'hc-id',
        parent: {
          _id: 'dh-id'
        }
      }
    };
    const healthCenterFixed = {
      _id: 'hc-id',
      type: 'health_center',
      name: 'The Health Center',
      contact: {
        _id: ANY_STRING,
        parent: {
          _id: 'hc-id',
          parent: {
            _id: 'dh-id'
          }
        }
      },
      parent: {
        _id: 'dh-id',
      }
    };
    const districtHospital = {
      _id: 'dh-id',
      type: 'district_hospital',
      name: 'The District Hospital',
      parent: {},
      contact: {
        name: 'DH Contact',
        phone: '555 3000'
      }
    };
    const districtHospitalContact = {
      name: 'DH Contact',
      phone: '555 3000',
      reported_date: ANY_NUMBER,
      type: 'person',
      parent: {
        _id: 'dh-id',
      }
    };
    const districtHospitalFixed = {
      _id: 'dh-id',
      type: 'district_hospital',
      name: 'The District Hospital',
      contact: {
        _id: ANY_STRING,
        parent: {
          _id: 'dh-id',
        }
      }
    };

    await utils.initDb([clinic, healthCenter, districtHospital]);
    await utils.initSettings(settings);
    await configWatcher.load();
    await utils.runMigration('extract-person-contacts');
    await utils.assertDb([districtHospitalFixed, districtHospitalContact,
      healthCenterFixed, healthCenterContact,
      clinicFixed, clinicContact]);
  });

  it('should create a new Person from facility.contact', function() {
    // given
    return utils.initDb([{
      _id: 'abc',
      type: 'district_hospital',
      name: 'myfacility',
      contact: {
        name: 'Alice',
        phone: '+123'
      },
    }, ])
      .then(() => utils.initSettings(settings))
      .then(() => configWatcher.load())
      .then(function() {

        // when
        return utils.runMigration('extract-person-contacts');

      })
      .then(function() {

        // expect
        return utils.assertDb([{
          _id: 'abc',
          type: 'district_hospital',
          name: 'myfacility',
          contact: {
            _id: ANY_STRING,
            parent: {
              _id: 'abc'
            },
          },
        }, {
          name: 'Alice',
          type: 'person',
          phone: '+123',
          reported_date: ANY_NUMBER,
          parent: {
            _id: 'abc'
          },
        }, ]);

      });
  });

  it('should retain the rc code - #2970', function() {
    // given
    return utils.initDb([{
      _id: 'abc',
      type: 'district_hospital',
      name: 'myfacility',
      contact: {
        name: 'Alice',
        phone: '+123',
        rc_code: 'rc1'
      },
    }, ])
      .then(() => utils.initSettings(settings))
      .then(() => configWatcher.load())
      .then(function() {

        // when
        return utils.runMigration('extract-person-contacts');

      })
      .then(function() {

        // expect
        return utils.assertDb([{
          _id: 'abc',
          type: 'district_hospital',
          name: 'myfacility',
          place_id: 'rc1',
          contact: {
            _id: ANY_STRING,
            parent: {
              _id: 'abc'
            },
          },
        }, {
          name: 'Alice',
          type: 'person',
          phone: '+123',
          reported_date: ANY_NUMBER,
          parent: {
            _id: 'abc'
          },
        }, ]);

      });
  });

  // NB: these are not necessarily required. For now we are testing these, but
  //     not extensively testing the allowing of lax data. If we come across
  //     a partner with very lax data and we want to allow it to migrate, we
  //     can disable validation in places.js. Alternatively, if we want to block
  //     it more extensively we would need to at least reverse these tests to
  //     fail instead of pass
  describe('re: parents', () => {
    it('should not break if parent of place not found', function() {
      // given
      return utils.initDb([{
        _id: 'abc',
        type: 'health_center',
        name: 'Homa Bay Health',
        parent: {
          _id: 'def',
          type: 'district_hospital',
          name: 'Kisumu',
          contact: {
            name: 'Madam Regina',
            phone: '+1234567890'
          }
        }
      }])
        .then(() => utils.initSettings(settings))
        .then(() => configWatcher.load())
        .then(function() {

          // when
          return utils.runMigration('extract-person-contacts');

        })
        .then(function() {

          // expect
          return utils.assertDb([{
            _id: 'abc',
            type: 'health_center',
            name: 'Homa Bay Health',
          }, ]);

        });
    });
    it('should not break if parent of place not found, with a migrated contact', () =>
      utils.initDb([{
        _id: 'abc',
        type: 'health_center',
        name: 'Homa Bay Health',
        contact: {
          _id: 'contact-id'
        },
        parent: {
          _id: 'def',
          type: 'district_hospital',
          name: 'Kisumu',
          contact: {
            name: 'Madam Regina',
            phone: '+1234567890'
          }
        }
      }])
        .then(() => utils.initSettings(settings))
        .then(() => configWatcher.load())
        .then(function() {
          return utils.runMigration('extract-person-contacts');
        })
        .then(function() {
          return utils.assertDb([{
            _id: 'abc',
            type: 'health_center',
            name: 'Homa Bay Health',
            contact: {
              _id: 'contact-id'
            }
          }]);
        }));
  });
});
