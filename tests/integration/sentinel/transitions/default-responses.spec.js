const utils = require('@utils');
const sentinelUtils = require('@utils/sentinel');
const uuid = require('uuid').v4;
const { expect } = require('chai');

describe('default_responses', () => {
  after(() => utils.revertDb([], true));
  afterEach(() => utils.revertDb([], true));

  it('should be skipped when transition is disabled', () => {
    const settings = {
      transitions: { default_responses: false }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '1234567890',
      errors: [{
        code: 'sys.empty'
      }],
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

  it('should add default response when message is empty', () => {
    const settings = {
      transitions: { default_responses: true },
      default_responses: {
        start_date: '2018-01-01'
      }
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '1234567890',
      errors: [{
        code: 'sys.empty'
      }],
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions.default_responses.ok).to.be.true;
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).to.have.lengthOf(1);
        expect(updated.tasks[0].messages[0].to).to.equal(doc.from);
        expect(updated.tasks[0].state).to.equal('pending');
      });
  });

  it('should add default response when form not found', () => {
    const settings = {
      transitions: { default_responses: true },
      default_responses: {
        start_date: '2018-01-01'
      },
      forms_only_mode: true
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      from: '1234567890',
      errors: [{
        code: 'sys.form_not_found'
      }],
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions.default_responses.ok).to.be.true;
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).to.have.lengthOf(1);
        expect(updated.tasks[0].messages[0].to).to.equal(doc.from);
        expect(updated.tasks[0].state).to.equal('pending');
      });
  });

  it('should add default response when form is found', () => {
    const settings = {
      transitions: { default_responses: true },
      default_responses: {
        start_date: '2018-01-01'
      },
      forms_only_mode: false
    };

    const doc = {
      _id: uuid(),
      type: 'data_record',
      errors: [{
        code: 'sys.form_not_found'
      }],
      from: '1234567890',
      reported_date: new Date().getTime()
    };

    return utils
      .updateSettings(settings, 'sentinel')
      .then(() => utils.saveDoc(doc))
      .then(() => sentinelUtils.waitForSentinel(doc._id))
      .then(() => sentinelUtils.getInfoDoc(doc._id))
      .then(info => {
        expect(info.transitions.default_responses.ok).to.be.true;
      })
      .then(() => utils.getDoc(doc._id))
      .then(updated => {
        expect(updated.tasks).to.have.lengthOf(1);
        expect(updated.tasks[0].messages[0].to).to.equal(doc.from);
        expect(updated.tasks[0].state).to.equal('pending');
      });
  });
});
