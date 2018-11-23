var _ = require('underscore'),
    moment = require('moment'),
    END_OF_ALPHABET = '\ufff0';

var getKeysArray = function(keys) {
  return keys.map(function(t) {
    return [ t ];
  });
};

// filter = { selected: [...], options: [...]}
var getRequestForMultidropdown = function(view, filter, mapKeysFunc) {
  if (!filter || !filter.selected) {
    return;
  }

  // If we know everything is selected, no filter to apply.
  if (filter.options && filter.selected.length === filter.options.length) {
    return;
  }

  return getRequestWithMappedKeys(view, filter.selected, mapKeysFunc);
};

var getRequestWithMappedKeys = function(view, keys, mapKeysFunc) {
  if (!keys || keys.length === 0) {
    return;
  }
  return {
    view: view,
    params: {
      keys: mapKeysFunc(keys)
    }
  };
};

var getRequestForBooleanKey = function(view, key) {
  if (!_.isBoolean(key)) {
    return;
  }
  return {
    view: view,
    params: {
      key: [ key ]
    }
  };
};

var reportedDateRequest = function(filters) {
  var dateRange = filters.date;
  if (!dateRange || (!dateRange.to && !dateRange.from)) {
    return;
  }
  var to = moment(dateRange.to);
  var from = moment(dateRange.from || 0);
  return {
    view: 'medic-client/reports_by_date',
    params: {
      startkey: [ from.valueOf() ],
      endkey: [ to.valueOf() ]
    }
  };
};

var formRequest = function(filters) {
  var req = getRequestForMultidropdown(
    'medic-client/reports_by_form',
    filters.forms,
    function(forms) {
      return forms.map(function(form) {
        return [ form.code ];
      });
    });

  if (req) {
    req.params.reduce = false;
  }

  return req;
};

var validityRequest = function(filters) {
  return getRequestForBooleanKey('medic-client/reports_by_validity', filters.valid);
};

var verificationRequest = function(filters) {
  return getRequestWithMappedKeys('medic-client/reports_by_verification', filters.verified, getKeysArray);
};

var placeRequest = function(filters) {
  return getRequestForMultidropdown('medic-client/reports_by_place', filters.facilities, getKeysArray);
};

var freetextRequest = function(filters, view) {
  if (filters.search) {
    var words = filters.search.trim().toLowerCase().split(/\s+/);
    return words.map(function(word) {
      var params = {};
      if (word.indexOf(':') !== -1) {
        // use exact match
        params.key = [ word ];
      } else {
        // use starts with
        params.startkey = [ word ];
        params.endkey = [ word + END_OF_ALPHABET ];
      }
      return {
        view: view,
        params: params
      };
    });
  }
};

var subjectRequest = function(filters) {
  var subjectIds = filters.subjectIds;
  return getRequestWithMappedKeys('medic-client/reports_by_subject', subjectIds, getKeysArray);
};

var contactTypeRequest = function(filters) {
  if (!filters.types) {
    return;
  }
  var view = 'medic-client/contacts_by_type';
  if (filters.types.selected && filters.types.options) {
    return getRequestForMultidropdown(view, filters.types, getKeysArray);
  }
  // Used by select2search.
  return getRequestWithMappedKeys(view, filters.types.selected, getKeysArray);
};

var simprintsRequest = function(filters) {
  if (!filters.simprintsIdentities) {
    return;
  }
  var keys = filters.simprintsIdentities.map(function(identity) {
    return [ 'simprints', identity.id ];
  });
  return {
    view: 'medic-client/contacts_by_reference',
    params: { keys: keys }
  };
};

var defaultReportRequest = function() {
  return {
    view: 'medic-client/reports_by_date',
    ordered: true,
    params: { descending: true }
  };
};

var defaultContactRequest = function() {
  return {
    view: 'medic-client/contacts_by_type_index_name',
    ordered: true
  };
};

var sortByLastVisitedDate = function() {
  return {
    view: 'medic-client/contacts_by_last_visited',
    map: function(row) {
      row.id = row.key;
      row.value = row.value.max;
      return row;
    },
    params: {
      reduce: true,
      group: true
    }
  };
};

var requestBuilders = {
  reports: function(filters) {
    var requests = [
      reportedDateRequest(filters),
      formRequest(filters),
      validityRequest(filters),
      verificationRequest(filters),
      placeRequest(filters),
      freetextRequest(filters, 'medic-client/reports_by_freetext'),
      subjectRequest(filters)
    ];

    requests = _.compact(_.flatten(requests));
    if (!requests.length) {
      requests.push(defaultReportRequest());
    }
    return requests;
  },
  contacts: function(filters, extensions) {
    var simprints = simprintsRequest(filters);
    if (simprints) {
      return [ simprints ];
    }

    var typeRequest = contactTypeRequest(filters);
    var hasTypeRequest = typeRequest && typeRequest.params.keys.length;

    var freetextRequests = freetextRequest(filters, 'medic-client/contacts_by_freetext');
    var hasFreetextRequests = freetextRequests && freetextRequests.length;

    if (hasTypeRequest && hasFreetextRequests) {

      var makeCombinedParams = function(freetextRequest, typeKey) {
        var type = typeKey[0];
        var params = {};
        if (freetextRequest.key) {
          params.key = [ type, freetextRequest.params.key[0] ];
        } else {
          params.startkey = [ type, freetextRequest.params.startkey[0] ];
          params.endkey = [ type, freetextRequest.params.endkey[0] ];
        }
        return params;
      };

      var makeCombinedRequest = function(typeRequests, freetextRequest) {
        var result = {
          view: 'medic-client/contacts_by_type_freetext',
          union: typeRequests.params.keys.length > 1
        };

        if (result.union) {
          result.paramSets =
              typeRequests.params.keys.map(_.partial(makeCombinedParams, freetextRequest, _));
          return result;
        }

        result.params = makeCombinedParams(freetextRequest, typeRequests.params.keys[0]);
        return result;
      };

      return freetextRequests.map(_.partial(makeCombinedRequest, typeRequest, _));
    }

    var requests = [ freetextRequests, typeRequest ];
    requests = _.compact(_.flatten(requests));

    if (!requests.length) {
      requests.push(defaultContactRequest());
    }

    if (module.exports.shouldSortByLastVisitedDate(extensions)) {
      // Always push this last, search:getIntersection uses the last request
      // result and we'll need it later for sorting
      requests.push(sortByLastVisitedDate());
    }
    return requests;
  }
};

// Filters object can be :
//  - For multidropdown :
// filter = { <field>: { selected: [...], options: [...] } }
// With <field> = types or facilities or forms
// E.g. var filters = {
//  types: {
//    selected: [ 'person', 'clinic' ],
//    options: [ 'person', 'clinic', 'district_hospital' ]
//  }
// }
//
// - For freetext search :
// var filters = { search: 'patient_id:123 stones   ' }
//
// - For reports_by_subject
// var filters = { subjectIds: [ 'a', 'b', 'c' ] };
//
// - For reports_by_date
// var filters = { date: { from: 1493244000000, to: 1495749599999 } };
//
// In case of several requests to combine, the filter object will have
// the corresponding fields simultaneously.
// e.g. freetext search + contacts dropdown:
//  var filters = {
//   search: 'some thing',
//   types: {
//     selected: [ 'clinic', 'district_hospital' ],
//     options: [ 'person', 'clinic', 'district_hospital' ]
//   }
//  };
//
// NB: options is not required: it is an optimisation shortcut
module.exports = {
  generate: function(type, filters, extensions) {
    var builder = requestBuilders[type];
    if (!builder) {
      throw new Error('Unknown type: ' + type);
    }
    return builder(filters, extensions);
  },
  shouldSortByLastVisitedDate: function(extensions) {
    return Boolean(extensions && extensions.sortByLastVisitedDate);
  }
};
