var _ = require('underscore'),
    registrationUtils = require('@medic/registration-utils');

/**
 * Hydrates the given contact by uuid and creates a model which
 * holds the doc and associated information for rendering. eg:
 * {
 *   _id: <doc uuid>,
 *   doc: <doc>,
 *   type: <object of the configuration of this contant type>,
 *   lineage: <array of contact's parents>,
 *   children: <array of contact's children>,
 *   reports: <array of reports about the contact>,
 *   isPrimaryContact: <boolean, true if contact is a primary for another contact>
 *   icon: <the ID of the icon resource that represents this contact's type>,
 *   label: <the translation key that describes this contact's type>
 * }
 */
angular.module('inboxServices').factory('ContactViewModelGenerator',
  function(
    $q,
    $translate,
    ContactMuted,
    DB,
    GetDataRecords,
    LineageModelGenerator,
    Search,
    Settings
  ) {
    'ngInject';
    'use strict';

    const TYPE_COMPARATOR = (lhs, rhs) => {
      const lhsPerson = lhs.type && lhs.type.person;
      const rhsPerson = rhs.type && rhs.type.person;
      if (lhsPerson && !rhsPerson) {
        return -1;
      }
      if (!lhsPerson && rhsPerson) {
        return 1;
      }
      const lhsId = lhs.type && lhs.type.id || '';
      const rhsId = rhs.type && rhs.type.id || '';
      return lhsId.localeCompare(rhsId);
    };

    const PRIMARY_CONTACT_COMPARATOR = (lhs, rhs) => {
      if (lhs.isPrimaryContact) {
        return -1;
      }
      if (rhs.isPrimaryContact) {
        return 1;
      }
      return 0;
    };

    const NAME_COMPARATOR = (lhs, rhs) => {
      const primary = PRIMARY_CONTACT_COMPARATOR(lhs, rhs);
      if (primary !== 0) {
        return primary;
      }
      if (!lhs.doc.name && !rhs.doc.name) {
        return 0;
      }
      if (!rhs.doc.name) {
        return 1;
      }
      if (!lhs.doc.name) {
        return -1;
      }
      return lhs.doc.name.localeCompare(rhs.doc.name);
    };

    const AGE_COMPARATOR = (lhs, rhs) => {
      const primary = PRIMARY_CONTACT_COMPARATOR(lhs, rhs);
      if (primary !== 0) {
        return primary;
      }
      if (lhs.doc.date_of_birth &&
          rhs.doc.date_of_birth &&
          lhs.doc.date_of_birth !== rhs.doc.date_of_birth) {
        return lhs.doc.date_of_birth < rhs.doc.date_of_birth ? -1 : 1;
      }
      if (lhs.doc.date_of_birth && !rhs.doc.date_of_birth) {
        return 1;
      }
      if (!lhs.doc.date_of_birth && rhs.doc.date_of_birth) {
        return -1;
      }
      return NAME_COMPARATOR(lhs, rhs);
    };

    const REPORTED_DATE_COMPARATOR = (lhs, rhs) => {
      if (lhs.reported_date > rhs.reported_date) {
        return -1;
      }
      if (lhs.reported_date < rhs.reported_date) {
        return 1;
      }
      return 0;
    };

    const MUTED_COMPARATOR = (nextComparator, lhs, rhs) => {
      if (!!lhs.doc.muted === !!rhs.doc.muted) {
        return nextComparator(lhs, rhs);
      }
      return lhs.doc.muted ? 1 : -1;
    };

    var setPrimaryContact = function(model) {
      var parent = model.lineage && model.lineage.length && model.lineage[0];
      model.isPrimaryContact = parent &&
        parent.contact &&
        (parent.contact._id === model.doc._id);
    };

    var setMutedState = function(model) {
      model.doc.muted = ContactMuted(model.doc, model.lineage);
    };

    const groupChildrenByType = children => {
      return _.groupBy(children, child => child.doc.contact_type || child.doc.type);
    };

    const addPrimaryContact = function(doc, children) {
      var contactId = doc && doc.contact && doc.contact._id;
      if (!contactId) {
        return children;
      }

      const primaryContact = children.find(child => child.doc._id === contactId);
      if (primaryContact) {
        primaryContact.isPrimaryContact = true;
        return children;
      }

      // If the primary contact is not a child, fetch the document
      return DB().get(contactId)
        .then(doc => {
          children.push({
            doc: doc,
            isPrimaryContact: true
          });
          return children;
        })
        .catch(function(err) {
          if (err.status === 404 || err.error === 'not_found') {
            return children;
          }
          throw err;
        });
    };

    var sortChildren = function(model, childModels) {
      childModels.forEach(group => {
        const comparator = group.type && group.type.sort_by_dob ? AGE_COMPARATOR : NAME_COMPARATOR;
        group.contacts.sort(comparator);
      });
      childModels.sort(TYPE_COMPARATOR);
      return childModels;
    };

    const getChildren = (model, types, { getChildPlaces } = {}) => {
      const options = { include_docs: true };
      const contactId = model.doc._id;
      if (getChildPlaces) {
        // get all types
        options.startkey = [ contactId ];
        options.endkey = [ contactId, {} ];
      } else {
        // just get people
        options.keys = types
          .filter(type => type.person && type.parents && type.parents.includes(model.type))
          .map(type => [ contactId, type.id ]);
      }
      return DB().query('medic-client/contacts_by_parent', options)
        .then(response => response.rows);
    };

    const buildChildModels = (groups, types) => {
      return Object.keys(groups).map(typeId => {
        return {
          contacts: groups[typeId],
          type: types.find(type => type.id === typeId)
        };
      });
    };

    const markDeceased = (model, children) => {
      children.forEach(child => {
        if (child.doc.date_of_death) {
          model.deceasedCount++;
          child.deceased = true;
        }
      });
      return children;
    };

    var loadChildren = function(model, options) {
      model.children = [];
      return getContactTypes().then(types => {
        return getChildren(model, types, options)
          .then(children => addPrimaryContact(model.doc, children))
          .then(children => markDeceased(model, children))
          .then(children => groupChildrenByType(children))
          .then(groups => buildChildModels(groups, types))
          .then(childModels => sortChildren(model, childModels));
      });
    };

    var addPatientName = function(reports, contacts) {
      reports.forEach(function(report) {
        if (report.fields && !report.fields.patient_name) {
          var patientId = report.fields.patient_id ||
                          report.patient_id;
          var patient = contacts.find(contact.patient_id === patientId);
          if (patient) {
            report.fields.patient_name = patient.name;
          }
        }
      });
    };

    var getHeading = function(report) {
      if (report.validSubject && report.subject && report.subject.value) {
        return report.subject.value;
      }
      if (report.subject && report.subject.name) {
        return report.subject.name;
      }
      return $translate.instant('report.subject.unknown');
    };

    var addHeading = function(reports) {
      var reportIds = _.pluck(reports, '_id');
      return GetDataRecords(reportIds).then(function(dataRecords) {
        dataRecords.forEach(function(dataRecord) {
          var report = reports.find(report => report._id === dataRecord._id);
          if (report) {
            report.heading = getHeading(dataRecord);
          }
        });
        return reports;
      });
    };

    var getReports = function(contactDocs) {
      var subjectIds = [];
      contactDocs.forEach(function(doc) {
        subjectIds.push(registrationUtils.getSubjectIds(doc));
      });
      subjectIds = _.flatten(subjectIds);
      return Search('reports', { subjectIds: subjectIds }, { include_docs: true })
        .then(function(reports) {
          reports.forEach(function(report) {
            report.valid = !report.errors || !report.errors.length;
          });
          return reports;
        });
    };

    var loadReports = function(model) {
      var contacts = [ model.doc ];
      model.children.forEach(group => {
        if (group.type && group.type.person) {
          group.contacts.forEach(contact => contacts.push(contact.doc));
        }
      });
      return getReports(contacts)
        .then(addHeading)
        .then(function(reports) {
          addPatientName(reports, contacts);
          reports.sort(REPORTED_DATE_COMPARATOR);
          return reports;
        });
    };

    const getContactTypes = () => {
      return Settings().then(settings => settings.contact_types || []);
    };

    const setType = function(model, types) {
      const typeId = model.doc.contact_type || model.doc.type;
      model.type = types.find(type => type.id === typeId);
    };

    return {
      getContact: function(id, options) {
        return $q.all([
          getContactTypes(),
          LineageModelGenerator.contact(id, options)
        ])
          .then(function(results) {
            const types = results[0];
            const model = results[1];
            
            setType(model, types);
            setPrimaryContact(model);
            setMutedState(model);

            model.deceasedCount = 0;

            return model;
          });
      },
      loadChildren: loadChildren,
      loadReports: loadReports
    };
  }
);
