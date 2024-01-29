const _ = require('lodash/core');
const moment = require('moment');

const END_OF_ALPHABET = '\ufff0';
const MINIMUM_SEARCH_TERM_LENGTH = 3;

const getKeysArray = (keys) => keys.map(key => [ key ]);

// filter = { selected: [...], options: [...]}
const getRequestForMultidropdown = (view, filter, mapKeysFunc) => {
  if (!filter?.selected) {
    return;
  }

  // If we know everything is selected, no filter to apply.
  if (filter.options && filter.selected.length === filter.options.length) {
    return;
  }

  return getRequestWithMappedKeys(view, filter.selected, mapKeysFunc);
};

const getRequestWithMappedKeys = (view, keys, mapKeysFunc) => {
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

const getRequestForBooleanKey = (view, key) => {
  if (!_.isBoolean(key)) {
    return;
  }
  return {
    view,
    params: {
      key: [ key ]
    }
  };
};

const reportedDateRequest = (filters) => {
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

const formRequest = (filters) => {
  const mapKeysFunc = forms => forms.map(form => [ form.code ]);
  const req = getRequestForMultidropdown('medic-client/reports_by_form', filters.forms, mapKeysFunc);
  if (req) {
    req.params.reduce = false;
  }
  return req;
};

const validityRequest = (filters) => {
  return getRequestForBooleanKey('medic-client/reports_by_validity', filters.valid);
};

const verificationRequest = (filters) => {
  return getRequestWithMappedKeys('medic-client/reports_by_verification', filters.verified, getKeysArray);
};

const placeRequest = (filters) => {
  return getRequestForMultidropdown('medic-client/reports_by_place', filters.facilities, getKeysArray);
};

const freetextRequestParams = (word) => {
  const params = {};
  if (word.indexOf(':') !== -1) {
    // use exact match
    params.key = [ word ];
    return params;
  }
  
  // use starts with
  if (word.length < MINIMUM_SEARCH_TERM_LENGTH) {
    return;
  }
  
  params.startkey = [ word ];
  params.endkey = [ word + END_OF_ALPHABET ];
  return params;
};

const freetextRequest = (filters, view) => {
  if (!filters.search) {
    return;
  }
  const words = filters.search
    .trim()
    .toLowerCase()
    .split(/\s+/);
  const requests = words.map((word) => {
    const params = freetextRequestParams(word);
    return params && { view, params };
  });
  return _.compact(requests);
};

const subjectRequest = (filters) => {
  const subjectIds = filters.subjectIds;
  return getRequestWithMappedKeys('medic-client/reports_by_subject', subjectIds);
};

const getContactsByParentRequest = (filters) => {
  if (!filters.parent) {
    return;
  }

  const types = filters?.types?.selected;
  return {
    view: 'medic-client/contacts_by_parent',
    params: {
      keys: types ? types.map(type => ([ filters.parent, type ])) : [ filters.parent ],
    },
  };
};

const contactTypeRequest = (filters, sortByLastVisitedDate) => {
  if (!filters.types) {
    return;
  }
  const view = 'medic-client/contacts_by_type';
  let request;
  if (filters.types.selected && filters.types.options) {
    request = getRequestForMultidropdown(view, filters.types, getKeysArray);
  } else {
    // Used by select2search
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

const defaultReportRequest = () => {
  return {
    view: 'medic-client/reports_by_date',
    ordered: true,
    params: { descending: true }
  };
};

const defaultContactRequest = () => {
  return {
    view: 'medic-client/contacts_by_type',
    ordered: true
  };
};

const sortByLastVisitedDate = () => {
  return {
    view: 'medic-client/contacts_by_last_visited',
    map: (row) => {
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

const makeCombinedParams = (freetextRequest, typeKey) => {
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

const getContactsByTypeAndFreetextRequest = (typeRequests, freetextRequest) => {
  const result = {
    view: 'medic-client/contacts_by_type_freetext',
    union: typeRequests.params.keys.length > 1
  };

  if (result.union) {
    result.paramSets = typeRequests.params.keys.map(typeRequest => {
      return makeCombinedParams(freetextRequest, typeRequest);
    });
    return result;
  }

  result.params = makeCombinedParams(freetextRequest, typeRequests.params.keys[0]);
  return result;
};

const getCombinedContactsRequests = (freetextRequests, contactsByParentRequest, typeRequest) => {
  const combinedRequests = freetextRequests.map(freetextRequest => {
    return getContactsByTypeAndFreetextRequest(typeRequest, freetextRequest);
  });
  if (contactsByParentRequest) {
    combinedRequests.unshift(contactsByParentRequest);
  }
  return combinedRequests;
};

const setDefaultContactsRequests = (requests, shouldSortByLastVisitedDate) => {
  if (!requests.length) {
    requests.push(defaultContactRequest());
  }

  if (shouldSortByLastVisitedDate) {
    // Always push this last, search:getIntersection uses the last request's result, we'll need it later for sorting.
    requests.push(sortByLastVisitedDate());
  }

  return requests;
};

const requestBuilders = {
  reports: (filters) => {
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
  contacts: (filters, extensions) => {
    const shouldSortByLastVisitedDate = module.exports.shouldSortByLastVisitedDate(extensions);

    const freetextRequests = freetextRequest(filters, 'medic-client/contacts_by_freetext');
    const contactsByParentRequest = getContactsByParentRequest(filters);
    const typeRequest = contactTypeRequest(filters, shouldSortByLastVisitedDate);
    const hasTypeRequest = typeRequest?.params.keys.length;

    if (contactsByParentRequest && hasTypeRequest && !freetextRequests?.length) {
      // The request's keys already have the type included.
      return [ contactsByParentRequest ];
    }

    if (hasTypeRequest && freetextRequests?.length) {
      return getCombinedContactsRequests(freetextRequests, contactsByParentRequest, typeRequest);
    }

    const requests = _.compact(_.flatten([ freetextRequests, typeRequest, contactsByParentRequest ]));
    return setDefaultContactsRequests(requests, shouldSortByLastVisitedDate);
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
  generate: (type, filters, extensions) => {
    const builder = requestBuilders[type];
    if (!builder) {
      throw new Error('Unknown type: ' + type);
    }
    return builder(filters, extensions);
  },
  shouldSortByLastVisitedDate: (extensions) => {
    return Boolean(extensions?.sortByLastVisitedDate);
  }
};
