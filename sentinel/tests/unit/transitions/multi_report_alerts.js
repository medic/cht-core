const _ = require('underscore'),
      config = require('../../../src/config'),
      messages = require('../../../src/lib/messages'),
      sinon = require('sinon'),
      assert = require('chai').assert,
      transition = require('../../../src/transitions/multi_report_alerts'),
      utils = require('../../../src/lib/utils');

let alertConfig;

describe('multi report alerts', () => {
  afterEach(() => sinon.restore());
  beforeEach(() => {
    // reset alert
    alertConfig = {
      name: 'you_should_know_about_this',
      is_report_counted: 'function() { return true; }',
      num_reports_threshold: 3,
      message: 'hi',
      recipients: ['+254777888999'],
      time_window_in_days : 7
    };
  });

  const stubFetchHydratedDocs = () => {
    sinon.stub(transition._lineage, 'hydrateDocs').resolves(hydratedReports);
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

  it('filter validation', () => {
    assert.equal(transition.filter({}), false);
    assert.equal(transition.filter({
      form: 'x',
      type: 'badtype'
    }), false);
    assert.equal(transition.filter({
      type: 'data_record'
    }), false);
    assert.equal(transition.filter({
      form: 'x',
    }), false);
    assert.equal(transition.filter({
      form: 'x',
      type: 'data_record'
    }), true);
  });

  it('filter validation hasRun', () => {
    assert.equal(transition.filter({
      form: 'x',
      type: 'data_record'
    }, {transitions : { multi_report_alerts: 'hi' }}), false);
  });

  const assertConfigIsInvalid = (done, alerts) => {
    sinon.stub(config, 'get').returns(alerts);
    try {
      transition.init();
    } catch(e) {
      assert.equal(config.get.getCall(0).args[0], 'multi_report_alerts');
      done();
    }
  };

  it('validates config : is_report_counted', done => {
    assertConfigIsInvalid(done, [_.omit(alertConfig, 'is_report_counted')]);
  });

  it('validates config : name', done => {
    assertConfigIsInvalid(done, [_.omit(alertConfig, 'name')]);
  });

  it('validates config : names are unique', done => {
    assertConfigIsInvalid(done, [alertConfig, alertConfig]);
  });

  it('validates config : num_reports_threshold', done => {
    assertConfigIsInvalid(done, [_.omit(alertConfig, 'num_reports_threshold')]);
  });

  it('validates config : num_reports_threshold < 100', done => {
    alertConfig.num_reports_threshold = 100000000; // arbitrary large number
    assertConfigIsInvalid(done, [ alertConfig ]);
  });

  it('validates config : message', done => {
    assertConfigIsInvalid(done, [_.omit(alertConfig, 'message')]);
  });

  it('validates config : recipients', done => {
    assertConfigIsInvalid(done, [_.omit(alertConfig, 'recipients')]);
  });

  it('validates config : time_window_in_days', done => {
    assertConfigIsInvalid(done, [_.omit(alertConfig, 'time_window_in_days')]);
  });

  it('fetches reports within time window', () => {
    sinon.stub(config, 'get').returns([alertConfig]);
    sinon.stub(utils, 'getReportsWithinTimeWindow').resolves(reports);
    stubFetchHydratedDocs();
    return transition.onMatch({ doc: doc }).then(() => {
      assert.equal(utils.getReportsWithinTimeWindow.callCount, 1);
      assert.equal(utils.getReportsWithinTimeWindow.args[0][0], 12344);
      assert.equal(utils.getReportsWithinTimeWindow.args[0][1], alertConfig.time_window_in_days);
    });
  });

  it('filters reports by form if forms is present in config', () => {
    sinon.stub(config, 'get').returns([_.extend({forms: ['A']} , alertConfig)]);
    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
    sinon.stub(transition._lineage, 'hydrateDocs').returns(Promise.resolve([hydratedReports[0]]));
    return transition.onMatch({ doc: doc }).then(() => {
      assert.equal(transition._lineage.hydrateDocs.callCount, 1);
      assert.equal(transition._lineage.hydrateDocs.args[0][0].length, 1);
      assert.equal(transition._lineage.hydrateDocs.args[0][0][0]._id, reports[0]._id);
    });
  });

  it('if not enough reports pass the is_report_counted func, does nothing', () => {
    alertConfig.is_report_counted = 'function() { return false; }';
    sinon.stub(config, 'get').returns([alertConfig]);
    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
    stubFetchHydratedDocs();
    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(() => {
      assert.equal(messages.addError.getCalls().length, 0);
      assert.equal(messages.addMessage.getCalls().length, 0);
    });
  });

  it('if no reports in time window, does nothing', () => {
    sinon.stub(config, 'get').returns([alertConfig]);
    // No reports
    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve([]));
    sinon.stub(transition._lineage, 'hydrateDocs').returns(Promise.resolve([]));
    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(docNeedsSaving => {
      assert.equal(messages.addError.getCalls().length, 0);
      assert.equal(messages.addMessage.getCalls().length, 0);
      assert(!docNeedsSaving);
    });
  });

  const assertMessage = (messageArgs, recipient, message, alertName, num_reports_threshold, time_window_in_days) => {
    const templateContext = {
      new_reports: [doc, ...hydratedReports],
      num_counted_reports: [doc, ...hydratedReports].length,
      alert_name: alertName,
      num_reports_threshold: num_reports_threshold,
      time_window_in_days: time_window_in_days
    };
    assert.equal(messageArgs[0], doc);
    assert.equal(messageArgs[1].message, message);
    assert.equal(messageArgs[2], recipient);
    assert.deepEqual(messageArgs[3], { templateContext: templateContext });
  };

  const assertMessages = (addMessageStub, alert) => {
    addMessageStub.getCalls().forEach((call, i) => {
      assertMessage(call.args, alert.recipients[i], alert.message, alert.name, alert.num_reports_threshold, alert.time_window_in_days);
    });
  };

  it('if enough reports pass the is_report_counted func, adds message', () => {
    sinon.stub(config, 'get').returns([alertConfig]);
    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
    stubFetchHydratedDocs();
    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(docNeedsSaving => {
      assert.equal(messages.addError.getCalls().length, 0);

      assert.equal(messages.addMessage.getCalls().length, alertConfig.recipients.length);
      assertMessages(messages.addMessage, alertConfig);
      // assert.equal(doc.tasks[0].type, 'alert');
      assert.equal(doc.tasks[0].alert_name, alertConfig.name);
      // assert.deepEqual(doc.tasks[0].counted_reports, [ doc._id, ...reports.map(report => report._id) ]);

      assert(docNeedsSaving);
    });
  });

  it('adds message when recipient is evaled', () => {
    const recipient = 'new_report.contact.phone';
    alertConfig.recipients = [recipient];
    alertConfig.num_reports_threshold = 1;
    sinon.stub(config, 'get').returns([alertConfig]);

    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve([]));
    sinon.stub(transition._lineage, 'hydrateDocs').returns(Promise.resolve([]));
    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(docNeedsSaving => {
      assert.equal(messages.addMessage.getCalls().length, 1);
      assert.equal(messages.addError.getCalls().length, 0);

      assert(docNeedsSaving);
    });
  });

  it('adds multiple messages when multiple recipients are evaled', () => {
    alertConfig.recipients = [ 'new_report.contact.phone' ];
    sinon.stub(config, 'get').returns([alertConfig]);

    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
    stubFetchHydratedDocs();
    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(docNeedsSaving => {
      assert.equal(messages.addMessage.getCalls().length, 3); // 3 counted reports, one phone number each.
      const actualPhones = messages.addMessage.getCalls().map(call => call.args[2]);
      const expectedPhones = [doc.contact.phone, hydratedReports[0].contact.phone, hydratedReports[1].contact.phone];
      assert.deepEqual(actualPhones, expectedPhones);

      assert.equal(messages.addError.getCalls().length, 0);

      assert(docNeedsSaving);
    });
  });

  it('does not add message when recipient cannot be evaled', () => {
    const recipient = 'new_report.contact.phonekkk'; // field doesn't exist
    alertConfig.recipients = [recipient];
    sinon.stub(config, 'get').returns([alertConfig]);

    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
    stubFetchHydratedDocs();
    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(docNeedsSaving => {
      assert.equal(messages.addError.getCalls().length, 3); // 3 countedReports, one failed recipient each
      assert.equal(messages.addMessage.getCalls().length, 0);

      assert(docNeedsSaving);
    });
  });

  it('does not add message when recipient is bad', () => {
    const recipient = 'ssdfds';
    alertConfig.recipients = [recipient];
    sinon.stub(config, 'get').returns([alertConfig]);

    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
    stubFetchHydratedDocs();
    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(docNeedsSaving => {
      assert.equal(messages.addMessage.getCalls().length, 0);
      assert.equal(messages.addError.getCalls().length, 3); // 3 countedReports, one failed recipient each

      assert(docNeedsSaving);
    });
  });

  it('does not add message when recipient is not international phone number', () => {
    const recipient = '0623456789';
    alertConfig.recipients = [recipient];
    sinon.stub(config, 'get').returns([alertConfig]);

    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
    stubFetchHydratedDocs();
    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(docNeedsSaving => {
      assert.equal(messages.addMessage.getCalls().length, 0);
      assert.equal(messages.addError.getCalls().length, 3); // 3 countedReports, one failed recipient each

      assert(docNeedsSaving);
    });
  });

  it('message only contains newReports', () => {
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
    sinon.stub(transition._lineage, 'hydrateDocs').returns(Promise.resolve(hydratedReportsWithOneAlreadyMessaged));

    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(docNeedsSaving => {
      assert.equal(messages.addMessage.getCalls().length, 1);
      assert.equal(messages.addError.getCalls().length, 0);
      assert.deepEqual(messages.addMessage.getCall(0).args[3].templateContext.new_reports, [doc, hydratedReportsWithOneAlreadyMessaged[0] ]);
      assert(docNeedsSaving);
    });
  });

  it('adds multiple messages when mutiple recipients', () => {
    alertConfig.recipients = ['+254111222333', 'new_report.contact.phone'];
    sinon.stub(config, 'get').returns([alertConfig]);

    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
    stubFetchHydratedDocs();
    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(() => {
      assert.equal(messages.addError.getCalls().length, 0);

      // first recipient
      assertMessage(messages.addMessage.getCall(0).args, '+254111222333', alertConfig.message, alertConfig.name, alertConfig.num_reports_threshold, alertConfig.time_window_in_days);
      // second recipient : matched 3 phones
      assertMessage(messages.addMessage.getCall(1).args, doc.contact.phone, alertConfig.message, alertConfig.name, alertConfig.num_reports_threshold, alertConfig.time_window_in_days);
      assertMessage(messages.addMessage.getCall(2).args, hydratedReports[0].contact.phone, alertConfig.message, alertConfig.name, alertConfig.num_reports_threshold, alertConfig.time_window_in_days);
      assertMessage(messages.addMessage.getCall(3).args, hydratedReports[1].contact.phone, alertConfig.message, alertConfig.name, alertConfig.num_reports_threshold, alertConfig.time_window_in_days);

      assert.equal(messages.addMessage.getCalls().length, 4);
    });
  });

  it('dedups message recipients', () => {
    // specify same recipient twice.
    alertConfig.recipients = ['new_report.contact.phone', 'new_report.contact.phone'];
    sinon.stub(config, 'get').returns([alertConfig]);

    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
    stubFetchHydratedDocs();
    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(() => {
      assert.equal(messages.addError.getCalls().length, 0);

      assert.equal(messages.addMessage.getCalls().length, 3); // 3 countedReports, 2 recipients specified for each, deduped to 1 for each.
      assert.equal(messages.addMessage.getCall(0).args[2], doc.contact.phone);
      assert.equal(messages.addMessage.getCall(1).args[2], hydratedReports[0].contact.phone);
      assert.equal(messages.addMessage.getCall(2).args[2], hydratedReports[1].contact.phone);
    });
  });

  it('when unexpected error, callback returns (error, false)', () => {
    sinon.stub(config, 'get').returns([alertConfig]);
    sinon.stub(utils, 'getReportsWithinTimeWindow').throws(new Error('much error'));

    return transition.onMatch({ doc: doc }).catch(err => {
      assert(!err.changed);
    });
  });

  it('runs multiple alerts', () => {
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

    return transition.onMatch({ doc: doc }).then(docNeedsSaving => {
      assert.equal(messages.addError.getCalls().length, 0);

      assert.equal(messages.addMessage.getCalls().length, 3); // alert[0].recipients + alert[1].recipients
      assertMessage(messages.addMessage.getCall(0).args, twoAlerts[0].recipients[0], twoAlerts[0].message, twoAlerts[0].name, twoAlerts[0].num_reports_threshold, twoAlerts[0].time_window_in_days);
      assertMessage(messages.addMessage.getCall(1).args, twoAlerts[1].recipients[0], twoAlerts[1].message, twoAlerts[1].name, twoAlerts[1].num_reports_threshold, twoAlerts[1].time_window_in_days);
      assertMessage(messages.addMessage.getCall(2).args, twoAlerts[1].recipients[1], twoAlerts[1].message, twoAlerts[1].name, twoAlerts[1].num_reports_threshold, twoAlerts[1].time_window_in_days);

      assert(docNeedsSaving);
    });
  });

  it('skips doc with wrong form if forms is present in config', () => {
    alertConfig.forms = ['B'];
    sinon.stub(config, 'get').returns([alertConfig]);

    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
    stubFetchHydratedDocs();
    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(docNeedsSaving => {
      assert.equal(messages.addError.getCalls().length, 0);
      assert.equal(messages.addMessage.getCalls().length, 0);
      assert(!docNeedsSaving);
    });
  });

  it('latest report has to go through is_report_counted function', () => {
    alertConfig.is_report_counted = 'function(report, latestReport) { return report.form === "B"; }';
    alertConfig.num_reports_threshold = 2;
    sinon.stub(config, 'get').returns([alertConfig]);

    // Only 1 report has form B, the latest_report doesn't, so we shouldn't reach the num_reports_threshold.
    // (pre-asserting the test data so that we don't break this test later by accident)
    assert.equal(doc.form, 'A');
    assert.equal(reports.filter(report => report.form === 'B').length, 1);

    sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
    stubFetchHydratedDocs();
    sinon.stub(messages, 'addError');
    sinon.stub(messages, 'addMessage');

    return transition.onMatch({ doc: doc }).then(docNeedsSaving => {
      assert.equal(messages.addError.getCalls().length, 0);
      assert.equal(messages.addMessage.getCalls().length, 0);
      assert(!docNeedsSaving);
    });
  });

  it('getCountedReportsAndPhones batches properly', () => {
    const report = () => ({ _id: 'docA', form: 'A', contact: { _id: 'contactA' } });

    const firstBatch = [...Array(100).keys()].map(report);
    const secondBatch = [...Array(50).keys()].map(report);

    const hdStub = sinon.stub(transition._lineage, 'hydrateDocs');
    hdStub.onCall(0).returns(Promise.resolve(firstBatch));
    hdStub.onCall(1).returns(Promise.resolve(secondBatch));
    const grwtwStub = sinon.stub(utils, 'getReportsWithinTimeWindow');
    grwtwStub.onCall(0).returns(Promise.resolve(firstBatch));
    grwtwStub.onCall(1).returns(Promise.resolve(secondBatch));

    return transition._getCountedReportsAndPhones(alertConfig, doc)
      .then(({countedReportsIds, newReports}) => {
        // Two batches above, plus the doc passed in
        assert.equal(countedReportsIds.length, 151);
        assert.equal(newReports.length, 151);
      });
  });
});
