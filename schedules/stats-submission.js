var _ = require('underscore'),
    request = require('request'),
    moment = require('moment'),
    db = require('../db'),
    config = require('../config'),
    utils = require('../controllers/utils');

_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

var template = _.template(
  'STAT {{year}} {{month}} {{active_chws}} {{registered_pregnancies}} ' +
  '{{flagged}} {{confirmed_deliveries}} {{estimated_deliveries}} ' +
  '{{deliveries_with_1_visit}} {{deliveries_with_4_visits}} ' +
  '{{deliveries_in_facility}} {{deliveries_with_sba}}'
);

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

var getPercentage = function(part, total) {
  if (!total) {
    return 0;
  }
  return Math.round((part || 0) / total * 100);
};

var getForms = function(doc, type) {
  return doc.valid_form_submissions[utils.getFormCode(type)] || 0;
};

var generateSubmissionString = function(doc) {

  var flagFormCode = utils.getFormCode('flag');
  var registrationFormCode = utils.getFormCode('registration');
  var registrationLmpFormCode = utils.getFormCode('registrationLmp');
  var deliveryFormCode = utils.getFormCode('delivery');

  var registrations = getForms(doc, 'registration') + getForms(doc, 'registrationLmp');
  var confirmed = getForms(doc, 'delivery');
  var deliveries = confirmed + doc.estimated_deliveries;

  return template({
    year: doc.year,
    month: doc.month + 1, // moment months are 0 based
    active_chws: doc.active_facilities,
    registered_pregnancies: registrations,
    flagged: getForms(doc, 'flag'),
    confirmed_deliveries: confirmed,
    estimated_deliveries: doc.estimated_deliveries,
    deliveries_with_1_visit: getPercentage(doc.visits_per_delivery['1+'], deliveries),
    deliveries_with_4_visits: getPercentage(doc.visits_per_delivery['4+'], deliveries),
    deliveries_in_facility: getPercentage(doc.delivery_locations.F, confirmed),
    deliveries_with_sba: getPercentage(doc.delivery_locations.S, confirmed)
  });

};

var createWebPayload = function(data) {
  return {
    message_id: Math.ceil(Math.random() * 100000),
    sent_timestamp: new Date().valueOf(),
    message: data,
    from: config.get('gateway_number')
  };
};

var submitWeb = function(data, callback) {

  var payload = createWebPayload(data);

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
    callback('Error submitting statistics');
  });

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

      var data = generateSubmissionString(doc);

      if (submissionMethod === 'web') {
        submitWeb(data, function(err) {
          if (err) {
            return callback(err);
          }
          doc.submitted = true;
          db.medic.insert(doc, callback);
        });
      }

    });
  }
};