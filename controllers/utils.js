var _ = require('underscore'),
    moment = require('moment'),
    async = require('async'),
    db = require('../db'),
    config = require('../config'),
    luceneConditionalLimit = 1000,
    noLmpDateModifier = 4;

var formatDate = function(date) {
  return date.zone(0).format('YYYY-MM-DD');
};

var formatDateRange = function(field, startDate, endDate) {
  var start = formatDate(startDate);
  var end = endDate ? formatDate(endDate.clone().add(1, 'days')) : '9999-01-01';
  return field + '<date>:[' + start + ' TO ' + end + ']';
};

var getFormCode = function(key) {
  return config.get('anc_forms')[key];
};

var fti = function(index, options, callback) {
  var queryOptions = _.pick(options, 'q', 'sort', 'skip', 'limit', 'include_docs');
  db.fti(index, queryOptions, function(err, result) {
    if (err) {
      return callback(err);
    }
    if (!result) {
      result = { total_rows: 0, rows: [] };
    } else if (!result.rows) {
      result.rows = [];
    }
    callback(null, result);
  });
};

var ftiWithPatientIds = function(options, callback) {
  if (options.patientIds) {
    options.patientIds = _.compact(options.patientIds);
    if (options.patientIds.length === 0) {
      return callback(null, { total_rows: 0, rows: [] });
    }
    // lucene allows a maximum of 1024 boolean conditions per query
    var chunks = chunk(options.patientIds, luceneConditionalLimit);
    async.reduce(chunks, { rows: [], total_rows: 0 }, function(memo, ids, callback) {
      var queryOptions = {
        q: options.q + ' AND patient_id:(' + _.compact(ids).join(' OR ') + ')',
        include_docs: options.include_docs
      };
      fti('data_records', queryOptions, function(err, result) {
        if (err) {
          return callback(err);
        }
        callback(null, {
          rows: memo.rows.concat(result.rows),
          total_rows: memo.total_rows + result.total_rows
        });
      });
    }, callback);
  } else {
    fti('data_records', options, callback);
  }
};

var getHighRisk = function(options, callback) {
  if (!options || !options.patientIds || !options.patientIds.length) {
    return callback(null, []);
  }
  options.include_docs = true;
  options.q = 'form:' + getFormCode('flag');
  ftiWithPatientIds(options, callback);
};

var chunk = function(items, size) {
  var chunks = [];
  for (var i = 0, j = items.length; i < j; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

var uniquePerPatientId = function(rows) {
  var ids = [];
  return _.reject(rows, function(row) {
    var id = row.doc.fields.patient_id;
    if (_.contains(ids, id)) {
      return true;
    }
    ids.push(id);
    return false;
  });
};

module.exports = {

  getFormCode: getFormCode,
  fti: fti,
  formatDateRange: formatDateRange,

  getAllRegistrations: function(options, callback) {
    var startDate = options.startDate;
    var endDate = options.endDate;

    if (!startDate || !endDate) {
      startDate = moment().subtract(options.maxWeeksPregnant || 42, 'weeks');
      endDate = moment().subtract(options.minWeeksPregnant || 0, 'weeks');
    }

    // add 40 weeks to get edd
    startDate = startDate.clone().add(40, 'weeks');
    endDate = endDate.clone().add(40, 'weeks');

    var query = 'errors<int>:0 ' +
      'AND form:("' + getFormCode('registration') + '" OR "' + getFormCode('registrationLmp') + '") ' +
      'AND ' + formatDateRange('expected_date', startDate, endDate);
    if (options.district) {
      query += ' AND district:"' + options.district + '"';
    }
    ftiWithPatientIds({
      q: query,
      patientIds: options.patientIds,
      include_docs: true
    }, callback);
  },

  getDeliveries: function(options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }
    var query = 'form:' + getFormCode('delivery');
    if (options.startDate && options.endDate) {
      query += ' AND ' + formatDateRange('reported_date', options.startDate, options.endDate);
    }
    if (options.district) {
      query += ' AND district:"' + options.district + '"';
    }
    ftiWithPatientIds(
      {
        q: query,
        include_docs: true,
        patientIds: options.patientIds
      },
      function(err, results) {
        if (err) {
          return callback(err);
        }
        callback(null, uniquePerPatientId(results.rows));
      }
    );
  },

  getBirthPatientIds: function(options, callback) {
    options.minWeeksPregnant = 42;
    options.maxWeeksPregnant = options.maxWeeksPregnant || 10000;
    module.exports.getAllRegistrations(options, function(err, registrations) {
      if (err) {
        return callback(err);
      }
      options.include_docs = true;
      module.exports.getDeliveries(options, function(err, deliveries) {
        if (err) {
          return callback(err);
        }
        var deliveryIds = _.map(deliveries, function(delivery) {
          return delivery.doc.fields.patient_id;
        });
        var registrationsIds = _.map(registrations.rows, function(registration) {
          return registration.doc.patient_id;
        });
        callback(null, _.union(deliveryIds, registrationsIds));
      });
    });
  },

  rejectDeliveries: function(objects, callback) {
    if (!objects.length) {
      return callback(null, []);
    }
    module.exports.getDeliveries({ 
      patientIds: _.pluck(objects, 'patient_id'),
      include_docs: true
    }, function(err, deliveries) {
      if (err) {
        return callback(err);
      }
      var undelivered = _.reject(objects, function(object) {
        return _.some(deliveries, function(delivery) {
          return delivery.doc.fields.patient_id === object.patient_id;
        });
      });
      callback(null, undelivered);
    });
  },

  getVisits: function(options, callback) {
    if (!options || !options.patientIds || !options.patientIds.length) {
      return callback(null, []);
    }
    var query = 'form:' + getFormCode('visit');
    if (options.startDate) {
      query += ' AND ' + formatDateRange(
        'reported_date', options.startDate, options.endDate
      );
    }
    ftiWithPatientIds({ q: query, include_docs: true, patientIds: options.patientIds }, callback);
  },

  getWeeksPregnant: function(doc) {
    if (doc.form === 'R') {
      return {
        number: moment().diff(moment(doc.reported_date), 'weeks') + noLmpDateModifier,
        approximate: true
      };
    }
    return {
      number: moment().diff(moment(doc.lmp_date), 'weeks')
    };
  },

  getEDD: function(doc) {
    if (doc.form === 'R') {
      return {
        date: moment(doc.reported_date).add(40 - noLmpDateModifier, 'weeks'),
        approximate: true
      };
    }
    return {
      date: moment(doc.lmp_date).add(40, 'weeks')
    };
  },

  injectVisits: function(objects, callback) {
    var patientIds = _.pluck(objects, 'patient_id');
    module.exports.getVisits({ patientIds: patientIds }, function(err, visits) {
      if (err) {
        return callback(err);
      }
      var count = _.countBy(visits.rows, function(visit) {
        return visit.doc.fields.patient_id;
      });
      _.each(objects, function(object) {
        object.visits = count[object.patient_id] || 0;
      });
      callback(null, objects);
    });
  },

  injectRisk: function(objects, callback) {
    var patientIds = _.pluck(objects, 'patient_id');
    getHighRisk({ patientIds: patientIds }, function(err, risks) {
      if (err) {
        return callback(err);
      }
      _.each(risks.rows, function(risk) {
        var object = _.findWhere(objects, { patient_id: risk.doc.fields.patient_id });
        if (object) {
          object.high_risk = true;
        }
      });
      callback(null, objects);
    });
  },

  getParent: function(facility, type) {
    while (facility && facility.type !== type) {
      facility = facility.parent;
    }
    return facility;
  },

  // exposed for testing
  setup: function(limit) {
    luceneConditionalLimit = limit;
  }

};