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
    parent: 'custom:facility',
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

angular.module('inboxServices').service('ContactSchema', [
  function() {
    return {
      get: function() {
        return {
          clinic: normalise('clinic', CLINIC),
          district_hospital: normalise('district_hospital', DISTRICT_HOSPITAL),
          health_center: normalise('health_center', HEALTH_CENTER),
          person: normalise('person', PERSON),
        };
      },
    };
  }
]);
