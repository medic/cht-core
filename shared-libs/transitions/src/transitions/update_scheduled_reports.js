const db = require('../db');
const config = require('../config');
const logger = require('../lib/logger');
const transitionUtils = require('./utils');
const contactTypeUtils = require('@medic/contact-types-utils');
const NAME = 'update_scheduled_reports';

const getLeafPlaceTypeIds = () => {
  const types = config.get('contact_types') || [];
  const placeTypes = types.filter(type => !type.person);
  const leafPlaceTypes = placeTypes.filter(type => {
    return placeTypes.every(inner => !inner.parents || !inner.parents.includes(type.id));
  });
  return leafPlaceTypes.map(type => type.id);
};

/**
 * Returns the ID of the parent iff that parent is a leaf type.
 */
const getParentId = contact => {
  const parentType = contact && contactTypeUtils.getTypeId(contact.parent);
  if (parentType) {
    const leafPlaceTypeIds = getLeafPlaceTypeIds();
    if (leafPlaceTypeIds.includes(parentType)) {
      return contact.parent._id;
    }
  }
};

module.exports = {
  name: NAME,
  filter: ({ doc, info }) => {
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
    const parentId = getParentId(doc.contact);
    if (!parentId) {
      return Promise.resolve();
    }

    let view;
    const options = { include_docs: true };
    if (doc.fields.week || doc.fields.week_number) {
      options.startkey = [
        doc.form,
        doc.fields.year,
        doc.fields.week || doc.fields.week_number,
        parentId,
      ];
      options.endkey = [
        doc.form,
        doc.fields.year,
        doc.fields.week || doc.fields.week_number,
        parentId,
        {},
      ];
      view = 'medic/reports_by_form_year_week_parent_reported_date';
    } else if (doc.fields.month || doc.fields.month_num) {
      options.startkey = [
        doc.form,
        doc.fields.year,
        doc.fields.month || doc.fields.month_num,
        parentId,
      ];
      options.endkey = [
        doc.form,
        doc.fields.year,
        doc.fields.month || doc.fields.month_num,
        parentId,
        {},
      ];
      view = 'medic/reports_by_form_year_month_parent_reported_date';
    } else {
      return Promise.resolve();
    }

    return db.medic.query(view, options).then(data => data && data.rows);
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
