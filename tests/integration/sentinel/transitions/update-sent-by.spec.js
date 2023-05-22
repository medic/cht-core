const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const uuid = require('uuid').v4;
const { expect } = require('chai');

describe('update_sent_by', () => {
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb([], true));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { update_sent_by: false }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '123456',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(Object.keys(info.transitions)).to.be.empty;
      });
  });

  it('should skip transition when not filtered, when sent_by exists or when contact not found or no name', () => {
    const settings = {
      transitions: { update_sent_by: true }
    };

    const report1 = {
      _id: uuid(),
      type: 'data_record',
      reported_date: new Date().getTime()
    };

    const report2 = {
      _id: uuid(),
      type: 'data_record',
      from: '123456',
      sent_by: 'Adam',
      reported_date: new Date().getTime()
    };

    const report3 = {
      _id: uuid(),
      type: 'data_record',
      from: '999888',
      reported_date: new Date().getTime()
    };

    const report4 = {
      _id: uuid(),
      type: 'data_record',
      from: '789456',
      reported_date: new Date().getTime()
    };

    const contact = {
      _id: uuid,
      phone: '789456',
      type: 'person',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(contact))
      .then(() => utils.saveDocs([report1, report2, report3, report4]))
      .then(() => sentinelUtils.waitForSentinel([report1._id, report2._id, report3._id, report4._id]))
      .then(() => sentinelUtils.getInfoDocs([report1._id, report2._id, report3._id, report4._id]))
      .then(infos => {
        expect(Object.keys(infos[0].transitions)).to.be.empty;
        expect(Object.keys(infos[1].transitions)).to.be.empty;
        expect(Object.keys(infos[2].transitions)).to.be.empty;
        expect(Object.keys(infos[3].transitions)).to.be.empty;
      });
  });

  it('should add sent by', () => {
    const settings = {
      transitions: { update_sent_by: true }
    };

    const report = {
      _id: uuid(),
      type: 'data_record',
      from: '123456789',
      reported_date: new Date().getTime()
    };

    const contacts = [
      {
        _id: uuid(),
        type: 'person',
        name: 'alpha',
        phone: '123456789',
        reported_date: new Date().getTime()
      },
      {
        _id: uuid(),
        type: 'person',
        name: 'beta',
        phone: '987654321',
        reported_date: new Date().getTime()
      }
    ];

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDocs(contacts))
      .then(() => utils.saveDoc(report))
      .then(() => sentinelUtils.waitForSentinel(report._id))
      .then(() => sentinelUtils.getInfoDoc(report._id))
      .then(info => {
        expect(info.transitions.update_sent_by.ok).to.be.true;
      })
      .then(() => utils.getDoc(report._id))
      .then(updated => {
        expect(updated.sent_by).to.equal('alpha');
      });
  });
});
