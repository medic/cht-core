var _ = require('underscore'),
    registrationUtils = require('@medic/registration-utils');

/**
 * Hydrates the given contact by uuid and creates a model which
 * holds the doc and associated information for rendering. eg:
 * {
 *   _id: <doc uuid>,
 *   doc: <doc>,
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
    ContactSchema,
    DB,
    GetDataRecords,
    LineageModelGenerator,
    Search
  ) {
    'ngInject';
    'use strict';

    var NAME_COMPARATOR = function(lhs, rhs) {
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

    var AGE_COMPARATOR = function(lhs, rhs) {
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

    var REPORTED_DATE_COMPARATOR = function(lhs, rhs) {
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

    var setSchemaFields = function(model) {
      var schema = ContactSchema.get(model.doc.type);
      model.icon = schema.icon;
      model.label = schema.label;
    };

    var setMutedState = function(model) {
      model.doc.muted = ContactMuted(model.doc, model.lineage);
    };

    // muted state is inherited, but only set when online via Sentinel transition
    const setChildrenMutedState = (model, children) => {
      if (model.doc.muted) {
        children.forEach(child => child.doc.muted = child.doc.muted || model.doc.muted);
      }
      return children;

    };

    var splitContactsByType = function(children) {
      return _.groupBy(children, function(child) {
        if (child.doc.type === 'person') {
          if (child.doc.date_of_death) {
            return 'deceased';
          }
          return 'persons';
        }
        return 'places';
      });
    };

    const getPrimaryContact = function(doc, children) {
      var contactId = doc && doc.contact && doc.contact._id;
      if (!contactId) {
        return $q.resolve();
      }

      const persons = children.persons || [];
      const idx = _.findIndex(persons, person => person.doc._id === contactId);
      if (idx !== -1) {
        return $q.resolve({
          idx,
          doc: persons[idx].doc
        });
      }

      // If the primary contact is not a child, fetch the document
      return DB().get(contactId)
        .then(doc => ({ idx, doc }))
        .catch(function(err) {
          if (err.status === 404 || err.error === 'not_found') {
            return;
          }
          throw err;
        });
    };

    var sortPrimaryContactToTop = function(model, children) {
      return getPrimaryContact(model.doc, children)
        .then(function (primaryContact) {
          if (!primaryContact) {
            return;
          }
          const newChild = {
            id: primaryContact.doc._id,
            doc: primaryContact.doc,
            isPrimaryContact: true
          };
          if (!children.persons) {
            children.persons = [ newChild ];
            return;
          }
          const persons = children.persons;
          // remove existing child
          if (primaryContact.idx !== -1) {
            persons.splice(primaryContact.idx, 1);
          }
          // push the primary contact on to the start of the array
          persons.unshift(newChild);
        })
        .then(function() {
          return children;
        });
    };

    var sortChildren = function(model, children) {
      if (children.places) {
        children.places.sort(_.partial(MUTED_COMPARATOR, NAME_COMPARATOR));
      }
      if (children.persons) {
        var personComparator = model.doc.type === 'clinic' ? AGE_COMPARATOR : NAME_COMPARATOR;
        children.persons.sort(_.partial(MUTED_COMPARATOR, personComparator));
      }
      return sortPrimaryContactToTop(model, children);
    };

    const getChildren = (contactId, { getChildPlaces } = {}) => {
      const options = { include_docs: true };
      if (getChildPlaces) {
        // get all types
        options.startkey = [ contactId ];
        options.endkey = [ contactId, {} ];
      } else {
        // just get people
        options.key = [ contactId, 'person' ];
      }
      return DB().query('medic-client/contacts_by_parent', options)
        .then(response => response.rows);
    };

    var loadChildren = function(model, options) {
      model.children = {};
      if (model.doc.type === 'person') {
        return $q.resolve({});
      }

      return getChildren(model.doc._id, options)
        .then(children => setChildrenMutedState(model, children))
        .then(splitContactsByType)
        .then(function(children) {
          if (children.places && children.places.length) {
            var childPlacesSchema = ContactSchema.get(children.places[0].doc.type);
            children.childPlacesLabel = childPlacesSchema.pluralLabel;
            children.childPlacesIcon = childPlacesSchema.icon;
          }
          return sortChildren(model, children);
        });
    };

    var addPatientName = function(reports, contacts) {
      reports.forEach(function(report) {
        if (report.fields && !report.fields.patient_name) {
          var patientId = report.fields.patient_id ||
                          report.patient_id;
          var patient = _.findWhere(contacts, { patient_id: patientId });
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
      return GetDataRecords(reportIds)
              .then(function(dataRecords) {
                dataRecords.forEach(function(dataRecord) {
                  var report = _.find(reports, { '_id': dataRecord._id });
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
      [ 'persons', 'deceased' ].forEach(function(type) {
        if (model.children[type]) {
          model.children[type].forEach(function(child) {
            contacts.push(child.doc);
          });
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

    return {
      getContact: function(id, options) {
        return LineageModelGenerator.contact(id, options)
          .then(function(model) {
            setPrimaryContact(model);
            setSchemaFields(model);
            setMutedState(model);

            return model;
          });
      },
      loadChildren: loadChildren,
      loadReports: loadReports
    };
  }
);
