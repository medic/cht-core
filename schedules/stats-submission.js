var request = require('request'),
    moment = require('moment'),
    db = require('../db'),
    config = require('../config'),
    utils = require('../controllers/utils');

var getView = function(name, query, callback) {
  if (!callback) {
    callback = query;
    query = {};
  }
  var startDate = moment().subtract(1, 'month').startOf('month');
  query.startkey = [ startDate.year(), startDate.month() ];
  query.endkey = [ startDate.year(), startDate.month(), {} ];
  db.medic.view('medic', name, query, callback);
};

var getForms = function(doc, type) {
  return doc.valid_form_submissions[utils.getFormCode(type)] || 0;
};

var getActivity = function(doc, type) {
  return doc.active_facilities[utils.getFormCode(type)] || 0;
};

var getVersion = function(doc) {
  return doc.version || 1;
};

var generateSubmissionString = function(doc) {

  var version = getVersion(doc);

  var registrations = getForms(doc, 'registration') + getForms(doc, 'registrationLmp');
  var totalActivity = version === 1 ? doc.active_facilities : doc.active_facilities._total;

  var results = [
    'STAT',
    doc.year, // the year the report is for
    doc.month + 1, // the month the report is for - moment months are 0 based
    totalActivity || 0, // the total active chws
    registrations, // the number of registrations
    getForms(doc, 'flag'), // the number of flags received
    getForms(doc, 'delivery'), // the number of deliveries received
    doc.estimated_deliveries, // the number of estimated deliveries
    doc.visits_per_delivery['1+'] || 0, // the number of delivereies with 1+ visits
    doc.visits_per_delivery['4+'] || 0, // the number of deliveries with 4+ visits
    doc.delivery_locations.F || 0, // the number of deliveries in a facility
    doc.delivery_locations.S || 0, // the number of deliveries with an sba
    getForms(doc, 'visit') // the number of visits received
  ];

  if (version > 1) {
    var registrationActivity = getActivity(doc, 'registration') + getActivity(doc, 'registrationLmp');
    results.push.apply(results, [
      registrationActivity, // the number of chws with 1+ registrations
      getActivity(doc, 'visit'), // the number of chws with 1+ visits
      getActivity(doc, 'flag'), // the number of chws with 1+ flags
      getActivity(doc, 'delivery'), // the number of chws with 1+ deliveries
      doc.active_facilities._totalReports || 0, // the number of chws who sent in any report this month
      doc.active_facilities._totalMessages || 0, // the number of chws who sent in any unstructured message this month
      doc.valid_form_submissions._totalMessages || 0, // the number of unstructured messages received this month
      doc.valid_form_submissions._totalReports || 0, // the number of reports received this month
    ]);
  }

  return results.join(' ');

};

var createWebPayload = function(data) {
  return {
    message_id: Math.ceil(Math.random() * 100000),
    sent_timestamp: new Date().valueOf(),
    message: data,
    from: config.get('gateway_number')
  };
};

var submitWeb = function(options, callback) {

  var payload = createWebPayload(options.data);

  request.post({
    url: 'http://stats.app.medicmobile.org/medic/_design/medic/_rewrite/add?locale=en',
    form: payload,
    auth: {
      user: 'stats',
      pass: '3j,3#E%:]Ep?[=>Qv!w%Cu"MP2uq4UDbv`&Wfv:`~N%T]+mN,'
    },
    timeout: 10 * 60 * 1000
  }, function(error, response, body) {
    if (error) {
      return callback(error);
    }
    try {
      body = JSON.parse(body);
    } catch(e) {
      return callback('Error parsing response');
    }
    if (body && body.payload && body.payload.success) {
      return callback();
    }
    callback(new Error('Error submitting statistics'));
  });

};

var submitSms = function(options, callback) {
  var to = config.get('statistics_submission_number');
  if (!to) {
    return callback(new Error('Request to submit statistics by SMS but no phone number configured'));
  }
  options.doc.scheduled_tasks = [{
    due: moment().toISOString(),
    state: 'pending',
    messages: [{
      to: to,
      message: options.data
    }]
  }];
  callback();
};

var submit = function(options, callback) {
  if (options.method === 'sms') {
    submitSms(options, callback);
  } else if (options.method === 'web') {
    submitWeb(options, callback);
  } else if (options.method === 'both') {
    submitWeb(options, function(err) {
      if (!err) {
        return callback();
      }
      submitSms(options, callback);
    });
  }
};

module.exports = {
  go: function(callback) {
    var submissionMethod = config.get('statistics_submission');
    if (!submissionMethod || submissionMethod === 'none') {
      // do no submit
      return callback();
    }
    getView('usage_stats_by_year_month', { include_docs: true }, function(err, response) {
      if (err) {
        return callback(err);
      }
      var doc = response.rows && response.rows.length && response.rows[0].doc;
      if (!doc || doc.submitted) {
        // either no doc generated, or doc already submitted
        return callback();
      }
      var options = {
        data: generateSubmissionString(doc),
        doc: doc,
        method: submissionMethod
      };
      submit(options, function(err) {
        if (err) {
          return callback(err);
        }
        doc.submitted = true;
        db.medic.insert(doc, callback);
      });
    });
  }
};