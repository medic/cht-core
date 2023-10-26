const utils = require('./utils');

describe('namespace-form-fields migration', function() {
  afterEach(function() {
    return utils.tearDown();
  });

  it('should put form fields in fields property', function() {
    // given

    const needsMigration = {
      _id: 'abc',
      type: 'data_record',
      form: 'R',
      patient_name: 'Henok'
    };

    const alreadyMigrated = {
      _id: 'def',
      type: 'data_record',
      form: 'R',
      fields: {
        patient_name: 'Dave'
      }
    };

    const unknownForm = {
      _id: 'hij',
      type: 'data_record',
      form: 'P',
      patient_name: 'Marc'
    };

    return utils.initDb([ needsMigration, alreadyMigrated, unknownForm ])
      .then(function() {
        return utils.initSettings({
          forms: { // this is the default config
            R: {
              meta: {
                code: 'R',
                icon: 'registration',
                label: {
                  en: 'Pregnancy Registration'
                }
              },
              fields: {
                patient_name: {
                  labels: {
                    tiny: {
                      en: 'N'
                    },
                    description: {
                      en: 'Patient Name'
                    },
                    short: {
                      en: 'Name'
                    }
                  },
                  position: 0,
                  type: 'string',
                  length: [
                    1,
                    30
                  ],
                  required: true
                }
              },
              public_form: true,
              use_sentinel: true
            }
          }
        });
      })
      .then(function() {

        // when
        return utils.runMigration('namespace-form-fields');

      })
      .then(function() {

        // expect
        return utils.assertDb([
          {
            _id: 'abc',
            type: 'data_record',
            form: 'R',
            fields: {
              patient_name: 'Henok'
            }
          },
          alreadyMigrated,
          unknownForm
        ]);

      });
  });
});
