var utils = require('./utils');

var migrate = function() {
  return utils.runMigration('create-patient-contacts');
};

describe('create-patient-contacts migration', function() {
  afterEach(function() {
    return utils.tearDown();
  });

  it('should run cleanly with no registered patients', function() {
    return utils.initDb([])
    .then(migrate)
    .then(function() {
      return utils.assertDb([]);
    });
  });

  it('should ignore registrations that already have patient contacts', function() {
    var documents = [
      {
        _id: 'registrationA',
        patient_id: '1234',
        form: 'A',
        transitions: {
          registration: {
            ok: true
          }
        }
      },
      {
        _id: 'RANDOM_UUID',
        patient_id: '1234',
        reported_date: 'now',
        type: 'person'
      }
    ];
    return utils.initDb(documents)
    .then(migrate)
    .then(function() {
      return utils.assertDb(documents);
    });
  });

  it('should ignore registrations that are not "actual" registrations', function() {
    var documents = [
      {
        _id: 'registrationA',
        // patient_id: '1234', <-- if a registration doesn't have a patient id here it was not a registration that
        //                         resulted in a patient_id being created, and thus should not have a patient contact
        //                         created for it.
        fields: {
          patient_id: '1234'
        },
        form: 'A',
        transitions: {
          registration: {
            ok: true
          }
        }
      }
    ];
    return utils.initDb(documents)
    .then(migrate)
    .then(function() {
      return utils.assertDb(documents);
    });
  });

  it('converts a registration into a patient contact', function() {
    var registration = {
      _id: 'registrationA',
      patient_id: '1234',
      form: 'A',
      from: '555-5555',
      reported_date: 'now',
      fields: {
        patient_name: 'Testerina'
      },
      transitions: {
        registration: {
          ok: true
        }
      }
    };
    var contact = {
      _id: 'chw',
      phone: '555-5555',
      reported_date: 'now',
      type: 'person',
      parent: {
        _id: 'a-parent'
      }
    };
    var patientContact = {
      name: 'Testerina',
      patient_id: '1234',
      reported_date: 'now',
      type: 'person',
      parent: {
        _id: 'a-parent'
      }
    };
    return utils.initDb([registration, contact])
    .then(migrate)
    .then(function() {
      return utils.assertDb([registration, contact, patientContact]);
    });
  });

  it('supports patients with multiple registrations', function() {
    var registrationA = {
      _id: 'registrationA',
      patient_id: '1234',
      form: 'A',
      from: '555-5555',
      reported_date: 'now',
      fields: {
        patient_name: 'Testerina'
      },
      transitions: {
        registration: {
          ok: true
        }
      }
    };
    var registrationB = {
      _id: 'registrationB',
      form: 'A',
      from: '555-5555',
      reported_date: 'now',
      fields: {
        patient_name: 'Testerina',
        patient_id: '1234'
      },
      transitions: {
        registration: {
          ok: true
        }
      }
    };
    var contact = {
      _id: 'chw',
      phone: '555-5555',
      reported_date: 'now',
      type: 'person',
      parent: {
        _id: 'a-parent'
      }
    };
    var patientContact = {
      name: 'Testerina',
      patient_id: '1234',
      reported_date: 'now',
      type: 'person',
      parent: {
        _id: 'a-parent'
      }
    };
    return utils.initDb([registrationA, registrationB, contact])
    .then(migrate)
    .then(function() {
      return utils.assertDb([registrationA, registrationB, contact, patientContact]);
    });
  });
});
