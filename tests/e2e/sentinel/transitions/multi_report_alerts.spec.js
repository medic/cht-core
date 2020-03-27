const utils = require('../../../utils');
const sentinelUtils = require('../utils');
const uuid = require('uuid');

const contact = {
  _id: 'person',
  type: 'person',
  phone: 'phone',
  reported_date: new Date().getTime()
};

describe('multi_report_alerts', () => {
  beforeAll(done => utils.saveDoc(contact).then(done));
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb([contact._id], true).then(done));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { multi_report_alerts: false },
      multi_report_alerts: [{
        name: 'test',
        is_report_counted: 'function(r, l) { return true }',
        num_reports_threshold: 1,
        message: 'multi_report_message',
        recipients: ['new_report.from'],
        time_window_in_days: 1,
        forms: ['FORM']
      }],
      forms: { FORM: { } }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FROM',
      reported_date: new Date().getTime(),
      contact: { _id: 'person' }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      });
  });

  it('should be skipped when no matching config', () => {
    const settings = {
      transitions: { multi_report_alerts: true },
      multi_report_alerts: [{
        name: 'test',
        is_report_counted: 'function(r, l) { return true }',
        num_reports_threshold: 1,
        message: 'multi_report_message',
        recipients: ['new_report.from'],
        time_window_in_days: 1,
        forms: ['FORM']
      }],
      forms: { NOT_FORM: { } }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'NOT_FORM',
      reported_date: new Date().getTime(),
      contact: { _id: 'person' }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      });
  });

  it('should add task when matched', () => {
    const settings = {
      transitions: { multi_report_alerts: true },
      multi_report_alerts: [{
        name: 'test',
        is_report_counted: 'function(r, l) { return true }',
        num_reports_threshold: 1,
        message: 'multi_report_message',
        recipients: ['new_report.from'],
        time_window_in_days: 1,
        forms: ['FORM']
      }],
      forms: { FORM: { } }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '0123456789',
      reported_date: new Date().getTime(),
      contact: { _id: 'person' }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.multi_report_alerts).toBeDefined();
        expect(info.transitions.multi_report_alerts.ok).toBe(true);
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).toBeDefined();
        expect(updated.tasks.length).toEqual(1);
        expect(updated.tasks[0].messages[0].message).toEqual('multi_report_message');
        expect(updated.tasks[0].messages[0].to).toEqual('0123456789');
        expect(updated.tasks[0].state).toEqual('pending');
      });
  });

  it('should not add task when threshold not reached', () => {
    const settings = {
      transitions: { multi_report_alerts: true },
      multi_report_alerts: [{
        name: 'test',
        is_report_counted: 'function(r, l) { return true }',
        num_reports_threshold: 2,
        message: 'multi_report_message',
        recipients: ['new_report.from'],
        time_window_in_days: 1,
        forms: ['FORM']
      }],
      forms: { FORM: { } }
    };

    const contacts = [{
      _id: 'contact1',
      type: 'person',
      phone: '+251 11 551 1211',
      reported_date: new Date().getTime()
    }, {
      _id: 'contact2',
      type: 'person',
      phone: '+256 41 9867538',
      reported_date: new Date().getTime()
    }];

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+251 11 551 1211',
      reported_date: new Date().getTime() - 100,
      contact: { _id: 'contact1' }
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+256 41 9867538',
      reported_date: new Date().getTime() + 100,
      contact: { _id: 'contact2' }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs(contacts))
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).not.toBeDefined();
      })
      .then(() => utils.saveDoc(doc2))
      .then(() => sentinelUtils.waitForSentinel(doc2._id))
      .then(() => sentinelUtils.getInfoDoc(doc2._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.multi_report_alerts).toBeDefined();
        expect(info.transitions.multi_report_alerts.ok).toBe(true);
      })
      .then(() => utils.getDoc(doc2._id))
      .then(updated => {
        expect(updated.tasks).toBeDefined();
        expect(updated.tasks.length).toEqual(2);

        expect(updated.tasks[0].messages[0].message).toEqual('multi_report_message');
        expect(updated.tasks[0].messages[0].to).toEqual('+256 41 9867538');
        expect(updated.tasks[0].state).toEqual('pending');

        expect(updated.tasks[1].messages[0].message).toEqual('multi_report_message');
        expect(updated.tasks[1].messages[0].to).toEqual('+251 11 551 1211');
        expect(updated.tasks[1].state).toEqual('pending');
      });
  });

  it('should not add task when conditions not met', () => {
    const settings = {
      transitions: { multi_report_alerts: true },
      multi_report_alerts: [{
        name: 'test',
        is_report_counted: 'function(r, l) { return r.magic; }',
        num_reports_threshold: 1,
        message: 'multi_report_magic',
        recipients: ['new_report.sent_by', 'new_report.home_phone'],
        time_window_in_days: 1,
        forms: ['FORM']
      }],
      forms: { FORM: { } }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      sent_by: '+256 41 9867538',
      home_phone: '+256 41 9867539',
      reported_date: new Date().getTime() - 100,
      contact: { _id: 'person' }
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      sent_by: '+256 41 9867530',
      home_phone: '+256 41 9867531',
      magic: true,
      reported_date: new Date().getTime() + 100,
      contact: { _id: 'person' }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).not.toBeDefined();
      })
      .then(() => utils.saveDoc(doc2))
      .then(() => sentinelUtils.waitForSentinel(doc2._id))
      .then(() => sentinelUtils.getInfoDoc(doc2._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.multi_report_alerts).toBeDefined();
        expect(info.transitions.multi_report_alerts.ok).toBe(true);
      })
      .then(() => utils.getDoc(doc2._id))
      .then(updated => {
        expect(updated.tasks).toBeDefined();
        expect(updated.tasks.length).toEqual(2);

        expect(updated.tasks[0].messages[0].message).toEqual('multi_report_magic');
        expect(updated.tasks[0].messages[0].to).toEqual('+256 41 9867530');
        expect(updated.tasks[0].state).toEqual('pending');

        expect(updated.tasks[1].messages[0].message).toEqual('multi_report_magic');
        expect(updated.tasks[1].messages[0].to).toEqual('+256 41 9867531');
        expect(updated.tasks[1].state).toEqual('pending');
      });
  });

  it('should not count reports that are outside of the time window', () => {
    const settings = {
      transitions: { multi_report_alerts: true },
      multi_report_alerts: [{
        name: 'test',
        is_report_counted: 'function(r, l) { return true }',
        num_reports_threshold: 2,
        message: 'multi_report_message',
        recipients: ['new_report.from'],
        time_window_in_days: 1,
        forms: ['FORM']
      }],
      forms: { FORM: { } }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: 'phone',
      reported_date: new Date().getTime() - 25 * 60 * 60 * 1000,
      contact: { _id: 'person' }
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: 'phone',
      reported_date: new Date().getTime() + 100,
      contact: { _id: 'person' }
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).not.toBeDefined();
      })
      .then(() => utils.saveDoc(doc2))
      .then(() => sentinelUtils.waitForSentinel(doc2._id))
      .then(() => sentinelUtils.getInfoDoc(doc2._id))
      .then(info => {
        expect(Object.keys(info.transitions).length).toEqual(0);
      })
      .then(() => utils.getDoc(doc2._id))
      .then(updated => {
        expect(updated.tasks).not.toBeDefined();
      });
  });

  it('non public_forms from unknown senders should not be counted', () => {
    const settings = {
      transitions: { multi_report_alerts: true, update_clinics: true },
      multi_report_alerts: [{
        name: 'test',
        is_report_counted: 'function(r, l) { return true }',
        num_reports_threshold: 2,
        message: 'multi_report_message',
        recipients: ['new_report.from'],
        time_window_in_days: 1,
        forms: ['FORM']
      }],
      forms: { FORM: { } }
    };

    const contacts = [{
      _id: 'chw',
      phone: '+251 11 551 1222',
      type: 'person',
      parent: { _id: 'district' },
      reported_date: new Date().getTime() - 10000
    }, {
      _id: 'chw2',
      phone: '+251 11 551 2133',
      type: 'person',
      parent: { _id: 'district' },
      reported_date: new Date().getTime() - 9000
    }];

    const doc_unknown = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+256 41 9767538',
      reported_date: new Date().getTime() - 8000
    };

    const doc_unknown2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+256 41 9767539',
      reported_date: new Date().getTime() - 7000
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+251 11 551 1222',
      reported_date: new Date().getTime() - 6000
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+251 11 551 2133',
      reported_date: new Date().getTime() - 5000
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDocs(contacts))
      .then(() => utils.saveDoc(doc_unknown))
      .then(() => sentinelUtils.waitForSentinel(doc_unknown._id))
      .then(() => sentinelUtils.getInfoDoc(doc_unknown._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.update_clinics).toBeDefined();
        expect(info.transitions.multi_report_alerts).not.toBeDefined();
      })
      .then(() => utils.getDoc(doc_unknown._id))
      .then(updated => {
        expect(updated.tasks).not.toBeDefined();
      })
      .then(() => utils.saveDoc(doc_unknown2))
      .then(() => sentinelUtils.waitForSentinel(doc_unknown2._id))
      .then(() => sentinelUtils.getInfoDoc(doc_unknown2._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.update_clinics).toBeDefined();
        expect(info.transitions.multi_report_alerts).not.toBeDefined();
      })
      .then(() => utils.getDoc(doc_unknown2._id))
      .then(updated => {
        expect(updated.tasks).not.toBeDefined();
      })
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions.update_clinics.ok).toEqual(true);
        expect(info.transitions.multi_report_alerts).not.toBeDefined();
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).not.toBeDefined();
      })
      .then(() => utils.saveDoc(doc2))
      .then(() => sentinelUtils.waitForSentinel(doc2._id))
      .then(() => sentinelUtils.getInfoDoc(doc2._id))
      .then(info => {
        expect(info.transitions).toBeDefined();
        expect(info.transitions.multi_report_alerts).toBeDefined();
        expect(info.transitions.multi_report_alerts.ok).toBe(true);
      })
      .then(() => utils.getDoc(doc2._id))
      .then(updated => {
        expect(updated.tasks).toBeDefined();
        expect(updated.tasks.length).toEqual(2);

        expect(updated.tasks[0].messages[0].message).toEqual('multi_report_message');
        expect(updated.tasks[0].messages[0].to).toEqual('+251 11 551 2133');
        expect(updated.tasks[0].state).toEqual('pending');

        expect(updated.tasks[1].messages[0].message).toEqual('multi_report_message');
        expect(updated.tasks[1].messages[0].to).toEqual('+251 11 551 1222');
        expect(updated.tasks[1].state).toEqual('pending');
      });
  });
});
