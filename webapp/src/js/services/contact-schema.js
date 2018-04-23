var _ = require('underscore');

/**
 * Service to prepare the schema used for Enketo contact forms.
 * Also contains helper functions to access the type hierarchy.
 */

// Keep this array in hierarchical order.
var RAW_SCHEMAS = [
  {
    type: 'district_hospital',
    isPlace: true,
    schema: {
      icon: 'medic-district-hospital',
      addButtonLabel: 'contact.type.district_hospital.new',
      label: 'contact.type.district_hospital',
      pluralLabel: 'contact.type.district_hospital.plural',
      fields: {
        name: {
          type: 'string',
          required: true,
        },
        contact: {
          type: 'db:person',
          required: true,
          parent: 'PARENT'
        },
        external_id: 'string',
        notes: 'text',
      },
    }
  },

  {
    type: 'health_center',
    isPlace: true,
    schema: {
      icon: 'medic-health-center',
      addButtonLabel: 'contact.type.health_center.new',
      label: 'contact.type.health_center',
      pluralLabel: 'contact.type.health_center.plural',
      fields: {
        name: {
          type: 'string',
          required: true,
        },
        parent: {
          type: 'db:district_hospital',
          required: true,
        },
        contact: {
          type: 'db:person',
          required: true,
          parent: 'PARENT'
        },
        external_id: 'string',
        notes: 'text',
      },
    }
  },

  {
    type: 'clinic',
    isPlace: true,
    schema: {
      icon: 'medic-clinic',
      addButtonLabel: 'contact.type.clinic.new',
      label: 'contact.type.clinic',
      pluralLabel: 'contact.type.clinic.plural',
      fields: {
        name: {
          type: 'string',
          required: true,
        },
        parent: {
          type: 'db:health_center',
          required: true,
        },
        contact: {
          type: 'db:person',
          required: true,
          parent: 'PARENT'
        },
        location: {
          type: 'geopoint',
          hide_in_view: true,
        },
      },
    }
  },

  {
    type: 'person',
    isPlace: false,
    schema: {
      icon: 'medic-person',
      addButtonLabel: 'contact.type.person.new',
      label: 'contact.type.person',
      pluralLabel: 'contact.type.person.plural',
      fields: {
        name: {
          type: 'string',
          required: true,
        },
        date_of_birth: 'date',
        phone: {
          type: 'tel',
          required: true,
        },
        alternate_phone: 'tel',
        notes: 'text',
        parent: {
          type: 'custom:medic-place',
          hide_in_form: true,
        },
      },
    }
  }
];

/**
 * Normalise the schema.
 *
 * Normalisation involves:
 * - expanding short-hand notation
 * - explicitly setting default values
 */
function normalise(type, schema) {
  var clone = _.clone(schema);
  clone.type = type;
  var fields = _.clone(clone.fields);
  _.forEach(fields, function(conf, name) {
    if(typeof conf === 'string') {
      fields[name] = { type: conf };
    } else {
      fields[name] = _.clone(conf);
    }
  });
  clone.fields = fields;
  return clone;
}

// NB: this operates as a deep-clone of the schema, avoiding problems with
//     callers being able to mutate the reference schema
function getSchema() {
  var normalisedSchema = {};
  RAW_SCHEMAS.forEach(function(elem) {
    normalisedSchema[elem.type] = normalise(elem.type, elem.schema);
  });
  return normalisedSchema;
}

function getTypesInOrder() {
  return RAW_SCHEMAS.map(function(elem) {
    return elem.type;
  });
}

angular.module('inboxServices').service('ContactSchema',
  function() {
    'use strict';

    return {
      get: function(type) {
        if(type) {
          return getSchema()[type];
        } else {
          return getSchema();
        }
      },
      getChildPlaceType: function(type) {
        var schema = getSchema();
        if (!_.has(schema, type)) {
          return;
        }
        return _.findKey(schema, function(value) {
          return value.fields.parent && (value.fields.parent.type === ('db:' + type));
        });
      },
      getPlaceTypes: function() {
        return _.chain(RAW_SCHEMAS)
                .filter(function(schema) {
                  return schema.isPlace;
                })
                .map(function(schema) {
                  return schema.type;
                })
                .value();
      },
      getTypes: getTypesInOrder,
      getVisibleFields: function() {
        // return a modified schema, missing special fields such as `parent`
        var schema = getSchema();
        _.each(schema, function(s) {
          delete s.fields.name;
          delete s.fields.parent;

          _.each(s.fields, function(props, name) {
            if (props.hide_in_view) {
              delete s.fields[name];
            }
          });
        });
        return schema;
      }
    };
  }
);
