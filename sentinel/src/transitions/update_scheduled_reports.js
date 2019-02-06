const utils = require('../lib/utils'),
  db = require('../db'),
  logger = require('../lib/logger'),
  transitionUtils = require('./utils'),
  NAME = 'update_scheduled_reports';

module.exports = {
  filter: (doc, info = {}) => {
    return Boolean(
      doc &&
      doc.form &&
      doc.type === 'data_record' &&
      (doc.errors ? doc.errors.length === 0 : true) &&
      module.exports._isFormScheduled(doc) &&
      !transitionUtils.hasRun(info, NAME)
    );
  },
  /**
   * If a record has a month/week/week_number, year and clinic then look for
   * duplicates and delete them.
   */
  onMatch: change => {
    return module.exports._getDuplicates(change.doc).then(rows => {
      if (!rows || !rows.length) {
        return;
      }

      if (rows.length === 1) {
        return true;
      }

      const duplicates = [];
      rows.forEach(row => {
        if (row.doc._id === change.doc._id) {
          return;
        }

        row.doc._deleted = true;
        duplicates.push(row.doc);
      });

      return db.medic
        .bulkDocs(duplicates)
        .then(() => true)
        .catch(err => {
          logger.error('error doing bulk save: %o', err);
        });
    });
  },
  //
  // look for duplicate from same year, month/week and reporting unit
  // also includes changed doc
  //
  _getDuplicates: doc => {
    const options = { include_docs: true },
          clinicId = utils.getClinicID(doc);
    let view;

    if (doc.fields.week || doc.fields.week_number) {
      options.startkey = [
        doc.form,
        doc.fields.year,
        doc.fields.week || doc.fields.week_number,
        clinicId,
      ];
      options.endkey = [
        doc.form,
        doc.fields.year,
        doc.fields.week || doc.fields.week_number,
        clinicId,
        {},
      ];
      view = 'reports_by_form_year_week_clinic_id_reported_date';
    } else if (doc.fields.month || doc.fields.month_num) {
      options.startkey = [
        doc.form,
        doc.fields.year,
        doc.fields.month || doc.fields.month_num,
        clinicId,
      ];
      options.endkey = [
        doc.form,
        doc.fields.year,
        doc.fields.month || doc.fields.month_num,
        clinicId,
        {},
      ];
      view = 'reports_by_form_year_month_clinic_id_reported_date';
    }

    if (!view || !clinicId) {
      return Promise.resolve();
    }

    return db.medic.query(`medic/${view}`, options).then(data => data && data.rows);
  },
  _isFormScheduled: function(doc) {
    return (
      doc.fields &&
      (doc.fields.month ||
        doc.fields.month_num ||
        doc.fields.week ||
        doc.fields.week_number) &&
      doc.fields.year
    );
  }
};
