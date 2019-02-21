const utils = require('../../../utils'),
      sentinelUtils = require('../utils'),
      uuid = require('uuid');

describe('multi_report_alerts', () => {
  afterAll(done => utils.revertDb().then(done));
  afterEach(done => utils.revertDb([], true).then(done));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { multi_report_alerts: false },
      multi_report_alerts: [{
        name: 'test',
        is_report_counted: 'function(r, l) { return true }',
        num_reports_threshold: 1,
        message: 'multi_report_message',
        recipients: 'new_report.from',
        time_window_in_days: 1,
        forms: 'FORM'
      }]
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FROM',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).not.toBeDefined();
      });
  });

  it('should be skipped when no matching config', () => {
    const settings = {
      transitions: { multi_report_alerts: false },
      multi_report_alerts: [{
        name: 'test',
        is_report_counted: 'function(r, l) { return true }',
        num_reports_threshold: 1,
        message: 'multi_report_message',
        recipients: 'new_report.from',
        time_window_in_days: 1,
        forms: 'FORM'
      }]
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'NOT_FORM',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).not.toBeDefined();
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
        forms: 'FORM'
      }]
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '0123456789',
      reported_date: new Date().getTime()
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
        forms: 'FORM'
      }]
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+251 11 551 1211',
      reported_date: new Date().getTime() - 100
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '+256 41 9867538',
      reported_date: new Date().getTime() + 100
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).not.toBeDefined();
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
        forms: 'FORM'
      }]
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      sent_by: '0123456789',
      home_phone: '01010101',
      reported_date: new Date().getTime() - 100
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      sent_by: '987654321',
      home_phone: '12121212',
      magic: true,
      reported_date: new Date().getTime() + 100
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).not.toBeDefined();
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
        expect(updated.tasks[0].messages[0].to).toEqual('987654321');
        expect(updated.tasks[0].state).toEqual('pending');

        expect(updated.tasks[1].messages[0].message).toEqual('multi_report_magic');
        expect(updated.tasks[1].messages[0].to).toEqual('12121212');
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
        forms: 'FORM'
      }]
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '0123456789',
      reported_date: new Date().getTime() - 25 * 60 * 60 * 1000
    };

    const doc2 = {
      _id: uuid(),
      type: 'data_record',
      form: 'FORM',
      from: '987654321',
      reported_date: new Date().getTime() + 100
    };

    return utils
      .updateSettings(settings, true)
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions).not.toBeDefined();
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).not.toBeDefined();
      })
      .then(() => utils.saveDoc(doc2))
      .then(() => sentinelUtils.waitForSentinel(doc2._id))
      .then(() => sentinelUtils.getInfoDoc(doc2._id))
      .then(info => {
        expect(info.transitions).not.toBeDefined();
      })
      .then(() => utils.getDoc(doc2._id))
      .then(updated => {
        expect(updated.tasks).not.toBeDefined();
      });
  });
});
