angular.module('inboxServices').factory('Repository', function(
  $log,
  $q,
  $window,
  DB
) {
  'ngInject';
  'use strict';

  function init() {
    return $q.all([
      createIndex('type'),
    ]);
  }

  /*
  function(doc) {
    var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
    var idx = types.indexOf(doc.type);
    if (idx !== -1) {
      var dead = !!doc.date_of_death;
      var muted = !!doc.muted;
      var order = dead + ' ' + muted + ' ' + idx + ' ' + (doc.name && doc.name.toLowerCase());
      emit([ doc.type ], order);
    }
  }
  */
  function contacts_by_type() {
    const orderedContactTypes = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
    const indexOfContactType = type => orderedContactTypes.indexOf(type);
    const compareFn = (a, b) => {
      if (!!a.date_of_death !== !!b.date_of_death) {
        return a.date_of_death ? -1 : 1;
      }

      if (!!a.muted !== !!b.muted) {
        return a.muted ? -1 : 1;
      }

      const typeOrderA = indexOfContactType(a.type);
      const typeOrderB = indexOfContactType(b.type);
      if (typeOrderA !== typeOrderB) {
        return typeOrderB - typeOrderA;
      }

      return (a.name || '').localeCompare(b.name, 'en');
    };

    return DB()
      .find({
        selector: {
          type: { $in: orderedContactTypes },
        },
      })
      .then(contacts => {
        contacts.sort(compareFn);
        return contacts;
      });
  }

  /*
  function(doc) {
    if (doc.type === 'data_record') {
      emit(doc.form ? 'report' : 'message');
    }
  }
  */
  function data_records_by_type() {}

  /*
  function(doc) {
    if (doc.type === 'data_record' && doc.form) {
      emit([!doc.errors || doc.errors.length === 0], doc.reported_date);
    }
  }
  */
  function data_records_by_validity(isValid) {
    const conditionalSelector = isValid ? {
      $or: [ 
        { errors: { $exists: false } }, 
        { errors: { $size: 0 } },
      ],
    } : {
      $and: [ 
        { errors: { $exists: true } },
        { $not: { errors: { $size: 0 } } },
      ],
    };

    const selector = Object.assign({ 
      type: { $eq: 'data_record' }, 
      form: { $exists: true }, 
    }, conditionalSelector);

    return DB().find({
      selector,
      // sort: ['reported_date'],
      fields: ['_id'],
    });
  }

  /*
  function(doc) {
    if (doc.type !== 'form' || !doc._attachments || !doc._attachments.xml) {
      return;
    }
    emit(doc.internalId);
  }
  */
  function forms(internalId) {
    const generalSelector = {
      type: 'form',
      '_attachments.xml': { $exists: true },
    };
    const specificSelector = internalId ? { internalId } : {};

    return DB().find({
      selector: Object.assign(generalSelector, specificSelector),
    }).then(result => result.docs);
  }

  function createIndex(name, fields) {
    const startTime = $window.performance.now();
    const fieldsArray = Array.isArray(fields) ? fields : [name];
    return DB().createIndex({ index: { name, fields: fieldsArray } })
      .then(() => $log.info(`Created index ${name}: ${$window.performance.now() - startTime}ms`))
      .catch(err => $log.error(`Failed to create index ${name}`, err));
  }
  
  const result = {
    init,

    dataRecords: {
      withType: data_records_by_type,
      withValidity: data_records_by_validity,
    },

    contacts: {
      withType: contacts_by_type,
    },

    forms,
  };

  $window.repository = result;
  return result;
});
