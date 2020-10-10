const _ = require('lodash/core');
const registrationUtils = require('@medic/registration-utils');

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
    ContactTypes,
    DB,
    GetDataRecords,
    LineageModelGenerator,
    Search
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

    const setPrimaryContact = model => {
      const immediateParent = model.lineage && model.lineage.length && model.lineage[0];
      model.isPrimaryContact = immediateParent &&
        immediateParent.contact &&
        immediateParent.contact._id === model.doc._id;
    };

    const setMutedState = modelToMute => {
      modelToMute.doc.muted = ContactMuted(modelToMute.doc, modelToMute.lineage);
    };

    // muted state is inherited, but only set when online via Sentinel transition
    const setChildrenMutedState = (model, children) => {
      if (model.doc.muted) {
        children.forEach(child => child.doc.muted = child.doc.muted || model.doc.muted);
      }
      return children;
    };

    const groupChildrenByType = children => {
      return _.groupBy(children, child => child.doc.contact_type || child.doc.type);
    };

    const addPrimaryContact = function(doc, children) {
      const contactId = doc && doc.contact && doc.contact._id;
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

    const sortChildren = function(model, childModels) {
      childModels.forEach(group => {
        const comparator = group.type && group.type.sort_by_dob ? AGE_COMPARATOR : NAME_COMPARATOR;
        group.contacts.sort(_.partial(MUTED_COMPARATOR, comparator));
      });
      childModels.sort(TYPE_COMPARATOR);
      return childModels;
    };

    const getPersonChildTypes = (types, parentId) => {
      if (!parentId) {
        return [];
      }
      const childTypes = types.filter(type => {
        return type.person &&
               type.parents &&
               type.parents.includes(parentId);
      });
      return childTypes;
    };

    const getChildren = (model, types, { getChildPlaces } = {}) => {
      const options = { include_docs: true };
      const contactId = model.doc._id;
      if (getChildPlaces) {
        // get all types
        options.startkey = [ contactId ];
        options.endkey = [ contactId, {} ];
      } else {
        // just get person children
        const childTypes = getPersonChildTypes(types, model.type && model.type.id);
        if (!childTypes.length) {
          return $q.resolve([]);
        }
        options.keys = childTypes.map(type => [ contactId, type.id ]);
      }
      return DB().query('medic-client/contacts_by_parent', options)
        .then(response => response.rows);
    };

    const buildChildModels = (groups, types) => {
      return Object.keys(groups).map(typeId => {
        return {
          contacts: groups[typeId],
          type: types.find(type => type.id === typeId),
          deceasedCount: 0
        };
      });
    };

    const markDeceased = (model, childModels) => {
      childModels.forEach(group => {
        group.contacts.forEach(child => {
          if (child.doc.date_of_death) {
            group.deceasedCount++;
            child.deceased = true;
          }
        });
      });
      return childModels;
    };

    const loadChildren = function(model, options) {
      model.children = [];
      return ContactTypes.getAll().then(types => {
        return getChildren(model, types, options)
          .then(children => setChildrenMutedState(model, children))
          .then(children => addPrimaryContact(model.doc, children))
          .then(children => groupChildrenByType(children))
          .then(groups => buildChildModels(groups, types))
          .then(childModels => markDeceased(model, childModels))
          .then(childModels => sortChildren(model, childModels));
      });
    };

    const addPatientName = function(reports, contacts) {
      reports.forEach(function(report) {
        if (report.fields && !report.fields.patient_name) {
          const patientId = report.fields.patient_id || report.patient_id;
          const patient = contacts.find(contact => contact.patient_id === patientId);
          if (patient) {
            report.fields.patient_name = patient.name;
          }
        }
      });
    };

    const getHeading = function(report, forms) {
      const form = _.find(forms, { code: report.form });
      if (form && form.subjectKey) {
        return $translate.instant(form.subjectKey, report);
      }
      if (report.validSubject && report.subject && report.subject.value) {
        return report.subject.value;
      }
      if (report.subject && report.subject.name) {
        return report.subject.name;
      }
      return $translate.instant('report.subject.unknown');
    };

    const addHeading = function(reports, forms) {
      const reportIds = _.map(reports, '_id');
      return GetDataRecords(reportIds).then(function(dataRecords) {
        dataRecords.forEach(function(dataRecord) {
          const report = reports.find(report => report._id === dataRecord._id);
          if (report) {
            report.heading = getHeading(dataRecord, forms);
          }
        });
        return reports;
      });
    };

    const getReports = function(contactDocs) {
      const subjectIds = [];
      contactDocs.forEach(function(doc) {
        subjectIds.push(registrationUtils.getSubjectIds(doc));
      });
      const searchOptions = { subjectIds: _.flattenDeep(subjectIds) };
      return Search('reports', searchOptions, { include_docs: true }).then(function(reports) {
        reports.forEach(function(report) {
          report.valid = !report.errors || !report.errors.length;
        });
        return reports;
      });
    };

    const loadReports = function(model, forms) {
      const contacts = [ model.doc ];
      model.children.forEach(group => {
        if (group.type && group.type.person) {
          group.contacts.forEach(contact => contacts.push(contact.doc));
        }
      });
      return getReports(contacts)
        .then(reports => addHeading(reports, forms))
        .then(function(reports) {
          addPatientName(reports, contacts);
          reports.sort(REPORTED_DATE_COMPARATOR);
          return reports;
        });
    };

    const setType = function(model, types) {
      const typeId = model.doc.contact_type || model.doc.type;
      model.type = types.find(type => type.id === typeId);
    };

    return {
      getContact: function(id, options) {
        return $q.all([
          ContactTypes.getAll(),
          LineageModelGenerator.contact(id, options)
        ])
          .then(function(results) {
            const types = results[0];
            const model = results[1];

            setType(model, types);
            setPrimaryContact(model);
            setMutedState(model);

            return model;
          });
      },
      loadChildren: loadChildren,
      loadReports: loadReports
    };
  }
);
