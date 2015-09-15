var _ = require('underscore');

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
    parent: 'db:clinic',
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
    if(conf.type.match('^db:')) {
      conf.db_type = conf.type.substring(3);
      conf.type = 'db';
      if(!conf.title) {
        conf.title = 'name';
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
          person: normalise('person', PERSON),
        };
      },
    };
  }
]);
