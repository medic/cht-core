const _ = require('underscore'),
      config = require('../../../config'),
      lineage = require('../../../lib/lineage'),
      messages = require('../../../lib/messages'),
      sinon = require('sinon').sandbox.create(),
      transition = require('../../../transitions/multi_report_alerts'),
      utils = require('../../../lib/utils');

let alertConfig;

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports.setUp = callback => {
  // reset alert
  alertConfig = {
    name: 'you_should_know_about_this',
    is_report_counted: 'function() { return true; }',
    num_reports_threshold: 3,
    message: 'hi',
    recipients: ['+254777888999'],
    time_window_in_days : 7
  };
  callback();
};

const stubFetchHydratedDocs = () => {
  sinon.stub(lineage, 'hydrateDocs').returns(Promise.resolve(hydratedReports));
};

// doc is hydrated before being passed to the transition.
const doc = {
  _id: 'doc',
  reported_date: 12345,
  form: 'A',
  contact: {
    _id: 'contact',
    phone: '+123456'
  }
};

const reports = [
  { _id: 'docA', form: 'A', contact: { _id: 'contactA' } },
  { _id: 'docB', form: 'B', contact: { _id: 'contactB' } },
];

const hydratedReports = [
  { _id: 'docA', form: 'A', contact: { _id: 'contactA', phone: '+234567'} },
  { _id: 'docB', form: 'B', contact: { _id: 'contactB', phone: '+345678'} }
];

exports['filter validation'] = test => {
  test.equal(transition.filter({}), false);
  test.equal(transition.filter({
    form: 'x',
    type: 'badtype'
  }), false);
  test.equal(transition.filter({
    type: 'data_record'
  }), false);
  test.equal(transition.filter({
    form: 'x',
  }), false);
  test.equal(transition.filter({
    form: 'x',
    type: 'data_record'
  }), true);
  test.done();
};

exports['filter validation hasRun'] = test => {
  test.equal(transition.filter({
    form: 'x',
    type: 'data_record',
    transitions : { multi_report_alerts: 'hi' }
  }), false);
  test.done();
};

const assertConfigIsInvalid = (test, alerts) => {
  sinon.stub(config, 'get').returns(alerts);
  try {
    transition.init();
  } catch(e) {
    test.equals(config.get.getCall(0).args[0], 'multi_report_alerts');
    test.done();
  }
};

exports['validates config : is_report_counted'] = test => {
  assertConfigIsInvalid(test, [_.omit(alertConfig, 'is_report_counted')]);
};

exports['validates config : name'] = test => {
  assertConfigIsInvalid(test, [_.omit(alertConfig, 'name')]);
};

exports['validates config : names are unique'] = test => {
  assertConfigIsInvalid(test, [alertConfig, alertConfig]);
};

exports['validates config : num_reports_threshold'] = test => {
  assertConfigIsInvalid(test, [_.omit(alertConfig, 'num_reports_threshold')]);
};

exports['validates config : num_reports_threshold < 100'] = test => {
  alertConfig.num_reports_threshold = 100000000; // arbitrary large number
  assertConfigIsInvalid(test, [ alertConfig ]);
};

exports['validates config : message'] = test => {
  assertConfigIsInvalid(test, [_.omit(alertConfig, 'message')]);
};

exports['validates config : recipients'] = test => {
  assertConfigIsInvalid(test, [_.omit(alertConfig, 'recipients')]);
};

exports['validates config : time_window_in_days'] = test => {
  assertConfigIsInvalid(test, [_.omit(alertConfig, 'time_window_in_days')]);
};

exports['fetches reports within time window'] = test => {
  sinon.stub(config, 'get').returns([alertConfig]);
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  transition.onMatch({ doc: doc }).then(() => {
    test.equals(utils.getReportsWithinTimeWindow.callCount, 1);
    test.equals(utils.getReportsWithinTimeWindow.args[0][0], 12344);
    test.equals(utils.getReportsWithinTimeWindow.args[0][1], alertConfig.time_window_in_days);
    test.done();
  });
};

exports['filters reports by form if forms is present in config'] = test => {
  sinon.stub(config, 'get').returns([_.extend({forms: ['A']} , alertConfig)]);
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  sinon.stub(lineage, 'hydrateDocs').returns(Promise.resolve([hydratedReports[0]]));
  transition.onMatch({ doc: doc }).then(() => {
    test.equals(lineage.hydrateDocs.callCount, 1);
    test.equals(lineage.hydrateDocs.args[0][0].length, 1);
    test.equals(lineage.hydrateDocs.args[0][0][0]._id, reports[0]._id);
    test.done();
  });
};

exports['if not enough reports pass the is_report_counted func, does nothing'] = test => {
  alertConfig.is_report_counted = 'function() { return false; }';
  sinon.stub(config, 'get').returns([alertConfig]);
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(() => {
    test.equals(messages.addError.getCalls().length, 0);
    test.equals(messages.addMessage.getCalls().length, 0);
    test.done();
  });
};

exports['if no reports in time window, does nothing'] = test => {
  sinon.stub(config, 'get').returns([alertConfig]);
  // No reports
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve([]));
  sinon.stub(lineage, 'hydrateDocs').returns(Promise.resolve([]));
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(docNeedsSaving => {
    test.equals(messages.addError.getCalls().length, 0);
    test.equals(messages.addMessage.getCalls().length, 0);
    test.ok(!docNeedsSaving);
    test.done();
  });
};

const assertMessage = (test, messageArgs, recipient, message, alertName, num_reports_threshold, time_window_in_days) => {
  const templateContext = {
    new_reports: [doc, ...hydratedReports],
    num_counted_reports: [doc, ...hydratedReports].length,
    alert_name: alertName,
    num_reports_threshold: num_reports_threshold,
    time_window_in_days: time_window_in_days
  };
  test.equals(messageArgs[0], doc);
  test.equals(messageArgs[1].message, message);
  test.equals(messageArgs[2], recipient);
  test.deepEqual(messageArgs[3], { templateContext: templateContext });
};

const assertMessages = (test, addMessageStub, alert) => {
  addMessageStub.getCalls().forEach((call, i) => {
    assertMessage(test, call.args, alert.recipients[i], alert.message, alert.name, alert.num_reports_threshold, alert.time_window_in_days);
  });
};

exports['if enough reports pass the is_report_counted func, adds message'] = test => {
  sinon.stub(config, 'get').returns([alertConfig]);
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(docNeedsSaving => {
    test.equals(messages.addError.getCalls().length, 0);

    test.equals(messages.addMessage.getCalls().length, alertConfig.recipients.length);
    assertMessages(test, messages.addMessage, alertConfig);
    test.equals(doc.tasks[0].type, 'alert');
    test.equals(doc.tasks[0].alert_name, alertConfig.name);
    test.deepEqual(doc.tasks[0].counted_reports, [ doc._id, ...reports.map(report => report._id) ]);

    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['adds message when recipient is evaled'] = test => {
  const recipient = 'new_report.contact.phone';
  alertConfig.recipients = [recipient];
  alertConfig.num_reports_threshold = 1;
  sinon.stub(config, 'get').returns([alertConfig]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve([]));
  sinon.stub(lineage, 'hydrateDocs').returns(Promise.resolve([]));
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(docNeedsSaving => {
    test.equals(messages.addMessage.getCalls().length, 1);
    test.equals(messages.addError.getCalls().length, 0);

    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['adds multiple messages when multiple recipients are evaled'] = test => {
  alertConfig.recipients = [ 'new_report.contact.phone' ];
  sinon.stub(config, 'get').returns([alertConfig]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(docNeedsSaving => {
    test.equals(messages.addMessage.getCalls().length, 3); // 3 counted reports, one phone number each.
    const actualPhones = messages.addMessage.getCalls().map(call => call.args[2]);
    const expectedPhones = [doc.contact.phone, hydratedReports[0].contact.phone, hydratedReports[1].contact.phone];
    test.deepEqual(actualPhones, expectedPhones);

    test.equals(messages.addError.getCalls().length, 0);

    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['does not add message when recipient cannot be evaled'] = test => {
  const recipient = 'new_report.contact.phonekkk'; // field doesn't exist
  alertConfig.recipients = [recipient];
  sinon.stub(config, 'get').returns([alertConfig]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(docNeedsSaving => {
    test.equals(messages.addError.getCalls().length, 3); // 3 countedReports, one failed recipient each
    test.equals(messages.addMessage.getCalls().length, 0);

    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['does not add message when recipient is bad'] = test => {
  const recipient = 'ssdfds';
  alertConfig.recipients = [recipient];
  sinon.stub(config, 'get').returns([alertConfig]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(docNeedsSaving => {
    test.equals(messages.addMessage.getCalls().length, 0);
    test.equals(messages.addError.getCalls().length, 3); // 3 countedReports, one failed recipient each

    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['does not add message when recipient is not international phone number'] = test => {
  const recipient = '0623456789';
  alertConfig.recipients = [recipient];
  sinon.stub(config, 'get').returns([alertConfig]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(docNeedsSaving => {
    test.equals(messages.addMessage.getCalls().length, 0);
    test.equals(messages.addError.getCalls().length, 3); // 3 countedReports, one failed recipient each

    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['message only contains newReports'] = test => {
  sinon.stub(config, 'get').returns([alertConfig]);

  const reportsWithOneAlreadyMessaged = [
    { _id: 'docA', form: 'A', contact: { _id: 'contactA' } },
    { _id: 'docB', form: 'B', contact: { _id: 'contactB' },
      tasks: [
        {
          type: 'alert',
          alert_name: alertConfig.name,
          counted_reports: ['docB']
        }
      ]
    },
  ];
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reportsWithOneAlreadyMessaged));

  const hydratedReportsWithOneAlreadyMessaged = [
    { _id: 'docA', form: 'A', contact: { _id: 'contactA', phone: '+234567'} },
    {
      _id: 'docB', form: 'B', contact: { _id: 'contactB', phone: '+345678'},
      tasks: [
        {
          type: 'alert',
          alert_name: alertConfig.name,
          counted_reports: ['docB']
        }
      ]
    }
  ];
  sinon.stub(lineage, 'hydrateDocs').returns(Promise.resolve(hydratedReportsWithOneAlreadyMessaged));

  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(docNeedsSaving => {
    test.equals(messages.addMessage.getCalls().length, 1);
    test.equals(messages.addError.getCalls().length, 0);
    test.deepEqual(messages.addMessage.getCall(0).args[3].templateContext.new_reports, [doc, hydratedReportsWithOneAlreadyMessaged[0] ]);
    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['adds multiple messages when mutiple recipients'] = test => {
  alertConfig.recipients = ['+254111222333', 'new_report.contact.phone'];
  sinon.stub(config, 'get').returns([alertConfig]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(() => {
    test.equals(messages.addError.getCalls().length, 0);

    // first recipient
    assertMessage(test, messages.addMessage.getCall(0).args, '+254111222333', alertConfig.message, alertConfig.name, alertConfig.num_reports_threshold, alertConfig.time_window_in_days);
    // second recipient : matched 3 phones
    assertMessage(test, messages.addMessage.getCall(1).args, doc.contact.phone, alertConfig.message, alertConfig.name, alertConfig.num_reports_threshold, alertConfig.time_window_in_days);
    assertMessage(test, messages.addMessage.getCall(2).args, hydratedReports[0].contact.phone, alertConfig.message, alertConfig.name, alertConfig.num_reports_threshold, alertConfig.time_window_in_days);
    assertMessage(test, messages.addMessage.getCall(3).args, hydratedReports[1].contact.phone, alertConfig.message, alertConfig.name, alertConfig.num_reports_threshold, alertConfig.time_window_in_days);

    test.equals(messages.addMessage.getCalls().length, 4);

    test.done();
  });
};

exports['dedups message recipients'] = test => {
  // specify same recipient twice.
  alertConfig.recipients = ['new_report.contact.phone', 'new_report.contact.phone'];
  sinon.stub(config, 'get').returns([alertConfig]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(() => {
    test.equals(messages.addError.getCalls().length, 0);

    test.equals(messages.addMessage.getCalls().length, 3); // 3 countedReports, 2 recipients specified for each, deduped to 1 for each.
    test.equals(messages.addMessage.getCall(0).args[2], doc.contact.phone);
    test.equals(messages.addMessage.getCall(1).args[2], hydratedReports[0].contact.phone);
    test.equals(messages.addMessage.getCall(2).args[2], hydratedReports[1].contact.phone);

    test.done();
  });
};

exports['when unexpected error, callback returns (error, false)'] = test => {
  sinon.stub(config, 'get').returns([alertConfig]);
  sinon.stub(utils, 'getReportsWithinTimeWindow').throws(new Error('much error'));

  transition.onMatch({ doc: doc }).catch(err => {
    test.ok(!err.changed);
    test.done();
  });
};

exports['runs multiple alerts'] = test => {
  var twoAlerts = [
  {
    name: 'first_alert',
    is_report_counted: 'function() { return true; }',
    num_reports_threshold : 3,
    message : 'hi',
    recipients : ['+254777888999'],
    time_window_in_days : 7
  },
  {
    name: 'second_alert',
    is_report_counted: 'function() { return true; }',
    num_reports_threshold : 2,
    message : 'bye',
    recipients : ['+254777888111', '+2562299383'],
    time_window_in_days : 5
  }];
  sinon.stub(config, 'get').returns(twoAlerts);
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(docNeedsSaving => {
    test.equals(messages.addError.getCalls().length, 0);

    test.equals(messages.addMessage.getCalls().length, 3); // alert[0].recipients + alert[1].recipients
    assertMessage(test, messages.addMessage.getCall(0).args, twoAlerts[0].recipients[0], twoAlerts[0].message, twoAlerts[0].name, twoAlerts[0].num_reports_threshold, twoAlerts[0].time_window_in_days);
    assertMessage(test, messages.addMessage.getCall(1).args, twoAlerts[1].recipients[0], twoAlerts[1].message, twoAlerts[1].name, twoAlerts[1].num_reports_threshold, twoAlerts[1].time_window_in_days);
    assertMessage(test, messages.addMessage.getCall(2).args, twoAlerts[1].recipients[1], twoAlerts[1].message, twoAlerts[1].name, twoAlerts[1].num_reports_threshold, twoAlerts[1].time_window_in_days);

    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['skips doc with wrong form if forms is present in config'] = test => {
  alertConfig.forms = ['B'];
  sinon.stub(config, 'get').returns([alertConfig]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(docNeedsSaving => {
    test.equals(messages.addError.getCalls().length, 0);
    test.equals(messages.addMessage.getCalls().length, 0);
    test.ok(!docNeedsSaving);
    test.done();
  });
};

exports['latest report has to go through is_report_counted function'] = test => {
  alertConfig.is_report_counted = 'function(report, latestReport) { return report.form === "B"; }';
  alertConfig.num_reports_threshold = 2;
  sinon.stub(config, 'get').returns([alertConfig]);

  // Only 1 report has form B, the latest_report doesn't, so we shouldn't reach the num_reports_threshold.
  // (pre-asserting the test data so that we don't break this test later by accident)
  test.equals(doc.form, 'A');
  test.equals(reports.filter(report => report.form === 'B').length, 1);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }).then(docNeedsSaving => {
    test.equals(messages.addError.getCalls().length, 0);
    test.equals(messages.addMessage.getCalls().length, 0);
    test.ok(!docNeedsSaving);
    test.done();
  });
};

exports['getCountedReportsAndPhones batches properly'] = test => {
  const report = () => ({ _id: 'docA', form: 'A', contact: { _id: 'contactA' } });

  const firstBatch = [...Array(100).keys()].map(report);
  const secondBatch = [...Array(50).keys()].map(report);

  const hdStub = sinon.stub(lineage, 'hydrateDocs');
  hdStub.onCall(0).returns(Promise.resolve(firstBatch));
  hdStub.onCall(1).returns(Promise.resolve(secondBatch));
  const grwtwStub = sinon.stub(utils, 'getReportsWithinTimeWindow');
  grwtwStub.onCall(0).returns(Promise.resolve(firstBatch));
  grwtwStub.onCall(1).returns(Promise.resolve(secondBatch));

  transition._getCountedReportsAndPhones(alertConfig, doc)
    .then(({countedReportsIds, newReports}) => {
      // Two batches above, plus the doc passed in
      test.equal(countedReportsIds.length, 151);
      test.equal(newReports.length, 151);
      test.done();
    });
};
