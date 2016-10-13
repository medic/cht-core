var _ = require('underscore');

/**
 * Schema used for Enketo contact forms.
 * Also contains helper functions to access the type hierarchy.
 */
var rawSchema = [
  {
    type: 'district_hospital',
    isPlace: true,
    schema: {
      icon: 'fa-building',
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
      icon: 'fa-hospital-o',
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
      icon: 'fa-group',
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
      icon: 'fa-user',
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

function getSchema() {
  var normalizedSchema = {};
  rawSchema.forEach(function(elem) {
    normalizedSchema[elem.type] = normalise(elem.type, elem.schema);
  });
  return normalizedSchema;
}

function getTypesInOrder() {
  return rawSchema.map(function(elem) {
    return elem.type;
  });
}

var RESERVED_FIELD_NAMES = [
  'children',
  'parents',
];

function validateSchema(type, schema) {
  schema = normalise(type, schema);

  var fieldNames = Object.keys(schema.fields);

  // check for reserved fields
  if(_.some(RESERVED_FIELD_NAMES, function(restricted) {
        return _.contains(fieldNames, restricted);
      })) {
    throw new Error('Reserved name used for field.  Do not name fields any of: ' + RESERVED_FIELD_NAMES);
  }

  // check for fields in `name` which do not exist
  if(schema.fields.hasOwnProperty('name')) {
    if(schema.name) {
      throw new Error('Cannot define calculated `name` if there is also a field called `name`.');
    }
  } else {
    if(!schema.name) {
      throw new Error('No `name` property specified and no `name` field present.');
    }
    _.chain(schema.name.match(/\{\{[^}]*\}\}/g))
        .map(function(m) {
          return m.substring(2, m.length-2);
        })
        .each(function(key) {
          if(fieldNames.indexOf(key) === -1) {
            throw new Error('Non-existent field referenced in name: "' + key + '"');
          }
        });
  }

  return true;
}

angular.module('inboxServices').service('ContactSchema',
  function() {
    return {
      get: function() {
        var schema = getSchema();
        if(arguments.length) {
          return schema[arguments[0]];
        }
        return schema;
      },
      getBelow: function(limit) {
        var schema = getSchema();
        var deleting;
        _.each(getTypesInOrder().reverse(), function(key) {
          if (key === limit) {
            deleting = true;
          }
          if (deleting) {
            delete schema[key];
          }
        });
        return schema;
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
        var placeTypes = rawSchema.map(function(elem) {
          if (elem.isPlace) {
            return elem.type;
          }
        });
        return _.filter(placeTypes, function(val) { return val !== undefined; });
      },
      getTypes: getTypesInOrder,
      getVisibleFields: function() {
        // return a modified schema, missing special fields such as `parent`, and
        // anything included in the `name` attribute
        var schema = getSchema();
        _.each(schema, function(s) {
          // Remove fields included in the name, so they are not duplicated below
          // it in the form
          if(s.name) {
            _.map(s.name.match(/\{\{[^}]+\}\}/g), function(key) {
              return key.substring(2, key.length-2);
            }).forEach(function(key) {
              delete s.fields[key];
            });
          }
          delete s.fields.name;
          delete s.fields.parent;

          _.each(s.fields, function(props, name) {
            if (props.hide_in_view) {
              delete s.fields[name];
            }
          });
        });
        return schema;
      },
      // Used by Enketo.
      validate: validateSchema,
    };
  }
);
