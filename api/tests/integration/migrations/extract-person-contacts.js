var utils = require('./utils');

var ANY_STRING = new RegExp('^.*$');
var ANY_NUMBER = new RegExp('^[0-9]+(\\.[0-9]*)?$');

describe('extract-person-contacts migration', function() {
  afterEach(function() {
    return utils.tearDown();
  });

  it('converts and minifies a 0.4 structure into a 2.x one', () => {
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

    return utils.initDb([clinic, healthCenter, districtHospital])
      .then(() => utils.runMigration('extract-person-contacts'))
      .then(() => utils.assertDb([districtHospitalFixed, districtHospitalContact,
                                  healthCenterFixed, healthCenterContact,
                                  clinicFixed, clinicContact]));
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
