var emit = function() {};

module.exports = {
  getConfig: function (ddoc, config, viewNames) {
    if (!viewNames || !(viewNames instanceof Array)) {
      return config;
    }

    config.views = {};
    viewNames.forEach(function(view) {
      config.views[view] = ddoc.views && ddoc.views[view] && ddoc.views[view].map || false;
    });

    return config;
  },

  getViewMapFn: function (config, viewName, full) {
    var COMMENT_REGEX = /\/\/.*/g,
        SIGNATURE_REGEX = /emit\(([^\(]*)\)/g,
        NEW_LINE_REGEX = /\\n/g;

    var fnString = module.exports.getViewMapString(config, viewName)
      .replace(NEW_LINE_REGEX, '\n')
      .replace(COMMENT_REGEX, '')
      .replace(SIGNATURE_REGEX, 'this.emit([ $1 ])')
      .trim();

    var fn = new Function('return ' + fnString)(); // jshint ignore:line
    //support multiple `emit`s
    return function() {
      var emitted = [];
      var emit = function(value) {
        return emitted.push(value);
      };
      fn.apply({ emit: emit }, arguments);
      return (full ? emitted : emitted[0]);
    };
  },

  getViewMapString: function (config, viewName) {
    return config.views && config.views[viewName] || module.exports.defaultViews[viewName];
  },

  defaultViews: {
    docs_by_replication_key: function (doc) {
      if (doc._id === 'resources' ||
          doc._id === 'appcache' ||
          doc._id === 'zscore-charts' ||
          doc.type === 'form' ||
          doc.type === 'translations') {
        return emit('_all', {});
      }
      var getSubject = function() {
        if (doc.form) {
          // report
          if (doc.contact && doc.errors && doc.errors.length) {
            for (var i = 0; i < doc.errors.length; i++) {
              // no patient found, fall back to using contact. #3437
              if (doc.errors[i].code === 'registration_not_found') {
                return doc.contact._id;
              }
            }
          }
          return (doc.patient_id || (doc.fields && doc.fields.patient_id)) ||
                 (doc.place_id || (doc.fields && doc.fields.place_id)) ||
                 (doc.contact && doc.contact._id);
        }
        if (doc.sms_message) {
          // incoming message
          return doc.contact && doc.contact._id;
        }
        if (doc.kujua_message) {
          // outgoing message
          return doc.tasks &&
                 doc.tasks[0] &&
                 doc.tasks[0].messages &&
                 doc.tasks[0].messages[0] &&
                 doc.tasks[0].messages[0].contact &&
                 doc.tasks[0].messages[0].contact._id;
        }
      };
      switch (doc.type) {
        case 'data_record':
          var subject = getSubject() || '_unassigned';
          var value = {};
          if (doc.form && doc.contact) {
            value.submitter = doc.contact._id;
          }
          return emit(subject, value);
        case 'clinic':
        case 'district_hospital':
        case 'health_center':
        case 'person':
          return emit(doc._id, {});
      }
    },
    contacts_by_depth: function(doc) {
      if (['person', 'clinic', 'health_center', 'district_hospital'].indexOf(doc.type) !== -1) {
        var value = doc.patient_id || doc.place_id;
        var parent = doc;
        var depth = 0;
        while (parent) {
          if (parent._id) {
            emit([parent._id], value);
            emit([parent._id, depth], value);
          }
          depth++;
          parent = parent.parent;
        }
      }
    }
  }
};
