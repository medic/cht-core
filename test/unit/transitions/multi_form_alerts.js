const _ = require('underscore'),
      config = require('../../../config'),
      lineage = require('../../../lib/lineage'),
      messages = require('../../../lib/messages'),
      sinon = require('sinon').sandbox.create(),
      transition = require('../../../transitions/multi_form_alerts'),
      utils = require('../../../lib/utils');

let alert;

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports.setUp = callback => {
  // reset alert
  alert = {
    isReportCounted: 'function() { return true; }',
    numReportsThreshold: 3,
    message: 'hi',
    recipients: ['+254777888999'],
    timeWindowInDays : 7
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
    transitions : { multi_form_alerts: 'hi' }
  }), false);
  test.done();
};

const testConfigIsValid = (test, alert) => {
  sinon.stub(config, 'get').returns([alert]);
  try {
    transition.init();
  } catch(e) {
    test.equals(config.get.getCall(0).args[0], 'multi_form_alerts');
    test.done();
  }
};

exports['validates config : isReportCounted'] = test => {
  testConfigIsValid(test, _.omit(alert, 'isReportCounted'));
};

exports['validates config : numReportsThreshold'] = test => {
  testConfigIsValid(test, _.omit(alert, 'numReportsThreshold'));
};

exports['validates config : message'] = test => {
  testConfigIsValid(test, _.omit(alert, 'message'));
};

exports['validates config : recipients'] = test => {
  testConfigIsValid(test, _.omit(alert, 'recipients'));
};

exports['validates config : timeWindowInDays'] = test => {
  testConfigIsValid(test, _.omit(alert, 'timeWindowInDays'));
};

exports['fetches reports within time window'] = test => {
  sinon.stub(config, 'get').returns([alert]);
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  transition.onMatch({ doc: doc }, undefined, undefined, () => {
    test.equals(utils.getReportsWithinTimeWindow.callCount, 1);
    test.equals(utils.getReportsWithinTimeWindow.args[0][0], 12344);
    test.equals(utils.getReportsWithinTimeWindow.args[0][1], alert.timeWindowInDays);
    test.done();
  });
};

exports['filters reports by form if forms is present in config'] = test => {
  sinon.stub(config, 'get').returns([_.extend({forms: ['A']} , alert)]);
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  sinon.stub(lineage, 'hydrateDocs').returns(Promise.resolve([hydratedReports[0]]));
  transition.onMatch({ doc: doc }, undefined, undefined, () => {
    test.equals(lineage.hydrateDocs.callCount, 1);
    test.equals(lineage.hydrateDocs.args[0][0].length, 1);
    test.equals(lineage.hydrateDocs.args[0][0][0]._id, reports[0]._id);
    test.done();
  });
};

exports['if not enough reports pass the isReportCounted func, does nothing'] = test => {
  alert.isReportCounted = 'function() { return false; }';
  sinon.stub(config, 'get').returns([alert]);
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }, undefined, undefined, () => {
    test.equals(messages.addError.getCalls().length, 0);
    test.equals(messages.addMessage.getCalls().length, 0);
    test.done();
  });
};

exports['if no reports in time window, does nothing'] = test => {
  sinon.stub(config, 'get').returns([alert]);
  // No reports
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve([]));
  sinon.stub(lineage, 'hydrateDocs').returns(Promise.resolve([]));
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }, undefined, undefined, (err, docNeedsSaving) => {
    test.equals(messages.addError.getCalls().length, 0);
    test.equals(messages.addMessage.getCalls().length, 0);
    test.ok(!docNeedsSaving);
    test.done();
  });
};

const assertMessage = (test, messageArgs, recipient, message) => {
  test.deepEqual(messageArgs, {
    doc: doc,
    phone: recipient,
    message: message,
    templateContext: { countedReports: [doc, ...hydratedReports] }
  });
};

const assertMessages = (test, addMessageStub, alert) => {
  addMessageStub.getCalls().forEach((call, i) => {
    assertMessage(test, call.args[0], alert.recipients[i], alert.message);
  });
};

exports['if enough reports pass the isReportCounted func, adds message'] = test => {
  sinon.stub(config, 'get').returns([alert]);
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }, undefined, undefined, (err, docNeedsSaving) => {
    test.equals(messages.addError.getCalls().length, 0);

    test.equals(messages.addMessage.getCalls().length, alert.recipients.length);
    assertMessages(test, messages.addMessage, alert);

    test.ok(!err);
    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['adds message when recipient is evaled'] = test => {
  const recipient = 'countedReports[0].contact.phone';
  alert.recipients = [recipient];
  sinon.stub(config, 'get').returns([alert]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }, undefined, undefined, (err, docNeedsSaving) => {
    test.equals(messages.addMessage.getCalls().length, 1);
    test.equals(messages.addError.getCalls().length, 0);

    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['adds multiple messages when multiple recipients are evaled'] = test => {
  alert.recipients = [ 'countedReports.map(report => report.contact.phone)' ];
  sinon.stub(config, 'get').returns([alert]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }, undefined, undefined, (err, docNeedsSaving) => {
    test.equals(messages.addMessage.getCalls().length, 3); // 3 counted reports, one phone number each.
    const actualPhones = messages.addMessage.getCalls().map(call => call.args[0].phone);
    const expectedPhones = [doc.contact.phone, hydratedReports[0].contact.phone, hydratedReports[1].contact.phone];
    test.deepEqual(actualPhones, expectedPhones);

    test.equals(messages.addError.getCalls().length, 0);

    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['does not add message when recipient cannot be evaled'] = test => {
  const recipient = 'countedReports[0].contact.phonekkk'; // field doesn't exist
  alert.recipients = [recipient];
  sinon.stub(config, 'get').returns([alert]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }, undefined, undefined, (err, docNeedsSaving) => {
    test.equals(messages.addError.getCalls().length, 1);
    test.equals(messages.addMessage.getCalls().length, 0);

    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['does not add message when recipient is bad'] = test => {
  const recipient = 'ssdfds';
  alert.recipients = [recipient];
  sinon.stub(config, 'get').returns([alert]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }, undefined, undefined, (err, docNeedsSaving) => {
    test.equals(messages.addMessage.getCalls().length, 0);
    test.equals(messages.addError.getCalls().length, 1);

    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['does not add message when recipient is not international phone number'] = test => {
  const recipient = '0623456789';
  alert.recipients = [recipient];
  sinon.stub(config, 'get').returns([alert]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }, undefined, undefined, (err, docNeedsSaving) => {
    test.equals(messages.addMessage.getCalls().length, 0);
    test.equals(messages.addError.getCalls().length, 1);

    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['adds multiple messages when mutiple recipients'] = test => {
  alert.recipients = ['+254111222333', 'countedReports.map(report => report.contact.phone)'];
  sinon.stub(config, 'get').returns([alert]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }, undefined, undefined, () => {
    test.equals(messages.addError.getCalls().length, 0);

    // first recipient
    assertMessage(test, messages.addMessage.getCall(0).args[0], '+254111222333', alert.message);
    // second recipient : matched 3 phones
    assertMessage(test, messages.addMessage.getCall(1).args[0], doc.contact.phone, alert.message);
    assertMessage(test, messages.addMessage.getCall(2).args[0], hydratedReports[0].contact.phone, alert.message);
    assertMessage(test, messages.addMessage.getCall(3).args[0], hydratedReports[1].contact.phone, alert.message);

    test.equals(messages.addMessage.getCalls().length, 4);

    test.done();
  });
};

exports['dedups message recipients'] = test => {
  alert.recipients = ['countedReports[0].contact.phone', 'countedReports[0].contact.phone'];
  sinon.stub(config, 'get').returns([alert]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }, undefined, undefined, () => {
    test.equals(messages.addError.getCalls().length, 0);

    test.equals(messages.addMessage.getCalls().length, 1); // 2 recipients specified, deduped to 1.
    test.equals(messages.addMessage.getCall(0).args[0].phone, doc.contact.phone);

    test.done();
  });
};

exports['when unexpected error, callback returns (error, false)'] = test => {
  sinon.stub(config, 'get').returns([alert]);
  sinon.stub(utils, 'getReportsWithinTimeWindow').throws(new Error('much error'));

  transition.onMatch({ doc: doc }, undefined, undefined, (err, docNeedsSaving) => {
    test.ok(err);
    test.ok(!docNeedsSaving);
    test.done();
  });
};

exports['runs multiple alerts'] = test => {
  var twoAlerts = [
  {
    isReportCounted: 'function() { return true; }',
    numReportsThreshold : 3,
    message : 'hi',
    recipients : ['+254777888999'],
    timeWindowInDays : 7
  },
  {
    isReportCounted: 'function() { return true; }',
    numReportsThreshold : 2,
    message : 'bye',
    recipients : ['+254777888111', '+2562299383'],
    timeWindowInDays : 5
  }];
  sinon.stub(config, 'get').returns(twoAlerts);
  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }, undefined, undefined, (err, docNeedsSaving) => {
    test.equals(messages.addError.getCalls().length, 0);

    test.equals(messages.addMessage.getCalls().length, 3); // alert[0].recipients + alert[1].recipients
    assertMessage(test, messages.addMessage.getCall(0).args[0], twoAlerts[0].recipients[0], twoAlerts[0].message);
    assertMessage(test, messages.addMessage.getCall(1).args[0], twoAlerts[1].recipients[0], twoAlerts[1].message);
    assertMessage(test, messages.addMessage.getCall(2).args[0], twoAlerts[1].recipients[1], twoAlerts[1].message);

    test.ok(!err);
    test.ok(docNeedsSaving);
    test.done();
  });
};

exports['skips doc with wrong form if forms is present in config'] = test => {
  alert.forms = ['B'];
  sinon.stub(config, 'get').returns([alert]);

  sinon.stub(utils, 'getReportsWithinTimeWindow').returns(Promise.resolve(reports));
  stubFetchHydratedDocs();
  sinon.stub(messages, 'addError');
  sinon.stub(messages, 'addMessage');

  transition.onMatch({ doc: doc }, undefined, undefined, (err, docNeedsSaving) => {
    test.equals(messages.addError.getCalls().length, 0);
    test.equals(messages.addMessage.getCalls().length, 0);
    test.ok(!err);
    test.ok(!docNeedsSaving);
    test.done();
  });
};
