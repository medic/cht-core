const _ = require('lodash/core');
_.partial = require('lodash/partial');
_.partial.placeholder = _;
const moment = require('moment');
const END_OF_ALPHABET = '\ufff0';

const getKeysArray = function(keys) {
  return keys.map(function(t) {
    return [ t ];
  });
};

// filter = { selected: [...], options: [...]}
const getRequestForMultidropdown = function(view, filter, mapKeysFunc) {
  if (!filter || !filter.selected) {
    return;
  }

  // If we know everything is selected, no filter to apply.
  if (filter.options && filter.selected.length === filter.options.length) {
    return;
  }

  return getRequestWithMappedKeys(view, filter.selected, mapKeysFunc);
};

const getRequestWithMappedKeys = function(view, keys, mapKeysFunc) {
  if (!keys || keys.length === 0) {
    return;
  }
  if (mapKeysFunc) {
    keys = mapKeysFunc(keys);
  }
  return {
    view,
    params: { keys }
  };
};

const getRequestForBooleanKey = function(view, key) {
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

const reportedDateRequest = function(filters) {
  const dateRange = filters.date;
  if (!dateRange || (!dateRange.to && !dateRange.from)) {
    return;
  }
  const to = moment(dateRange.to);
  const from = moment(dateRange.from || 0);
  return {
    view: 'medic-client/reports_by_date',
    params: {
      startkey: [ from.valueOf() ],
      endkey: [ to.valueOf() ]
    }
  };
};

const formRequest = function(filters) {
  const req = getRequestForMultidropdown(
    'medic-client/reports_by_form',
    filters.forms,
    function(forms) {
      return forms.map(function(form) {
        return [ form.code ];
      });
    }
  );

  if (req) {
    req.params.reduce = false;
  }

  return req;
};

const validityRequest = function(filters) {
  return getRequestForBooleanKey('medic-client/reports_by_validity', filters.valid);
};

const verificationRequest = function(filters) {
  return getRequestWithMappedKeys('medic-client/reports_by_verification', filters.verified, getKeysArray);
};

const placeRequest = function(filters) {
  return getRequestForMultidropdown('medic-client/reports_by_place', filters.facilities, getKeysArray);
};

const freetextRequest = function(filters, view) {
  if (filters.search) {
    const words = filters.search.trim().toLowerCase().split(/\s+/);
    return words.map(function(word) {
      const params = {};
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

const subjectRequest = function(filters) {
  const subjectIds = filters.subjectIds;
  return getRequestWithMappedKeys('medic-client/reports_by_subject', subjectIds);
};

const getContactParentRequest = function(filters) {
  if (!filters.parent) {
    return;
  }

  return getRequestWithMappedKeys('medic-client/contacts_by_parent', filters.parents, getKeysArray);
};

const contactTypeRequest = function(filters, sortByLastVisitedDate) {
  if (!filters.types) {
    return;
  }
  const view = 'medic-client/contacts_by_type';
  let request;
  if (filters.types.selected && filters.types.options) {
    request = getRequestForMultidropdown(view, filters.types, getKeysArray);
  } else {
    // Used by select2search.
    request = getRequestWithMappedKeys(view, filters.types.selected, getKeysArray);
  }

  if (sortByLastVisitedDate) {
    request.map = row => {
      const [ dead, muted ] = row.value.split(' ');
      row.sort = dead + ' ' + muted;
      return row;
    };
  }

  return request;
};

const defaultReportRequest = function() {
  return {
    view: 'medic-client/reports_by_date',
    ordered: true,
    params: { descending: true }
  };
};

const defaultContactRequest = function() {
  return {
    view: 'medic-client/contacts_by_type',
    ordered: true
  };
};

const sortByLastVisitedDate = function() {
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

const requestBuilders = {
  reports: function(filters) {
    let requests = [
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
    const shouldSortByLastVisitedDate = module.exports.shouldSortByLastVisitedDate(extensions);


    if (filters) {
      filters.parents = [ '17f1df8a-b096-4d1e-823d-2723bf7d24ee' ];
    }


    const typeRequest = contactTypeRequest(filters, shouldSortByLastVisitedDate);
    const hasTypeRequest = typeRequest && typeRequest.params.keys.length;

    const freetextRequests = freetextRequest(filters, 'medic-client/contacts_by_freetext');
    const hasFreetextRequests = freetextRequests && freetextRequests.length;




    const parentContactRequest = getContactParentRequest(filters);




    if (hasTypeRequest && hasFreetextRequests) {

      const makeCombinedParams = function(freetextRequest, typeKey) {
        const type = typeKey[0];
        const params = {};
        if (freetextRequest.key) {
          params.key = [ type, freetextRequest.params.key[0] ];
        } else {
          params.startkey = [ type, freetextRequest.params.startkey[0] ];
          params.endkey = [ type, freetextRequest.params.endkey[0] ];
        }
        return params;
      };

      const makeCombinedRequest = function(typeRequests, freetextRequest) {
        const result = {
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

    let requests = [ freetextRequests, typeRequest, parentContactRequest ];
    requests = _.compact(_.flatten(requests));

    if (!requests.length) {
      requests.push(defaultContactRequest());
    }

    if (shouldSortByLastVisitedDate) {
      // Always push this last, search:getIntersection uses the last request
      // result and we'll need it later for sorting
      requests.push(sortByLastVisitedDate());
    }
    console.warn('search requests -> ', requests);
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
    const builder = requestBuilders[type];
    if (!builder) {
      throw new Error('Unknown type: ' + type);
    }
    return builder(filters, extensions);
  },
  shouldSortByLastVisitedDate: function(extensions) {
    return Boolean(extensions && extensions.sortByLastVisitedDate);
  }
};
