var moment = require('moment'),
    sinon = require('sinon'),
    assert = require('chai').assert,
    db = require('../../src/db-nano'),
    transition = require('../../src/transitions/update_sent_forms');

describe('update sent by', () => {
  beforeEach(() => { process.env.TEST_ENV = true; });
  afterEach(() => sinon.restore());

  it('calls db.get with id of clinic', () => {
      sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
      sinon.stub(db.audit, 'saveDoc').callsArgWith(1, null);
      const change = {
          doc: {
              contact: {
                  parent: {
                      _id: '1'
                  }
              }
          }
      };
      return transition.onMatch(change).then(() => {
          assert.equal(db.medic.get.callCount, 1);
          assert.equal(db.medic.get.args[0][0], '1');
      });
  });

  it('calls audit.saveDoc with clinic and updated sent_forms', () => {
      var now = moment();
      sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
      var save = sinon.stub(db.audit, 'saveDoc').callsArgWith(1, null);
      const change = {
          doc: {
              form: 'XXX',
              reported_date: now.valueOf()
          }
      };
      return transition.onMatch(change).then(() => {
          const clinic = save.args[0][0];
          assert(clinic.sent_forms);
          assert(clinic.sent_forms.XXX);
          assert.equal(clinic.sent_forms.XXX, now.toISOString());
      });
  });

  it('does not overwrite if existing date is after', () => {
      var now = moment(),
          tomorrow = now.clone().add(1, 'day');
      sinon.stub(db.medic, 'get').callsArgWith(1, null, {
          sent_forms: { XXX: tomorrow.toISOString() }
      });
      sinon.stub(db.audit, 'saveDoc').callsArgWith(1, null);
      const change = {
          doc: {
              form: 'XXX',
              reported_date: now.valueOf()
          }
      };
      return transition.onMatch(change).then(changed => {
          assert(!changed);
      });
  });

  it('overwrites if existing date is before', () => {
      var now = moment(),
          yesterday = now.clone().subtract(1, 'day');
      sinon.stub(db.medic, 'get').callsArgWith(1, null, {
          sent_forms: { XXX: yesterday.toISOString() }
      });
      var save = sinon.stub(db.audit, 'saveDoc').callsArgWith(1, null);

      const change = {
          doc: {
              form: 'XXX',
              reported_date: now.valueOf()
          }
      };
      return transition.onMatch(change).then(() => {
          const clinic = save.args[0][0];
          assert(clinic.sent_forms);
          assert(clinic.sent_forms.XXX);
          assert.equal(clinic.sent_forms.XXX, now.toISOString());
      });
  });
});
