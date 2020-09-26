const moment = require('moment');
const sinon = require('sinon');
const assert = require('chai').assert;
const db = require('../../../src/db');
const logger = require('../../../src/lib/logger');
const transition = require('../../../src/transitions/update_sent_forms');

describe('update sent forms', () => {
  afterEach(() => sinon.restore());

  it('should have basic properties defined', () => {
    assert.equal(transition.name, 'update_sent_forms');
    assert.equal(transition.asynchronousOnly, true);
    assert.equal(transition.deprecated, true);
    assert.equal(transition.deprecatedIn, '3.7.x');
  });

  it('init() should log a warning when transition is deprecated.', () => {
    const deprecatedMsg = 'It will be removed in next major version. '
      + 'Consider updating your configuration to disable it.';
    sinon.stub(logger, 'warn');

    transition.init();

    assert.equal(logger.warn.callCount, 1);
    assert.equal(logger.warn.args[0][0].includes(transition.name), true);
    assert.equal(logger.warn.args[0][0].includes(transition.deprecatedIn), true);
    assert.equal(logger.warn.args[0][0].includes(deprecatedMsg), true);
  });

  it('calls db.get with id of clinic', () => {
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
    sinon.stub(db.medic, 'put').callsArgWith(1, null);
    const change = {
      doc: {
        contact: {
          parent: {
            _id: '1',
          },
        },
      },
    };
    return transition.onMatch(change).then(() => {
      assert.equal(db.medic.get.callCount, 1);
      assert.equal(db.medic.get.args[0][0], '1');
    });
  });

  it('Saves clinic and updated sent_forms', () => {
    const now = moment();
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
    const save = sinon.stub(db.medic, 'put').callsArgWith(1, null);
    const change = {
      doc: {
        form: 'XXX',
        reported_date: now.valueOf(),
      },
    };
    return transition.onMatch(change).then(() => {
      const clinic = save.args[0][0];
      logger.info(clinic);
      assert(clinic.sent_forms);
      assert(clinic.sent_forms.XXX);
      assert.equal(clinic.sent_forms.XXX, now.toISOString());
    });
  });

  it('does not overwrite if existing date is after', () => {
    const now = moment();
    const tomorrow = now.clone().add(1, 'day');
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {
      sent_forms: { XXX: tomorrow.toISOString() },
    });

    const change = {
      doc: {
        form: 'XXX',
        reported_date: now.valueOf(),
      },
    };
    return transition.onMatch(change).then(changed => {
      assert(!changed);
    });
  });

  it('overwrites if existing date is before', () => {
    const now = moment();
    const yesterday = now.clone().subtract(1, 'day');
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {
      sent_forms: { XXX: yesterday.toISOString() },
    });
    const save = sinon.stub(db.medic, 'put').callsArgWith(1, null);

    const change = {
      doc: {
        form: 'XXX',
        reported_date: now.valueOf(),
      },
    };
    return transition.onMatch(change).then(() => {
      const clinic = save.args[0][0];
      assert(clinic.sent_forms);
      assert(clinic.sent_forms.XXX);
      assert.equal(clinic.sent_forms.XXX, now.toISOString());
    });
  });
});
