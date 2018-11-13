const sinon = require('sinon'),
  assert = require('chai').assert,
  db = require('../../src/db-pouch'),
  transitions = require('../../src/transitions/index');

describe('finalize transition', () => {
  afterEach(() => sinon.restore());

  it('save not called if transition results are null', done => {
    const doc = { _rev: '1' };
    const saveDoc = sinon.stub(db.medic, 'put');
    transitions.finalize(
      {
        change: { doc: doc },
        results: null,
      },
      () => {
        assert.equal(saveDoc.callCount, 0);
        done();
      }
    );
  });

  it('save is called if transition results have changes', done => {
    const doc = { _rev: '1' };
    const saveDoc = sinon.stub(db.medic, 'put').callsArg(1);
    transitions.finalize(
      {
        change: { doc: doc },
        results: [null, null, true],
      },
      () => {
        assert.equal(saveDoc.callCount, 1);
        assert(saveDoc.args[0][0]._rev);
        done();
      }
    );
  });

  it('applyTransition creates transitions property', done => {
    const doc = { _rev: '1' };
    const info = {};
    sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
    sinon.stub(db.medic, 'get').rejects({ status: 404 });
    sinon.stub(db.medic, 'put').resolves({});
    sinon.stub(db.sentinel, 'put').resolves({});
    const transition = {
      onMatch: change => {
        change.doc.foo = 'bar';
        return Promise.resolve(true);
      },
    };
    transitions.applyTransition(
      {
        key: 'x',
        change: {
          id: '123',
          doc: doc,
          info: info,
          seq: 1,
        },
        transition: transition,
      },
      (err, changed) => {
        assert(!err);
        assert(changed);
        assert(info.transitions.x.ok);
        assert(info.transitions.x.last_rev);
        assert(info.transitions.x.seq);
        assert.equal(doc.errors, undefined);
        assert.equal(doc.foo, 'bar');
        done();
      }
    );
  });

  it('applyTransition adds errors to doc but does not return errors', done => {
    const doc = { _rev: '1' };
    var transition = {
      onMatch: () => Promise.reject({ changed: false, message: 'oops' }),
    };
    transitions.applyTransition(
      {
        key: 'x',
        change: {
          doc: doc,
        },
        transition: transition,
      },
      (err, changed) => {
        assert(!err);
        assert(!changed);
        assert.equal(doc.transitions, undefined); // don't save the transition or it won't run next time
        assert(doc.errors.length === 1);
        // error message contains error
        assert.equal(doc.errors[0].message, 'Transition error on x: oops');
        done();
      }
    );
  });
});
