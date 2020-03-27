const utils = require('./utils');

const migrate = function() {
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
    const settings = {
      registrations: [{
        form: 'A'
      }]
    };
    const documents = [
      {
        _id: 'registrationA',
        patient_id: '1234',
        form: 'A',
        content_type: 'xml',
        type: 'data_record'
      },
      {
        _id: 'RANDOM_UUID',
        patient_id: '1234',
        reported_date: 'now',
        type: 'person'
      }
    ];
    return utils.initDb(documents)
      .then(() => utils.initSettings(settings))
      .then(migrate)
      .then(function() {
        return utils.assertDb(documents);
      });
  });

  it('should ignore registrations that are not "actual" registrations', function() {
    const settings = {
      registrations: [{
        form: 'A'
      }]
    };
    const documents = [
      {
        _id: 'chw',
        type: 'person',
        parent: { _id: 'parent' },
        phone: '555-555',
        reported_date: 'now'
      },
      {
        _id: 'registrationA',
        // patient_id: '1234', <-- if a registration doesn't have a patient id here it was not a registration that
        //                         resulted in a patient_id being created, and thus should not have a patient contact
        //                         created for it.
        fields: {
          patient_id: '1234',
          patient_name: 'test1'
        },
        form: 'A',
        content_type: 'xml',
        type: 'data_record'
      },
      {
        _id: 'registrationB',
        patient_id: '12341',
        fields: {
          patient_name: 'test2'
        },
        form: 'A',
        content_type: 'xml',
        // type: 'data_record' <-- type is required to be `data_record`
      },
      {
        _id: 'registrationC',
        patient_id: '12342',
        fields: {
          patient_name: 'test3'
        },
        // form: 'A',          <-- form field is required
        content_type: 'xml',
        type: 'data_record'
      },
      {
        _id: 'registrationD',
        patient_id: '12343',
        fields: {
          patient_name: 'test4'
        },
        form: 'B',           // <-- form should be configured
        content_type: 'xml',
        type: 'data_record'
      },
      {
        _id: 'registrationE',
        patient_id: '12344',
        fields: {
          patient_name: 'test5'
        },
        form: 'A',
        content_type: 'other', // when content_type != `xml`, needs a public form or contact property
        type: 'data_record'
      },
      {
        _id: 'registrationF',
        patient_id: '12345',
        form: 'A',
        from: '555-5555',
        reported_date: 'now',
        fields: {
          patient_name: 'test6'
        },
        content_type: 'xml',
        type: 'data_record',
        errors: ['some', 'error'] // invalid when errors are present
      }
    ];
    return utils.initDb(documents)
      .then(() => utils.initSettings(settings))
      .then(migrate)
      .then(function() {
        return utils.assertDb(documents);
      });
  });

  it('converts a registration into a patient contact', function() {
    const settings = {
      registrations: [{
        form: 'A'
      }]
    };
    const registration = {
      _id: 'registrationA',
      patient_id: '1234',
      form: 'A',
      from: '555-5555',
      reported_date: 'now',
      fields: {
        patient_name: 'Testerina'
      },
      content_type: 'xml',
      type: 'data_record'
    };
    const contact = {
      _id: 'chw',
      phone: '555-5555',
      reported_date: 'now',
      type: 'person',
      parent: {
        _id: 'a-parent'
      }
    };
    const patientContact = {
      name: 'Testerina',
      patient_id: '1234',
      reported_date: 'now',
      type: 'person',
      parent: {
        _id: 'a-parent'
      }
    };
    return utils.initDb([registration, contact])
      .then(() => utils.initSettings(settings))
      .then(migrate)
      .then(function() {
        return utils.assertDb([registration, contact, patientContact]);
      });
  });

  it('supports patients with multiple registrations', function() {
    const settings = {
      registrations: [{
        form: 'A'
      }]
    };
    const registrationA = {
      _id: 'registrationA',
      patient_id: '1234',
      form: 'A',
      from: '555-5555',
      reported_date: 'now',
      fields: {
        patient_name: 'Testerina'
      },
      content_type: 'xml',
      type: 'data_record'
    };
    const registrationB = {
      _id: 'registrationB',
      form: 'A',
      from: '555-5555',
      reported_date: 'now',
      fields: {
        patient_name: 'Testerina',
        patient_id: '1234'
      },
      content_type: 'xml',
      type: 'data_record'
    };
    const contact = {
      _id: 'chw',
      phone: '555-5555',
      reported_date: 'now',
      type: 'person',
      parent: {
        _id: 'a-parent'
      }
    };
    const patientContact = {
      name: 'Testerina',
      patient_id: '1234',
      reported_date: 'now',
      type: 'person',
      parent: {
        _id: 'a-parent'
      }
    };
    return utils.initDb([registrationA, registrationB, contact])
      .then(() => utils.initSettings(settings))
      .then(migrate)
      .then(function() {
        return utils.assertDb([registrationA, registrationB, contact, patientContact]);
      });
  });
});
