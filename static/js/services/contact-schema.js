var _ = require('underscore');

var CLINIC = {
  title: '{{name}}',
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
    external_id: 'string',
    notes: 'text',
  },
};

var DISTRICT_HOSPITAL = {
  title: '{{name}}',
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
  title: '{{name}}',
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
  title: '{{name}}',
  badge: 'fa-user',
  fields: {
    name: {
      type: 'string',
      required: true,
    },
    phone: {
      type: 'phone',
      required: true,
    },
    code: 'string',
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
  'title',
];

function validateSchema(schema) {
  var fieldNames = Object.keys(schema.fields);

  // check for reserved fields
  if(_.some(RESERVED_FIELD_NAMES, function(restricted) {
        return _.contains(fieldNames, restricted);
      })) {
    throw new Error('Reserved name used for field.  Do not name fields any of: ' + RESERVED_FIELD_NAMES);
  }

  // check for fields in `title` which do not exist
  _.chain(schema.title.match(/\{\{[^}]*\}\}/g))
      .map(function(m) {
        return m.substring(2, m.length-2);
      })
      .each(function(key) {
        if(fieldNames.indexOf(key) === -1) {
          throw new Error('Non-existent field referenced in title: "' + key + '"');
        }
      });

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
      getWithoutSpecialFields: function() {
        // return a modified schema, missing special fields such as `parent`, and
        // anything included in the `title` attribute
        var schema = getSchema();
        _.each(schema, function(s) {
          // Remove fields included in the title, so they are not duplicated below
          // it in the form
          _.map(s.title.match(/\{\{[^}]+\}\}/g), function(key) {
            return key.substring(2, key.length-2);
          }).forEach(function(key) {
            delete s.fields[key];
          });
          delete s.fields.parent;
        });
        return schema;
      },
      validate: validateSchema,
    };
  }
]);
