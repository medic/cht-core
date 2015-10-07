var _ = require('underscore');

var CLINIC = {
  badge: 'fa-home',
  icon: 'fa-home',
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
    },
    location: {
      type: 'geopoint',
      hide_in_view: true,
    },
  },
};

var DISTRICT_HOSPITAL = {
  badge: 'fa-building',
  icon: 'fa-building',
  fields: {
    name: {
      type: 'string',
      required: true,
    },
    contact: {
      type: 'db:person',
      required: true,
    },
    external_id: 'string',
    notes: 'text',
  },
};

var HEALTH_CENTER = {
  badge: 'fa-hospital-a',
  icon: 'fa-hospital-o',
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
    },
    external_id: 'string',
    notes: 'text',
  },
};

var PERSON = {
  badge: 'fa-user',
  name: '{{first_name}} {{last_name}}',
  fields: {
    first_name: {
      type: 'string',
      required: true,
    },
    last_name: {
      type: 'string',
      required: true,
    },
    national_id_number: 'string',
    date_of_birth: 'date',
    phone: {
      type: 'tel',
      required: true,
    },
    alternate_phone: 'tel',
    notes: 'text',
    parent: 'custom:medic-place',
  },
};

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
  return {
    district_hospital: normalise('district_hospital', DISTRICT_HOSPITAL),
    health_center: normalise('health_center', HEALTH_CENTER),
    clinic: normalise('clinic', CLINIC),
    person: normalise('person', PERSON),
  };
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

angular.module('inboxServices').service('ContactSchema', [
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
        _.each(Object.keys(schema).reverse(), function(key) {
          if (key === limit) {
            deleting = true;
          }
          if (deleting) {
            delete schema[key];
          }
        });
        return schema;
      },
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
      validate: validateSchema,
    };
  }
]);
