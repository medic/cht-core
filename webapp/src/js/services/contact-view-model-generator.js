var _ = require('underscore');

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
    $log,
    $q,
    ContactMuted,
    ContactSchema,
    DB,
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

    var setPrimaryContact = function(model) {
      var parent = model.lineage && model.lineage.length && model.lineage[0];
      model.isPrimaryContact = parent &&
        parent.contact &&
        (parent.contact._id === model.doc._id);
      return model;
    };

    var setSchemaFields = function(model) {
      var schema = ContactSchema.get(model.doc.type);
      model.icon = schema.icon;
      model.label = schema.label;
      return model;
    };

    var setMutedState = function(model) {
      model.doc.muted = ContactMuted(model.doc, model.lineage);
      return model;
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

    var getPrimaryContact = function(doc) {
      var contactId = doc && doc.contact && doc.contact._id;
      if (!contactId) {
        return $q.resolve();
      }
      return DB().get(contactId).catch(function(err) {
        if (err.status === 404 || err.error === 'not_found') {
          return;
        }
        throw err;
      });
    };

    var sortPrimaryContactToTop = function(model) {
      return getPrimaryContact(model.doc)
        .then(function(primaryContact) {
          if (!primaryContact) {
            return;
          }
          var newChild = {
            id: primaryContact._id,
            doc: primaryContact,
            isPrimaryContact: true
          };
          if (!model.children.persons) {
            model.children.persons = [ newChild ];
            return;
          }
          var persons = model.children.persons;
          // remove existing child
          var primaryContactIdx = _.findIndex(persons, function(child) {
            return child.doc._id === primaryContact._id;
          });
          if (primaryContactIdx !== -1) {
            persons.splice(primaryContactIdx, 1);
          }
          // push the primary contact on to the start of the array
          persons.unshift(newChild);
        })
        .then(function() {
          return model;
        });
    };

    var sortChildren = function(model) {
      if (model.children.places) {
        model.children.places.sort(NAME_COMPARATOR);
      }
      if (model.children.persons) {
        var personComparator = model.doc.type === 'clinic' ? AGE_COMPARATOR : NAME_COMPARATOR;
        model.children.persons.sort(personComparator);
      }
      return sortPrimaryContactToTop(model);
    };

    var getChildren = function(contactId) {
      return DB().query('medic-client/contacts_by_parent', {
        key: contactId,
        include_docs: true
      })
        .then(function(childrenResponse) {
          return childrenResponse.rows;
        })
        .then(function(children) {
          var ids = _.compact(children.map(function(child) {
            return child.doc.contact && child.doc.contact._id;
          }));
          return DB().allDocs({ keys: ids, include_docs: true })
            .then(function(contactsResponse) {
              children.forEach(function(child) {
                var contactId = child.doc.contact && child.doc.contact._id;
                if (contactId) {
                  var contactRow = _.findWhere(contactsResponse.rows, { id: contactId });
                  if (contactRow) {
                    child.doc.contact = contactRow.doc;
                  }
                }
              });
              return children;
            });
        });
    };

    var setChildren = function(model) {
      model.children = {};
      if (model.doc.type === 'person') {
        return model;
      }
      return getChildren(model.doc._id)
        .then(splitContactsByType)
        .then(function(children) {
          if (children.places && children.places.length) {
            var childPlacesSchema = ContactSchema.get(children.places[0].doc.type);
            children.childPlacesLabel = childPlacesSchema.pluralLabel;
            children.childPlacesIcon = childPlacesSchema.icon;
          }
          model.children = children;
          return sortChildren(model);
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

    var getReports = function(contactDocs) {
      var subjectIds = [];
      contactDocs.forEach(function(doc) {
        subjectIds.push(doc._id);
        if (doc.patient_id) {
          subjectIds.push(doc.patient_id);
        }
        if (doc.place_id) {
          subjectIds.push(doc.place_id);
        }
      });
      return Search('reports', { subjectIds: subjectIds }, { include_docs: true })
        .then(function(reports) {
          reports.forEach(function(report) {
            report.valid = !report.errors || !report.errors.length;
          });
          return reports;
        });
    };

    var setReports = function(model) {
      var contacts = [ model.doc ];
      [ 'persons', 'deceased' ].forEach(function(type) {
        if (model.children[type]) {
          model.children[type].forEach(function(child) {
            contacts.push(child.doc);
          });
        }
      });
      return getReports(contacts)
        .then(function(reports) {
          addPatientName(reports, contacts);
          reports.sort(REPORTED_DATE_COMPARATOR);
          model.reports = reports;
          return model;
        });
    };

    return function(id, options) {
      return LineageModelGenerator.contact(id, options)
        .then(setChildren)
        .then(setReports)
        .then(setPrimaryContact)
        .then(setSchemaFields)
        .then(setMutedState);
    };
  }
);
