var _ = require('underscore');

var CATCHMENT_AREA = {
  title: '{{name}}',
  badge: 'fa-home',
  fields: {
    name: {
      type: 'string',
      required: true,
    },
    health_centre: {
      type: 'db:health_centre',
      required: true,
    },
    primary_contact: {
      type: 'db:person',
      required: true,
    },
    external_id: 'string',
    notes: 'text',
  },
};

var DISTRICT = {
  title: '{{name}}',
  badge: 'fa-building',
  fields: {
    name: {
      type: 'string',
      required: true,
    },
    primary_contact: {
      type: 'db:person',
      required: true,
    },
    external_id: 'string',
    notes: 'text',
  },
};

var HEALTH_CENTRE = {
  title: '{{name}}',
  badge: 'fa-hospital-a',
  fields: {
    name: {
      type: 'string',
      required: true,
    },
    district: {
      type: 'db:district',
      required: true,
    },
    primary_contact: {
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
    primary_location: 'custom:facility',
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
  var fields = clone.fields;
  _.forEach(fields, function(conf, name) {
    if(typeof conf === 'string') {
      conf = { type: conf };
      fields[name] = conf;
    }
    var matches = conf.type.match('^(db|custom):');
    if(matches) {
      conf[matches[1] + '_type'] = conf.type.substring(matches[0].length);
      conf.type = matches[1];
      if(!conf.title) {
        conf.title = '{{name}}';
      }
    }
  });
  return clone;
}

angular.module('inboxServices').service('ContactSchema', [
  function() {
    return {
      get: function() {
        return {
          catchment_area: normalise('catchment_area', CATCHMENT_AREA),
          district: normalise('district', DISTRICT),
          health_centre: normalise('health_centre', HEALTH_CENTRE),
          person: normalise('person', PERSON),
        };
      },
    };
  }
]);
