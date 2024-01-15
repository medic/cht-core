angular.module('inboxServices').factory('GetSummaries',
  function(
    $q,
    ContactTypes,
    DB,
    Session
  ) {

    'use strict';
    'ngInject';

    const SUBJECT_FIELDS = [ 'patient_id', 'patient_name', 'place_id' ];

    const getLineage = contact => {
      const parts = [];
      while (contact) {
        if (contact._id) {
          parts.push(contact._id);
        }
        contact = contact.parent;
      }
      return parts;
    };

    const isMissingSubjectError = error => {
      return error.code === 'sys.missing_fields' &&
             error.fields &&
             error.fields.some(field => SUBJECT_FIELDS.includes(field));
    };

    const getSubject = doc => {
      const subject = {};
      const reference = doc.patient_id ||
                      (doc.fields && doc.fields.patient_id) ||
                      doc.place_id;
      const patientName = doc.fields && doc.fields.patient_name;
      if (patientName) {
        subject.name = patientName;
      }

      if (reference) {
        subject.value = reference;
        subject.type = 'reference';
      } else if (doc.fields && doc.fields.place_id) {
        subject.value = doc.fields.place_id;
        subject.type = 'id';
      } else if (patientName) {
        subject.value = patientName;
        subject.type = 'name';
      } else if (doc.errors) {
        if (doc.errors.some(error => isMissingSubjectError(error))) {
          subject.type = 'unknown';
        }
      }

      return subject;
    };

    // WARNING: This is a copy of the medic/doc_summaries_by_id view
    // with some minor modifications and needs to be kept in sync until
    // this workaround is no longer needed.
    // https://github.com/medic/medic/issues/4666
    const summarise = doc => {
      if (!doc) {
        // happens when the doc with the requested id wasn't found in the DB
        return;
      }

      if (doc.type === 'data_record' && doc.form) { // report
        return {
          _id: doc._id,
          _rev: doc._rev,
          from: doc.from || doc.sent_by,
          phone: doc.contact && doc.contact.phone,
          form: doc.form,
          read: doc.read,
          valid: !doc.errors || !doc.errors.length,
          verified: doc.verified,
          reported_date: doc.reported_date,
          contact: doc.contact && doc.contact._id,
          lineage: getLineage(doc.contact && doc.contact.parent),
          subject: getSubject(doc),
          case_id: doc.case_id || (doc.fields && doc.fields.case_id)
        };
      }
      if (ContactTypes.includes(doc)) { // contact
        return {
          _id: doc._id,
          _rev: doc._rev,
          name: doc.name || doc.phone,
          phone: doc.phone,
          type: doc.type,
          contact_type: doc.contact_type,
          contact: doc.contact && doc.contact._id,
          lineage: getLineage(doc.parent),
          date_of_death: doc.date_of_death,
          muted: doc.muted
        };
      }
    };

    const getRemote = ids => {
      return DB().query('medic/doc_summaries_by_id', { keys: ids }).then(response => {
        return response.rows.map(row => {
          row.value._id = row.id;
          return row.value;
        });
      });
    };

    const getLocal = ids => {
      return DB().allDocs({ keys: ids, include_docs: true }).then(response => {
        return response.rows
          .map(row => summarise(row.doc))
          .filter(summary => summary);
      });
    };

    return ids => {
      if (!ids || !ids.length) {
        return $q.resolve([]);
      }
      if (Session.isOnlineOnly()) {
        return getRemote(ids);
      }
      return getLocal(ids);
    };
  });
