var sinon = require('sinon'),
    request = require('request'),
    schedule = require('../../schedules/stats-submission'),
    db = require('../../db'),
    config = require('../../config'),
    successfulResponse = JSON.stringify({ payload: { success: true }});

var clock;

exports.setUp = function(callback) {
  clock = sinon.useFakeTimers();
  callback();
};

var restore = function(fn) {
  if (fn.restore) {
    fn.restore();
  }
};

exports.tearDown = function (callback) {
  clock.restore();
  restore(db.medic.view);
  restore(db.medic.insert);
  restore(config.get);
  restore(request.post);
  callback();
};

exports['go shortcircuits when submission method not defined (default)'] = function(test) {
  test.expect(1);
  sinon.stub(config, 'get').withArgs('statistics_submission').returns(undefined);
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.done();
  });
};

exports['go shortcircuits when submission method set tp none'] = function(test) {
  test.expect(1);
  sinon.stub(config, 'get').withArgs('statistics_submission').returns('none');
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.done();
  });
};

exports['go returns errors from getView'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, 'bang');
  sinon.stub(config, 'get').withArgs('statistics_submission').returns('web');
  schedule.go(function(err) {
    test.equals(err, 'bang');
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['go does nothing if no doc'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [] });
  sinon.stub(config, 'get').withArgs('statistics_submission').returns('web');
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['go does nothing if doc already submitted'] = function(test) {
  test.expect(2);
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [{
    doc: { submitted: true }
  }] });
  sinon.stub(config, 'get').withArgs('statistics_submission').returns('web');
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.done();
  });
};

exports['go returns error from post'] = function(test) {
  test.expect(2);

  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [{
    doc: {
      version: 2,
      visits_per_delivery: { '1+': 0, '2+': 0, '3+': 0, '4+': 0 },
      estimated_deliveries: 0,
      valid_form_submissions: {},
      delivery_locations: {},
      active_facilities: {},
      type: 'usage_stats',
      reported_date: 1427838796899,
      year: 2014,
      month: 11
    }
  }] });
  var requestPost = sinon.stub(request, 'post').callsArgWith(1, 'some error');
  sinon.stub(config, 'get')
    .withArgs('statistics_submission').returns('web')
    .withArgs('gateway_number').returns('+555123456')
    .withArgs('anc_forms').returns({
      registration: 'R',
      registrationLmp: 'P',
      visit: 'V',
      delivery: 'D',
      flag: 'F'
    });
  schedule.go(function(err) {
    test.equals(err, 'some error');
    test.equals(requestPost.callCount, 1);
    test.done();
  });
};

exports['go returns error if post response is not valid json'] = function(test) {
  test.expect(2);

  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [{
    doc: {
      version: 2,
      visits_per_delivery: { '1+': 0, '2+': 0, '3+': 0, '4+': 0 },
      estimated_deliveries: 0,
      valid_form_submissions: {},
      delivery_locations: {},
      active_facilities: {},
      type: 'usage_stats',
      reported_date: 1427838796899,
      year: 2014,
      month: 11
    }
  }] });
  var requestPost = sinon.stub(request, 'post').callsArgWith(1, null, null, 'x');
  sinon.stub(config, 'get')
    .withArgs('statistics_submission').returns('web')
    .withArgs('gateway_number').returns('+555123456')
    .withArgs('anc_forms').returns({
      registration: 'R',
      registrationLmp: 'P',
      visit: 'V',
      delivery: 'D',
      flag: 'F'
    });
  schedule.go(function(err) {
    test.equals(err, 'Error parsing response');
    test.equals(requestPost.callCount, 1);
    test.done();
  });
};

exports['go returns error if post response body indicates failure'] = function(test) {
  test.expect(2);

  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [{
    doc: {
      version: 2,
      visits_per_delivery: { '1+': 0, '2+': 0, '3+': 0, '4+': 0 },
      estimated_deliveries: 0,
      valid_form_submissions: {},
      delivery_locations: {},
      active_facilities: {},
      type: 'usage_stats',
      reported_date: 1427838796899,
      year: 2014,
      month: 11
    }
  }] });
  var requestPost = sinon.stub(request, 'post').callsArgWith(1, null, null, JSON.stringify({ payload: { success: false }}));
  sinon.stub(config, 'get')
    .withArgs('statistics_submission').returns('web')
    .withArgs('gateway_number').returns('+555123456')
    .withArgs('anc_forms').returns({
      registration: 'R',
      registrationLmp: 'P',
      visit: 'V',
      delivery: 'D',
      flag: 'F'
    });
  schedule.go(function(err) {
    test.equals(err.message, 'Error submitting statistics');
    test.equals(requestPost.callCount, 1);
    test.done();
  });
};

exports['go submits empty submission string'] = function(test) {
  test.expect(8);

  var phone = '+555123456';
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [{
    doc: {
      version: 2,
      visits_per_delivery: { '1+': 0, '2+': 0, '3+': 0, '4+': 0 },
      estimated_deliveries: 0,
      valid_form_submissions: {},
      delivery_locations: {},
      active_facilities: {},
      type: 'usage_stats',
      reported_date: 1427838796899,
      year: 2014,
      month: 11
    }
  }] });
  var requestPost = sinon.stub(request, 'post').callsArgWith(1, null, null, successfulResponse);
  var dbSaveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  sinon.stub(config, 'get')
    .withArgs('statistics_submission').returns('web')
    .withArgs('gateway_number').returns(phone)
    .withArgs('anc_forms').returns({
      registration: 'R',
      registrationLmp: 'P',
      visit: 'V',
      delivery: 'D',
      flag: 'F'
    });
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(requestPost.callCount, 1);
    test.equals(requestPost.firstCall.args[0].form.sent_timestamp, 0);
    test.equals(requestPost.firstCall.args[0].form.message, 'STAT 2014 12 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0');
    test.equals(requestPost.firstCall.args[0].form.from, phone);
    test.equals(dbSaveDoc.callCount, 1);
    test.equals(dbSaveDoc.firstCall.args[0].submitted, true);
    test.done();
  });
};

exports['go submits populated submission string'] = function(test) {
  test.expect(8);

  var phone = '+555123456';
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [{
    doc: {
      version: 2,
      visits_per_delivery: { '1+': 20, '2+': 19, '3+': 18, '4+': 17 },
      estimated_deliveries: 50,
      valid_form_submissions: { _totalReports: 251, _totalMessages: 5, D: 60, F: 12, V: 101, R: 63, P: 15 }, 
      delivery_locations: { F: 23, S: 20 },
      active_facilities: { _total: 12, _totalReports: 11, _totalMessages: 4, D: 10, F: 5, V: 12, R: 1, P: 5 },
      type: 'usage_stats',
      reported_date: 1427838796899,
      year: 2014,
      month: 11
    }
  }] });
  var requestPost = sinon.stub(request, 'post').callsArgWith(1, null, null, successfulResponse);
  var dbSaveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  sinon.stub(config, 'get')
    .withArgs('statistics_submission').returns('web')
    .withArgs('gateway_number').returns(phone)
    .withArgs('anc_forms').returns({
      registration: 'R',
      registrationLmp: 'P',
      visit: 'V',
      delivery: 'D',
      flag: 'F'
    });
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(requestPost.callCount, 1);
    test.equals(requestPost.firstCall.args[0].form.sent_timestamp, 0);
    test.equals(requestPost.firstCall.args[0].form.message, 'STAT 2014 12 12 78 12 60 50 20 17 23 20 101 6 12 5 10 11 4 5 251');
    test.equals(requestPost.firstCall.args[0].form.from, phone);
    test.equals(dbSaveDoc.callCount, 1);
    test.equals(dbSaveDoc.firstCall.args[0].submitted, true);
    test.done();
  });
};

exports['go returns error from sms if no number configured'] = function(test) {
  test.expect(1);

  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [{
    doc: {
      version: 2,
      visits_per_delivery: { '1+': 0, '2+': 0, '3+': 0, '4+': 0 },
      estimated_deliveries: 0,
      valid_form_submissions: {},
      delivery_locations: {},
      active_facilities: {},
      type: 'usage_stats',
      reported_date: 1427838796899,
      year: 2014,
      month: 11
    }
  }] });
  sinon.stub(config, 'get')
    .withArgs('statistics_submission').returns('sms')
    .withArgs('anc_forms').returns({
      registration: 'R',
      registrationLmp: 'P',
      visit: 'V',
      delivery: 'D',
      flag: 'F'
    });
  schedule.go(function(err) {
    test.equals(err.message, 'Request to submit statistics by SMS but no phone number configured');
    test.done();
  });
};

exports['go generates sms message'] = function(test) {
  test.expect(5);

  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [{
    doc: {
      version: 2,
      visits_per_delivery: { '1+': 0, '2+': 0, '3+': 0, '4+': 0 },
      estimated_deliveries: 0,
      valid_form_submissions: {},
      delivery_locations: {},
      active_facilities: {},
      type: 'usage_stats',
      reported_date: 1427838796899,
      year: 2014,
      month: 11
    }
  }] });
  var to = '+64274666666';
  sinon.stub(config, 'get')
    .withArgs('statistics_submission').returns('sms')
    .withArgs('statistics_submission_number').returns(to)
    .withArgs('anc_forms').returns({
      registration: 'R',
      registrationLmp: 'P',
      visit: 'V',
      delivery: 'D',
      flag: 'F'
    });
  var dbSaveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.equals(dbSaveDoc.callCount, 1);
    test.equals(dbSaveDoc.firstCall.args[0].submitted, true);
    test.equals(dbSaveDoc.firstCall.args[0].scheduled_tasks.length, 1);
    test.same(dbSaveDoc.firstCall.args[0].scheduled_tasks[0], {
      due: '1970-01-01T00:00:00.000Z',
      state: 'pending',
      messages: [{
        to: to,
        message: 'STAT 2014 12 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0'
      }]
    });
    test.done();
  });
};

exports['go falls back to sms when set to both'] = function(test) {
  test.expect(6);

  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [{
    doc: {
      version: 2,
      visits_per_delivery: { '1+': 0, '2+': 0, '3+': 0, '4+': 0 },
      estimated_deliveries: 0,
      valid_form_submissions: {},
      delivery_locations: {},
      active_facilities: {},
      type: 'usage_stats',
      reported_date: 1427838796899,
      year: 2014,
      month: 11
    }
  }] });
  var to = '+64274666666';
  sinon.stub(config, 'get')
    .withArgs('statistics_submission').returns('both')
    .withArgs('statistics_submission_number').returns(to)
    .withArgs('anc_forms').returns({
      registration: 'R',
      registrationLmp: 'P',
      visit: 'V',
      delivery: 'D',
      flag: 'F'
    });
  var requestPost = sinon.stub(request, 'post').callsArgWith(1, null, null, JSON.stringify({ payload: { success: false }}));
  var dbSaveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.equals(requestPost.callCount, 1);
    test.equals(dbSaveDoc.callCount, 1);
    test.equals(dbSaveDoc.firstCall.args[0].submitted, true);
    test.equals(dbSaveDoc.firstCall.args[0].scheduled_tasks.length, 1);
    test.same(dbSaveDoc.firstCall.args[0].scheduled_tasks[0], {
      due: '1970-01-01T00:00:00.000Z',
      state: 'pending',
      messages: [{
        to: to,
        message: 'STAT 2014 12 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0'
      }]
    });
    test.done();
  });
};

exports['go submits populated submission string for old style active_facilities'] = function(test) {
  test.expect(8);

  var phone = '+555123456';
  var getView = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [{
    doc: {
      visits_per_delivery: { '1+': 20, '2+': 19, '3+': 18, '4+': 17 },
      estimated_deliveries: 50,
      valid_form_submissions: { D: 60, F: 12, V: 101, R: 63, P: 15 }, 
      delivery_locations: { F: 23, S: 20 },
      active_facilities: 20,
      type: 'usage_stats',
      reported_date: 1427838796899,
      year: 2014,
      month: 11
    }
  }] });
  var requestPost = sinon.stub(request, 'post').callsArgWith(1, null, null, successfulResponse);
  var dbSaveDoc = sinon.stub(db.medic, 'insert').callsArg(1);
  sinon.stub(config, 'get')
    .withArgs('statistics_submission').returns('web')
    .withArgs('gateway_number').returns(phone)
    .withArgs('anc_forms').returns({
      registration: 'R',
      registrationLmp: 'P',
      visit: 'V',
      delivery: 'D',
      flag: 'F'
    });
  schedule.go(function(err) {
    test.equals(err, undefined);
    test.equals(getView.callCount, 1);
    test.equals(requestPost.callCount, 1);
    test.equals(requestPost.firstCall.args[0].form.sent_timestamp, 0);
    test.equals(requestPost.firstCall.args[0].form.message, 'STAT 2014 12 20 78 12 60 50 20 17 23 20 101');
    test.equals(requestPost.firstCall.args[0].form.from, phone);
    test.equals(dbSaveDoc.callCount, 1);
    test.equals(dbSaveDoc.firstCall.args[0].submitted, true);
    test.done();
  });
};
