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
    catchment_area: 'db:clinic',
    health_center: 'db:health_center',
    district: 'db:district_hospital',
  },
};

function tr(schema) {
  var clone = _.clone(schema);
  var fields = clone.fields;
  _.forEach(fields, function(conf, name) {
    if(typeof conf === 'string') {
      fields[name] = { type: conf };
    }
  });
  return clone;
}

angular.module('inboxServices').service('ContactSchema', [
  function() {
    return {
      get: function() {
        return {
          person: tr(PERSON),
        };
      },
    };
  }
]);
