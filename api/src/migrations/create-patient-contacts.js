const _ = require('lodash');
const { promisify } = require('util');
const db = require('../db');
const logger = require('../logger');
const async = require('async');
const registrationUtils = require('@medic/registration-utils');
const settingsService = require('../services/settings');

const BATCH_SIZE = 100;

const registrationIdsWithNoPatientContacts = function(batch, settings, callback) {
  db.medic.query(
    'medic-client/contacts_by_reference',
    {
      keys: batch.map(row => ['shortcode', row[0]]),
    },
    function(err, results) {
      if (err) {
        return callback(err);
      }

      const existingContactShortcodes = results.rows.map(row => row.key[1]);

      const potentialRegistrationIdsToConsider = batch.filter(
        row => !_.includes(existingContactShortcodes, row[0])
      );

      db.medic.allDocs(
        {
          include_docs: true,
          keys: _.chain(potentialRegistrationIdsToConsider)
            .map(row => row[1])
            .flattenDeep()
            .value(),
        },
        function(err, results) {
          if (err) {
            return callback(err);
          }

          const registrations = results.rows
            .map(row => row.doc)
            .filter(doc => registrationUtils.isValidRegistration(doc, settings));

          callback(null, registrations);
        }
      );
    }
  );
};

const batchCreatePatientContacts = function(batch, settings, callback) {
  process.stdout.write('Of ' + batch.length + ' potential patients ');

  registrationIdsWithNoPatientContacts(batch, settings, function(
    err,
    registrationsToConsider
  ) {
    if (err) {
      return callback(err);
    }

    process.stdout.write(
      registrationsToConsider.length + ' do not have a contact. '
    );
    if (registrationsToConsider.length === 0) {
      process.stdout.write('\n');
      return callback();
    }

    process.stdout.write('Getting registrations.. ');

    const uniqueValidRegistrations = _.chain(registrationsToConsider)
      .filter(function(registration) {
        // Registrations require a patient_id to indicate they are the type to
        // have a patient contact created for them
        return registration.patient_id;
      })
      .uniqBy(function(registration) {
        // And we only need one for each patient.
        return registration.patient_id;
      })
      .value();

    if (!uniqueValidRegistrations.length) {
      logger.info('no new patient registrations in this batch');
      return callback();
    }

    process.stdout.write(
      uniqueValidRegistrations.length +
        ' new patient registrations.. Getting parents.. '
    );

    const contactPhoneNumbers = _.chain(uniqueValidRegistrations)
      .map('from')
      .uniq()
      .value();

    db.medic.query(
      'medic-client/contacts_by_phone',
      {
        keys: contactPhoneNumbers,
        include_docs: true,
      },
      function(err, results) {
        if (err) {
          return callback(err);
        }

        const contactForPhoneNumber = _.chain(results.rows)
          .map('doc')
          .uniq()
          .reduce(function(memo, doc) {
            memo[doc.phone] = doc;
            return memo;
          }, {})
          .value();

        const patientPersons = uniqueValidRegistrations.map(function(
          registration
        ) {
          const contact = contactForPhoneNumber[registration.from];
          // create a new patient with this patient_id
          const fields = registration.fields || {};
          const name =
            fields.patient_name ||
            fields.full_name ||
            registration.patient_name ||
            registration.full_name;
          const patient = {
            name: name,
            parent: contact && contact.parent,
            reported_date: registration.reported_date,
            type: 'person',
            patient_id: registration.patient_id,
          };
          // include the DOB if it was generated on report
          if (registration.birth_date) {
            patient.date_of_birth = registration.birth_date;
          }
          return patient;
        });

        process.stdout.write(
          'Storing ' + patientPersons.length + ' new patient contacts.. '
        );

        db.medic.bulkDocs(patientPersons, function(err, results) {
          if (err) {
            return callback(err);
          }

          const errors = results.filter(function(result) {
            return !result.ok;
          });

          if (errors.length) {
            return callback(
              new Error('Bulk create errors: ' + JSON.stringify(errors))
            );
          }

          logger.info('batch DONE');
          callback();
        });
      }
    );
  });
};

module.exports = {
  name: 'create-patient-contacts',
  created: new Date(2017, 2, 13),
  run: promisify(function(callback) {
    settingsService.get().then(settings => {
      db.medic.query('medic-client/registered_patients', {}, function(
        err,
        results
      ) {
        if (err) {
          return callback(err);
        }

        if (results.rows.length === 0) {
          logger.info('No registered patients to create contacts from');
          return callback();
        }

        const registrationsForPatientShortcode = _.toPairs(
          _.reduce(
            results.rows,
            function(memo, row) {
              if (!memo[row.key]) {
                memo[row.key] = [];
              }

              memo[row.key].push(row.id);
              return memo;
            },
            {}
          )
        );

        let progressCount = 0;
        const total = registrationsForPatientShortcode.length;

        logger.info(`There are ${total} patients with registrations`);

        async.doWhilst(
          function(callback) {
            const batch = registrationsForPatientShortcode.splice(0, BATCH_SIZE);
            progressCount += BATCH_SIZE;

            process.stdout.write('[' + progressCount + '/' + total + '] ');
            batchCreatePatientContacts(batch, settings, callback);
          },
          function(cb) {
            return cb(null, registrationsForPatientShortcode.length);
          },
          callback
        );
      });
    });
  }),
};
